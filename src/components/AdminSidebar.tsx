import React, { useState } from 'react';
import {
  Sliders, Users, Server, HardDrive, Package, Layers, Activity,
  ShieldAlert, Archive, ShoppingBag, Tag, Megaphone, Sparkles,
  Coins, MessageSquare, Palette, LifeBuoy, FileText, FolderInput,
  Key, Scale, ArrowLeft, LogOut, UserPlus, PlusCircle, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { UserAvatar } from './ui/UserAvatar';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aether-admin-sidebar-collapsed') === 'true');
  const toggleCollapsed = () => setCollapsed(current => {
    localStorage.setItem('aether-admin-sidebar-collapsed', String(!current));
    return !current;
  });

  const adminCoreItems = [
    { page: 'admin-dashboard', label: 'Overview', icon: Sliders },
    { page: 'admin-users', label: 'Users', icon: Users },
    { page: 'admin-servers', label: 'Servers', icon: Server },
    { page: 'admin-settings', label: 'Panel Settings', icon: Sliders },
  ];
  const nodeItems = [{ page: 'admin-nodes', label: 'Nodes', icon: HardDrive }];

  const secondaryItems = [
    { page: 'admin-products', label: 'Products & Plans', icon: Package },
    { page: 'admin-server-types', label: 'Server Types', icon: Layers },
    { page: 'admin-monitoring', label: 'Monitoring', icon: Activity },
    { page: 'admin-diagnostics', label: 'Diagnostics', icon: ShieldAlert },
    { page: 'admin-backups', label: 'Backups', icon: Archive },
    { page: 'admin-billing', label: 'Billing', icon: ShoppingBag },
    { page: 'admin-coupons', label: 'Coupons', icon: Tag },
    { page: 'admin-announcements', label: 'Announcements', icon: Megaphone },
    { page: 'admin-ads', label: 'Ad Campaigns', icon: Sparkles },
    { page: 'admin-rewards', label: 'AFK Rewards', icon: Coins },
    { page: 'admin-discord', label: 'Discord Bot', icon: MessageSquare },
    { page: 'admin-panel-customization', label: 'Panel Customization', icon: Palette },
    { page: 'admin-support', label: 'Support Queue', icon: LifeBuoy },
    { page: 'admin-audit-logs', label: 'Audit Trail', icon: FileText },
    { page: 'admin-importer', label: 'Importer', icon: FolderInput },
    { page: 'admin-api-keys', label: 'REST API Keys', icon: Key },
    { page: 'admin-legal', label: 'Legal Pages', icon: Scale },
  ];

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
      {/* Navigation Sections */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
        {/* ADMINISTRATION */}
        <div>
          <div className="sidebar-section-label text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
            Administration
          </div>
          <div className="space-y-0.5">
            {adminCoreItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-surface-2)] text-white font-semibold border-l-2 border-[var(--color-accent)] shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="sidebar-section-label text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
            Nodes
          </div>
          <div className="space-y-0.5">
            {nodeItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive ? 'bg-[var(--color-surface-2)] text-[var(--color-ink)] font-semibold border-l-2 border-[var(--color-accent)]' : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div>
          <div className="sidebar-section-label text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
            Quick Actions
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('admin-users')}
              title="New User"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[var(--color-surface-2)] transition-colors text-left cursor-pointer"
            >
              <UserPlus className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
              <span>New User</span>
            </button>
            <button
              onClick={() => onNavigate('admin-servers')}
              title="New Server"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[var(--color-surface-2)] transition-colors text-left cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
              <span>New Server</span>
            </button>
          </div>
        </div>

        {/* MORE MODULES */}
        <div>
          <div className="sidebar-section-label text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
            System Modules
          </div>
          <div className="space-y-0.5">
            {secondaryItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-surface-2)] text-white border-l-2 border-[var(--color-accent)]'
                      : 'text-neutral-400 hover:text-white hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[var(--color-accent)]' : 'text-neutral-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* NAVIGATION */}
        <div>
          <div className="sidebar-section-label text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
            Navigation
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            title="Back to Panel"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[var(--color-surface-2)] transition-colors text-left cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>Back to Panel</span>
          </button>
        </div>
      </div>

      {/* Admin Profile Footer */}
      <div className="p-3 border-t border-[var(--color-surface-2)] bg-[var(--color-bg)] shrink-0">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              seed={user?.id || user?.username || user?.email}
              avatarUrl={user?.avatarUrl}
              name={user?.username || user?.displayName || 'admin'}
              sizeClass="w-8 h-8"
              shape="rounded"
            />
            <div className={`min-w-0 ${collapsed ? 'hidden' : ''}`}>
              <div className="text-xs font-bold text-white truncate">
                {user?.username || user?.displayName || 'admin'}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono capitalize truncate">
                {user?.role || 'Administrator'}
              </div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer rounded hover:bg-[var(--color-surface-3)]"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
