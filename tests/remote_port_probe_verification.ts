import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import net from 'node:net';
import { WingsClient } from '../server/services/wings';
import { Node } from '../src/types';
import {
  canBindPortLocally,
  claimAllocationPort,
  releaseAllocationPortClaim
} from '../server/network/endpointResolver';

async function main() {
  let responseStatus = 200;
  const checkedAt = new Date().toISOString();
  let authHeader = '';
  const server = createServer((req, res) => {
    authHeader = String(req.headers['x-daemon-token'] || '');
    res.writeHead(responseStatus, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseStatus === 200 ? { available: true, checkedAt } : { error: 'unsupported' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const node: Node = {
      id: 'remote-test',
      name: 'Remote test',
      hostname: '127.0.0.1',
      apiPort: port,
      apiUrl: `http://127.0.0.1:${port}`,
      ssl: false,
      token: 'test-secret',
      isLocal: false,
      behindProxy: false,
      maintenanceMode: false,
      memory: 1024,
      disk: 10,
      cpu: 100,
      maxServers: 1,
      memoryOverallocate: 0,
      diskOverallocate: 0,
      tags: [],
      lastHeartbeatAt: null,
      createdAt: checkedAt
    };

    const checked = await WingsClient.checkPort(node, 25565);
    assert.equal(checked.supported, true);
    assert.equal(checked.available, true);
    assert.equal(checked.checkedAt, checkedAt);
    assert.equal(authHeader, 'test-secret');

    responseStatus = 404;
    const unsupported = await WingsClient.checkPort(node, 25565);
    assert.equal(unsupported.supported, false);

    assert.equal(claimAllocationPort('node-a', 25565), true);
    assert.equal(claimAllocationPort('node-a', 25565), false);
    assert.equal(claimAllocationPort('node-b', 25565), true);
    releaseAllocationPortClaim('node-a', 25565);
    releaseAllocationPortClaim('node-b', 25565);

    const occupiedServer = net.createServer();
    await new Promise<void>((resolve, reject) => {
      occupiedServer.once('error', reject);
      occupiedServer.listen(0, '127.0.0.1', resolve);
    });
    try {
      const occupiedAddress = occupiedServer.address();
      assert.ok(occupiedAddress && typeof occupiedAddress !== 'string');
      assert.equal(await canBindPortLocally(occupiedAddress.port), false);
    } finally {
      await new Promise<void>((resolve, reject) => {
        occupiedServer.close(error => error ? reject(error) : resolve());
      });
    }

    console.log('Remote port probe verification passed.');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
