import assert from 'node:assert/strict';
import { buildBotStartupCommand } from '../src/lib/startup';
import { withBotMemoryLimit } from '../server/utils/runtimeLimits';

const customNodeCommand = buildBotStartupCommand(
  {
    software: 'Node.js',
    limits: { ramMB: 768, cpuCores: 1, diskGB: 5, backups: 0, databases: 0 }
  },
  { botRuntime: 'nodejs', customCommand: 'node --max-old-space-size=4096 index.js' }
);
assert.deepEqual(customNodeCommand.args, ['--max-old-space-size=768', 'index.js']);

const linuxPythonLaunch = withBotMemoryLimit('python', 'python3', ['-u', 'main.py'], 512, 'linux');
assert.equal(linuxPythonLaunch.executable, '/bin/sh');
assert.equal(linuxPythonLaunch.memoryEnforcement, 'address-space');
assert.ok(linuxPythonLaunch.args.includes('524288'));
assert.ok(linuxPythonLaunch.args.includes('python3'));

const windowsPythonLaunch = withBotMemoryLimit('python', 'python', ['-u', 'main.py'], 512, 'win32');
assert.equal(windowsPythonLaunch.executable, 'python');
assert.equal(windowsPythonLaunch.memoryEnforcement, 'unavailable');

console.log('Runtime memory limit verification passed.');
