import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writePaperVelocitySettings } from '../server/minecraft/paperConfig';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aetherpanel-paper-config-'));
const existingPath = path.join(root, 'existing', 'paper-global.yml');
const missingPath = path.join(root, 'missing', 'paper-global.yml');

try {
  const original = [
    'verbose: true',
    'proxies:',
    '  bungee:',
    '    online-mode: true',
    '    enabled: false',
    '  velocity:',
    '    enabled: false # keep this comment',
    '    online-mode: true',
    '    secret: preserve-me',
    'other:',
    '  key: preserve-me',
    ''
  ].join('\n');
  fs.mkdirSync(path.dirname(existingPath), { recursive: true });
  fs.writeFileSync(existingPath, original, 'utf8');

  writePaperVelocitySettings(existingPath, false, false);
  let contents = fs.readFileSync(existingPath, 'utf8');
  assert.match(contents, /enabled: false # keep this comment/);
  assert.match(contents, /online-mode: false/);
  assert.match(contents, /secret: preserve-me/);
  assert.match(contents, /bungee:\n    online-mode: true\n    enabled: false/);
  assert.match(contents, /other:\n  key: preserve-me/);

  writePaperVelocitySettings(existingPath, false, true);
  contents = fs.readFileSync(existingPath, 'utf8');
  assert.match(contents, /velocity:\n    enabled: true # keep this comment\n    online-mode: false/);

  writePaperVelocitySettings(existingPath, true, false);
  contents = fs.readFileSync(existingPath, 'utf8');
  assert.match(contents, /velocity:\n    enabled: false # keep this comment\n    online-mode: true/);

  writePaperVelocitySettings(missingPath, false, false);
  assert.equal(
    fs.readFileSync(missingPath, 'utf8'),
    'proxies:\n  velocity:\n    enabled: false\n    online-mode: false\n'
  );

  console.log('Paper config preservation, two-way toggle, and missing-file verification passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
