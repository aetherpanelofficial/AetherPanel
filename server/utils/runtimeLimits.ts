export interface BotLaunchCommand {
  executable: string;
  args: string[];
  memoryEnforcement: 'runtime-heap' | 'address-space' | 'unavailable';
}

export function withBotMemoryLimit(
  runtime: 'nodejs' | 'python' | 'bun',
  executable: string,
  args: string[],
  memoryMB: number,
  platform: NodeJS.Platform = process.platform
): BotLaunchCommand {
  const safeMemoryMB = Number.isFinite(memoryMB) ? Math.max(128, Math.floor(memoryMB)) : 1024;
  if (runtime === 'nodejs') {
    return { executable, args, memoryEnforcement: 'runtime-heap' };
  }
  if (platform === 'win32') {
    return { executable, args, memoryEnforcement: 'unavailable' };
  }

  return {
    executable: '/bin/sh',
    args: [
      '-c',
      'ulimit -v "$1" || { echo "AetherPanel could not apply the bot memory limit." >&2; exit 125; }; shift; exec "$@"',
      'aetherpanel-memory-limit',
      String(safeMemoryMB * 1024),
      executable,
      ...args
    ],
    memoryEnforcement: 'address-space'
  };
}
