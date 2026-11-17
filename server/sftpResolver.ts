import os from 'os';
import { Node, Server, SftpConnectionInfo } from '../src/types';
import { getDb } from './db';
import { checkPortReachable } from './network/networkDetection';
import { isValidFQDN } from './network/endpointResolver';

export interface SftpResolutionDetails {
  mode: 'DIRECT' | 'direct';
  status: 'online' | 'offline';
  host: string;
  port: number;
  source: 'fqdn' | 'hostname' | 'public_ipv4' | 'node_ip' | 'host_header';
  reachable: boolean;
}

function resolveSftpHost(node?: Partial<Node> | null, hostHeader?: string): { host: string; source: SftpResolutionDetails['source'] } {
  const fqdn = node?.fqdn?.trim();
  if (isValidFQDN(fqdn)) return { host: fqdn, source: 'fqdn' };
  if (node?.isLocal || node?.isLocalNode) return { host: os.hostname(), source: 'hostname' };
  if (node?.publicIpv4?.trim()) return { host: node.publicIpv4.trim(), source: 'public_ipv4' };
  if (hostHeader && hostHeader !== 'localhost') return { host: hostHeader, source: 'host_header' };
  const nodeIp = node?.ip?.trim() || node?.hostname?.trim();
  return { host: nodeIp || '127.0.0.1', source: 'node_ip' };
}

/**
 * Performs verification of node network & sftp availability.
 */
export async function resolveNodeSftpMode(nodeId: string): Promise<SftpResolutionDetails> {
  const db = await getDb();
  const node = db.nodes.find(n => n.id === nodeId || ((nodeId === 'local' || nodeId === 'node_local') && (n.isLocal || n.id === 'local' || n.id === 'node_local')));
  
  const sftpPort = node?.sftpPort || 2022;
  const sftpDaemonOnline = await checkPortReachable('127.0.0.1', sftpPort, 1000);

  const { host, source } = resolveSftpHost(node);

  return {
    mode: 'DIRECT',
    status: sftpDaemonOnline ? 'online' : 'offline',
    host,
    port: sftpPort,
    source,
    reachable: sftpDaemonOnline
  };
}

/**
 * Resolves the SFTP endpoint for any server using standard Pterodactyl node conventions.
 * Uses a valid node FQDN or its local hostname fallback, the SFTP port, and user.serverId credentials.
 */
export async function resolveServerSftpInfo(
  serverId: string,
  clientHostHeader?: string,
  userId?: string
): Promise<SftpConnectionInfo> {
  const db = await getDb();
  const server = db.servers.find(s => s.id === serverId);
  const node = server ? db.nodes.find(n => n.id === server.nodeId) : db.nodes[0];

  // Resolve user to format username as user.serverId (Pterodactyl style)
  const user = userId 
    ? db.users.find(u => u.id === userId)
    : server 
      ? db.users.find(u => u.id === server.userId) || db.users[0]
      : db.users[0];

  const usernamePrefix = user?.username || user?.email?.split('@')[0] || 'admin';
  const serverShortId = server ? server.id.replace('srv_', '').slice(0, 8) : 'default';
  const sftpUsername = `${usernamePrefix}.${serverShortId}`;

  const cleanHeader = clientHostHeader ? clientHostHeader.split(':')[0].trim() : '';

  const { host } = resolveSftpHost(node, cleanHeader);
  let port = node?.sftpPort || 2022;

  const uri = `sftp://${sftpUsername}@${host}:${port}`;

  return {
    host,
    port,
    username: sftpUsername,
    password: (server as any)?.sftpPassword || 'Account Password',
    uri,
    isProtected: true,
    tunnelType: 'direct',
    nodeName: node?.name || 'Primary Node'
  };
}
