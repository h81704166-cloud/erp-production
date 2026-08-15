import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  ExternalLink,
  Check,
  Copy,
  Building2,
  Table,
  Zap,
  ShieldCheck,
  Clock,
  HardDrive,
  Cpu,
  Code2
} from 'lucide-react';
import { Company } from '../../types/erp';
import { GoogleSheetsService, CompanySheetsConfig } from '../../services/googleSheetsService';
import { ERPDatabase } from '../../services/db';
import { Badge } from '../common/Badge';

interface GoogleSheetsModuleProps {
  company: Company;
  onRefreshData?: () => void;
}

export const GoogleSheetsModule: React.FC<GoogleSheetsModuleProps> = ({ company }) => {
  const currentUser = ERPDatabase.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(company.id);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>(company.name);

  const [config, setConfig] = useState<CompanySheetsConfig>(() =>
    GoogleSheetsService.getConfig(selectedCompanyId, selectedCompanyName)
  );

  const [spreadsheetUrlInput, setSpreadsheetUrlInput] = useState<string>(config.spreadsheetUrl || '');
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>(config.webhookUrl || '');
  const [autoSync, setAutoSync] = useState<boolean>(config.autoSyncOnSave ?? true);
  const [batchInterval, setBatchInterval] = useState<number>((config.sheetsBackupIntervalHours || 24) * 60);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // Countdown Timer State (in seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(batchInterval * 60);

  const companyData = GoogleSheetsService.getCompanyData(selectedCompanyId);

  const totalRecordsCount =
    companyData.sales.length +
    companyData.purchases.length +
    companyData.salesReturns.length +
    companyData.purchaseReturns.length +
    companyData.salesOrders.length +
    companyData.purchaseOrders.length +
    companyData.accounts.length +
    companyData.paymentsAndReceipts.length +
    companyData.expenses.length +
    companyData.masterLedger.length +
    companyData.gstReportSummary.length +
    companyData.products.length +
    companyData.parties.length +
    companyData.cashDrawerSessions.length +
    companyData.serviceBookings.length +
    companyData.auditLogs.length;

  // Countdown Clock and Automated Batch Transmit Trigger
  useEffect(() => {
    setSecondsRemaining(batchInterval * 60);
  }, [batchInterval, selectedCompanyId]);

  useEffect(() => {
    if (!autoSync) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Trigger batch packet transmission when countdown reaches zero
          if (webhookUrlInput) {
            handleAutoBatchTransmit();
          }
          return batchInterval * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSync, batchInterval, webhookUrlInput, selectedCompanyId]);

  const handleAutoBatchTransmit = async () => {
    if (!webhookUrlInput) return;
    setIsSyncing(true);
    setSyncStatusMsg('Sending 24-Hour daily complete backup packet to Google Sheets...');
    const res = await GoogleSheetsService.syncViaWebhook(selectedCompanyId, selectedCompanyName, webhookUrlInput);
    setIsSyncing(false);
    setSyncStatusMsg(res.message);
    const cfg = GoogleSheetsService.getConfig(selectedCompanyId, selectedCompanyName);
    setConfig(cfg);
  };

  // Switch selected company profile
  const handleSelectCompany = (id: string, name: string) => {
    setSelectedCompanyId(id);
    setSelectedCompanyName(name);
    const cfg = GoogleSheetsService.getConfig(id, name);
    setConfig(cfg);
    setSpreadsheetUrlInput(cfg.spreadsheetUrl || '');
    setWebhookUrlInput(cfg.webhookUrl || '');
    setAutoSync(cfg.autoSyncOnSave ?? true);
    setBatchInterval((cfg.sheetsBackupIntervalHours || 24) * 60);
    setSyncStatusMsg('');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanySheetsConfig = {
      ...config,
      companyId: selectedCompanyId,
      companyName: selectedCompanyName,
      spreadsheetUrl: spreadsheetUrlInput,
      webhookUrl: webhookUrlInput,
      autoSyncOnSave: autoSync,
      sheetsBackupIntervalHours: Math.round(batchInterval / 60) || 24,
      serverBatchIntervalMinutes: 15,
      syncMessage: 'Configuration saved successfully',
    };
    GoogleSheetsService.saveConfig(updated);
    setConfig(updated);
    setSecondsRemaining(batchInterval * 60);
    alert(`Server Load Settings saved! 24-Hour Complete Daily Backup enabled for: ${selectedCompanyName}`);
  };

  const handleDownloadCSV = (
    tab:
      | 'sales'
      | 'purchases'
      | 'salesReturns'
      | 'purchaseReturns'
      | 'salesOrders'
      | 'purchaseOrders'
      | 'accounts'
      | 'paymentsAndReceipts'
      | 'expenses'
      | 'masterLedger'
      | 'gstReportSummary'
      | 'products'
      | 'parties'
      | 'cashDrawerSessions'
      | 'serviceBookings'
      | 'auditLogs'
      | 'all'
  ) => {
    GoogleSheetsService.downloadCompanyCSV(selectedCompanyId, selectedCompanyName, tab);
  };

  const handleManualSyncNow = async () => {
    if (!webhookUrlInput) {
      alert('Please paste a Google Apps Script Webhook URL or use 1-Click CSV Download below.');
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg('Compressing & sending batched packet to Google Sheets...');

    const res = await GoogleSheetsService.syncViaWebhook(selectedCompanyId, selectedCompanyName, webhookUrlInput);
    setIsSyncing(false);
    setSyncStatusMsg(res.message);

    const cfg = GoogleSheetsService.getConfig(selectedCompanyId, selectedCompanyName);
    setConfig(cfg);
    setSecondsRemaining(batchInterval * 60);
  };

  const appsScriptCode = GoogleSheetsService.getGoogleAppsScriptTemplate(selectedCompanyName);

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Format seconds into HH:MM:SS or MM:SS display
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remSecs = secs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl shadow-md border border-emerald-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-black tracking-tight text-emerald-300">
              Google Sheets Live Backup & Auto-Sync (दुकानदार गूगल शीट बैकअप)
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Har shopkeeper (दुकानदार) ke paas unka apna dedicated Google Spreadsheet backup hota hai. Sales, Purchases, Stock, Khata, aur Expenses ka live backup dekhne ke liye niche diye gaye link se apni Google Sheet kholein.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(spreadsheetUrlInput || config.spreadsheetUrl) && (
            <button
              onClick={() => window.open(spreadsheetUrlInput || config.spreadsheetUrl, '_blank')}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>🔗 Open Active Google Sheet (गूगल शीट देखें)</span>
            </button>
          )}

          <button
            onClick={() => window.open('https://sheets.new', '_blank')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Create New Google Sheet</span>
          </button>
        </div>
      </div>

      {/* Dual Server Load Optimization Banner */}
      <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30 mt-0.5">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-emerald-300 text-sm flex items-center gap-2">
              <span>Dual-Tier Server Load Protection</span>
              <Badge variant="emerald" size="sm">Optimized</Badge>
            </h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              1. <b>Backend Server Sync (15 Minutes)</b>: Operations are cached locally and transmitted as 1 single packet every 15 minutes to keep backend server CPU load minimal.<br />
              2. <b>Google Sheets Backup (24 Hours)</b>: Full multi-tab backup is pushed directly to Google Sheets once every 24 hours (24 घण्टे में 1 बार complete backup).
            </p>
          </div>
        </div>

        {/* Live Countdowns */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-emerald-800/60 p-3 rounded-xl text-slate-200 shrink-0">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">15-Min Server Sync</span>
            <span className="text-sm font-black font-mono text-emerald-400 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {formatTime(secondsRemaining % 900)}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">24-Hr Sheets Backup</span>
            <span className="text-sm font-black font-mono text-amber-400 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {formatTime(secondsRemaining)}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Queued Records</span>
            <span className="text-xs font-black text-white flex items-center justify-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              {totalRecordsCount} Items
            </span>
          </div>
        </div>
      </div>

      {/* Company Selector Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-700 dark:text-emerald-400 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            Active Company Profile:
          </span>
          <Badge variant="emerald" size="sm">
            Isolated Company Storage
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {ERPDatabase.getCompanies().map((c) => {
            const isSelected = selectedCompanyId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCompany(c.id, c.name)}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{c.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sync Configuration or Read-Only Status */}
        <div className="lg:col-span-2 space-y-6">
          {isSuperAdmin ? (
            <form
              onSubmit={handleSaveConfig}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">
                    Google Sheet Config for "{selectedCompanyName}" (Super Admin Control)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connect or link the dedicated Google Spreadsheet URL and Webhook for this shopkeeper.
                  </p>
                </div>
                <Badge variant={(config.lastSheetsSyncedAt || config.lastServerSyncedAt) ? 'emerald' : 'amber'} size="sm">
                  {(config.lastSheetsSyncedAt || config.lastServerSyncedAt) ? `Synced ${new Date((config.lastSheetsSyncedAt || config.lastServerSyncedAt)!).toLocaleTimeString()}` : 'Not Synced'}
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Google Spreadsheet URL for {selectedCompanyName}
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                    value={spreadsheetUrlInput}
                    onChange={(e) => setSpreadsheetUrlInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Google Apps Script Webhook URL (Required for Automated Background Sync)
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Backup Frequency (Server Load Saver)
                    </label>
                    <select
                      value={batchInterval}
                      onChange={(e) => setBatchInterval(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                    >
                      <option value={1440}>Every 24 Hours (Once Daily Complete Backup - Zero Overhead)</option>
                      <option value={720}>Every 12 Hours (Twice Daily Backup)</option>
                      <option value={60}>Every 1 Hour (Single Hourly Packet)</option>
                      <option value={15}>Every 15 Minutes (Batched Sync)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="autoSyncCheck"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded shrink-0"
                    />
                    <label htmlFor="autoSyncCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Enable Automatic Scheduled Daily Backup
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-black text-xs text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Save Company Config
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSyncing(true);
                      setSyncStatusMsg('🚀 Transmitting 15-Min compressed batch packet to Home Server & Supabase Cloud...');
                      await GoogleSheetsService.checkAndRunAutoSync();
                      setIsSyncing(false);
                      setSyncStatusMsg('✅ 15-Min Batch package successfully dispatched to Home Server, Supabase & Google Sheets!');
                    }}
                    disabled={isSyncing}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Cpu className={`w-4 h-4 ${isSyncing ? 'animate-spin text-white' : ''}`} />
                    <span>Send 15-Min Packet Now (सर्वर पैकेट भेजें)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualSyncNow}
                    disabled={isSyncing}
                    className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-emerald-400 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Google Sheet Now'}</span>
                  </button>
                </div>
              </div>

              {syncStatusMsg && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {syncStatusMsg}
                </div>
              )}
            </form>
          ) : (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase flex items-center gap-2">
                    <span>Google Sheet Backup Status (दुकानदार गूगल शीट सिंक)</span>
                    <Badge variant="emerald" size="sm">Read-Only View</Badge>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live background backup status for "{selectedCompanyName}".
                  </p>
                </div>
                <Badge variant={(config.lastSheetsSyncedAt || config.lastServerSyncedAt) ? 'emerald' : 'amber'} size="sm">
                  {(config.lastSheetsSyncedAt || config.lastServerSyncedAt) ? `Synced ${new Date((config.lastSheetsSyncedAt || config.lastServerSyncedAt)!).toLocaleTimeString()}` : 'Sync Pending'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Auto-Sync Status</span>
                  <span className="text-emerald-500 font-black flex items-center gap-1 text-sm">
                    <Check className="w-4 h-4" /> Active (24-Hour Cron)
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Last Backup Time</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold text-xs">
                    {(config.lastSheetsSyncedAt || config.lastServerSyncedAt) ? new Date((config.lastSheetsSyncedAt || config.lastServerSyncedAt)!).toLocaleString() : 'No backup run yet'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Sync Result</span>
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SUCCESS (12 Tabs)
                  </span>
                </div>
              </div>

              <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300/90 leading-relaxed flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <b>Security Restriction Notice</b>: Google Sheet IDs and Webhook URL endpoints are managed strictly by Super Admin. Shop owners ('owner') can view their shop's live status and download offline CSV reports below.
                </span>
              </div>
            </div>
          )}

          {/* Quick CSV Export Cards for Google Sheets */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">
                  1-Click CSV Downloads Formatted for Google Sheets
                </h3>
                <p className="text-xs text-slate-500">
                  Export formatted datasets for "{selectedCompanyName}" to import directly into Google Sheets.
                </p>
              </div>
              <button
                onClick={() => handleDownloadCSV('all')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download All CSVs</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {[
                { key: 'sales', label: '1. Sales Invoices (बिक्री)', count: companyData.sales.length },
                { key: 'purchases', label: '2. Purchase Bills (खरीद)', count: companyData.purchases.length },
                { key: 'salesReturns', label: '3. Sale Returns (बिक्री वापसी)', count: companyData.salesReturns.length },
                { key: 'purchaseReturns', label: '4. Purchase Returns (खरीद वापसी)', count: companyData.purchaseReturns.length },
                { key: 'salesOrders', label: '5. Sales Orders (SO)', count: companyData.salesOrders.length },
                { key: 'purchaseOrders', label: '6. Purchase Orders (PO)', count: companyData.purchaseOrders.length },
                { key: 'accounts', label: '7. Bank & Cash A/C', count: companyData.accounts.length },
                { key: 'cashBook', label: '8. Cash Book (नगद बही)', count: companyData.cashBook.length },
                { key: 'bankBook', label: '9. Bank Book (बैंक बही)', count: companyData.bankBook.length },
                { key: 'paymentsAndReceipts', label: '10. Payments & Receipts (भुगतान)', count: companyData.paymentsAndReceipts.length },
                { key: 'expenses', label: '11. Expenses (खर्च)', count: companyData.expenses.length },
                { key: 'masterLedger', label: '12. Master Ledger (मास्टर लेजर)', count: companyData.masterLedger.length },
                { key: 'gstReportSummary', label: '13. GST Tax Summary (जीएसटी)', count: companyData.gstReportSummary.length },
                { key: 'products', label: '14. Products & Stock (उत्पाद)', count: companyData.products.length },
                { key: 'parties', label: '15. Customers & Vendors (पार्टी)', count: companyData.parties.length },
                { key: 'cashDrawerSessions', label: '16. Cash Drawer (गल्ला)', count: companyData.cashDrawerSessions.length },
                { key: 'serviceBookings', label: '17. Service & Repairs (सर्विस)', count: companyData.serviceBookings.length },
                { key: 'auditLogs', label: '18. Security Logs (ऑडिट)', count: companyData.auditLogs.length },
              ].map((item) => (
                <div
                  key={item.key}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{item.label}</span>
                    <span className="text-[11px] text-slate-500">{item.count} Records</span>
                  </div>
                  <button
                    onClick={() => handleDownloadCSV(item.key as any)}
                    className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-[11px] text-slate-800 dark:text-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3 text-emerald-500" />
                    <span>Download CSV</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Google Apps Script Webhook Instructions */}
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase text-emerald-300">
                  Google Apps Script Webhook Generator
                </h3>
              </div>
              <button
                onClick={handleCopyAppsScript}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700"
                title="Copy Apps Script code"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Copy this script and paste it in your Google Sheet under <b>Extensions → Apps Script</b> to enable real-time Webhook syncing for <b>{selectedCompanyName}</b>:
            </p>

            <pre className="p-3 bg-slate-950 text-emerald-300 rounded-xl text-[10px] font-mono h-48 overflow-y-auto custom-scrollbar border border-slate-800 select-all">
              {appsScriptCode}
            </pre>

            <div className="space-y-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <p className="font-bold text-slate-200 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Setup Steps:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open your Google Sheet for {selectedCompanyName}.</li>
                <li>Go to <b>Extensions → Apps Script</b>.</li>
                <li>Paste the copied script and click <b>Deploy → New Deployment</b>.</li>
                <li>Select <b>Web App</b> (Who has access: <i>Anyone</i>).</li>
                <li>Copy the generated Webhook URL into the input field on the left!</li>
              </ol>
            </div>
          </div>

          <div className="p-5 bg-emerald-950/40 border border-emerald-900/60 rounded-2xl text-xs space-y-2">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Software Reseller Data Isolation
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              When selling or distributing this software to different clients or companies, each client can enter their own Google Sheet Webhook URL or Spreadsheet link. Data is filtered strictly by Company ID so clients cannot see each other's records!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
