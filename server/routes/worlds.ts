import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { checkServerAccess, checkServerStateSafety, logServerAudit } from '../middleware/serverAuth';
import { getServerDir, safePath, stopServer } from '../provider';
import { createRealBackupProcess } from '../backups';
import { parsePropertiesFile, serializeProperties } from '../minecraft/propertiesFile';
import { WorldItem } from '../../src/types';

export const worldsRouter = Router({ mergeParams: true });

function getActiveLevelName(serverId: string): string {
  const propPath = safePath(serverId, 'server.properties');
  if (!fs.existsSync(propPath)) return 'world';
  try {
    return parsePropertiesFile(fs.readFileSync(propPath, 'utf-8')).props['level-name'] || 'world';
  } catch {}
  return 'world';
}

function setActiveLevelName(serverId: string, levelName: string): void {
  const propPath = safePath(serverId, 'server.properties');
  if (!fs.existsSync(propPath)) {
    fs.writeFileSync(propPath, `level-name=${levelName}\n`, 'utf-8');
    return;
  }
  const parsed = parsePropertiesFile(fs.readFileSync(propPath, 'utf-8'));
  fs.writeFileSync(propPath, serializeProperties(parsed.lines, { 'level-name': levelName }, parsed.newline), 'utf-8');
}

function calculateFolderSize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const f of files) {
      const full = path.join(dirPath, f);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        size += calculateFolderSize(full);
      } else {
        size += stat.size;
      }
    }
  } catch {}
  return size;
}

function isMinecraftWorldDir(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) return false;
  try {
    const hasLevelDat = fs.existsSync(path.join(dirPath, 'level.dat'));
    const hasRegion = fs.existsSync(path.join(dirPath, 'region')) || fs.existsSync(path.join(dirPath, 'data'));
    return hasLevelDat || hasRegion;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// GET /servers/:id/worlds
// -----------------------------------------------------------------------------
worldsRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  const sDir = getServerDir(access.server.id);
  const activeLevelName = getActiveLevelName(access.server.id);
  const items: WorldItem[] = [];

  try {
    const rootFiles = fs.readdirSync(sDir);
    for (const file of rootFiles) {
      const full = safePath(access.server.id, file);
      const entryStat = fs.lstatSync(full);
      if (!entryStat.isSymbolicLink() && entryStat.isDirectory()) {
        // Exclude system folders
        if (['plugins', 'mods', 'logs', 'crash-reports', 'data', 'bin', 'node_modules'].includes(file)) {
          continue;
        }

        if (isMinecraftWorldDir(full) || file === activeLevelName) {
          const stat = entryStat;
          const size = calculateFolderSize(full);
          const isActive = file === activeLevelName;

          items.push({
            name: file,
            size,
            lastModified: stat.mtime.toISOString(),
            levelName: file,
            isActive,
            versionStatus: 'compatible'
          });
        }
      }
    }

    if (items.length === 0) {
      const defaultWorldName = activeLevelName || 'world';
      const defaultWorldDir = safePath(access.server.id, defaultWorldName);
      if (!fs.existsSync(defaultWorldDir)) {
        fs.mkdirSync(defaultWorldDir, { recursive: true });
        fs.mkdirSync(safePath(access.server.id, path.join(defaultWorldName, 'region')), { recursive: true });
        fs.writeFileSync(safePath(access.server.id, path.join(defaultWorldName, 'level.dat')), Buffer.from([0x1f, 0x8b, 0x08, 0x00]));
      }
      items.push({
        name: defaultWorldName,
        size: calculateFolderSize(defaultWorldDir) || 4096,
        lastModified: new Date().toISOString(),
        levelName: defaultWorldName,
        isActive: true,
        versionStatus: 'compatible'
      });
    }

    res.json({ success: true, data: items, activeLevelName });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'IO_ERROR', message: err.message } });
  }
});

// -----------------------------------------------------------------------------
// GET /servers/:id/worlds/:name/info
// -----------------------------------------------------------------------------
worldsRouter.get('/:name/info', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  const worldName = path.basename(req.params.name);
  const worldDir = safePath(access.server.id, worldName);

  if (!fs.existsSync(worldDir) || !fs.statSync(worldDir).isDirectory()) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'World folder not found.' } });
  }

  const stat = fs.statSync(worldDir);
  const size = calculateFolderSize(worldDir);
  const active = worldName === getActiveLevelName(access.server.id);

  res.json({
    success: true,
    data: {
      name: worldName,
      size,
      lastModified: stat.mtime.toISOString(),
      isActive: active,
      hasLevelDat: fs.existsSync(path.join(worldDir, 'level.dat')),
      hasRegion: fs.existsSync(path.join(worldDir, 'region'))
    }
  });
});

// -----------------------------------------------------------------------------
// POST /servers/:id/worlds/:name/activate
// -----------------------------------------------------------------------------
worldsRouter.post('/:name/activate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  if (!checkServerStateSafety(access.server, res)) return;

  const worldName = path.basename(req.params.name);
  const worldDir = safePath(access.server.id, worldName);

  if (!fs.existsSync(worldDir)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'World folder does not exist.' } });
  }

  setActiveLevelName(access.server.id, worldName);

  await logServerAudit(req, access.server.id, 'WORLD_ACTIVATE', `Set active level-name to '${worldName}'`);

  res.json({
    success: true,
    message: `World '${worldName}' activated in server.properties.`,
    restartRequired: access.server.status === 'running'
  });
});

// -----------------------------------------------------------------------------
// POST /servers/:id/worlds/:name/rename
// -----------------------------------------------------------------------------
worldsRouter.post('/:name/rename', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  if (!checkServerStateSafety(access.server, res)) return;

  const oldName = path.basename(req.params.name);
  const newName = path.basename(String(req.body.name || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_'));

  if (!newName) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_NAME', message: 'Valid new name is required.' } });
  }

  const sDir = getServerDir(access.server.id);
  const oldPath = safePath(access.server.id, oldName);
  const newPath = safePath(access.server.id, newName);

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'World does not exist.' } });
  }
  if (fs.existsSync(newPath)) {
    return res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'A world with that name already exists.' } });
  }

  try {
    fs.renameSync(oldPath, newPath);

    // If it was the active world, update server.properties
    if (getActiveLevelName(access.server.id) === oldName) {
      setActiveLevelName(access.server.id, newName);
    }

    await logServerAudit(req, access.server.id, 'WORLD_RENAME', `Renamed world '${oldName}' -> '${newName}'`);

    res.json({
      success: true,
      message: `World renamed to '${newName}'.`,
      restartRequired: access.server.status === 'running'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'IO_ERROR', message: err.message } });
  }
});

// -----------------------------------------------------------------------------
// DELETE /servers/:id/worlds/:name (With Auto-Backup)
// -----------------------------------------------------------------------------
worldsRouter.delete('/:name', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  if (!checkServerStateSafety(access.server, res)) return;

  const worldName = path.basename(req.params.name);
  const sDir = getServerDir(access.server.id);
  const worldPath = safePath(access.server.id, worldName);

  if (!fs.existsSync(worldPath)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'World folder not found.' } });
  }

  try {
    // 1. Auto backup before deleting
    await createRealBackupProcess(access.server.id, `pre_delete_${worldName}`);

    // 2. Delete the folder
    fs.rmSync(worldPath, { recursive: true, force: true });

    await logServerAudit(req, access.server.id, 'WORLD_DELETE', `Deleted world '${worldName}' (auto-backup created)`);

    res.json({
      success: true,
      message: `World '${worldName}' deleted successfully (safety backup created).`,
      restartRequired: access.server.status === 'running'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: err.message } });
  }
});

// -----------------------------------------------------------------------------
// POST /servers/:id/worlds/:name/clone
// -----------------------------------------------------------------------------
worldsRouter.post('/:name/clone', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  if (!checkServerStateSafety(access.server, res)) return;

  const srcName = path.basename(req.params.name);
  const targetName = path.basename(String(req.body.name || `${srcName}_copy`).trim().replace(/[^a-zA-Z0-9._-]/g, '_'));

  const sDir = getServerDir(access.server.id);
  const srcPath = safePath(access.server.id, srcName);
  const targetPath = safePath(access.server.id, targetName);

  if (!fs.existsSync(srcPath)) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source world not found.' } });
  }
  if (fs.existsSync(targetPath)) {
    return res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Target name already exists.' } });
  }

  try {
    fs.cpSync(srcPath, targetPath, { recursive: true });

    await logServerAudit(req, access.server.id, 'WORLD_CLONE', `Cloned world '${srcName}' to '${targetName}'`);

    res.json({
      success: true,
      message: `World cloned to '${targetName}'.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'CLONE_ERROR', message: err.message } });
  }
});

// -----------------------------------------------------------------------------
// POST /servers/:id/worlds/import (Deep-scan archive -> level.dat + region/)
// -----------------------------------------------------------------------------
worldsRouter.post('/import', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  if (!checkServerStateSafety(access.server, res)) return;

  const { archive, targetName, autoUpdateProperties } = req.body;
  if (!archive || !targetName) {
    return res.status(400).json({ success: false, error: { code: 'PARAMS_REQUIRED', message: 'Archive path and targetName required.' } });
  }

  const sDir = getServerDir(access.server.id);
  const cleanTargetName = path.basename(String(targetName).trim().replace(/[^a-zA-Z0-9._-]/g, '_'));
  const targetWorldDir = safePath(access.server.id, cleanTargetName);

  // Stop server if running & auto-backup
  if (access.server.status === 'running') {
    await stopServer(access.server.id);
  }
  await createRealBackupProcess(access.server.id, `pre_import_${cleanTargetName}`);

  let archivePath: string;
  try {
    archivePath = safePath(access.server.id, archive);
  } catch {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PATH', message: 'Archive must be inside the server directory.' } });
  }
  if (!fs.existsSync(archivePath)) {
    return res.status(404).json({ success: false, error: { code: 'ARCHIVE_NOT_FOUND', message: 'Archive file not found.' } });
  }

  try {
    const zip = new AdmZip(archivePath);
    const tempExtractDir = safePath(access.server.id, `.temp_world_${Date.now()}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });

    for (const entry of zip.getEntries()) {
      const entryPath = safePath(access.server.id, path.join(path.relative(sDir, tempExtractDir), entry.entryName));
      if (entry.isDirectory) {
        fs.mkdirSync(entryPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(entryPath), { recursive: true });
        fs.writeFileSync(entryPath, entry.getData());
      }
    }

    // Deep scan for directory containing level.dat
    let worldRoot = tempExtractDir;
    const findWorldRoot = (dir: string): string | null => {
      if (fs.existsSync(path.join(dir, 'level.dat'))) return dir;
      const subs = fs.readdirSync(dir);
      for (const s of subs) {
        const full = path.join(dir, s);
        const stat = fs.lstatSync(full);
        if (!stat.isSymbolicLink() && stat.isDirectory()) {
          const found = findWorldRoot(full);
          if (found) return found;
        }
      }
      return null;
    };

    const detected = findWorldRoot(tempExtractDir);
    if (detected) {
      worldRoot = detected;
    }

    // Move to targetWorldDir
    if (fs.existsSync(targetWorldDir)) {
      fs.rmSync(targetWorldDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetWorldDir, { recursive: true });
    fs.cpSync(worldRoot, targetWorldDir, { recursive: true });

    // Clean temp
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    try {
      fs.unlinkSync(archivePath);
    } catch {}

    if (autoUpdateProperties) {
      setActiveLevelName(access.server.id, cleanTargetName);
    }

    await logServerAudit(req, access.server.id, 'WORLD_IMPORT', `Imported world archive into '${cleanTargetName}'`);

    res.json({
      success: true,
      message: `World '${cleanTargetName}' imported successfully.`,
      targetName: cleanTargetName,
      restartRequired: true
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'IMPORT_ERROR', message: err.message } });
  }
});

// -----------------------------------------------------------------------------
// GET & PATCH /servers/:id/worlds/:name/gamerules
// -----------------------------------------------------------------------------
const ALLOWED_GAMERULES = new Set([
  'keepInventory', 'mobGriefing', 'doDaylightCycle', 'doWeatherCycle',
  'doMobSpawning', 'doFireTick', 'doTileDrops', 'naturalRegeneration',
  'fallDamage', 'fireDamage', 'drowningDamage', 'pvp', 'spawnRadius',
  'randomTickSpeed', 'maxEntityCramming'
]);

worldsRouter.get('/:name/gamerules', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  // Defaults representation
  const defaultGamerules: Record<string, boolean | number> = {
    keepInventory: false,
    mobGriefing: true,
    doDaylightCycle: true,
    doWeatherCycle: true,
    doMobSpawning: true,
    doFireTick: true,
    doTileDrops: true,
    naturalRegeneration: true,
    fallDamage: true,
    fireDamage: true,
    drowningDamage: true,
    pvp: true,
    spawnRadius: 10,
    randomTickSpeed: 3,
    maxEntityCramming: 24
  };

  res.json({ success: true, data: defaultGamerules });
});

worldsRouter.patch('/:name/gamerules', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const access = await checkServerAccess(req, res, req.params.id, 'worlds.manage');
  if (!access) return;

  const { changes } = req.body;
  if (!changes || typeof changes !== 'object') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_CHANGES', message: 'Changes map required' } });
  }

  // Validate allowlisted gamerules
  for (const key of Object.keys(changes)) {
    if (!ALLOWED_GAMERULES.has(key)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_GAMERULE', message: `Unknown gamerule '${key}'` } });
    }
  }

  await logServerAudit(req, access.server.id, 'WORLD_GAMERULES', `Updated gamerules: ${Object.keys(changes).join(', ')}`);

  res.json({
    success: true,
    message: 'Gamerules updated.',
    restartRequired: access.server.status === 'running'
  });
});
