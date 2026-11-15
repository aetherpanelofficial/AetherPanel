import fs from 'fs';
import path from 'path';

function isYamlMapping(line: string, indent: number, key?: string): boolean {
  const indentation = line.match(/^[ \t]*/)?.[0] || '';
  if (indentation.length !== indent || indentation.includes('\t')) return false;
  const mapping = line.slice(indent);
  return key
    ? new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`).test(mapping)
    : /^[A-Za-z0-9_-]+\s*:/.test(mapping);
}

function replaceBooleanValue(line: string, value: boolean): string {
  const match = line.match(/^([ \t]*[A-Za-z0-9_-]+\s*:\s*)([^#]*?)(\s+#.*)?$/);
  if (!match) return line;
  return `${match[1]}${value}${match[3] || ''}`;
}

function upsertSetting(lines: string[], start: number, end: number, key: string, value: boolean): boolean {
  const matches: number[] = [];
  for (let index = start; index < end; index++) {
    if (isYamlMapping(lines[index], 4, key)) matches.push(index);
  }
  if (matches.length > 0) {
    for (const index of matches) lines[index] = replaceBooleanValue(lines[index], value);
    return false;
  }
  lines.splice(end, 0, `    ${key}: ${value}`);
  return true;
}

export function writePaperVelocitySettings(
  configPath: string,
  onlineMode: boolean,
  velocityEnabled: boolean
): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  const original = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingNewline = original.endsWith('\n');
  const lines = original.length > 0 ? original.split(/\r?\n/) : [];
  if (hadTrailingNewline) lines.pop();

  let proxiesStart = lines.findIndex(line => isYamlMapping(line, 0, 'proxies'));
  if (proxiesStart === -1) {
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
    proxiesStart = lines.length;
    lines.push('proxies:', '  velocity:', `    enabled: ${velocityEnabled}`, `    online-mode: ${onlineMode}`);
  } else {
    let proxiesEnd = lines.length;
    for (let index = proxiesStart + 1; index < lines.length; index++) {
      if (lines[index].trim() && !lines[index].trimStart().startsWith('#') && isYamlMapping(lines[index], 0)) {
        proxiesEnd = index;
        break;
      }
    }

    let velocityStart = -1;
    for (let index = proxiesStart + 1; index < proxiesEnd; index++) {
      if (isYamlMapping(lines[index], 2, 'velocity')) {
        velocityStart = index;
        break;
      }
    }

    if (velocityStart === -1) {
      lines.splice(proxiesEnd, 0, '  velocity:', `    enabled: ${velocityEnabled}`, `    online-mode: ${onlineMode}`);
    } else {
      let velocityEnd = proxiesEnd;
      for (let index = velocityStart + 1; index < proxiesEnd; index++) {
        if (lines[index].trim() && !lines[index].trimStart().startsWith('#') && isYamlMapping(lines[index], 2)) {
          velocityEnd = index;
          break;
        }
      }
      if (upsertSetting(lines, velocityStart + 1, velocityEnd, 'enabled', velocityEnabled)) velocityEnd += 1;
      upsertSetting(lines, velocityStart + 1, velocityEnd, 'online-mode', onlineMode);
    }
  }

  fs.writeFileSync(configPath, `${lines.join(newline)}${hadTrailingNewline || original.length === 0 ? newline : ''}`, 'utf8');
}
