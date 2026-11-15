import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '0.0.0.0', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        return reject(new Error('Could not determine an available test port.'));
      }
      const port = address.port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForDaemon(child: ChildProcess, baseUrl: string, output: () => string): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Daemon exited early: ${output()}`);
    try {
      const response = await fetch(`${baseUrl}/api/ports/1/check`, {
        headers: { 'x-daemon-token': 'port-probe-test-secret' },
        signal: AbortSignal.timeout(1000)
      });
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Daemon did not become ready: ${output()}`);
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aetherpanel-daemon-probe-'));
  const daemonPath = path.join(tempRoot, 'agent.js');
  fs.copyFileSync(path.join(process.cwd(), 'daemon', 'agent.js'), daemonPath);
  const axiosStub = path.join(tempRoot, 'node_modules', 'axios');
  fs.mkdirSync(axiosStub, { recursive: true });
  fs.writeFileSync(
    path.join(axiosStub, 'index.js'),
    'module.exports = { get: async () => { throw new Error("Network fetch not used by port probe test"); } };',
    'utf8'
  );
  const daemonPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${daemonPort}`;
  let outputText = '';
  const child = spawn(process.execPath, [daemonPath], {
    cwd: tempRoot,
    env: {
      ...process.env,
      DAEMON_PORT: String(daemonPort),
      BIND_HOST: '127.0.0.1',
      NODE_TOKEN: 'port-probe-test-secret',
      NODE_PATH: path.join(process.cwd(), 'node_modules'),
      PANEL_URL: 'http://127.0.0.1:1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout?.on('data', chunk => { outputText += chunk.toString(); });
  child.stderr?.on('data', chunk => { outputText += chunk.toString(); });

  try {
    await waitForDaemon(child, baseUrl, () => outputText);
    const availablePort = await getFreePort();
    const availableResponse = await fetch(`${baseUrl}/api/ports/${availablePort}/check`, {
      headers: { 'x-daemon-token': 'port-probe-test-secret' }
    });
    assert.equal(availableResponse.status, 200);
    assert.equal((await availableResponse.json()).available, true);

    const boundServer = net.createServer();
    await new Promise<void>((resolve, reject) => {
      boundServer.once('error', reject);
      boundServer.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = boundServer.address();
      assert.ok(address && typeof address !== 'string');
      const occupiedResponse = await fetch(`${baseUrl}/api/ports/${address.port}/check`, {
        headers: { 'x-daemon-token': 'port-probe-test-secret' }
      });
      assert.equal(occupiedResponse.status, 200);
      assert.equal((await occupiedResponse.json()).available, false);
    } finally {
      await new Promise<void>((resolve, reject) => boundServer.close(error => error ? reject(error) : resolve()));
    }

    const unauthorizedResponse = await fetch(`${baseUrl}/api/ports/${availablePort}/check`);
    assert.equal(unauthorizedResponse.status, 401);
    console.log('Daemon live port probe verification passed.');
  } finally {
    if (child.exitCode === null) child.kill();
    await new Promise<void>(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      setTimeout(resolve, 3000);
    });
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
