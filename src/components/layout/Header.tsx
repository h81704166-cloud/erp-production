import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, RefreshCw, Building, Menu, Wifi, WifiOff, LogOut, UserCheck, KeyRound } from 'lucide-react';
import { User, UserRole, Company } from '../../types/erp';
import { ThemeSwitcher } from './ThemeSwitcher';
import { CashierPinSwitchModal } from '../common/CashierPinSwitchModal';

interface HeaderProps {
  currentUser?: User;
  onSwitchUser?: (user: User) => void;
  allUsers?: User[];
  company?: Company;
  themeMode: 'day' | 'night';
  onToggleTheme: () => void;
  onOpenQuickSearch: () => void;
  isSyncing: boolean;
  pendingSyncCount?: number;
  onSyncNow: () => void;
  onToggleMobileSidebar?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  allUsers = [],
  company,
  themeMode,
  onToggleTheme,
  onOpenQuickSearch,
  isSyncing,
  pendingSyncCount = 0,
  onSyncNow,
  onToggleMobileSidebar,
  onLogout,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isCashierModalOpen, setIsCashierModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const roleBadges: Record<UserRole, { label: string; variant: any }> = {
    super_admin: { label: 'SUPER ADMIN', variant: 'rose' },
    admin: { label: 'SYSTEM ADMIN', variant: 'rose' },
    owner: { label: 'OWNER', variant: 'emerald' },
    manager: { label: 'MANAGER', variant: 'amber' },
    accountant: { label: 'ACCOUNTANT / CA', variant: 'purple' },
    cashier: { label: 'CASHIER', variant: 'cyan' },
    stock_keeper: { label: 'STOCK KEEPER', variant: 'indigo' },
  };

  const activeUser = currentUser || allUsers[0] || {
    id: 'usr-001',
    name: 'Sitaram Ghintala (Owner)',
    email: 'owner@apex.com',
    role: 'owner' as UserRole,
    companyId: 'comp-001',
    phone: '+91 98765 43210',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const comp: Company = company || {
    id: 'comp-001',
    name: 'Apex Enterprise Ltd',
    legalName: 'Apex Enterprise Ltd',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    email: 'info@apex.com',
    phone: '+91 98765 43210',
    address: '101 Trade Tower, Nariman Point',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400021',
    currency: 'INR',
    financialYearStart: '2026-04-01',
  };

  return (
    <header className="h-16 liquid-glass border-b border-white/20 dark:border-emerald-500/20 px-2.5 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl shadow-lg w-full max-w-full min-w-0 overflow-hidden">
      {/* Left: Mobile Menu, Company & Search */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-emerald-400 hover:bg-white transition-colors cursor-pointer border border-slate-200/50 dark:border-emerald-900/40 shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20 border border-emerald-400/40 shrink-0">
            <Building className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none truncate max-w-[120px] md:max-w-none">
              {comp.name}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-emerald-400 font-bold mt-0.5 truncate">
              GSTIN: {comp.gstin}
            </p>
          </div>
        </div>

        {/* Quick Search Bar Trigger & Shortcut Badges */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenQuickSearch}
            className="flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-3.5 py-1.5 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 border border-white/60 dark:border-emerald-500/30 rounded-2xl text-xs text-slate-700 dark:text-slate-200 font-medium transition-all shadow-sm backdrop-blur-md cursor-pointer shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden md:inline">Quick Search items, sales...</span>
            <span className="md:hidden text-[11px] font-semibold">Search</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-emerald-900/40 rounded-lg text-slate-600 dark:text-emerald-400 shadow-2xs">
              Ctrl+K
            </kbd>
          </button>

          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-emerald-600 dark:text-emerald-400">Ctrl+S</kbd> Save
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-indigo-600 dark:text-indigo-400">Ctrl+P</kbd> Print
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions, Sync, Network Status, Role Switcher & Theme */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Connection Status Indicator */}
        {!isOnline ? (
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold shadow-2xs shrink-0"
            title="Application is currently offline"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="hidden sm:inline text-[11px]">Offline</span>
          </div>
        ) : isSyncing || pendingSyncCount > 0 ? (
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold shadow-2xs shrink-0"
            title="Syncing pending offline data with cloud server"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
            <span className="text-[11px] font-extrabold whitespace-nowrap">
              <span className="hidden md:inline">Syncing </span>({pendingSyncCount})
            </span>
          </div>
        ) : (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold shadow-2xs shrink-0"
            title="Connected and fully synchronized"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden md:inline">Online</span>
          </div>
        )}

        {/* POS PIN Cashier Switch Button */}
        {onSwitchUser && (
          <button
            onClick={() => setIsCashierModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-extrabold text-xs transition-all border border-cyan-500/30 shadow-2xs cursor-pointer shrink-0"
            title="POS PIN द्वारा इस दुकान का कैशियर बदलें"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span className="hidden sm:inline text-[11px] font-black">
              👤 {activeUser.name.split(' ')[0]} <span className="opacity-70 text-[10px]">[{activeUser.role.toUpperCase()}]</span>
            </span>
            <span className="text-[10px] bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md ml-0.5">
              POS PIN
            </span>
          </button>
        )}

        {/* Sync Now Button */}
        <button
          onClick={onSyncNow}
          disabled={isSyncing || !isOnline}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
          title="Trigger background sync worker"
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden lg:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Dynamic Multi-Theme Switcher Dropdown */}
        <ThemeSwitcher />

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-emerald-300 font-bold text-xs transition-all border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer shrink-0"
          title={themeMode === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
        >
          {themeMode === 'day' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden xl:inline text-[11px]">Night</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden xl:inline text-[11px]">Day</span>
            </>
          )}
        </button>

        {/* Logout / Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 font-extrabold text-xs transition-all border border-rose-300 dark:border-rose-800 shadow-2xs cursor-pointer shrink-0"
            title="Safely sync data & Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="hidden md:inline text-[11px]">Logout</span>
          </button>
        )}
      </div>

      {/* POS PIN Cashier Switcher Modal */}
      {onSwitchUser && (
        <CashierPinSwitchModal
          isOpen={isCashierModalOpen}
          onClose={() => setIsCashierModalOpen(false)}
          currentUser={activeUser}
          company={comp}
          allUsers={allUsers}
          onSwitchUser={(u) => {
            onSwitchUser(u);
            setIsCashierModalOpen(false);
          }}
        />
      )}
    </header>
  );
};

