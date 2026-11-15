import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getServerDir,
  readServerFile,
  writeServerFile
} from '../server/provider';

const serverId = `path_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aetherpanel-path-test-'));
const outsideFile = path.join(outsideDir, 'secret.txt');
const serverDir = getServerDir(serverId);
const symlinkPath = path.join(serverDir, 'outside');

try {
  fs.writeFileSync(outsideFile, 'outside data', 'utf8');
  fs.symlinkSync(outsideDir, symlinkPath, process.platform === 'win32' ? 'junction' : 'dir');

  assert.throws(() => readServerFile(serverId, 'outside/secret.txt'));
  assert.throws(() => writeServerFile(serverId, 'outside/created.txt', 'should not escape'));
  assert.equal(fs.existsSync(path.join(outsideDir, 'created.txt')), false);

  const oddPath = 'space dir/雪 #config.txt';
  writeServerFile(serverId, oddPath, 'unicode, spaces, and # are valid');
  assert.equal(readServerFile(serverId, oddPath), 'unicode, spaces, and # are valid');

  console.log('Path confinement and odd-path verification passed.');
} finally {
  if (fs.existsSync(symlinkPath)) fs.rmSync(symlinkPath, { recursive: true, force: true });
  fs.rmSync(serverDir, { recursive: true, force: true });
  fs.rmSync(outsideDir, { recursive: true, force: true });
}
