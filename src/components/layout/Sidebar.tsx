import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  ShoppingBag,
  Package,
  ArrowLeftRight,
  Users,
  Truck,
  BookOpen,
  Wallet,
  Receipt,
  FileText,
  BarChart3,
  UserCog,
  ShieldAlert,
  Settings,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  Sun,
  Moon,
  Terminal,
  LogOut,
  Scissors,
  Presentation,
  Server,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
} from 'lucide-react';
import { UserRole } from '../../types/erp';

export type ActiveModule =
  | 'admin_panel'
  | 'dashboard'
  | 'pos'
  | 'services'
  | 'sales'
  | 'sales_orders'
  | 'purchase'
  | 'purchase_orders'
  | 'inventory'
  | 'stock_transfer'
  | 'customers'
  | 'udhar_recovery'
  | 'vendors'
  | 'accounts'
  | 'master_ledger'
  | 'expenses'
  | 'gst'
  | 'reports'
  | 'gsheets'
  | 'users'
  | 'audit'
  | 'settings'
  | 'architecture'
  | 'sales_pitch';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  userRole?: UserRole;
  lowStockCount?: number;
  pendingDueCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  themeMode?: 'day' | 'night';
  onToggleTheme?: () => void;
  onLogout?: () => void;
}

interface NavItem {
  id: ActiveModule;
  label: string;
  icon: any;
  allowedRoles: UserRole[];
  badge?: number;
  badgeVariant?: 'amber' | 'rose' | 'emerald';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  userRole = 'owner',
  lowStockCount = 0,
  pendingDueCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  themeMode = 'night',
  onToggleTheme,
  onLogout,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'admin_panel',
      label: 'Master Control Panel (C-Panel)',
      icon: Server,
      allowedRoles: ['super_admin', 'admin'],
      badgeVariant: 'emerald',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier', 'stock_keeper'],
    },
    {
      id: 'pos',
      label: 'POS Billing',
      icon: ShoppingCart,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'cashier'],
    },
    {
      id: 'services',
      label: 'Service & Bookings',
      icon: Scissors,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'cashier'],
    },
    {
      id: 'sales',
      label: 'Sales Invoices',
      icon: TrendingUp,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier'],
    },
    {
      id: 'sales_orders',
      label: 'Sales Orders & Returns',
      icon: ShoppingCart,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier'],
    },
    {
      id: 'purchase',
      label: 'Purchases & Bills',
      icon: ShoppingBag,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'stock_keeper'],
    },
    {
      id: 'purchase_orders',
      label: 'Purchase Orders (PO)',
      icon: ShoppingBag,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'stock_keeper'],
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: Package,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'stock_keeper'],
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'stock_transfer',
      label: 'Stock Transfer',
      icon: ArrowLeftRight,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'stock_keeper'],
    },
    {
      id: 'customers',
      label: 'Customers & Khata',
      icon: Users,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier'],
      badge: pendingDueCount > 0 ? pendingDueCount : undefined,
      badgeVariant: 'rose',
    },
    {
      id: 'udhar_recovery',
      label: 'Udhar Recovery List',
      icon: Wallet,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier'],
      badge: pendingDueCount > 0 ? pendingDueCount : undefined,
      badgeVariant: 'rose',
    },
    {
      id: 'vendors',
      label: 'Vendors Directory',
      icon: Truck,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'stock_keeper'],
    },
    {
      id: 'accounts',
      label: 'Accounts & Books',
      icon: BookOpen,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant'],
    },
    {
      id: 'master_ledger',
      label: 'Master Ledger (Dr/Cr)',
      icon: BookOpen,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier'],
    },
    {
      id: 'expenses',
      label: 'Expenses & Income',
      icon: Receipt,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier'],
    },
    {
      id: 'gst',
      label: 'GST (GSTR-1 & 3B)',
      icon: FileText,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant'],
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      icon: BarChart3,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager', 'accountant'],
    },
    {
      id: 'gsheets',
      label: 'Google Sheets & Webhooks',
      icon: FileSpreadsheet,
      allowedRoles: ['super_admin', 'admin'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: UserCog,
      allowedRoles: ['super_admin', 'admin', 'owner'],
    },
    {
      id: 'audit',
      label: 'Audit & Security Trail',
      icon: ShieldAlert,
      allowedRoles: ['super_admin', 'admin'],
    },
    {
      id: 'architecture',
      label: 'System & Infrastructure',
      icon: Terminal,
      allowedRoles: ['super_admin', 'admin'],
    },
    {
      id: 'sales_pitch',
      label: 'Sales Demo & Pitch Deck',
      icon: Presentation,
      allowedRoles: ['super_admin', 'admin'],
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      allowedRoles: ['super_admin', 'admin', 'owner', 'manager'],
    },
  ];

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('erp_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('erp_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const visibleItems = navItems.filter((item) => (item.allowedRoles as string[] || []).includes(userRole));

  const sidebarInner = (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-56 lg:w-60'
      } transition-all duration-300 liquid-glass border-r border-slate-200/80 dark:border-emerald-500/20 flex flex-col shrink-0 text-slate-800 dark:text-slate-200 select-none h-full shadow-2xl backdrop-blur-xl relative z-20`}
    >
      {/* Sidebar Top Header with Minimax Toggle */}
      <div className={`p-3 border-b border-slate-200/50 dark:border-emerald-900/40 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Enterprise Modules</span>
          </div>
        )}
        
        {/* Desktop Collapse / Expand Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex items-center justify-center p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          title={isCollapsed ? "Maximize Sidebar (विस्तार करें)" : "Minimize Sidebar (छोटा करें)"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="lg:hidden text-slate-400 hover:text-white text-xs font-bold p-1">
            ✕
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
        {(visibleItems || []).map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectModule(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
              } rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer group relative ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 border border-emerald-400/60'
                  : 'hover:bg-slate-100 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-500/10 dark:bg-slate-800/60 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <span className="truncate text-xs text-left font-semibold tracking-tight">{item.label}</span>
                )}
              </div>

              {/* Badge or Active Chevron */}
              {!isCollapsed ? (
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                        item.badgeVariant === 'amber'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-950" />}
                </div>
              ) : (
                item.badge !== undefined && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                )
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Controls & System Info */}
      <div className={`p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40 text-[10px] text-slate-600 dark:text-slate-400 space-y-2 ${isCollapsed ? 'text-center' : ''}`}>
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={themeMode === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
            } rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer shadow-xs`}
          >
            <span className="flex items-center gap-2">
              {themeMode === 'day' ? (
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
              {!isCollapsed && <span>{themeMode === 'day' ? 'Light Mode' : 'Dark Mode'}</span>}
            </span>
            {!isCollapsed && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-extrabold">
                Mode
              </span>
            )}
          </button>
        )}

        {onLogout && (
          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onLogout();
            }}
            title="Sign Out"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
            } rounded-lg bg-rose-950/60 border border-rose-800/80 hover:bg-rose-900/80 text-rose-300 font-bold text-xs transition-colors cursor-pointer`}
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </span>
            {!isCollapsed && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-700">
                Exit
              </span>
            )}
          </button>
        )}

        {!isCollapsed && (
          <div className="pt-1 flex items-center justify-between font-mono text-[9px] text-slate-500 dark:text-slate-400">
            <span>UNIERP v2.4</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Online</span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        {sidebarInner}
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative z-10 w-64 h-full">
            {sidebarInner}
          </div>
        </div>
      )}
    </>
  );
};
