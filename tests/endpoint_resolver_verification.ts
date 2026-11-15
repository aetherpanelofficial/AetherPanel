import assert from 'node:assert/strict';
import { resolveNodePublicEndpoint, resolveServerPublicEndpoint } from '../server/network/endpointResolver';
import { Node, Server } from '../src/types';

const server: Partial<Server> = { primaryPort: 25565 };
const node: Partial<Node> = {
  fqdn: '',
  hostname: 'node.example.test',
  ip: '203.0.113.8'
};

assert.equal(resolveNodePublicEndpoint(node).host, '203.0.113.8');
assert.equal(resolveServerPublicEndpoint(server, node).endpoint, '203.0.113.8:25565');

node.ip = '203.0.113.9';
assert.equal(resolveNodePublicEndpoint(node).host, '203.0.113.9');
assert.equal(resolveServerPublicEndpoint(server, node).endpoint, '203.0.113.9:25565');

node.fqdn = 'play.example.test';
assert.equal(resolveNodePublicEndpoint(node).host, 'play.example.test');
assert.equal(resolveServerPublicEndpoint(server, node).endpoint, 'play.example.test:25565');

console.log('Endpoint resolver cache and fallback verification passed.');
