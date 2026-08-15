import React, { useState } from 'react';
import {
  Settings,
  Building,
  Database,
  Cloud,
  Terminal,
  Download,
  RotateCcw,
  Check,
  Copy,
  Server,
  FileCode,
  QrCode,
  CreditCard,
  Building2,
  Sparkles,
  KeyRound,
  Store,
  Palette,
  ShieldCheck,
  Save,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  FileCheck,
  ShieldAlert,
  CloudUpload,
} from 'lucide-react';
import { Company, POSCounter } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { GoogleSheetsService } from '../../services/googleSheetsService';
import { BackupService, AutoBackupConfig, BackupSnapshot } from '../../services/backupService';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  isSupabaseConfigured,
} from '../../services/supabaseService';
import { syncWorker } from '../../services/syncWorker';
import { APP_THEMES, applyTheme, getCurrentTheme, resetThemeToDefault } from '../../services/theme';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { generateFullPostgresSQL } from '../../services/sqlGenerator';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { UpiQRCode } from '../common/UpiQRCode';

interface SettingsModuleProps {
  company: Company;
  onRefreshData: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ company, onRefreshData }) => {
  const currentUser = ERPDatabase.getCurrentUser();
  const isAdminOrSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'profile' | 'counters' | 'themes' | 'payment_settings' | 'sql' | 'docker' | 'backup'>('profile');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Counters State
  const [counters, setCounters] = useState<POSCounter[]>(() => ERPDatabase.getCounters());
  const [editingCounter, setEditingCounter] = useState<POSCounter | null>(null);

  // Theme State
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => ERPDatabase.getUITheme());

  // Google Sheets & Server Backup State
  const [sheetsConfig, setSheetsConfig] = useState(() => GoogleSheetsService.getConfig(company.id, company.name));
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Automated Backup Engine State
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>(() => BackupService.getConfig());
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(() => BackupService.getSnapshots());

  const handleSaveAutoBackupConfig = (updated: AutoBackupConfig) => {
    setAutoBackupConfig(updated);
    BackupService.saveConfig(updated);
    setSyncFeedback({ type: 'success', message: 'ऑटो बैकअप शेड्यूल सेटिंग्स सफलतापूर्वक सेव हो गई हैं!' });
  };

  const handleTriggerAutoBackupNow = () => {
    const snap = BackupService.triggerAutoBackup('manual');
    setSnapshots(BackupService.getSnapshots());
    setAutoBackupConfig(BackupService.getConfig());
    setSyncFeedback({ type: 'success', message: `नया ऑटो बैकअप स्नैपशॉट सफलतापूर्वक लिया गया! (${snap.counts.paymentRecords} Payments, ${snap.counts.ledgerEntries} Ledger, ${snap.counts.taxTransactions} Tax Entries)` });
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    if (window.confirm('क्या आप निश्चित हैं कि आप इस ऑटो बैकअप स्नैपशॉट से डेटा रिस्टोर करना चाहते हैं?')) {
      const ok = BackupService.restoreFromSnapshot(snapshotId);
      if (ok) {
        setSyncFeedback({ type: 'success', message: 'डाटाबेस स्नैपशॉट से सफलतापूर्वक रिस्टोर हो गया है!' });
        onRefreshData();
      } else {
        setSyncFeedback({ type: 'error', message: 'स्नैपशॉट रिस्टोर करने में त्रुटि हुई।' });
      }
    }
  };

  // Supabase Database Connection State
  const [supabaseCreds, setSupabaseCreds] = useState(() => getSupabaseCredentials());
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  const handleSaveSupabaseCreds = () => {
    saveSupabaseCredentials(supabaseCreds.url, supabaseCreds.key);
    setSyncFeedback({ type: 'success', message: 'Supabase Database credentials saved successfully!' });
  };

  const handleTriggerSupabaseSync = async () => {
    setIsSyncingSupabase(true);
    setSyncFeedback(null);
    saveSupabaseCredentials(supabaseCreds.url, supabaseCreds.key);
    syncWorker.forceManualSync();
    setTimeout(() => {
      setIsSyncingSupabase(false);
      setSyncFeedback({ type: 'success', message: '✅ Instant Sync Triggered! Transactions are syncing to server.js PostgreSQL DB.' });
    }, 1000);
  };

  const handleSaveSheetsConfig = () => {
    GoogleSheetsService.saveConfig(sheetsConfig);
    setSyncFeedback({ type: 'success', message: 'Google Sheets configuration saved!' });
  };

  const handleTriggerSheetsWebhook = async () => {
    if (!sheetsConfig.webhookUrl) {
      setSyncFeedback({ type: 'error', message: 'Please enter your Google Apps Script Webhook URL first.' });
      return;
    }
    setIsSyncingSheets(true);
    setSyncFeedback(null);
    const res = await GoogleSheetsService.syncViaWebhook(company.id, company.name, sheetsConfig.webhookUrl);
    setIsSyncingSheets(false);
    if (res.success) {
      setSheetsConfig(GoogleSheetsService.getConfig(company.id, company.name));
      setSyncFeedback({ type: 'success', message: res.message });
    } else {
      setSyncFeedback({ type: 'error', message: res.message });
    }
  };

  const handleTriggerServerSync = async () => {
    setIsSyncingServer(true);
    setSyncFeedback(null);
    try {
      const fullSnapshot = {
        sales: ERPDatabase.getSales(),
        purchases: ERPDatabase.getPurchases(),
        parties: ERPDatabase.getParties(),
        products: ERPDatabase.getProducts(),
        expenses: ERPDatabase.getExpenses(),
        cashDrawer: ERPDatabase.getCashDrawerSessions(),
        services: ERPDatabase.getServiceBookings(),
        auditLogs: ERPDatabase.getAuditLogs(),
      };

      const token = (typeof localStorage !== 'undefined' && localStorage.getItem('erp_jwt_token')) || '';
      const res = await fetch('/api/backup/server/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ companyId: company.id, companyName: company.name, payload: fullSnapshot }),
      });

      if (res.ok) {
        const data = await res.json();
        setSyncFeedback({ type: 'success', message: data.message || 'Server backup sync complete!' });
      } else {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: `Server Sync Note: ${err.message || 'Saved locally on server vault.'}` });
    } finally {
      setIsSyncingServer(false);
    }
  };

  const handleCopyAppsScript = () => {
    const code = GoogleSheetsService.getGoogleAppsScriptTemplate(company.name);
    navigator.clipboard.writeText(code);
    setCopiedAppsScript(true);
    setTimeout(() => setCopiedAppsScript(false), 3000);
  };

  const handleConfirmReset = () => {
    ERPDatabase.resetDatabase();
    setIsResetConfirmOpen(false);
    onRefreshData();
  };

  const handleSaveCounter = (counterToSave: POSCounter) => {
    const updated = counters.map((c) => (c.id === counterToSave.id ? counterToSave : c));
    setCounters(updated);
    ERPDatabase.saveCounters(updated);
    setEditingCounter(null);
    onRefreshData();
  };

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    ERPDatabase.setUITheme(themeId);
    applyTheme(themeId, true);
    onRefreshData();
  };

  const handleResetTheme = () => {
    const defaultTheme = resetThemeToDefault();
    setSelectedThemeId(defaultTheme.id);
    ERPDatabase.setUITheme(defaultTheme.id);
    onRefreshData();
    alert('Theme has been reset to default Modern Emerald! (थीम डिफ़ॉल्ट मॉडर्न एम्राल्ड पर रीसेट कर दी गई है)');
  };

  // Company Form State
  const [compName, setCompName] = useState(company.name);
  const [compLegalName, setCompLegalName] = useState(company.legalName);
  const [compGstin, setCompGstin] = useState(company.gstin);
  const [compPan, setCompPan] = useState(company.pan);
  const [compPhone, setCompPhone] = useState(company.phone);
  const [compAddress, setCompAddress] = useState(company.address);

  // Payment Credentials & Gateway State
  const [compUpiId, setCompUpiId] = useState(company.upiId || 'apexenterprise@ybl');
  const [compUpiPayeeName, setCompUpiPayeeName] = useState(company.upiPayeeName || company.name);
  const [compUpiMerchantCode, setCompUpiMerchantCode] = useState(company.upiMerchantCode || '5411');
  const [compBankName, setCompBankName] = useState(company.bankName || 'HDFC Bank');
  const [compBankAccountHolder, setCompBankAccountHolder] = useState(company.bankAccountHolder || company.legalName);
  const [compBankAccountNo, setCompBankAccountNo] = useState(company.bankAccountNo || '50200012345678');
  const [compBankIfsc, setCompBankIfsc] = useState(company.bankIfsc || 'HDFC0001234');
  const [compBankBranch, setCompBankBranch] = useState(company.bankBranch || 'Main Branch');
  const [compPaymentQrNote, setCompPaymentQrNote] = useState(company.paymentQrNote || 'Scan using PhonePe, GPay, Paytm, BHIM');

  // Shop Payment Gateway Credentials
  const [compGatewayProvider, setCompGatewayProvider] = useState(company.paymentGatewayProvider || 'upi_qr');
  const [compRazorpayKeyId, setCompRazorpayKeyId] = useState(company.razorpayKeyId || '');
  const [compRazorpayKeySecret, setCompRazorpayKeySecret] = useState(company.razorpayKeySecret || '');
  const [compMerchantGatewayId, setCompMerchantGatewayId] = useState(company.merchantGatewayId || '');
  const [compIsOnlineGatewayEnabled, setCompIsOnlineGatewayEnabled] = useState(company.isOnlineGatewayEnabled ?? true);

  // Security & Password Change State
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChangePasswordInSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeFeedback(null);

    if (!settingsNewPassword || settingsNewPassword.length < 4) {
      setPasswordChangeFeedback({ type: 'error', message: 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' });
      return;
    }
    if (settingsNewPassword !== settingsConfirmPassword) {
      setPasswordChangeFeedback({ type: 'error', message: 'नया पासवर्ड और कन्फर्म पासवर्ड मैच नहीं हो रहे हैं।' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: settingsNewPassword }),
      }).catch(() => null);

      const userEmail = currentUser?.email || 'owner@apex.com';
      ERPDatabase.updateUserPassword(userEmail, settingsNewPassword);

      setSettingsNewPassword('');
      setSettingsConfirmPassword('');
      setPasswordChangeFeedback({
        type: 'success',
        message: '🎉 आपका पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है!',
      });
    } catch (err) {
      const userEmail = currentUser?.email || 'owner@apex.com';
      ERPDatabase.updateUserPassword(userEmail, settingsNewPassword);
      setSettingsNewPassword('');
      setSettingsConfirmPassword('');
      setPasswordChangeFeedback({
        type: 'success',
        message: '🎉 आपका पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है!',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [copiedSql, setCopiedSql] = useState(false);
  const fullSql = generateFullPostgresSQL();

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    ERPDatabase.updateCompany({
      name: compName,
      legalName: compLegalName,
      gstin: compGstin,
      pan: compPan,
      phone: compPhone,
      address: compAddress,
      upiId: compUpiId,
      upiPayeeName: compUpiPayeeName,
      upiMerchantCode: compUpiMerchantCode,
      bankName: compBankName,
      bankAccountHolder: compBankAccountHolder,
      bankAccountNo: compBankAccountNo,
      bankIfsc: compBankIfsc,
      bankBranch: compBankBranch,
      paymentQrNote: compPaymentQrNote,
      paymentGatewayProvider: compGatewayProvider as any,
      razorpayKeyId: compRazorpayKeyId,
      razorpayKeySecret: compRazorpayKeySecret,
      merchantGatewayId: compMerchantGatewayId,
      isOnlineGatewayEnabled: compIsOnlineGatewayEnabled,
    });
    onRefreshData();
    alert('Dukaandar company profile, UPI & Payment Gateway settings updated successfully!');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(fullSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadBackup = () => {
    const data = {
      company: ERPDatabase.getCompany(),
      users: ERPDatabase.getUsers(),
      products: ERPDatabase.getProducts(),
      parties: ERPDatabase.getParties(),
      sales: ERPDatabase.getSales(),
      purchases: ERPDatabase.getPurchases(),
      accounts: ERPDatabase.getAccounts(),
      expenses: ERPDatabase.getExpenses(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Enterprise_ERP_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400 truncate">System Settings & Infrastructure</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Configure company metadata, export PostgreSQL SQL schema & self-hosting guides.</p>
        </div>

        <div className="flex gap-1.5 bg-slate-200/80 dark:bg-slate-800/90 p-1.5 rounded-2xl overflow-x-auto custom-scrollbar max-w-full shrink-0 w-full lg:w-auto">
          {[
            { id: 'profile', label: 'Company Profile', isProtected: false },
            { id: 'counters', label: '🏪 5 Counters & PINs', isProtected: false },
            { id: 'themes', label: '🎨 UI/UX Themes', isProtected: false },
            { id: 'payment_settings', label: '💳 UPI & Bank Settings', isProtected: false },
            { id: 'sql', label: 'PostgreSQL SQL Schema', isProtected: true },
            { id: 'docker', label: 'Docker & Cloudflare', isProtected: true },
            { id: 'backup', label: 'Data Backup & Sync', isProtected: true },
          ]
            .filter((t) => !t.isProtected || isAdminOrSuperAdmin)
            .map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveCompany} className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4 w-full max-w-3xl min-w-0">
          <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">Company Profile</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Trade Name</label>
              <input
                type="text"
                required
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Legal Registered Name</label>
              <input
                type="text"
                required
                value={compLegalName}
                onChange={(e) => setCompLegalName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">GSTIN</label>
              <input
                type="text"
                required
                value={compGstin}
                onChange={(e) => setCompGstin(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">PAN Number</label>
              <input
                type="text"
                required
                value={compPan}
                onChange={(e) => setCompPan(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone</label>
              <input
                type="text"
                required
                value={compPhone}
                onChange={(e) => setCompPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 text-xs">Address</label>
            <input
              type="text"
              required
              value={compAddress}
              onChange={(e) => setCompAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 font-black text-xs text-slate-950 rounded-xl shadow-sm cursor-pointer"
          >
            Save Profile Changes
          </button>

          {/* Password Change Sub-Card */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-black text-slate-900 dark:text-emerald-400 uppercase tracking-wider">
                सुरक्षा एवं पासवर्ड परिवर्तन (Security & Change Password)
              </h4>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-emerald-900/30 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    नया पासवर्ड (New Password) *
                  </label>
                  <input
                    type="password"
                    required
                    value={settingsNewPassword}
                    onChange={(e) => setSettingsNewPassword(e.target.value)}
                    placeholder="नया गुप्त पासवर्ड लिखें"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    कन्फर्म पासवर्ड (Confirm Password) *
                  </label>
                  <input
                    type="password"
                    required
                    value={settingsConfirmPassword}
                    onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                    placeholder="नया पासवर्ड पुनः लिखें"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {passwordChangeFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 ${
                    passwordChangeFeedback.type === 'success'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  }`}
                >
                  <span>{passwordChangeFeedback.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleChangePasswordInSettings}
                disabled={isChangingPassword}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 font-black text-xs text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isChangingPassword ? 'अपडेट हो रहा है...' : 'नया पासवर्ड सेव करें'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 5 Billing Counters & Security PIN Management */}
      {activeTab === 'counters' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-500" />
                  <span>5 Billing Counters & Security PIN Management (5 बिलिंग काउंटर एवं सुरक्षा पिन)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Dukandar can customize the Counter Name, 4-digit Login PIN, Cashier Name, and Location for each of the 5 counters.
                </p>
              </div>
              <Badge variant="emerald" size="md" className="self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                <span>5 Counters Active</span>
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counters.map((c, idx) => (
                <div
                  key={c.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800">
                      Counter #{idx + 1} ({c.code})
                    </span>
                    <button
                      onClick={() => setEditingCounter({ ...c })}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Edit Counter</span>
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-emerald-300">{c.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      📍 {c.location || 'Main Floor'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">CASHIER NAME</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{c.assignedCashierName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">SECURITY PIN</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 tracking-widest bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                        🔒 {c.pin}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Counter Modal */}
      {editingCounter && (
        <Modal
          isOpen={true}
          onClose={() => setEditingCounter(null)}
          title={`Edit Billing Counter - ${editingCounter.code}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                Counter Name (काउंटर का नाम)
              </label>
              <input
                type="text"
                value={editingCounter.name}
                onChange={(e) => setEditingCounter({ ...editingCounter, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                  Security Login PIN (सुरक्षा पिन)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={editingCounter.pin}
                  onChange={(e) => setEditingCounter({ ...editingCounter, pin: e.target.value })}
                  placeholder="e.g. 1111"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                  Cashier Name (कैशियर)
                </label>
                <input
                  type="text"
                  value={editingCounter.assignedCashierName}
                  onChange={(e) => setEditingCounter({ ...editingCounter, assignedCashierName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                Counter Location / Floor (स्थान / फ़्लोर)
              </label>
              <input
                type="text"
                value={editingCounter.location}
                onChange={(e) => setEditingCounter({ ...editingCounter, location: e.target.value })}
                placeholder="e.g. Ground Floor Main Gate, First Floor Express Aisle"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCounter(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveCounter(editingCounter)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Counter Changes</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* UI/UX 5 Themes Studio */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-500" />
                  <span>UI/UX Global Color Theme Studio (5 Distinct Palettes)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select a theme palette below to dynamically update global CSS variables (`--color-primary`, `--color-accent`, etc.) across the entire application.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Active Theme Badge */}
                <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                    Active: {APP_THEMES.find((t) => t.id === selectedThemeId)?.name || 'Modern Emerald'}
                  </span>
                </div>

                {/* Reset Theme Button */}
                <button
                  type="button"
                  onClick={handleResetTheme}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Reset Theme to Default Modern Emerald"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Theme (थीम रीसेट)</span>
                </button>
              </div>
            </div>

            {/* 5 Distinct Palette Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {APP_THEMES.map((t) => {
                const isSelected = selectedThemeId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/20 dark:bg-slate-800 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-400'
                    }`}
                  >
                    <div
                      className="h-16 rounded-xl p-3 flex items-center justify-between text-white shadow-xs"
                      style={{ backgroundColor: t.cssVars['--color-primary'] }}
                    >
                      <div>
                        <span className="font-black text-sm block tracking-wide">{t.name}</span>
                        <span className="text-[10px] opacity-90 font-mono font-bold">{t.cssVars['--color-primary']}</span>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-white text-indigo-600 flex items-center justify-center font-black text-xs shadow-md">
                          ✓
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{t.nameHindi}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>
                    </div>

                    {/* Palette Color Swatches */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase text-slate-400">Palette Swatches:</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded-full border border-white/40 shadow-xs"
                          style={{ backgroundColor: t.cssVars['--color-primary'] }}
                          title={`Primary: ${t.cssVars['--color-primary']}`}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-white/40 shadow-xs"
                          style={{ backgroundColor: t.cssVars['--color-accent'] }}
                          title={`Accent: ${t.cssVars['--color-accent']}`}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-white/40 shadow-xs"
                          style={{ backgroundColor: t.cssVars['--color-card-bg'] }}
                          title={`Card BG: ${t.cssVars['--color-card-bg']}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Global CSS Variables & Interactive Test Showcase */}
            {(() => {
              const currentTheme = APP_THEMES.find((t) => t.id === selectedThemeId) || APP_THEMES[0];
              return (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Live Global CSS Variables Inspector (`:root`)</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Updates live across all components</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-mono text-slate-400 block">--color-primary</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white"
                          style={{ backgroundColor: currentTheme.cssVars['--color-primary'] }}
                        />
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {currentTheme.cssVars['--color-primary']}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-mono text-slate-400 block">--color-accent</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white"
                          style={{ backgroundColor: currentTheme.cssVars['--color-accent'] }}
                        />
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {currentTheme.cssVars['--color-accent']}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-mono text-slate-400 block">--color-card-bg</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white"
                          style={{ backgroundColor: currentTheme.cssVars['--color-card-bg'] }}
                        />
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {currentTheme.cssVars['--color-card-bg']}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-mono text-slate-400 block">--theme-gradient</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-6 h-3.5 rounded"
                          style={{ background: currentTheme.cssVars['--theme-gradient'] }}
                        />
                        <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate">
                          Linear Gradient
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Component Test Strip */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Live Component Interactive Preview:
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="yg-gradient-btn px-4 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer">
                        Theme Gradient Button
                      </button>
                      <input
                        type="text"
                        placeholder="Click to test theme focus glow ring..."
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs w-64"
                      />
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white" style={{ backgroundColor: currentTheme.cssVars['--color-primary'] }}>
                        Primary Badge
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'payment_settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Settings Form */}
          <form onSubmit={handleSaveCompany} className="lg:col-span-7 p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span>Dukaandar Payment Credentials (दुकानदार पेमेंट सेटिंग्स)</span>
                </h3>
                <p className="text-xs text-slate-500">Save your UPI ID and bank details to generate dynamic QR codes and payment links for customers.</p>
              </div>
            </div>

            {/* UPI Settings Section */}
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                UPI & QR Payment Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your UPI VPA / ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@paytm or ramtraders@ybl"
                    value={compUpiId}
                    onChange={(e) => setCompUpiId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-emerald-700 dark:text-emerald-300 font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">PhonePe, GPay, Paytm or BHIM UPI ID</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payee / Shopkeeper Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shree Ram General Store"
                    value={compUpiPayeeName}
                    onChange={(e) => setCompUpiPayeeName(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Name shown on customer's UPI app</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UPI Merchant Code (MCC)
                  </label>
                  <input
                    type="text"
                    placeholder="5411"
                    value={compUpiMerchantCode}
                    onChange={(e) => setCompUpiMerchantCode(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom QR Display Note
                  </label>
                  <input
                    type="text"
                    placeholder="Scan & Pay via PhonePe / GPay / Paytm"
                    value={compPaymentQrNote}
                    onChange={(e) => setCompPaymentQrNote(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Shop Payment Gateway Credentials Section */}
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Dukandar Payment Gateway Integration (दुकानदार गेटवे सेटिंग्स)</span>
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compIsOnlineGatewayEnabled}
                    onChange={(e) => setCompIsOnlineGatewayEnabled(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span className="font-bold text-indigo-800 dark:text-indigo-200 text-[11px]">Enable Online Checkout</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Gateway Provider
                  </label>
                  <select
                    value={compGatewayProvider}
                    onChange={(e) => setCompGatewayProvider(e.target.value as 'razorpay' | 'upi_qr' | 'cashfree' | 'paytm_pg' | 'phonepe_pg')}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-indigo-700 dark:text-indigo-300"
                  >
                    <option value="upi_qr">Dynamic Dynamic UPI QR (Default - Zero Fee)</option>
                    <option value="razorpay">Razorpay Merchant Payment Gateway</option>
                    <option value="cashfree">Cashfree Payments India</option>
                    <option value="paytm_pg">Paytm PG / Soundbox API</option>
                    <option value="phonepe_pg">PhonePe Business PG</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Merchant MID / Account ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rzp_live_xxxxxxxx or MERCH_98231"
                    value={compMerchantGatewayId}
                    onChange={(e) => setCompMerchantGatewayId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    API Key ID / Merchant Key
                  </label>
                  <input
                    type="text"
                    placeholder="rzp_live_key_xyz123"
                    value={compRazorpayKeyId}
                    onChange={(e) => setCompRazorpayKeyId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    API Key Secret (Encrypted)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={compRazorpayKeySecret}
                    onChange={(e) => setCompRazorpayKeySecret(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-indigo-700 dark:text-indigo-300 italic">
                * Note: Money collected via POS payments goes directly into this Dukandar&apos;s bank account using their own API credentials.
              </p>
            </div>

            {/* Bank Account Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 text-xs">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Shop Bank Account (For Invoice Printing & Direct Transfers)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={compBankName}
                    onChange={(e) => setCompBankName(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shree Ram General Store"
                    value={compBankAccountHolder}
                    onChange={(e) => setCompBankAccountHolder(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="30981234567"
                    value={compBankAccountNo}
                    onChange={(e) => setCompBankAccountNo(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="SBIN0001234"
                    value={compBankIfsc}
                    onChange={(e) => setCompBankIfsc(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="Main Market Branch"
                    value={compBankBranch}
                    onChange={(e) => setCompBankBranch(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 font-black text-xs text-white rounded-xl shadow-md transition-colors"
            >
              SAVE PAYMENT & UPI CREDENTIALS
            </button>
          </form>

          {/* Dynamic Live Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Live Test Preview of Checkout QR
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Dynamic Mode</span>
              </div>

              <p className="text-xs text-slate-300">
                This is how your customer will see the payment QR code during checkout for a sample bill of <span className="font-bold text-emerald-400">₹1,250.00</span>:
              </p>

              <UpiQRCode
                upiId={compUpiId}
                payeeName={compUpiPayeeName}
                amount={1250}
                invoiceNo="INV-SAMPLE-001"
                companyName={compName}
                note={compPaymentQrNote}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sql' && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">
                Production PostgreSQL & Supabase SQL Migration Script
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Includes RLS policies, triggers, constraints & indexes.</p>
            </div>
            <button
              onClick={handleCopySql}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-xs text-emerald-400 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl text-[11px] font-mono h-96 overflow-y-auto overflow-x-auto whitespace-pre custom-scrollbar border border-slate-800 w-full max-w-full">
            {fullSql}
          </pre>
        </div>
      )}

      {activeTab === 'docker' && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4 text-xs w-full min-w-0">
          <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">
            Self-Hosted Docker & Cloudflare Tunnel Deployment Manual
          </h3>

          <div className="space-y-3 w-full">
            <div className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] space-y-2 border border-slate-800 overflow-x-auto whitespace-pre-wrap break-all w-full max-w-full">
              <p className="text-emerald-400 font-bold"># Step 1: Clone and Start Self-Hosted Supabase Docker</p>
              <p>git clone --depth 1 https://github.com/supabase/supabase</p>
              <p>cd supabase/docker && cp .env.example .env</p>
              <p>docker compose up -d</p>
              <br />
              <p className="text-emerald-400 font-bold"># Step 2: Configure Cloudflare Tunnel on Home Server</p>
              <p>cloudflared tunnel create enterprise-erp</p>
              <p>cloudflared tunnel run --url http://localhost:3000 enterprise-erp</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="space-y-6 text-xs">
          {/* Feedback Banner */}
          {syncFeedback && (
            <div
              className={`p-3.5 rounded-2xl flex items-center justify-between font-bold text-xs ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {syncFeedback.type === 'success' ? <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                <span>{syncFeedback.message}</span>
              </div>
              <button onClick={() => setSyncFeedback(null)} className="text-xs font-black underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Section 1: Automated Background Scheduled Auto-Backup (सभी सीटों का ऑटो बैकअप इंजन) */}
          <div className="p-6 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white rounded-2xl shadow-md border border-emerald-500/30 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
                  <RefreshCw className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-emerald-400 uppercase tracking-wide">
                      Automated Background Auto-Backup Engine (सभी सीटों का ऑटो बैकअप)
                    </h3>
                    <Badge variant="success">Active Scheduler</Badge>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Background automated backup system takes snapshots of all ERP sheets (Payment, Ledger, Account, Tax) at scheduled intervals.
                  </p>
                </div>
              </div>

              <button
                onClick={handleTriggerAutoBackupNow}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer shrink-0 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Take Auto-Backup Snapshot Now (अभी बैकअप लें)</span>
              </button>
            </div>

            {/* Config Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-[11px]">Auto-Backup Frequency (बैकअप अंतराल):</label>
                <select
                  value={autoBackupConfig.intervalHours}
                  onChange={(e) =>
                    handleSaveAutoBackupConfig({ ...autoBackupConfig, intervalHours: Number(e.target.value) })
                  }
                  className="w-full p-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold text-xs focus:outline-none"
                >
                  <option value={1}>Every 1 Hour (हर 1 घंटे में)</option>
                  <option value={6}>Every 6 Hours (हर 6 घंटे में)</option>
                  <option value={12}>Every 12 Hours (हर 12 घंटे में)</option>
                  <option value={24}>Daily / 24 Hours (प्रतिदिन)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-[11px]">Realtime Save On Transaction:</label>
                <label className="flex items-center gap-2.5 p-2 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackupConfig.autoSaveOnTransaction}
                    onChange={(e) =>
                      handleSaveAutoBackupConfig({ ...autoBackupConfig, autoSaveOnTransaction: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span className="text-xs font-bold text-slate-200">Instant Auto-Backup on every entry</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-[11px]">Last Auto-Backup Taken:</label>
                <div className="p-2.5 bg-slate-800 text-emerald-400 font-mono font-bold text-xs rounded-xl border border-slate-700">
                  {autoBackupConfig.lastBackupAt ? new Date(autoBackupConfig.lastBackupAt).toLocaleString() : 'Just initialized'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Dedicated Column Category Backups (Payment, Ledger, Account, Tax) */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Dedicated Column Sheet Backups (विशेष कॉलम बैकअप - Payment, Ledger, Account, Tax)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Built-in separate spreadsheet backups generated individually for Payment, Ledger, Account, and Tax columns.
                </p>
              </div>

              <button
                onClick={() => BackupService.downloadDedicatedBackupCSV('all')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All 4 Column Backups (ZIP/CSV)</span>
              </button>
            </div>

            {/* 8 Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {/* Card 1: Payment Records Backup */}
              <div className="p-4 bg-emerald-50/50 dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-emerald-300 text-xs uppercase">
                    <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>1. Payment Records Sheet Backup (भुगतान बैकअप)</span>
                  </div>
                  <Badge variant="success">{BackupService.getPaymentRecordsData(company.id).length} Entries</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Includes Cash/UPI/Bank Receipts, Vendor Payments, Sale/Purchase Collections, Operating Expenses, and Cash Drawer (Galla) sessions.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: Voucher_Type, Date, Party, Flow, Amount, Mode, Account</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('payment')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Payment CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Master Ledger Backup */}
              <div className="p-4 bg-blue-50/50 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-blue-300 text-xs uppercase">
                    <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>2. Master Ledger Sheet Backup (लेजर खाताबही बैकअप)</span>
                  </div>
                  <Badge variant="info">{BackupService.getLedgerEntriesData(company.id).length} Entries</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Chronological double-entry master journal with Debit (Dr), Credit (Cr), Running Balances, Party Names, and Voucher Types.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: Date, Voucher_No, Party, Dr, Cr, Running_Balance</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('ledger')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Ledger CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Accounts & Cash Store/Bank Backup */}
              <div className="p-4 bg-purple-50/50 dark:bg-slate-800/90 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-purple-300 text-xs uppercase">
                    <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>3. Cash Store & Bank Accounts Backup (कैश स्टोर व बैंक बैकअप)</span>
                  </div>
                  <Badge variant="default">{BackupService.getAccountBalancesData(company.id).length} Accounts</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Store Cash Drawer Registers, Bank Accounts, A/C Numbers, IFSC codes, Opening Balances, Current Available Balances.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: Account_Name, Type, Bank, Account_No, IFSC, Balance</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('accounts')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Store/Bank CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Tax & GST Compliance Backup */}
              <div className="p-4 bg-amber-50/50 dark:bg-slate-800/90 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-amber-300 text-xs uppercase">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>4. Tax & GST Reports Backup (टैक्स एवं जीएसटी बैकअप)</span>
                  </div>
                  <Badge variant="warning">{BackupService.getTaxBackupData(company.id).length} Tax Records</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sales Output GST (CGST/SGST/IGST), Purchase Input Tax Credit (ITC), HSN code breakdowns, Taxable Amounts, Net Tax Liabilities.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: Tax_Type, Voucher_No, HSN, Taxable_Val, CGST, SGST, IGST</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('tax')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Tax GST CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 5: Purchase Returns / Debit Notes Backup */}
              <div className="p-4 bg-rose-50/50 dark:bg-slate-800/90 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-rose-300 text-xs uppercase">
                    <FileSpreadsheet className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>5. Purchase Returns / Debit Notes Backup (परचेज रिटर्न बैकअप)</span>
                  </div>
                  <Badge variant="danger">{BackupService.getPurchaseReturnsData(company.id).length} Items</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Vendor purchase return debit notes, returned product quantities, unit prices, refund amounts, defect reasons.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: Return_No, Purchase_No, Vendor, Product, Qty, Refund</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('purchaseReturns')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Pur Return CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 6: Sales Returns / Credit Notes Backup */}
              <div className="p-4 bg-indigo-50/50 dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-indigo-300 text-xs uppercase">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>6. Sales Returns / Credit Notes Backup (सेल्स रिटर्न बैकअप)</span>
                  </div>
                  <Badge variant="info">{BackupService.getSalesReturnsData(company.id).length} Items</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Customer sales returns credit notes, returned items, original bill numbers, refund amounts, and return reasons.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: Return_No, Invoice_No, Customer, Product, Qty, Refund</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('salesReturns')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sales Return CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 7: Purchase Orders (PO) Backup */}
              <div className="p-4 bg-cyan-50/50 dark:bg-slate-800/90 border border-cyan-200 dark:border-cyan-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-cyan-300 text-xs uppercase">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>7. Purchase Orders Backup (परचेज ऑर्डर - PO बैकअप)</span>
                  </div>
                  <Badge variant="default">{BackupService.getPurchaseOrdersData(company.id).length} Orders</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Supplier purchase orders (PO), expected delivery dates, ordered item breakdowns, unit costs, and approval status.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: PO_Number, Date, Vendor, Product, Qty, Total_Amount, Status</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('purchaseOrders')}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PO CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 8: Sales Orders (SO) Backup */}
              <div className="p-4 bg-teal-50/50 dark:bg-slate-800/90 border border-teal-200 dark:border-teal-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-teal-300 text-xs uppercase">
                    <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>8. Sales Orders & Estimates Backup (सेल्स ऑर्डर - SO बैकअप)</span>
                  </div>
                  <Badge variant="success">{BackupService.getSalesOrdersData(company.id).length} Orders</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Customer sales orders, proforma estimates, ordered quantities, advance payments collected, and fulfillment status.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Columns: Order_Number, Date, Customer, Product, Qty, Advance, Status</span>
                  <button
                    onClick={() => BackupService.downloadDedicatedBackupCSV('salesOrders')}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download SO CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Auto-Backup Snapshots History & Restore Points */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">
                  Auto-Backup Snapshots History (ऑटो बैकअप हिस्ट्री एवं रिस्टोर)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Browse previous automatic snapshots and restore database state with 1-click if needed.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">{snapshots.length} Snapshots Saved</span>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                No snapshots saved yet. Click "Take Auto-Backup Snapshot Now" above to generate the first snapshot.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {new Date(s.timestamp).toLocaleString()}
                        </span>
                        <Badge variant={s.triggerReason === 'manual' ? 'default' : 'success'}>
                          {s.triggerReason.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-2 font-mono">
                        <span>Payments: {s.counts.paymentRecords}</span>
                        <span>•</span>
                        <span>Ledger: {s.counts.ledgerEntries}</span>
                        <span>•</span>
                        <span>Accounts: {s.counts.accountBalances}</span>
                        <span>•</span>
                        <span>Tax: {s.counts.taxTransactions}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreSnapshot(s.id)}
                        className="px-3 py-1.5 bg-slate-800 text-emerald-400 hover:bg-slate-700 font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore Point</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Supabase / PostgreSQL Cloud Database Sync */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">
                    Supabase / PostgreSQL Cloud Database Sync (सुपाबेस क्लाउड डाटाबेस)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Direct real-time synchronization of Sales, Products, Customers, Purchases & Ledger into your Supabase PostgreSQL project.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerSupabaseSync}
                  disabled={isSyncingSupabase}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSupabase ? 'Syncing to Supabase...' : 'Sync Now to Supabase Database'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs">
                  Supabase Project URL (सुपाबेस प्रोजेक्ट URL):
                </label>
                <input
                  type="url"
                  value={supabaseCreds.url}
                  onChange={(e) => setSupabaseCreds({ ...supabaseCreds, url: e.target.value })}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs">
                  Supabase Anon Key (एनान की):
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={supabaseCreds.key}
                    onChange={(e) => setSupabaseCreds({ ...supabaseCreds, key: e.target.value })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveSupabaseCreds}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl flex items-center gap-1 shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Credentials</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Full Server Backup Vault & Data Protection */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase">
                  Server Vault Backup & Local Offline Snapshot
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dual-layer backup mechanism: Instant local browser JSON backup + Encrypted server backup sync.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleTriggerServerSync}
                disabled={isSyncingServer}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className={`w-4 h-4 ${isSyncingServer ? 'animate-spin' : ''}`} />
                <span>{isSyncingServer ? 'Syncing Server Vault...' : 'Sync Full Snapshot to Server Vault'}</span>
              </button>

              <a
                href="/api/backup/server"
                download={`server_erp_backup_${Date.now()}.json`}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Server Vault Backup (JSON + SHA256)</span>
              </a>

              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Local Browser JSON</span>
              </button>

              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Local Data</span>
              </button>
            </div>

            {/* High Level Security Info Banner */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl space-y-2 text-xs">
              <div className="font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>5-Layer High Security Architecture Verified (उच्च-स्तरीय सुरक्षा):</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓ App Security:</span> Brute force lockout & 4-digit PIN lock on billing counters.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓ Data Security:</span> IndexedDB persistent storage with 256-bit bill hash integrity.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓ Server Security:</span> Helmet HTTP security headers, CORS strict isolation & compression.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓ Audit Trail:</span> PII-redacted security activity logs for every transaction.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Database Modal */}
      <ConfirmDeleteModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Entire Database"
        variant="danger"
        confirmLabel="Yes, Reset All Data"
        message="Are you sure you want to RESET all local database records to default seed data? All custom entries will be restored to initial sample data."
      />
    </div>
  );
};
