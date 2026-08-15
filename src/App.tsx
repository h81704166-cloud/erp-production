import React, { useState, useEffect } from 'react';
import { Crown, AlertTriangle, Calendar, RefreshCw, Phone, ShieldAlert } from 'lucide-react';
import { ERPDatabase } from './services/db';
import { GoogleSheetsService } from './services/googleSheetsService';
import { applyTheme, initSystemThemeObserver, getSavedThemeMode, hasManualThemeModeSet, setAppThemeMode } from './services/theme';
import { requestPersistentStorage, getPendingSyncCount } from './services/offlineDb';
import { syncWorker } from './services/syncWorker';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { QuickSearchModal } from './components/layout/QuickSearchModal';
import { OnTheFlyAddModal } from './components/common/OnTheFlyAddModal';
import { LoginPage } from './components/auth/LoginPage';
import { CPanelLoginPage } from './components/auth/CPanelLoginPage';
import { LogoutSyncModal } from './components/auth/LogoutSyncModal';

// Modules
import { InvoicePrintService } from './services/pdfGenerator';
import { DashboardModule } from './components/modules/DashboardModule';
import { POSModule } from './components/modules/POSModule';
import { SalesModule } from './components/modules/SalesModule';
import { PurchaseModule } from './components/modules/PurchaseModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { StockTransferModule } from './components/modules/StockTransferModule';
import { PartyModule } from './components/modules/PartyModule';
import { AccountsModule } from './components/modules/AccountsModule';
import { ExpensesModule } from './components/modules/ExpensesModule';
import { GSTModule } from './components/modules/GSTModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { UserManagementModule } from './components/modules/UserManagementModule';
import { AuditLogsModule } from './components/modules/AuditLogsModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { GoogleSheetsModule } from './components/modules/GoogleSheetsModule';
import { SystemArchitectureModule } from './components/modules/SystemArchitectureModule';
import { SalesOrdersModule } from './components/modules/SalesOrdersModule';
import { PurchaseOrdersModule } from './components/modules/PurchaseOrdersModule';
import { UdharRecoveryModule } from './components/modules/UdharRecoveryModule';
import { MasterLedgerModule } from './components/modules/MasterLedgerModule';
import { ServicesModule } from './components/modules/ServicesModule';
import { SalesPitchModule } from './components/modules/SalesPitchModule';
import { AdminPanelModule } from './components/modules/AdminPanelModule';
import { ServerAdminLoginPage } from './components/auth/ServerAdminLoginPage';
import { ServerAdminDashboardModule } from './components/modules/ServerAdminDashboardModule';
import { ServerAdminService } from './services/serverAdminService';

export function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const isServerAdminUrlRoute = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = (window.location.pathname + window.location.search + window.location.hash).toLowerCase();
    return path.includes('/server-admin') || path.includes('server-admin');
  };

  const [isServerAdminRoute, setIsServerAdminRoute] = useState<boolean>(() => isServerAdminUrlRoute());
  const [isServerAdminAuthenticated, setIsServerAdminAuthenticated] = useState<boolean>(() => ServerAdminService.isAuthenticated());

  const isSuperAdminUrlRoute = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = (window.location.pathname + window.location.search + window.location.hash).toLowerCase();
    return (
      path.includes('/secure-master-cpanel-auth') ||
      path.includes('secure-master-cpanel-auth') ||
      path.includes('/karni/admin/adpanel') ||
      path.includes('karni/admin/adpanel') ||
      path.includes('/admin/adpanel') ||
      path.includes('/adpanel')
    );
  };

  const [isCPanelAuthenticated, setIsCPanelAuthenticated] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('erp_is_cpanel_authenticated') === 'true';
    }
    return false;
  });

  const [isCPanelLoginView, setIsCPanelLoginView] = useState<boolean>(() => isSuperAdminUrlRoute() && !isCPanelAuthenticated);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (isSuperAdminUrlRoute()) {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('erp_is_cpanel_authenticated') === 'true') {
        return true;
      }
      return false;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('erp_is_authenticated') === 'true';
    }
    return false;
  });

  // Core Data State
  const company = ERPDatabase.getCompany();
  const companies = ERPDatabase.getCompanies();
  const users = ERPDatabase.getUsers();
  
  const superAdminUser = users.find((u) => u.role === 'super_admin') || {
    id: 'usr-000',
    name: 'Super Admin (Billkart)',
    email: 'admin@billkart.shop',
    role: 'super_admin' as const,
    companyId: 'comp-001',
    phone: '+91 99999 00000',
    status: 'active' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const defaultOwner = users.find((u) => u.role === 'owner') || users[0];
  
  // Navigation & Theme State
  const [activeModule, setActiveModule] = useState(() => {
    if (isSuperAdminUrlRoute() && isCPanelAuthenticated) {
      return 'admin_panel';
    }
    return 'dashboard';
  });

  // Set current user depending on route and CPanel auth status
  const currentUser = (() => {
    if ((isSuperAdminUrlRoute() || activeModule === 'admin_panel' || activeModule === 'cpanel') && isCPanelAuthenticated) {
      ERPDatabase.setCurrentUser(superAdminUser);
      return superAdminUser;
    }
    return ERPDatabase.getCurrentUser() || defaultOwner;
  })();

  const products = ERPDatabase.getProducts();
  const parties = ERPDatabase.getParties();
  const sales = ERPDatabase.getSales();
  const purchases = ERPDatabase.getPurchases();
  const stockTransfers = ERPDatabase.getStockTransfers();
  const accounts = ERPDatabase.getAccounts();
  const expenses = ERPDatabase.getExpenses();
  const incomes = ERPDatabase.getIncomes();
  const auditLogs = ERPDatabase.getAuditLogs();
  const [themeMode, setThemeMode] = useState<'day' | 'night'>(() => getSavedThemeMode());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Toggle theme mode manually
  const handleToggleTheme = () => {
    const newMode = themeMode === 'day' ? 'night' : 'day';
    setThemeMode(newMode);
    setAppThemeMode(newMode, true);
  };

  // Sync Engine State
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('erp_last_synced_at') : null
  );
  const [autoLogoutNotice, setAutoLogoutNotice] = useState<string | null>(null);

  // Modals
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [onTheFlyType, setOnTheFlyType] = useState<'product' | 'customer' | 'vendor' | 'account' | null>(null);

  const refreshData = () => setRefreshKey((prev) => prev + 1);

  // 15-Minute Inactivity Auto Logout Engine (15 मिनट ऑटो लॉगआउट)
  useEffect(() => {
    if (!isAuthenticated && !isCPanelAuthenticated) return;

    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
    let lastActivityTimestamp = Date.now();

    const resetInactivityTimer = () => {
      lastActivityTimestamp = Date.now();
    };

    const userEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    userEvents.forEach((evt) => {
      window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });

    const inactivityCheckInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityTimestamp >= INACTIVITY_TIMEOUT_MS) {
        ERPDatabase.addAuditLog(
          'AUTO_LOGOUT',
          'Security',
          'User/SuperAdmin automatically logged out due to 15 minutes of inactivity (15 मिनट की निष्कियता पर ऑटो लॉगआउट)'
        );
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('erp_is_authenticated');
          localStorage.removeItem('erp_is_cpanel_authenticated');
          localStorage.removeItem('cpanel_master_token');
        }
        setIsCPanelAuthenticated(false);
        setIsAuthenticated(false);
        setAutoLogoutNotice('Safety Auto-Logout: You were automatically logged out due to 15 minutes of inactivity (15 मिनट निष्क्रिय रहने के कारण आपका सेशन सुरक्षित रूप से समाप्त कर दिया गया है।)');
      }
    }, 10000);

    return () => {
      userEvents.forEach((evt) => {
        window.removeEventListener(evt, resetInactivityTimer);
      });
      clearInterval(inactivityCheckInterval);
    };
  }, [isAuthenticated, isCPanelAuthenticated]);

  // Sync dark class on root document when themeMode changes
  useEffect(() => {
    setAppThemeMode(themeMode, hasManualThemeModeSet());
  }, [themeMode]);

  // Initialize OS system-preference observer
  useEffect(() => {
    const cleanupObserver = initSystemThemeObserver((systemMode) => {
      setThemeMode(systemMode);
    });
    return () => {
      cleanupObserver();
    };
  }, []);

  // Request Persistent Storage & Initialize Background Sync Listeners
  useEffect(() => {
    // 0. Apply UI Theme
    applyTheme(ERPDatabase.getUITheme());

    // 1. Request persistent storage on app startup
    requestPersistentStorage();

    // 1.a Start background recurring Google Sheets auto-sync task
    GoogleSheetsService.startBackgroundAutoSync();

    // 2. Fetch initial pending sync count
    getPendingSyncCount().then((count) => setPendingSyncCount(count));

    // 3. Listen to sync worker status events
    const handleSyncStatusChanged = (e: any) => {
      if (e.detail) {
        if (typeof e.detail.pendingCount === 'number') {
          setPendingSyncCount(e.detail.pendingCount);
        }
        if (typeof e.detail.isSyncing === 'boolean') {
          setIsSyncing(e.detail.isSyncing);
        }
        if (e.detail.lastSyncedAt) {
          setLastSyncedAt(e.detail.lastSyncedAt);
        }
      }
    };

    const handleSyncCompleted = () => {
      getPendingSyncCount().then((count) => setPendingSyncCount(count));
      setIsSyncing(false);
      if (typeof localStorage !== 'undefined') {
        const lastSync = localStorage.getItem('erp_last_synced_at');
        if (lastSync) setLastSyncedAt(lastSync);
      }
    };

    window.addEventListener('sync_status_changed', handleSyncStatusChanged);
    window.addEventListener('sync_completed', handleSyncCompleted);
    window.addEventListener('company_changed', refreshData);

    return () => {
      window.removeEventListener('sync_status_changed', handleSyncStatusChanged);
      window.removeEventListener('sync_completed', handleSyncCompleted);
      window.removeEventListener('company_changed', refreshData);
    };
  }, []);

  // Sync URL route for /karni/admin/adpanel and handle popstate browser back/forward
  useEffect(() => {
    const handleUrlRouteSync = () => {
      if (isSuperAdminUrlRoute()) {
        const cpanelAuth = typeof localStorage !== 'undefined' && localStorage.getItem('erp_is_cpanel_authenticated') === 'true';
        if (cpanelAuth) {
          const superAdmin = users.find((u) => u.role === 'super_admin') || superAdminUser;
          ERPDatabase.setCurrentUser(superAdmin);
          setIsCPanelAuthenticated(true);
          setIsAuthenticated(true);
          setActiveModule('admin_panel');
          refreshData();
        } else {
          setIsCPanelAuthenticated(false);
          setIsCPanelLoginView(true);
        }
      }
    };

    window.addEventListener('popstate', handleUrlRouteSync);
    window.addEventListener('hashchange', handleUrlRouteSync);

    if (isSuperAdminUrlRoute()) {
      handleUrlRouteSync();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/karni/admin/adpanel')) {
        try {
          window.history.replaceState({ module: 'admin_panel' }, '', '/karni/admin/adpanel');
        } catch (_) {}
      }
    }

    return () => {
      window.removeEventListener('popstate', handleUrlRouteSync);
      window.removeEventListener('hashchange', handleUrlRouteSync);
    };
  }, []);

  const handleSelectModule = (mod: string) => {
    setActiveModule(mod);
    setIsSidebarOpen(false);

    if (mod === 'admin_panel' || mod === 'cpanel') {
      const cpanelAuth = typeof localStorage !== 'undefined' && localStorage.getItem('erp_is_cpanel_authenticated') === 'true';
      if (cpanelAuth) {
        const superAdmin = users.find((u) => u.role === 'super_admin') || superAdminUser;
        ERPDatabase.setCurrentUser(superAdmin);
        refreshData();
      } else {
        setIsCPanelAuthenticated(false);
        setIsCPanelLoginView(true);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/karni/admin/adpanel')) {
        try {
          window.history.pushState({ module: 'admin_panel' }, '', '/karni/admin/adpanel');
        } catch (_) {}
      }
    } else {
      if (typeof window !== 'undefined' && isSuperAdminUrlRoute()) {
        try {
          window.history.pushState({ module: mod }, '', '/');
        } catch (_) {}
      }
    }
  };

  // Keyboard Shortcuts (Ctrl+K for Quick Search, F2 for POS, Ctrl+S for Save Bill, Ctrl+P for Print Invoice)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Quick Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(true);
      }
      // F2: Jump to POS Billing
      else if (e.key === 'F2') {
        e.preventDefault();
        setActiveModule('pos');
      }
      // Ctrl+S or Cmd+S: Save current billing transaction
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('trigger_save_billing'));
      }
      // Ctrl+P or Cmd+P: Quickly print the last generated invoice
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const latestSales = ERPDatabase.getSales();
        if (latestSales && latestSales.length > 0) {
          InvoicePrintService.printA4Invoice(latestSales[0], company);
        } else {
          alert('No generated sales invoices found in the system to print.');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [company]);

  // Server Admin Portal Dedicated Route Check
  if (isServerAdminRoute || isServerAdminUrlRoute()) {
    if (!isServerAdminAuthenticated || !ServerAdminService.isAuthenticated()) {
      return (
        <ServerAdminLoginPage
          onLoginSuccess={() => setIsServerAdminAuthenticated(true)}
          onBackToApp={() => {
            setIsServerAdminRoute(false);
            if (typeof window !== 'undefined') {
              try { window.history.pushState({}, '', '/'); } catch (_) {}
            }
          }}
        />
      );
    }

    return (
      <ServerAdminDashboardModule
        onLogout={() => {
          ServerAdminService.logout();
          setIsServerAdminAuthenticated(false);
        }}
        onReturnToErp={() => {
          setIsServerAdminRoute(false);
          if (typeof window !== 'undefined') {
            try { window.history.pushState({}, '', '/'); } catch (_) {}
          }
        }}
      />
    );
  }

  if ((isSuperAdminUrlRoute() || isCPanelLoginView || activeModule === 'admin_panel' || activeModule === 'cpanel') && !isCPanelAuthenticated) {
    return (
      <CPanelLoginPage
        onLoginSuccess={(user) => {
          ERPDatabase.setCurrentUser(user);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('erp_is_authenticated', 'true');
            localStorage.setItem('erp_is_cpanel_authenticated', 'true');
          }
          setIsCPanelAuthenticated(true);
          setIsCPanelLoginView(false);
          setAutoLogoutNotice(null);
          setIsAuthenticated(true);
          setActiveModule('admin_panel');
          refreshData();
        }}
        onNavigateToMerchantLogin={() => {
          setIsCPanelLoginView(false);
          if (typeof window !== 'undefined') {
            try { window.history.pushState({}, '', '/'); } catch (_) {}
          }
        }}
        onNavigateToSignup={() => {
          setIsCPanelLoginView(false);
          if (typeof window !== 'undefined') {
            try { window.history.pushState({}, '', '/'); } catch (_) {}
          }
        }}
        onNavigateToDemo={() => {
          setIsCPanelLoginView(false);
          if (typeof window !== 'undefined') {
            try { window.history.pushState({}, '', '/'); } catch (_) {}
          }
        }}
      />
    );
  }

  if (!isAuthenticated) {

    return (
      <LoginPage
        onLoginSuccess={(user) => {
          ERPDatabase.setCurrentUser(user);
          if (user && user.companyId) {
            ERPDatabase.setActiveCompany(user.companyId);
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('erp_is_authenticated', 'true');
          }
          setAutoLogoutNotice(null);
          setIsAuthenticated(true);
          refreshData();
        }}
        companies={companies}
        allUsers={users}
        autoLogoutNotice={autoLogoutNotice}
      />
    );
  }

  return (
    <div className={`min-h-screen ${themeMode === 'night' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans antialiased overflow-x-hidden w-full`}>
      <div className="flex h-screen overflow-hidden w-full max-w-full">
        {/* Sidebar */}
        <Sidebar
          activeModule={activeModule as any}
          onSelectModule={(mod) => handleSelectModule(mod)}
          userRole={currentUser?.role || 'owner'}
          lowStockCount={(products || []).filter((p) => p.stockQty <= p.minStockAlert).length}
          pendingDueCount={(parties || []).filter((p) => p.type === 'customer' && p.currentBalance > 0).length}
          isMobileOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
          onLogout={() => setIsLogoutModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
          {/* Header Bar */}
          <Header
            currentUser={currentUser}
            onSwitchUser={(u) => {
              ERPDatabase.setCurrentUser(u);
              refreshData();
            }}
            allUsers={users}
            company={company}
            themeMode={themeMode}
            onToggleTheme={handleToggleTheme}
            isSyncing={isSyncing}
            pendingSyncCount={pendingSyncCount}
            onSyncNow={() => {
              syncWorker.forceManualSync();
              const config = GoogleSheetsService.getConfig(company.id, company.name);
              if (config.webhookUrl) {
                GoogleSheetsService.syncViaWebhook(company.id, company.name, config.webhookUrl).catch(() => {});
              }
            }}
            onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
            onToggleMobileSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onLogout={() => setIsLogoutModalOpen(true)}
          />

          {/* Module Canvas Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6 custom-scrollbar w-full min-w-0 max-w-full">
            <div className="w-full min-w-0 max-w-full space-y-6">
              {/* Subscription & Prime Plan Status Banner */}
              {(() => {
                const planName = (company.subscriptionPlan || 'prime').toUpperCase();
                const expDate = company.subscriptionExpiresAt ? new Date(company.subscriptionExpiresAt) : new Date('2026-12-31');
                const now = new Date();
                const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = daysRemaining <= 0;
                const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 15;

                if (isExpired) {
                  return (
                    <div className="p-4 bg-rose-950/90 border border-rose-800 rounded-2xl text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-rose-900 rounded-xl text-rose-300 shrink-0">
                          <ShieldAlert className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-rose-300 flex items-center gap-2">
                            <span>⚠️ SUBSCRIPTION EXPIRED / प्राइम सदस्यता समाप्त हो गई</span>
                            <span className="px-2 py-0.5 bg-rose-700 text-white rounded text-[10px] font-black">EXPIRED</span>
                          </h4>
                          <p className="text-xs text-rose-200 mt-1">
                            Aapke shop <strong>"{company.name}"</strong> ka Prime Subscription plan <strong>{expDate.toLocaleDateString('en-IN')}</strong> ko expire ho chuka hai. Kripya Admin se sampark karein ya Plan Renew karein.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const newExp = new Date();
                          newExp.setFullYear(newExp.getFullYear() + 1);
                          ERPDatabase.updateCompany({
                            subscriptionStatus: 'active',
                            subscriptionPlan: 'prime',
                            subscriptionExpiresAt: newExp.toISOString(),
                          }, company.id);
                          refreshData();
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Crown className="w-4 h-4" />
                        <span>Renew 1-Year Prime Plan</span>
                      </button>
                    </div>
                  );
                }

                if (isExpiringSoon) {
                  return (
                    <div className="p-3.5 bg-amber-950/80 border border-amber-800/80 rounded-2xl text-amber-100 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-2.5 text-xs">
                        <Crown className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                        <div>
                          <span className="font-extrabold text-amber-300">Prime Plan Expiring Soon: </span>
                          <span>Aapka Prime Subscription <strong>{daysRemaining} din</strong> me ({expDate.toLocaleDateString('en-IN')}) expire ho jayega. Non-stop service ke liye abhi renew karein.</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveModule('users')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] rounded-xl shrink-0 cursor-pointer"
                      >
                        Renew Now
                      </button>
                    </div>
                  );
                }

                return null;
              })()}
              {activeModule === 'dashboard' && (
                <DashboardModule
                  sales={sales}
                  products={products}
                  parties={parties}
                  accounts={accounts}
                  expenses={expenses}
                  onNavigate={(mod) => setActiveModule(mod)}
                  onOpenAddModal={(type) => setOnTheFlyType(type)}
                />
              )}

              {activeModule === 'pos' && (
                <POSModule
                  products={products}
                  parties={parties}
                  company={company}
                  currentUser={currentUser}
                  onRefreshData={refreshData}
                  onOpenAddModal={(type) => setOnTheFlyType(type)}
                />
              )}

              {activeModule === 'services' && (
                <ServicesModule
                  company={company}
                  parties={parties}
                  onRefreshData={refreshData}
                />
              )}

              {activeModule === 'sales' && (
                <SalesModule
                  sales={sales}
                  company={company}
                  products={products}
                  onRefreshData={refreshData}
                />
              )}

              {activeModule === 'sales_orders' && (
                <SalesOrdersModule
                  products={products}
                  parties={parties}
                  onRefreshData={refreshData}
                />
              )}

              {(activeModule === 'purchase' || activeModule === 'purchases') && (
                <PurchaseModule
                  purchases={purchases}
                  parties={parties}
                  products={products}
                  company={company}
                  onRefreshData={refreshData}
                  onOpenAddVendor={() => setOnTheFlyType('vendor')}
                />
              )}

              {activeModule === 'purchase_orders' && (
                <PurchaseOrdersModule
                  products={products}
                  parties={parties}
                  onRefreshData={refreshData}
                />
              )}

              {activeModule === 'inventory' && (
                <InventoryModule
                  products={products}
                  company={company}
                  onRefreshData={refreshData}
                  onOpenAddModal={() => setOnTheFlyType('product')}
                />
              )}

              {activeModule === 'stock_transfer' && (
                <StockTransferModule
                  transfers={stockTransfers}
                  products={products}
                  company={company}
                  onRefreshData={refreshData}
                />
              )}

              {(activeModule === 'customers' || activeModule === 'khata') && (
                <PartyModule
                  parties={parties}
                  company={company}
                  partyType="customer"
                  onRefreshData={refreshData}
                  onOpenAddParty={(type) => setOnTheFlyType(type || 'customer')}
                />
              )}

              {activeModule === 'udhar_recovery' && (
                <UdharRecoveryModule
                  parties={parties}
                  onRefreshData={refreshData}
                />
              )}

              {activeModule === 'vendors' && (
                <PartyModule
                  parties={parties}
                  company={company}
                  partyType="vendor"
                  onRefreshData={refreshData}
                  onOpenAddParty={(type) => setOnTheFlyType(type || 'vendor')}
                />
              )}

              {(activeModule === 'accounts' || activeModule === 'cash_bank') && (
                <AccountsModule
                  accounts={accounts}
                  company={company}
                  onRefreshData={refreshData}
                  onOpenAddAccount={() => setOnTheFlyType('account')}
                />
              )}

              {activeModule === 'master_ledger' && (
                <MasterLedgerModule
                  company={company}
                  parties={parties}
                  onRefreshData={refreshData}
                />
              )}

              {(activeModule === 'expenses' || activeModule === 'income') && (
                <ExpensesModule
                  expenses={expenses}
                  incomes={incomes}
                  accounts={accounts}
                  company={company}
                  onRefreshData={refreshData}
                />
              )}

              {(activeModule === 'gst' || activeModule === 'gst_reports') && (
                <GSTModule sales={sales} purchases={purchases} company={company} />
              )}

              {(activeModule === 'reports' || activeModule === 'pnl_reports' || activeModule === 'balance_sheet' || activeModule === 'backup') && (
                <ReportsModule
                  sales={sales}
                  purchases={purchases}
                  expenses={expenses}
                  products={products}
                  parties={parties}
                  accounts={accounts}
                  company={company}
                  onRefreshData={refreshData}
                />
              )}

              {/* Restricted Admin Modules RBAC Guard */}
              {['gsheets', 'audit', 'audit_logs', 'architecture', 'sales_pitch', 'admin_panel', 'cpanel'].includes(activeModule) &&
              !(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') ? (
                <div className="p-8 bg-slate-900/90 border border-rose-500/40 rounded-3xl text-center space-y-4 max-w-2xl mx-auto my-12 shadow-2xl backdrop-blur-xl">
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-white">403 Access Denied / 403 एक्सेस अस्वीकृत</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    This technical and administrative module is strictly restricted to <strong>Admin</strong> and <strong>Super Admin</strong> roles. Shop Owners and Staff members do not have access privileges.
                  </p>
                  <button
                    onClick={() => setActiveModule('dashboard')}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-black text-xs text-slate-950 rounded-xl shadow-lg cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  {activeModule === 'gsheets' && (
                    <GoogleSheetsModule company={company} onRefreshData={refreshData} />
                  )}

                  {(activeModule === 'audit' || activeModule === 'audit_logs') && (
                    <AuditLogsModule logs={auditLogs} onRefreshLogs={refreshData} />
                  )}

                  {activeModule === 'architecture' && (
                    <SystemArchitectureModule />
                  )}

                  {activeModule === 'sales_pitch' && (
                    <SalesPitchModule />
                  )}

                  {(activeModule === 'admin_panel' || activeModule === 'cpanel') && (
                    <AdminPanelModule
                      onDataChange={refreshData}
                      onSwitchCompany={(companyId) => {
                        const comp = companies.find((c) => c.id === companyId);
                        if (comp) {
                          ERPDatabase.setItem('erp_company', comp);
                          refreshData();
                          setActiveModule('dashboard');
                        }
                      }}
                    />
                  )}
                </>
              )}

              {activeModule === 'users' && (
                <UserManagementModule
                  users={users}
                  company={company}
                  onRefreshData={refreshData}
                />
              )}

              {activeModule === 'settings' && (
                <SettingsModule company={company} onRefreshData={refreshData} />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Global Logout Data Sync Modal */}
      <LogoutSyncModal
        isOpen={isLogoutModalOpen}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={() => syncWorker.forceManualSync()}
        onCompleteLogout={() => {
          setIsLogoutModalOpen(false);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('erp_is_authenticated');
            localStorage.removeItem('erp_is_cpanel_authenticated');
            localStorage.removeItem('cpanel_master_token');
          }
          setIsCPanelAuthenticated(false);
          setIsAuthenticated(false);
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* Global Quick Search Modal */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        onNavigate={(mod) => {
          handleSelectModule(mod);
          setIsQuickSearchOpen(false);
        }}
      />

      {/* Global On-the-Fly Creation Modal */}
      {onTheFlyType && (
        <OnTheFlyAddModal
          type={onTheFlyType}
          isOpen={!!onTheFlyType}
          onClose={() => setOnTheFlyType(null)}
          onAdded={() => {
            refreshData();
            setOnTheFlyType(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
