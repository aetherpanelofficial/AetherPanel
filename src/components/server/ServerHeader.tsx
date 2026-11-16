import React, { useState, useRef, useEffect } from 'react';
import {
  Wifi, Check, Copy, RotateCw, Play, Square, Skull,
  Box, FileText, Terminal as TerminalIcon, ArrowLeft,
  ChevronDown, ExternalLink, Zap, Info, Shield, Database,
  Clock, Folder, Activity, Key, Sliders, Users, HardDrive,
  Package, Boxes, Globe, Crown, FolderInput, MessageSquare
} from 'lucide-react';
import { Server } from '../../types';
import { formatMemory } from '../../lib/serverNormalize';

interface ServerHeaderProps {
  server: Server;
  isMinecraft: boolean;
  isPython: boolean;
  fullIp: string;
  copied: boolean;
  onCopy: (text: string) => void;
  onNavigate: (page: string, params?: any) => void;
  isRunning: boolean;
  canStart: boolean;
  canRestart: boolean;
  canStop: boolean;
  canKill: boolean;
  powerLoadingAction: 'start' | 'stop' | 'restart' | 'kill' | null;
  onPowerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => void;
  activeTab?: string;
  onTabSelect?: (tab: string) => void;
  databasesCount?: number;
  schedulesCount?: number;
  backupsCount?: number;
}

export const ServerHeader: React.FC<ServerHeaderProps> = ({
  server,
  isMinecraft,
  isPython,
  fullIp,
  copied,
  onCopy,
  onNavigate,
  isRunning,
  canStart,
  canRestart,
  canStop,
  canKill,
  powerLoadingAction,
  onPowerAction,
  activeTab = 'console',
  onTabSelect,
  databasesCount = 0,
  schedulesCount = 0,
  backupsCount = 0
}) => {
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close More menu when clicking outside anywhere on document
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    if (moreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreDropdownOpen]);

  // Minecraft servers get Plugins, Mods, Players, Worlds, Properties outside in main tabs row!
  const mainTabs = isMinecraft
    ? [
        { id: 'console', label: 'Console', icon: TerminalIcon },
        { id: 'files', label: 'Files', icon: Folder },
        { id: 'plugins', label: 'Plugins', icon: Package },
        { id: 'mods', label: 'Mods', icon: Boxes },
        { id: 'players', label: 'Players', icon: Crown },
        { id: 'worlds', label: 'Worlds', icon: Globe },
        { id: 'properties', label: 'Properties', icon: FileText },
        { id: 'backups', label: 'Backups', icon: HardDrive, count: backupsCount },
        { id: 'startup', label: 'Startup', icon: Sliders },
        { id: 'databases', label: 'Databases', icon: Database, count: databasesCount },
        { id: 'schedules', label: 'Schedules', icon: Clock, count: schedulesCount },
        { id: 'subusers', label: 'Users', icon: Users },
        { id: 'activity', label: 'Activity', icon: Activity }
      ]
    : [
        { id: 'console', label: 'Console', icon: TerminalIcon },
        { id: 'files', label: 'Files', icon: Folder },
        { id: 'startup', label: 'Startup', icon: Sliders },
        { id: 'env', label: 'Environment', icon: Key },
        { id: 'backups', label: 'Backups', icon: HardDrive, count: backupsCount },
        { id: 'databases', label: 'Databases', icon: Database, count: databasesCount },
        { id: 'schedules', label: 'Schedules', icon: Clock, count: schedulesCount },
        { id: 'subusers', label: 'Users', icon: Users },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'settings', label: 'Settings', icon: Sliders }
      ];

  const moreTabs = isMinecraft
    ? [
        { id: 'network', label: 'Network & SFTP', icon: Wifi, desc: 'Allocations & SFTP access' },
        { id: 'monitoring', label: 'Monitoring', icon: Activity, desc: 'Live CPU & RAM telemetry' },
        { id: 'importer', label: 'Server Importer', icon: FolderInput, desc: 'Pterodactyl migration' },
        { id: 'settings', label: 'Server Settings', icon: Sliders, desc: 'Container variables & specs' }
      ]
    : [
        { id: 'network', label: 'Network & SFTP', icon: Wifi, desc: 'Allocations & SFTP access' },
        { id: 'monitoring', label: 'Monitoring', icon: Activity, desc: 'Live CPU & RAM telemetry' },
        { id: 'importer', label: 'Server Importer', icon: FolderInput, desc: 'Pterodactyl migration' },
        { id: 'discord', label: 'Discord Bot', icon: MessageSquare, desc: 'Webhooks & notifications' }
      ];

  const activeMoreTab = moreTabs.find((t) => t.id === activeTab);
  const isMoreTabActive = !!activeMoreTab;

  return (
    <div className="border-b border-[var(--color-surface-2)] bg-[var(--color-bg)] shrink-0">
      <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-4">
      {/* 1. Breadcrumb row (Orihost image_00688f85.png) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2 font-mono">
          <button
            type="button"
            onClick={() => onNavigate('servers')}
            className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            <span>Servers</span>
          </button>
          <span>/</span>
          <span className="text-white font-semibold truncate max-w-[200px] sm:max-w-xs">{server.name}</span>
          <span>/</span>
          <span className="text-[var(--color-accent)] font-semibold capitalize">{activeTab}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neutral-400 bg-[var(--color-surface-2)] px-2.5 py-0.5 rounded border border-[var(--color-line)]">
            Node: {server.location || 'DE-04'}
          </span>
          {server.isSubuser && (
            <span className="font-mono text-[10px] text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2.5 py-0.5 rounded border border-[var(--color-accent)]/30">
              Shared Access
            </span>
          )}
        </div>
      </div>

      {/* 2. Server Title, Specs & Power Buttons (Orihost image_00688f85.png) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Icon, Server Name & Real Specs */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-accent)] shadow-sm">
            {isMinecraft ? <Box className="h-5 w-5" /> : isPython ? <FileText className="h-5 w-5" /> : <TerminalIcon className="h-5 w-5" />}
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">
                {server.name}
              </h1>

              {/* Status Badge */}
              <span
                className="server-status inline-flex items-center gap-1.5"
                data-state={server.status}
                aria-label={`Server status: ${server.status}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${server.status === 'running' ? 'bg-[var(--color-ok)]' : server.status === 'starting' || server.status === 'stopping' ? 'bg-[var(--color-warn)]' : server.status === 'crashed' ? 'bg-[var(--color-err)]' : 'bg-[var(--color-ink-mute)]'}`} />
                <span className="tracking-wider font-mono">{server.status}</span>
              </span>

              {isMinecraft ? (
                <button
                  type="button"
                  onClick={() => onCopy(fullIp)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-mono text-[var(--color-ink)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                  title="Copy Minecraft join address"
                  aria-label={`Copy Minecraft join address ${fullIp}`}
                >
                  <span>{fullIp}</span>
                  {copied ? <Check className="h-3 w-3 text-[var(--color-ok)]" /> : <Copy className="h-3 w-3 text-[var(--color-ink-dim)]" />}
                </button>
              ) : server.primaryPort ? (
                <button
                  type="button"
                  onClick={() => onCopy(fullIp)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-mono text-[var(--color-ink)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                  title="Copy exposed application address"
                  aria-label={`Copy exposed application address ${fullIp}`}
                >
                  <span>Exposed: {fullIp}</span>
                  {copied ? <Check className="h-3 w-3 text-[var(--color-ok)]" /> : <Copy className="h-3 w-3 text-[var(--color-ink-dim)]" />}
                </button>
              ) : null}

              {/* Location Tag */}
              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                <span>/</span>
                <span>{server.location || 'DE-04'}</span>
              </span>
            </div>

            {/* Subtitle Specs */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400 font-mono">
              <span className="text-neutral-300 font-medium">
                {server.software} ({server.version || 'Latest'})
              </span>
              <span>·</span>
              <span>{formatMemory(server.resources?.memoryMb || server.limits?.ramMB || 512)} RAM</span>
              <span>·</span>
              <span>{server.limits?.cpuCores || 1} CPU</span>
              <span>·</span>
              <span>{server.limits?.diskGB || 10} GB Disk</span>
            </div>
          </div>
        </div>

        {/* Right: Power Controls */}
        <div className="flex items-center gap-2">
          {!isRunning && server.status !== 'starting' ? (
            <button
              type="button"
              disabled={powerLoadingAction !== null || !canStart}
              onClick={() => onPowerAction('start')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {powerLoadingAction === 'start' ? (
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>Start</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={powerLoadingAction !== null || !canRestart}
                onClick={() => onPowerAction('restart')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] hover:border-amber-500/50 text-amber-400 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {powerLoadingAction === 'restart' ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                <span>Restart</span>
              </button>

              <button
                type="button"
                disabled={powerLoadingAction !== null || !canStop}
                onClick={() => onPowerAction('stop')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] hover:border-red-500/50 text-red-400 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {powerLoadingAction === 'stop' ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5 fill-current" />
                )}
                <span>Stop</span>
              </button>

              {canKill && (
                <button
                  type="button"
                  disabled={powerLoadingAction !== null}
                  onClick={() => onPowerAction('kill')}
                  className="p-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] hover:bg-red-950/40 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Force Kill (SIGKILL)"
                  aria-label="Force kill server"
                >
                  <Skull className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Horizontal Sub-Navigation Tabs Row */}
      <div className="flex items-center justify-between border-t border-[var(--color-line)]/80 pt-2 relative overflow-visible gap-2">
        {/* Scrollable Main Tabs Row */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-2 py-0.5">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabSelect && onTabSelect(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-white bg-[var(--color-surface-2)] border-b-2 border-[var(--color-accent)]'
                    : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-line)] text-neutral-300">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* More Dropdown (Outside Scroll Container - Never Clipped, Anchored with Ref) */}
        <div ref={dropdownRef} className="shrink-0 relative">
          <button
            type="button"
            onClick={() => setMoreDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap border shadow-sm ${
              isMoreTabActive
                ? 'text-white bg-[var(--color-surface-2)] border-[var(--color-accent)]/50 shadow-orange-500/10'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)] border-transparent hover:border-[var(--color-line)]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{isMoreTabActive && activeMoreTab ? activeMoreTab.label : 'More'}</span>
              {isMoreTabActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              )}
            </div>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180 text-[var(--color-accent)]' : 'text-neutral-400'}`} />
          </button>

          {moreDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-line)] shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 z-[999] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold border-b border-[var(--color-line)]/80 mb-1">
                <span>Tools & Advanced</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              </div>

              <div className="space-y-1">
                {moreTabs.map((mt) => {
                  const Icon = mt.icon;
                  const isActive = activeTab === mt.id;
                  return (
                    <button
                      key={mt.id}
                      type="button"
                      onClick={() => {
                        if (onTabSelect) onTabSelect(mt.id);
                        setMoreDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-between group ${
                        isActive
                          ? 'bg-[var(--color-surface-2)] text-[var(--color-accent)] font-bold border border-[var(--color-accent)]/30 shadow-inner'
                          : 'text-neutral-300 hover:text-white hover:bg-[var(--color-surface-3)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                          isActive
                            ? 'bg-[var(--color-bg)] border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                            : 'bg-[var(--color-bg)] border-[var(--color-line)] text-neutral-400 group-hover:text-white group-hover:border-neutral-700'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="truncate font-semibold leading-tight">{mt.label}</div>
                          {mt.desc && (
                            <div className="text-[10px] text-neutral-500 truncate leading-tight mt-0.5">{mt.desc}</div>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] shadow-sm shadow-orange-500/50 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Top 2 Promo Banners on Every Server Tab (Orihost image_00688f85.png) */}
      <div className="space-y-2 pt-1">
      </div>
      </div>
    </div>
  );
};
