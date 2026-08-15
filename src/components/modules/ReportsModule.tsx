import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  FileText,
  Download,
  Printer,
  ShieldCheck,
  Database,
  Building2,
  Wallet,
  Search,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  HardDriveUpload,
  HardDriveDownload,
  ShieldAlert,
} from 'lucide-react';
import { Sale, Purchase, Expense, Product, Party, Account, Company } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { BackupService, AutoBackupConfig, BackupSnapshot } from '../../services/backupService';
import { GoogleSheetsService, CompanySheetsConfig } from '../../services/googleSheetsService';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { Badge } from '../common/Badge';

interface ReportsModuleProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  parties: Party[];
  accounts: Account[];
  company?: Company;
  onRefreshData?: () => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  sales = [],
  purchases = [],
  expenses = [],
  products = [],
  parties = [],
  accounts = [],
  company,
  onRefreshData,
}) => {
  // Top level module tab state
  const [topTab, setTopTab] = useState<'financial_statements' | 'bank_statement' | 'cash_statement' | 'backup_restore'>('financial_statements');

  // Sub tab for Financial Statements
  const [reportType, setReportType] = useState<'pnl' | 'balance_sheet' | 'trial_balance'>('pnl');

  // Filters for Bank & Cash Statements
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Backup configuration state
  const [backupConfig, setBackupConfig] = useState<AutoBackupConfig>(BackupService.getConfig());
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(BackupService.getSnapshots());
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  // Google Sheets state
  const safeCompany = company || ERPDatabase.getCompany();
  const [sheetsConfig, setSheetsConfig] = useState<CompanySheetsConfig>(() =>
    GoogleSheetsService.getConfig(safeCompany.id, safeCompany.name)
  );
  const [webhookUrlInput, setWebhookUrlInput] = useState(sheetsConfig.webhookUrl || '');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  const safeSales = sales || [];
  const safePurchases = purchases || [];
  const safeExpenses = expenses || [];
  const safeProducts = products || [];
  const safeParties = parties || [];
  const safeAccounts = accounts || [];

  const handleSaveWebhook = () => {
    const updated = { ...sheetsConfig, webhookUrl: webhookUrlInput.trim() };
    GoogleSheetsService.saveConfig(updated);
    setSheetsConfig(updated);
    alert('Google Sheets Webhook URL saved successfully!');
  };

  const handleSyncToGoogleSheets = async () => {
    if (!webhookUrlInput.trim()) {
      alert('Please enter your Google Apps Script Webhook URL first.');
      return;
    }
    setIsSyncingSheets(true);
    const res = await GoogleSheetsService.syncViaWebhook(safeCompany.id, safeCompany.name, webhookUrlInput.trim());
    setIsSyncingSheets(false);
    setSheetsConfig(GoogleSheetsService.getConfig(safeCompany.id, safeCompany.name));
    alert(res.message);
  };

  // P&L Calculations
  const grossSalesRevenue = safeSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const totalPurchaseCost = safePurchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
  const cogs = totalPurchaseCost * 0.7;
  const grossProfit = Math.max(0, grossSalesRevenue - cogs);
  const totalOperatingExpenses = safeExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = grossProfit - totalOperatingExpenses;

  // Balance Sheet Calculations
  const stockValuation = safeProducts.reduce((acc, p) => acc + p.stockQty * p.purchasePrice, 0);
  const customerDebtors = safeParties
    .filter((p) => p.type === 'customer' && p.currentBalance > 0)
    .reduce((acc, p) => acc + p.currentBalance, 0);
  const cashAndBank = safeAccounts.reduce((acc, a) => acc + a.currentBalance, 0);
  const totalCurrentAssets = stockValuation + customerDebtors + cashAndBank;

  const vendorPayables = Math.abs(
    safeParties
      .filter((p) => p.type === 'vendor' && p.currentBalance < 0)
      .reduce((acc, p) => acc + p.currentBalance, 0)
  );
  const totalLiabilities = vendorPayables;
  const netOwnerEquity = totalCurrentAssets - totalLiabilities;

  // Bank Statement Data
  const rawBankData = useMemo(() => {
    return BackupService.getBankBookData(safeCompany.id);
  }, [safeSales, safePurchases, safeExpenses, safeCompany.id]);

  const filteredBankData = useMemo(() => {
    return rawBankData.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (row.Voucher_No || '').toLowerCase().includes(q) ||
        (row.Particulars || '').toLowerCase().includes(q) ||
        (row.Bank_Name || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;
      const todayStr = new Date().toLocaleDateString('en-IN');
      if (dateFilter === 'today') return row.Date === todayStr;

      return true;
    });
  }, [rawBankData, searchQuery, dateFilter]);

  // Cash Statement Data
  const rawCashData = useMemo(() => {
    return BackupService.getCashBookData(safeCompany.id);
  }, [safeSales, safePurchases, safeExpenses, safeCompany.id]);

  const filteredCashData = useMemo(() => {
    return rawCashData.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (row.Voucher_No || '').toLowerCase().includes(q) ||
        (row.Particulars || '').toLowerCase().includes(q) ||
        (row.Category || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;
      const todayStr = new Date().toLocaleDateString('en-IN');
      if (dateFilter === 'today') return row.Date === todayStr;

      return true;
    });
  }, [rawCashData, searchQuery, dateFilter]);

  // Backup Handlers
  const handleTriggerManualBackup = () => {
    setIsBackupLoading(true);
    setTimeout(() => {
      const newSnap = BackupService.triggerAutoBackup('manual');
      setSnapshots(BackupService.getSnapshots());
      setBackupConfig(BackupService.getConfig());
      setIsBackupLoading(false);
      alert(`Database Backup Snapshot #${newSnap.id} taken successfully! All sales, purchases, bank & cash records secured.`);
    }, 400);
  };

  const handleDownloadFullDatabaseJson = () => {
    const fullData = ERPDatabase.exportDatabaseJSON();
    const blob = new Blob([fullData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FULL_ERP_DATABASE_BACKUP_${safeCompany.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreSnapshot = (snapId: string) => {
    if (!window.confirm('Are you sure you want to restore database to this snapshot? Current unsaved entries will be reverted to this restore point.')) {
      return;
    }
    const ok = BackupService.restoreFromSnapshot(snapId);
    if (ok) {
      if (onRefreshData) onRefreshData();
      alert('Database successfully restored from snapshot restore point!');
    } else {
      alert('Failed to restore snapshot.');
    }
  };

  const handleToggleAutoBackup = () => {
    const updated = { ...backupConfig, enabled: !backupConfig.enabled };
    BackupService.saveConfig(updated);
    setBackupConfig(updated);
  };

  const handleUpdateInterval = (hours: number) => {
    const updated = { ...backupConfig, intervalHours: hours };
    BackupService.saveConfig(updated);
    setBackupConfig(updated);
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden text-slate-900 dark:text-slate-100">
      {/* Primary Header & Top Level Tab Navigation */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Financial Statements & Audit Center</span>
            </h2>
            <Badge variant="emerald">2026-2027</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time Profit & Loss, Balance Sheet, Bank Statements, Cashbook Statements, & Automatic Cloud Database Backup.
          </p>
        </div>

        {/* Top Modules Navigation Buttons */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          {[
            { id: 'financial_statements', label: 'Financial Statements', icon: FileText, desc: 'P&L & Balance Sheet' },
            { id: 'bank_statement', label: 'Bank Statement', icon: Building2, desc: 'Deposits & Bank Book' },
            { id: 'cash_statement', label: 'Cash Statement', icon: Wallet, desc: 'Cashbook & Nagad Bahi' },
            { id: 'backup_restore', label: 'Data Backup (बैकअप)', icon: Database, desc: 'Full Backup & Restore' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = topTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTopTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. FINANCIAL STATEMENTS TAB */}
      {topTab === 'financial_statements' && (
        <div className="space-y-6">
          {/* Sub Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              {[
                { id: 'pnl', label: 'Statement of Profit & Loss' },
                { id: 'balance_sheet', label: 'Balance Sheet' },
                { id: 'trial_balance', label: 'Trial Balance' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setReportType(t.id as any)}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors ${
                    reportType === t.id
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  InvoicePrintService.printFinancialStatements(
                    { grossSalesRevenue, cogs, grossProfit, totalOperatingExpenses, netProfit },
                    { stockValuation, customerDebtors, cashAndBank, totalCurrentAssets, vendorPayables, netOwnerEquity },
                    safeCompany
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Statement PDF</span>
              </button>
              <button
                onClick={() => GoogleSheetsService.downloadCompanyCSV(safeCompany.id, safeCompany.name, 'masterLedger')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Google Sheet CSV (Master Ledger)</span>
              </button>
              <button
                onClick={() => BackupService.downloadDedicatedBackupCSV('all')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold text-xs shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Audit</span>
              </button>
            </div>
          </div>

          {/* Statement of Profit & Loss */}
          {reportType === 'pnl' && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-3xl shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-emerald-400">Statement of Profit & Loss</h3>
                  <p className="text-xs text-slate-500">For the period ending {new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <Badge variant={netProfit >= 0 ? 'emerald' : 'rose'}>
                  NET PROFIT: ₹{netProfit.toLocaleString('en-IN')}
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between font-bold text-slate-900 dark:text-slate-100">
                  <span>Gross Sales Revenue</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">₹{grossSalesRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Less: Estimated Cost of Goods Sold (COGS)</span>
                  <span className="font-mono text-rose-500">-₹{cogs.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex justify-between font-black text-sm text-emerald-900 dark:text-emerald-300">
                  <span>GROSS PROFIT</span>
                  <span className="font-mono">₹{grossProfit.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">Operating Expenses Breakdown</p>
                  {safeExpenses.length === 0 ? (
                    <p className="text-slate-400 italic pl-2">No operating expenses recorded.</p>
                  ) : (
                    safeExpenses.map((e) => (
                      <div key={e.id} className="flex justify-between text-slate-700 dark:text-slate-300 pl-2">
                        <span>{e.category} ({e.voucherNo})</span>
                        <span className="font-mono text-rose-500">-₹{e.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span>Total Operating Expenses</span>
                    <span className="font-mono">-₹{totalOperatingExpenses.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center text-sm font-black mt-4 shadow-md">
                  <span>NET OPERATING PROFIT</span>
                  <span className="text-emerald-400 text-lg font-mono">₹{netProfit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Balance Sheet Statement */}
          {reportType === 'balance_sheet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
                  ASSETS (संपत्ति)
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200">
                    <span>Inventory Stock Valuation</span>
                    <span className="font-bold font-mono">₹{stockValuation.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200">
                    <span>Sundry Debtors (Customer Receivables)</span>
                    <span className="font-bold font-mono">₹{customerDebtors.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200">
                    <span>Cash & Bank Balances</span>
                    <span className="font-bold font-mono">₹{cashAndBank.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 font-black text-sm text-emerald-900 dark:text-emerald-300 rounded-xl flex justify-between shadow-xs">
                    <span>TOTAL ASSETS</span>
                    <span className="font-mono">₹{totalCurrentAssets.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400 border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider">
                  LIABILITIES & EQUITY (देनदारियां)
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200">
                    <span>Sundry Creditors (Vendor Payables)</span>
                    <span className="font-bold font-mono">₹{vendorPayables.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200">
                    <span>Owner Capital & Retained Equity</span>
                    <span className="font-bold font-mono">₹{netOwnerEquity.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3.5 bg-slate-900 text-white font-black text-sm rounded-xl flex justify-between shadow-xs">
                    <span>TOTAL LIABILITIES & EQUITY</span>
                    <span className="font-mono text-emerald-400">₹{(vendorPayables + netOwnerEquity).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trial Balance */}
          {reportType === 'trial_balance' && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-3xl shadow-sm overflow-x-auto">
              <h3 className="text-sm font-bold text-slate-900 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                Trial Balance Summary
              </h3>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Ledger Account Head</th>
                    <th className="p-3 text-right">Debit Balance (₹)</th>
                    <th className="p-3 text-right">Credit Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  <tr>
                    <td className="p-3 font-bold">Sales Account</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right font-bold font-mono">₹{grossSalesRevenue.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Purchase Account</td>
                    <td className="p-3 text-right font-bold font-mono">₹{totalPurchaseCost.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Operating Expenses</td>
                    <td className="p-3 text-right font-bold font-mono">₹{totalOperatingExpenses.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Cash & Bank Balances</td>
                    <td className="p-3 text-right font-bold font-mono">₹{cashAndBank.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. BANK STATEMENT TAB */}
      {topTab === 'bank_statement' && (
        <div className="space-y-5">
          {/* Top Bar Controls */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bank transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Date Filter */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                ].map((df) => (
                  <button
                    key={df.id}
                    onClick={() => setDateFilter(df.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      dateFilter === df.id ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => InvoicePrintService.printBankStatement(filteredBankData, safeCompany, dateFilter)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 rounded-xl font-bold text-xs"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Print Bank Statement</span>
              </button>
              <button
                onClick={() => GoogleSheetsService.downloadCompanyCSV(safeCompany.id, safeCompany.name, 'bankBook')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-200" />
                <span>Google Sheet CSV (Bank)</span>
              </button>
              <button
                onClick={() => BackupService.downloadDedicatedBackupCSV('bankBook')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 text-white hover:bg-sky-700 rounded-xl font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Bank CSV</span>
              </button>
            </div>
          </div>

          {/* Statement Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/40 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-sky-500 text-white rounded-xl">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase">Total Deposits (Cr)</p>
                <p className="text-base font-black text-sky-900 dark:text-sky-200 font-mono">
                  ₹{filteredBankData.reduce((acc, r) => acc + (r.Inflow_Deposit_Cr || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-rose-500 text-white rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">Total Withdrawals (Dr)</p>
                <p className="text-base font-black text-rose-900 dark:text-rose-200 font-mono">
                  ₹{filteredBankData.reduce((acc, r) => acc + (r.Outflow_Withdrawal_Dr || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Closing Bank Balance</p>
                <p className="text-base font-black text-emerald-900 dark:text-emerald-200 font-mono">
                  ₹{(filteredBankData[0]?.Bank_Running_Balance || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher No</th>
                  <th className="p-3">Particulars / Account</th>
                  <th className="p-3 text-center">Mode</th>
                  <th className="p-3 text-right text-emerald-600">Deposit (Cr ₹)</th>
                  <th className="p-3 text-right text-rose-600">Withdrawal (Dr ₹)</th>
                  <th className="p-3 text-right">Running Bank Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBankData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No bank statement transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredBankData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold">{row.Date}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{row.Voucher_No}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{row.Particulars}</div>
                        <div className="text-[10px] text-slate-400">Bank: {row.Bank_Name}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 rounded text-[10px] font-bold">
                          {row.Payment_Mode}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 font-mono">
                        {row.Inflow_Deposit_Cr > 0 ? `₹${row.Inflow_Deposit_Cr.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600 font-mono">
                        {row.Outflow_Withdrawal_Dr > 0 ? `₹${row.Outflow_Withdrawal_Dr.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-sky-700 dark:text-sky-300 font-mono">
                        ₹{(row.Bank_Running_Balance || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CASH STATEMENT TAB */}
      {topTab === 'cash_statement' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cashbook statement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                ].map((df) => (
                  <button
                    key={df.id}
                    onClick={() => setDateFilter(df.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      dateFilter === df.id ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => InvoicePrintService.printCashStatement(filteredCashData, safeCompany, dateFilter)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 rounded-xl font-bold text-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Cashbook (नगद बही)</span>
              </button>
              <button
                onClick={() => GoogleSheetsService.downloadCompanyCSV(safeCompany.id, safeCompany.name, 'cashBook')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Google Sheet CSV (Cashbook)</span>
              </button>
              <button
                onClick={() => BackupService.downloadDedicatedBackupCSV('cashBook')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Cash CSV</span>
              </button>
            </div>
          </div>

          {/* Cash Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-xl">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Cash Inflow (Cr)</p>
                <p className="text-base font-black text-emerald-900 dark:text-emerald-200 font-mono">
                  ₹{filteredCashData.reduce((acc, r) => acc + (r.Inflow_Receipt_Cr || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-rose-500 text-white rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">Cash Outflow (Dr)</p>
                <p className="text-base font-black text-rose-900 dark:text-rose-200 font-mono">
                  ₹{filteredCashData.reduce((acc, r) => acc + (r.Outflow_Payment_Dr || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-white rounded-xl">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">Cash Balance in Galla</p>
                <p className="text-base font-black text-amber-900 dark:text-amber-200 font-mono">
                  ₹{(filteredCashData[0]?.Cash_Running_Balance || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Cashbook Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher No</th>
                  <th className="p-3">Particulars & Category</th>
                  <th className="p-3 text-right text-emerald-600">Cash Inflow (Cr ₹)</th>
                  <th className="p-3 text-right text-rose-600">Cash Outflow (Dr ₹)</th>
                  <th className="p-3 text-right">Running Cash Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCashData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      No cash transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredCashData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold">{row.Date}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{row.Voucher_No}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{row.Particulars}</div>
                        <div className="text-[10px] text-slate-400">Category: {row.Category} | By: {row.Recorded_By || 'Cashier'}</div>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 font-mono">
                        {row.Inflow_Receipt_Cr > 0 ? `₹${row.Inflow_Receipt_Cr.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600 font-mono">
                        {row.Outflow_Payment_Dr > 0 ? `₹${row.Outflow_Payment_Dr.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-amber-600 dark:text-amber-300 font-mono">
                        ₹{(row.Cash_Running_Balance || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DATA BACKUP & RESTORE TAB */}
      {topTab === 'backup_restore' && (
        <div className="space-y-6">
          {/* Quick Backup Action Banner */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl shadow-md border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-lg font-black text-white">Cloud & Local Data Backup (बैकअप)</h3>
                  <Badge variant="emerald">ACTIVE</Badge>
                </div>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Protect your business data against accidental loss. Download complete JSON database backups or export separate CSV ledgers anytime.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleTriggerManualBackup}
                  disabled={isBackupLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isBackupLoading ? 'animate-spin' : ''}`} />
                  <span>{isBackupLoading ? 'Taking Snapshot...' : 'Take Backup Snapshot'}</span>
                </button>

                <button
                  onClick={handleDownloadFullDatabaseJson}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all"
                >
                  <HardDriveDownload className="w-4 h-4 text-emerald-400" />
                  <span>Download Full JSON Backup</span>
                </button>
              </div>
            </div>

            {/* Config & Auto Backup Status */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-300">Auto-Backup Status:</span>
                <button
                  onClick={handleToggleAutoBackup}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                    backupConfig.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {backupConfig.enabled ? 'Enabled (चालू है)' : 'Disabled (बंद है)'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Backup Frequency:</span>
                {[1, 6, 12, 24].map((hrs) => (
                  <button
                    key={hrs}
                    onClick={() => handleUpdateInterval(hrs)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      backupConfig.intervalHours === hrs ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    Every {hrs}h
                  </button>
                ))}
              </div>

              <div className="text-slate-400 text-[11px]">
                Last Backup Taken: <span className="text-emerald-400 font-mono font-bold">{backupConfig.lastBackupAt ? new Date(backupConfig.lastBackupAt).toLocaleString() : 'Never'}</span>
              </div>
            </div>
          </div>

          {/* Google Sheets Integration & Live Auto-Sync Banner */}
          <div className="p-6 bg-emerald-950/20 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                  <h3 className="text-base font-black text-slate-900 dark:text-emerald-300">
                    Google Sheets Auto Backup & Live Sync (गूगल शीट बैकअप)
                  </h3>
                  <Badge variant={sheetsConfig.syncStatus === 'success' ? 'emerald' : 'sky'}>
                    {sheetsConfig.syncStatus ? sheetsConfig.syncStatus.toUpperCase() : 'READY'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Export financial statements, bank books, cashbooks, sales, and purchases directly to Google Sheets with zero duplicates.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => GoogleSheetsService.downloadCompanyCSV(safeCompany.id, safeCompany.name, 'all')}
                  className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download 16 Google Sheets CSVs</span>
                </button>

                <button
                  onClick={() => setShowScriptModal(!showScriptModal)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{showScriptModal ? 'Hide Apps Script Code' : 'Google Apps Script Setup'}</span>
                </button>
              </div>
            </div>

            {/* Webhook Input and Sync Row */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Google Sheets Webhook URL (गूगल शीट वेबहुक यूआरएल)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <button
                  onClick={handleSaveWebhook}
                  className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition-all shrink-0"
                >
                  Save URL
                </button>
                <button
                  onClick={handleSyncToGoogleSheets}
                  disabled={isSyncingSheets}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Syncing to Google Sheets...' : 'Sync Now to Google Sheets'}</span>
                </button>
              </div>

              {sheetsConfig.lastSheetsSyncedAt && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  Last Synced to Google Sheets: {new Date(sheetsConfig.lastSheetsSyncedAt).toLocaleString()}
                </p>
              )}
            </div>

            {/* Google Apps Script Modal / Collapsible Guide */}
            {showScriptModal && (
              <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl border border-emerald-500/40 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="font-black text-emerald-400">Google Apps Script Code for Google Sheet (1-Click Setup)</h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(GoogleSheetsService.getGoogleAppsScriptTemplate(safeCompany.name));
                      alert('Google Apps Script code copied to clipboard!');
                    }}
                    className="px-3 py-1 bg-emerald-500 text-slate-950 font-black rounded-lg text-[10px]"
                  >
                    Copy Apps Script Code
                  </button>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-[11px]">
                  <li>Open your Google Sheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-400 underline">sheets.new</a></li>
                  <li>Go to <strong>Extensions</strong> → <strong>Apps Script</strong>.</li>
                  <li>Paste the copied code below into `Code.gs` and click <strong>Deploy</strong> → <strong>New deployment</strong> → Select <strong>Web app</strong>.</li>
                  <li>Set Access to <strong>Anyone</strong>, click Deploy, copy the Web App URL, and paste it into the Webhook URL box above!</li>
                </ol>
                <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto text-[10px] font-mono text-emerald-300 max-h-48 border border-slate-800">
                  {GoogleSheetsService.getGoogleAppsScriptTemplate(safeCompany.name)}
                </pre>
              </div>
            )}
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-3xl shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-emerald-400 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Export Individual Statement Backups (CSV)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { id: 'bankBook', label: 'Bank Statement CSV', icon: Building2 },
                { id: 'cashBook', label: 'Cash Statement CSV', icon: Wallet },
                { id: 'payment', label: 'Payment Records CSV', icon: DollarSign },
                { id: 'ledger', label: 'Master Ledger CSV', icon: FileText },
                { id: 'tax', label: 'GST Tax Report CSV', icon: PieChart },
                { id: 'accounts', label: 'Accounts Balance CSV', icon: Database },
                { id: 'purchaseOrders', label: 'Purchase Orders CSV', icon: FileSpreadsheet },
                { id: 'salesOrders', label: 'Sales Orders CSV', icon: FileSpreadsheet },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => BackupService.downloadDedicatedBackupCSV(item.id as any)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Backup Restore Snapshots List */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-3xl shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-emerald-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Database Restore Points & History (बैकअप रीस्टोर)</span>
            </h4>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                No backup snapshots saved yet. Click "Take Backup Snapshot" to create a restore point.
              </div>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-black text-slate-900 dark:text-slate-100">
                        <span>Snapshot ID: {snap.id}</span>
                        <Badge variant="emerald">{snap.triggerReason.toUpperCase()}</Badge>
                      </div>
                      <p className="text-slate-500 font-mono text-[11px]">
                        Timestamp: {new Date(snap.timestamp).toLocaleString()} | Sales: {snap.counts.salesInvoices}, Purchases: {snap.counts.purchaseBills}, Cashbook: {snap.counts.cashBookEntries || 0}, Bank: {snap.counts.bankBookEntries || 0}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRestoreSnapshot(snap.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs"
                    >
                      <HardDriveUpload className="w-3.5 h-3.5" />
                      <span>Restore Database</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
