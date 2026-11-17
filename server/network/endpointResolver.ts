import net from 'net';
import dgram from 'dgram';
import os from 'os';
import { Node, Server, SftpConnectionInfo } from '../../src/types';

/**
 * System-reserved infrastructure ports that user game/bot server allocations must NEVER claim.
 */
export const RESERVED_SYSTEM_PORTS = new Set<number>([
  22,   // SSH
  80,   // HTTP / Let's Encrypt ACME Challenge
  443,  // HTTPS Primary Web Panel
  2022, // SFTP Dedicated Daemon
  3000, // Node.js Application Ingress / Vite Web App
  8080, // Node HTTP / Internal API Channel
  8443, // Secure Node Daemon HTTPS Gateway
  9666  // Node Agent API
]);

export function isPortReserved(port: number): boolean {
  if (RESERVED_SYSTEM_PORTS.has(port)) return true;
  return ['PORT', 'SFTP_PORT', 'NODE_API_PORT', 'DAEMON_PORT'].some((key) => {
    const configured = Number(process.env[key]);
    return Number.isInteger(configured) && configured > 0 && configured === port;
  });
}

export function canBindPortLocally(port: number): Promise<boolean> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return Promise.resolve(false);

  return checkPortBindings(port);
}

function getPortProbeHosts(): string[] {
  const interfaces = Object.values(os.networkInterfaces());
  const hasIpv6 = interfaces.some(addresses => (addresses || []).some(address => net.isIP(address.address) === 6));
  const hosts = new Set(['0.0.0.0', '127.0.0.1']);
  if (hasIpv6) {
    hosts.add('::');
    hosts.add('::1');
  }
  for (const addresses of interfaces) {
    for (const address of addresses || []) {
      if (address.address && !address.address.includes('%')) hosts.add(address.address);
    }
  }
  return [...hosts];
}

async function canBindTcp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({ host, port, exclusive: true }, () => {
      server.close(error => resolve(!error));
    });
  });
}

async function canBindUdp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket(net.isIP(host) === 6 ? 'udp6' : 'udp4');
    let completed = false;
    socket.once('error', () => {
      if (completed) return;
      completed = true;
      try { socket.close(); } catch {}
      resolve(false);
    });
    socket.bind({ address: host, port, exclusive: true }, () => {
      if (completed) return;
      completed = true;
      socket.close(() => resolve(true));
    });
  });
}

async function checkPortBindings(port: number): Promise<boolean> {
  const hosts = getPortProbeHosts();
  for (const host of hosts) {
    if (!(await canBindTcp(host, port))) return false;
  }
  for (const host of hosts) {
    if (!(await canBindUdp(host, port))) return false;
  }
  return true;
}

export const NO_EXTERNAL_ENDPOINT = 'NO_EXTERNAL_ENDPOINT';
const pendingPortClaims = new Set<string>();

export function claimAllocationPort(nodeId: string, port: number): boolean {
  const key = `${nodeId}:${port}`;
  if (pendingPortClaims.has(key)) return false;
  pendingPortClaims.add(key);
  return true;
}

export function releaseAllocationPortClaim(nodeId: string, port: number): void {
  pendingPortClaims.delete(`${nodeId}:${port}`);
}

export function isInternalAddress(addr?: string | null): boolean {
  if (!addr) return true;
  const trimmed = addr.trim().toLowerCase();
  return trimmed === '127.0.0.1' || trimmed === 'localhost' || trimmed === '0.0.0.0' || trimmed === '::1';
}

export function isValidFQDN(fqdn?: string | null): boolean {
  if (!fqdn) return false;
  const trimmed = fqdn.trim();
  if (trimmed.length < 3 || trimmed.length > 253) return false;
  if (trimmed === 'localhost' || trimmed.endsWith('.local') || trimmed === 'local-vps') return false;
  if (net.isIP(trimmed) !== 0) return false;
  const fqdnRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
  return fqdnRegex.test(trimmed);
}

export function isValidIPv4(ip?: string | null): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  return net.isIPv4(trimmed) && trimmed !== '0.0.0.0';
}

export function isValidIPv6(ip?: string | null): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  return net.isIPv6(trimmed);
}

export interface PublicEndpointResult {
  endpoint: string;
  source: 'fqdn' | 'hostname' | 'public_ipv4' | 'public_ipv6' | 'node_ip';
  port: number;
  isExternallyReachable: boolean;
  rawHost: string;
}

interface NodePublicEndpointResult {
  host: string;
  source: 'fqdn' | 'public_ipv4' | 'node_ip';
  isExternallyReachable: boolean;
}

const publicEndpointCache = new Map<string, PublicEndpointResult>();
const nodeEndpointCache = new Map<string, NodePublicEndpointResult>();
const ENDPOINT_CACHE_LIMIT = 512;

function getCachedEndpoint<T extends object>(cache: Map<string, T>, key: string): T | undefined {
  const cached = cache.get(key);
  if (!cached) return undefined;
  cache.delete(key);
  cache.set(key, cached);
  return { ...cached };
}

function cacheEndpoint<T extends object>(cache: Map<string, T>, key: string, value: T): T {
  if (!cache.has(key) && cache.size >= ENDPOINT_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { ...value });
  return { ...value };
}

/**
 * Resolves the external connection address for a server (Pterodactyl style):
 * Priority: configured FQDN > local OS hostname > Node Public IPv4 > Node IP > Server Primary IP.
 */
export function resolveServerPublicEndpoint(
  server: Partial<Server>,
  node?: Partial<Node> | null
): PublicEndpointResult {
  const port = (server as any).port || server.primaryPort || 25565;
  const cacheKey = JSON.stringify([
    port,
    node?.isLocal,
    node?.fqdn,
    node?.publicIpv4,
    node?.ip,
    node?.hostname,
    server.primaryIp
  ]);
  const cachedEndpoint = getCachedEndpoint(publicEndpointCache, cacheKey);
  if (cachedEndpoint) return cachedEndpoint;
  const cache = (result: PublicEndpointResult) => cacheEndpoint(publicEndpointCache, cacheKey, result);

  // 1. Node explicit FQDN (Highest priority: DNS domain configured for player connections)
  const nodeFqdn = (node?.fqdn || '').trim();
  if (isValidFQDN(nodeFqdn)) {
    return cache({
      endpoint: `${nodeFqdn}:${port}`,
      rawHost: nodeFqdn,
      source: 'fqdn',
      port,
      isExternallyReachable: true
    });
  }

  const nodeHostname = (node?.hostname || '').trim();
  const isLocalNode = node?.isLocal === true || node?.isLocalNode === true;
  const hostnameFallback = isLocalNode ? os.hostname().trim() : '';
  if (hostnameFallback) {
    return cache({
      endpoint: `${hostnameFallback}:${port}`,
      rawHost: hostnameFallback,
      source: 'hostname',
      port,
      isExternallyReachable: false
    });
  }

  // 2. Node Public IPv4
  if (node?.publicIpv4 && node.publicIpv4.trim()) {
    const rawHost = node.publicIpv4.trim();
    return cache({
      endpoint: `${rawHost}:${port}`,
      rawHost,
      source: 'public_ipv4',
      port,
      isExternallyReachable: true
    });
  }

  // 3. Node IP, then server IP, if no explicit public endpoint exists.
  const nodeIp = node?.ip?.trim() || (net.isIP(nodeHostname) ? nodeHostname : '');
  if (nodeIp && nodeIp !== '127.0.0.1' && nodeIp !== '0.0.0.0' && nodeIp !== '::1') {
    return cache({
      endpoint: `${nodeIp}:${port}`,
      rawHost: nodeIp,
      source: 'node_ip',
      port,
      isExternallyReachable: true
    });
  }

  const serverIp = (server.primaryIp || '').trim();
  if (serverIp && net.isIP(serverIp) && serverIp !== '127.0.0.1' && serverIp !== '0.0.0.0' && serverIp !== '::1') {
    return cache({
      endpoint: `${serverIp}:${port}`,
      rawHost: serverIp,
      source: 'node_ip',
      port,
      isExternallyReachable: true
    });
  }

  const fallbackHost = nodeIp && !isInternalAddress(nodeIp) ? nodeIp : serverIp || nodeIp || '127.0.0.1';
  return cache({
    endpoint: `${fallbackHost}:${port}`,
    rawHost: fallbackHost,
    source: 'node_ip',
    port,
    isExternallyReachable: !isInternalAddress(fallbackHost)
  });
}

/**
 * Resolves the host endpoint for a compute Node.
 */
export function resolveNodePublicEndpoint(
  node: Partial<Node>
): NodePublicEndpointResult {
  const cacheKey = JSON.stringify([node.fqdn, node.publicIpv4, node.ip, node.hostname]);
  const cachedEndpoint = getCachedEndpoint(nodeEndpointCache, cacheKey);
  if (cachedEndpoint) return cachedEndpoint;
  const cache = (result: NodePublicEndpointResult) => cacheEndpoint(nodeEndpointCache, cacheKey, result);

  if (node.fqdn && node.fqdn.trim()) {
    return cache({ host: node.fqdn.trim(), source: 'fqdn', isExternallyReachable: true });
  }

  if (node.publicIpv4 && node.publicIpv4.trim()) {
    return cache({ host: node.publicIpv4.trim(), source: 'public_ipv4', isExternallyReachable: true });
  }

  const hostnameIp = node.hostname && net.isIP(node.hostname.trim()) ? node.hostname.trim() : '';
  const host = node.ip?.trim() || hostnameIp || '127.0.0.1';
  return cache({
    host,
    source: 'node_ip',
    isExternallyReachable: !isInternalAddress(host)
  });
}
