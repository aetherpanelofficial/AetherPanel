import React, { useState } from 'react';
import {
  LayoutDashboard, Server, Plus, CreditCard, LifeBuoy, Settings, LogOut,
  ShieldCheck, Coins, Key, Activity, Zap, ExternalLink, User, Star, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useBranding } from '../lib/BrandingContext';
import { UserAvatar } from './ui/UserAvatar';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string, params?: any) => void;
  userServers?: any[];
  currentServerId?: string;
  onSelectServer?: (serverId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  userServers = [],
  currentServerId,
  onSelectServer
}) => {
  const { user, logout } = useAuth();
  const { brandName } = useBranding();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aether-sidebar-collapsed') === 'true');
  const toggleCollapsed = () => setCollapsed(current => {
    localStorage.setItem('aether-sidebar-collapsed', String(!current));
    return !current;
  });

  const isDashboardActive = currentPage === 'dashboard';
  const isServerActive = currentPage === 'servers' || currentPage === 'server-manage';
  const isAccountActive = currentPage === 'settings' || currentPage === 'api-keys';

  return (
    <aside
      id="aether-sidebar"
      data-collapsed={collapsed}
      className={`app-sidebar hidden lg:flex ${collapsed ? 'w-16' : 'w-64'} flex-none border-r border-[var(--color-line)] bg-[var(--color-bg)] flex-col h-full select-none z-20 transition-[width]`}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-end'} p-2 border-b border-[var(--color-line)]`}>
        <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className="sidebar-toggle">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      {/* Main Navigation Sections */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
        {/* SECTION: SERVERS */}
        <div className="space-y-1">
          <div className="sidebar-section-label px-3 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-1">
            SERVERS
          </div>

          <button
            onClick={() => onNavigate('dashboard')}
            title="Dashboard"
            aria-current={isDashboardActive ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
              isDashboardActive
                ? 'bg-[var(--color-surface-2)] text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className={`h-4 w-4 ${isDashboardActive ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('servers')}
            title="My servers"
            aria-current={isServerActive ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
              isServerActive
                ? 'bg-[var(--color-surface-2)] text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Server rack icon */}
              <div className="flex flex-col gap-0.5 text-[var(--color-accent)]">
                <div className="w-3.5 h-1.5 rounded-[2px] border border-[var(--color-accent)] flex items-center justify-end px-0.5">
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--color-accent)]" />
                </div>
                <div className="w-3.5 h-1.5 rounded-[2px] border border-[var(--color-accent)] flex items-center justify-end px-0.5">
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--color-accent)]" />
                </div>
              </div>
              <span>My servers</span>
            </div>
            {userServers.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-line)] text-neutral-300 font-mono">
                {userServers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('deploy')}
            title="Create server"
            aria-current={currentPage === 'deploy' ? 'page' : undefined}
            className={`w-full flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer group ${
              currentPage === 'deploy'
                ? 'bg-[var(--color-surface-2)] text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <Plus className="h-4 w-4 text-neutral-400 group-hover:text-white transition-colors" />
            <span>Create server</span>
          </button>
        </div>

        {/* SECTION: ACCOUNT */}
        <div className="space-y-1">
          <div className="sidebar-section-label px-3 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-1">
            ACCOUNT
          </div>

          <button
            onClick={() => onNavigate('settings')}
            title="Account"
            aria-current={isAccountActive ? 'page' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
              isAccountActive
                ? 'bg-[var(--color-surface-2)] text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <User className={`h-4 w-4 ${isAccountActive ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
            <span>Account</span>
          </button>

          <button
            onClick={() => onNavigate('billing')}
            title="Premium"
            aria-current={currentPage === 'billing' ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer group ${
              currentPage === 'billing'
                ? 'bg-[var(--color-surface-2)] text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="h-4 w-4 text-neutral-400 group-hover:text-amber-400 transition-colors" />
              <span>Premium</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('support')}
            title="Support"
            aria-current={currentPage === 'support' ? 'page' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
              currentPage === 'support'
                ? 'bg-[var(--color-surface-2)] text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <LifeBuoy className={`h-4 w-4 ${currentPage === 'support' ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
            <span>Support</span>
          </button>

          <button
            onClick={() => onNavigate('afk-rewards')}
            title="AFK Rewards"
            aria-current={currentPage === 'afk-rewards' ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
              currentPage === 'afk-rewards'
                ? 'bg-[var(--color-surface-2)] text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Coins className={`h-4 w-4 ${currentPage === 'afk-rewards' ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
              <span>AFK Rewards</span>
            </div>
            <span className="text-[9px] font-mono text-[var(--color-accent)] font-semibold bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded">
              FREE
            </span>
          </button>
        </div>

        {/* Promo Card: "Need more power?" (Matching Orihost screenshot image_ba8ad95e.png) */}
        <div className="sidebar-promo p-3.5 rounded-xl bg-[var(--color-surface-1)] border border-[var(--color-line)] space-y-1.5 relative overflow-hidden group">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Zap className="h-3.5 w-3.5 text-[var(--color-accent)] fill-[var(--color-accent)]" />
            <span>Need more power?</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Dedicated 24/7 plans on our premium nodes.
          </p>
          <button
            onClick={() => onNavigate('billing')}
            className="text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] flex items-center gap-1 transition-colors pt-1 cursor-pointer"
          >
            <span>View plans</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* User Profile Pill at Bottom (Opens Account Settings) */}
      <div className="p-3 border-t border-[var(--color-surface-2)] shrink-0 bg-[var(--color-bg)]">
        <div 
          onClick={() => onNavigate('settings')}
          className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] border border-[var(--color-line)] hover:border-[var(--color-accent)]/40 transition-colors cursor-pointer group"
          title="Account Settings"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <UserAvatar
              seed={user?.id || user?.username || user?.email}
              avatarUrl={user?.avatarUrl}
              name={user?.displayName || user?.username || 'User'}
              sizeClass="w-8 h-8"
              shape="rounded"
              className="group-hover:scale-105 transition-transform"
            />
            <div className="sidebar-profile-name truncate">
              <div className="text-xs font-bold text-white group-hover:text-[var(--color-accent)] transition-colors truncate leading-tight">
                {user?.displayName || user?.username || 'kravenog'}
              </div>
              <div className="text-[10px] text-neutral-400 truncate leading-none mt-0.5 font-mono">
                {user?.email || 'kravenog@gmail.com'}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            title="Sign Out"
            aria-label="Sign out"
            className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 rounded-lg hover:bg-neutral-800 ml-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
