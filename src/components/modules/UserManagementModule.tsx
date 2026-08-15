import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  ShieldCheck,
  UserCheck,
  Lock,
  Building,
  QrCode,
  ShieldAlert,
  Store,
  CheckCircle2,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  ArrowRight,
  Crown,
  Calendar,
  Sparkles,
  RefreshCw,
  Clock,
  AlertTriangle,
  BookOpen,
  Edit2,
  Trash2,
  Check,
  X,
  Key,
  Shield,
  Eye,
  LogIn
} from 'lucide-react';
import { User, UserRole, Company } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { StaffService } from '../../services/staffService';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface UserManagementModuleProps {
  users: User[];
  company: Company;
  onRefreshData: () => void;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  users = [],
  company,
  onRefreshData,
}) => {
  const currentUser = ERPDatabase.getCurrentUser();
  const companies = ERPDatabase.getCompanies();

  // Super Admin Authorization check
  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.email === 'admin@billkart.shop' ||
    currentUser?.email === 'superadmin@apex.com' ||
    currentUser?.email === 'sitaramghintala54@gmail.com';

  // Store Owner / Admin check
  const isStoreOwner =
    isSuperAdmin ||
    currentUser?.role === 'owner' ||
    currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'staff' | 'matrix' | 'shops'>('staff');

  // Modals state
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
  const [editingStaffUser, setEditingStaffUser] = useState<User | null>(null);
  const [resetPinStaffUser, setResetPinStaffUser] = useState<User | null>(null);
  const [resetPinValue, setResetPinValue] = useState('1234');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Server-synced staff state
  const [serverStaffList, setServerStaffList] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  const loadStaff = async () => {
    setIsLoadingStaff(true);
    const list = await StaffService.fetchStaffList(company.id);
    setServerStaffList(list);
    setIsLoadingStaff(false);
  };

  useEffect(() => {
    loadStaff();
  }, [company.id]);

  // New Shop Form State
  const [shopName, setShopName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [paymentQrNote, setPaymentQrNote] = useState('Scan & Pay using GPay, PhonePe, Paytm or any UPI App');

  // Subscription / Prime Plan Onboarding State
  const [subPlan, setSubPlan] = useState<'free_trial' | 'starter' | 'prime' | 'enterprise'>('prime');
  const [validityMonths, setValidityMonths] = useState<number>(12);
  const [renewShopComp, setRenewShopComp] = useState<Company | null>(null);
  const [renewMonths, setRenewMonths] = useState<number>(12);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // New / Edit Staff User Form State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPin, setUserPin] = useState('1234');
  const [userRole, setUserRole] = useState<UserRole>('cashier');
  const [targetCompanyId, setTargetCompanyId] = useState(company.id);

  const roleColors: Record<UserRole, any> = {
    super_admin: 'rose',
    admin: 'rose',
    owner: 'emerald',
    manager: 'amber',
    accountant: 'purple',
    cashier: 'cyan',
    stock_keeper: 'indigo',
  };

  const roleTitles: Record<UserRole, { title: string; desc: string }> = {
    super_admin: { title: 'Super Admin', desc: 'System Master & Platform Management' },
    owner: { title: 'Dukandar / Shop Owner', desc: 'Full Shop Control, P&L, Settings & Staff Access' },
    admin: { title: 'Administrator', desc: 'Full Administrative Operations & Staff Setup' },
    manager: { title: 'Store Manager', desc: 'Sales, Purchases, Inventory, Reports & Daily Operations' },
    accountant: { title: 'Accountant / CA', desc: 'GST Reports, Master Ledger, Bank/Cash Accounts & Expenses' },
    cashier: { title: 'Billing Cashier', desc: 'POS Billing, Invoices, Customer Udhar Recovery & Receipts' },
    stock_keeper: { title: 'Stock / Inventory Clerk', desc: 'Inventory Stocking, Purchases & Vendor Receipts' },
  };

  const handleCreateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !ownerName || !ownerEmail || !ownerPin) return;

    // Calculate Prime Plan Expiration Date
    const now = new Date();
    const expiresAtDate = new Date(now);
    expiresAtDate.setMonth(expiresAtDate.getMonth() + validityMonths);

    // 1. Create the new Shop Workspace with dedicated payment credentials & subscription
    const newCompany = ERPDatabase.addCompany({
      name: shopName,
      legalName: legalName || `${shopName} Pvt Ltd`,
      gstin: gstin || 'UNREGISTERED',
      pan: pan || 'N/A',
      email: ownerEmail,
      phone: ownerPhone || '+91 98000 00000',
      address: address || 'Main Market Road',
      city: city || 'Mumbai',
      state: stateName,
      pincode: pincode || '400001',
      currency: '₹',
      financialYearStart: '2026-04-01',
      upiId: upiId || `${ownerEmail.split('@')[0]}@upi`,
      upiPayeeName: upiPayeeName || shopName,
      upiMerchantCode: '5411',
      bankName: bankName || 'State Bank of India',
      bankAccountHolder: upiPayeeName || shopName,
      bankAccountNo: bankAccountNo || '123456789012',
      bankIfsc: bankIfsc || 'SBIN0001234',
      bankBranch: `${city || 'Mumbai'} Branch`,
      paymentQrNote,
      subscriptionStatus: 'active',
      subscriptionPlan: subPlan,
      subscriptionExpiresAt: expiresAtDate.toISOString(),
      ownerName,
      ownerPhone,
    });

    // 2. Automatically create & link the primary Shopkeeper (Owner) User with Password/PIN
    const newOwnerUser = ERPDatabase.addUser({
      companyId: newCompany.id,
      name: `${ownerName} (Owner)`,
      email: ownerEmail,
      phone: ownerPhone,
      role: 'owner',
      status: 'active',
      pin: ownerPin,
      password: ownerPin,
    } as any);

    // Store encrypted/hashed password update locally
    ERPDatabase.updateUserPassword(ownerEmail, ownerPin);

    // Sync owner creation to server backend asynchronously
    StaffService.createStaff({
      name: `${ownerName} (Owner)`,
      email: ownerEmail,
      phone: ownerPhone,
      role: 'owner',
      pin: ownerPin,
      companyId: newCompany.id,
    }).catch((err) => console.warn('[OnboardShop] Server staff creation sync note:', err));

    // 3. Reset form
    setShopName('');
    setLegalName('');
    setOwnerName('');
    setOwnerEmail('');
    setOwnerPhone('');
    setOwnerPin('');
    setGstin('');
    setPan('');
    setAddress('');
    setCity('');
    setPincode('');
    setUpiId('');
    setUpiPayeeName('');
    setBankName('');
    setBankAccountNo('');
    setBankIfsc('');
    setIsAddShopModalOpen(false);

    setSuccessMessage(
      `✅ Manual Onboarding Complete! New Shop "${newCompany.name}" (ID: ${newCompany.id}) created with Owner ${newOwnerUser.email} & Password set successfully (Prime Plan valid till ${expiresAtDate.toLocaleDateString('en-IN')}).`
    );

    onRefreshData();
  };

  const handleRenewSubscription = (companyToRenew: Company, addMonths: number) => {
    const currentExpiry = companyToRenew.subscriptionExpiresAt
      ? new Date(companyToRenew.subscriptionExpiresAt)
      : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    baseDate.setMonth(baseDate.getMonth() + addMonths);

    ERPDatabase.updateCompany({
      subscriptionStatus: 'active',
      subscriptionPlan: 'prime',
      subscriptionExpiresAt: baseDate.toISOString(),
    }, companyToRenew.id);

    setRenewShopComp(null);
    setSuccessMessage(
      `🎉 Prime Subscription for "${companyToRenew.name}" extended by ${addMonths} Months! Valid until ${baseDate.toLocaleDateString('en-IN')}.`
    );
    onRefreshData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;
    setErrorMessage(null);

    if (editingStaffUser) {
      const res = await StaffService.updateStaff(editingStaffUser.id, {
        name: userName,
        email: userEmail,
        phone: userPhone,
        role: userRole,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update staff member.');
        return;
      }

      if (userPin) {
        await StaffService.resetStaffPassword(editingStaffUser.id, userPin);
      }
      setSuccessMessage(`✅ Staff account "${userName}" updated successfully!`);
    } else {
      const res = await StaffService.createStaff({
        companyId: targetCompanyId || company.id,
        name: userName,
        email: userEmail,
        phone: userPhone,
        role: userRole,
        pin: userPin || '1234',
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create staff member.');
        return;
      }

      setSuccessMessage(`🎉 New staff member "${userName}" added as ${userRole.toUpperCase()}!`);
    }

    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setUserPin('1234');
    setEditingStaffUser(null);
    setIsAddUserModalOpen(false);
    loadStaff();
    onRefreshData();
  };

  const handleOpenEditStaff = (staff: User) => {
    setEditingStaffUser(staff);
    setUserName(staff.name);
    setUserEmail(staff.email);
    setUserPhone(staff.phone || '');
    setUserRole(staff.role);
    setTargetCompanyId(staff.companyId);
    setUserPin('1234');
    setErrorMessage(null);
    setIsAddUserModalOpen(true);
  };

  const handleOpenResetPinModal = (staff: User) => {
    setResetPinStaffUser(staff);
    setResetPinValue('1234');
    setErrorMessage(null);
    setIsResetPinModalOpen(true);
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinStaffUser || !resetPinValue) return;
    setErrorMessage(null);

    const res = await StaffService.resetStaffPassword(resetPinStaffUser.id, resetPinValue);
    if (res.success) {
      setSuccessMessage(`🔑 Password/PIN for "${resetPinStaffUser.name}" reset successfully! Active session tokens revoked.`);
      setIsResetPinModalOpen(false);
      setResetPinStaffUser(null);
      loadStaff();
      onRefreshData();
    } else {
      setErrorMessage(res.error || 'Failed to reset PIN.');
    }
  };

  const handleToggleUserStatus = async (staff: User) => {
    setErrorMessage(null);
    const isActivating = staff.status !== 'active';
    const res = await StaffService.updateStaff(staff.id, {
      isActive: isActivating,
    });

    if (res.success) {
      setSuccessMessage(`Account status for "${staff.name}" changed to ${isActivating ? 'ACTIVE' : 'INACTIVE'}`);
      loadStaff();
      onRefreshData();
    } else {
      setErrorMessage(res.error || 'Failed to update account status.');
    }
  };

  const handleDeleteUser = async (staff: User) => {
    if (confirm(`Are you sure you want to soft-delete staff member "${staff.name}" (${staff.email})? Historical billing records will remain intact.`)) {
      setErrorMessage(null);
      const res = await StaffService.deleteStaff(staff.id);
      if (res.success) {
        setSuccessMessage(`Staff member "${staff.name}" soft-deleted and access revoked.`);
        loadStaff();
        onRefreshData();
      } else {
        setErrorMessage(res.error || 'Failed to delete staff member.');
      }
    }
  };

  const handleSwitchUserToSuperAdmin = () => {
    const adminUser = users.find((u) => u.role === 'super_admin' || u.email === 'admin@billkart.shop') || {
      id: 'usr-000',
      name: 'Super Admin (Billkart)',
      email: 'admin@billkart.shop',
      role: 'super_admin' as UserRole,
      companyId: 'comp-001',
      phone: '+91 99999 00000',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    ERPDatabase.setCurrentUser(adminUser);
    onRefreshData();
  };

  const handleSwitchToOwner = () => {
    const ownerUser = users.find((u) => u.companyId === company.id && (u.role === 'owner' || u.role === 'admin')) || {
      id: 'usr-001',
      name: `${company.ownerName || 'Dukandar Owner'} (Owner)`,
      email: company.email || 'owner@apex.com',
      role: 'owner' as UserRole,
      companyId: company.id,
      phone: company.phone,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    ERPDatabase.setCurrentUser(ownerUser);
    onRefreshData();
  };

  // IF NOT STORE OWNER OR ADMIN: Show Security Restriction Panel
  if (!isStoreOwner) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Restricted Staff View: </span>
              <span>Only Store Owner or Admin can add staff members and configure role-based access.</span>
            </div>
          </div>
          <button
            onClick={handleSwitchToOwner}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] whitespace-nowrap shadow-sm transition-all flex items-center gap-1"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Switch to Shop Owner Session</span>
          </button>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-950/80 text-amber-600 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Staff Management Restricted (स्टाफ प्रबंधन)
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              You are currently logged in as <strong className="text-slate-800 dark:text-slate-200">{currentUser?.name}</strong> with role <Badge variant="cyan">{currentUser?.role.toUpperCase()}</Badge>.
              Only the shop owner (<code className="font-bold text-emerald-600">{company.name}</code>) has permissions to invite staff and assign role restrictions.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <span className="text-slate-500">Shop Workspace:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{company.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <span className="text-slate-500">Your Current Role:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser?.role.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Allowed Access:</span>
              <span className="text-emerald-600 font-bold">POS Billing, Sales & Allowed Modules</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter staff members belonging to current shop
  const currentShopUsers = users.filter((u) => u.companyId === company.id);

  return (
    <div className="space-y-6">
      {/* Top Security Banner */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-bold">Role-Based Access Control (RBAC) Active: </span>
            <span>Add staff members for <strong>{company.name}</strong> and assign strict role-based dashboard permissions.</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">
            {currentUser?.role.toUpperCase()} LOGGED IN
          </Badge>
          {isSuperAdmin && (
            <Badge variant="rose" size="sm">
              SUPER ADMIN
            </Badge>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 dark:text-emerald-400 text-sm font-black">
            ✕
          </button>
        </div>
      )}

      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-emerald-600" />
            <span>Staff & Role-Based Access Control (स्टाफ एवं भूमिका प्रबंधन)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Dukandar Staff Manager: Add cashiers, managers, and stock clerks. Each role sees only their assigned dashboard and data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingStaffUser(null);
              setUserName('');
              setUserEmail('');
              setUserPhone('');
              setUserRole('cashier');
              setUserPin('1234');
              setTargetCompanyId(company.id);
              setIsAddUserModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-extrabold text-xs text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Staff Member</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setIsAddShopModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>+ Onboard New Shop</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Shop Name</p>
          <p className="text-lg font-black text-slate-900 dark:text-emerald-400 mt-1 truncate">{company.name}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">ID: {company.id}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Total Shop Staff</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{currentShopUsers.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active user accounts</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Billing Cashiers</p>
          <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
            {currentShopUsers.filter((u) => u.role === 'cashier').length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">POS Billing access only</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Role Access Control</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">STRICT ENFORCED</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Isolated Dashboard Data</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Shop Staff List ({currentShopUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Role Access Matrix (रोल के अनुसार अधिकार)</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('shops')}
            className={`pb-3 border-b-2 flex items-center gap-2 ${
              activeTab === 'shops'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Super Admin: All Multi-Tenant Shops ({companies.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: SHOP STAFF LIST */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Staff Members for {company.name}</span>
                </h3>
                <p className="text-xs text-slate-500">Each staff member logs in using their email/username and assigned security PIN.</p>
              </div>

              <button
                onClick={() => {
                  setEditingStaffUser(null);
                  setUserName('');
                  setUserEmail('');
                  setUserPhone('');
                  setUserRole('cashier');
                  setUserPin('1234');
                  setTargetCompanyId(company.id);
                  setIsAddUserModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </button>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-lg">Staff Name</th>
                  <th className="p-3">Login Email / Username</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentShopUsers.map((u) => {
                  const isCurrentActiveSession = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900 dark:text-emerald-300 flex items-center gap-2">
                          <span>{u.name}</span>
                          {isCurrentActiveSession && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px] rounded-full">
                              YOU (ACTIVE)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="p-3 font-mono text-slate-500">{u.phone || 'N/A'}</td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <Badge variant={roleColors[u.role]} size="sm">
                            {u.role.toUpperCase()}
                          </Badge>
                          <p className="text-[10px] text-slate-400">{roleTitles[u.role]?.desc}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Test Session Switch */}
                          <button
                            onClick={() => {
                              ERPDatabase.setCurrentUser(u);
                              onRefreshData();
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            title="Switch session to test what this staff member sees"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Test View</span>
                          </button>

                          {/* Edit Staff */}
                          <button
                            onClick={() => handleOpenEditStaff(u)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            title="Edit Staff Details & Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1.5 rounded-lg transition-all ${
                              u.status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                            }`}
                            title={u.status === 'active' ? 'Deactivate Staff Account' : 'Activate Staff Account'}
                          >
                            {u.status === 'active' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete Staff */}
                          {u.role !== 'owner' && u.role !== 'super_admin' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                              title="Delete Staff Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE ACCESS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400 uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Role Permissions & Access Matrix (भूमिका अनुसार अधिकार तालिका)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Overview of module and feature accessibility across different user roles in Billkart.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[11px] uppercase">
                <tr>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-700">Module / System Feature</th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center text-emerald-600">👑 Owner</th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center text-amber-600">💼 Manager</th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center text-cyan-600">💳 Cashier</th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600">📦 Stock Clerk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {[
                  { feature: 'POS Touch Billing & Invoices', owner: true, manager: true, cashier: true, stock: false },
                  { feature: 'Dashboard Sales & Net Profit Stats', owner: true, manager: true, cashier: false, stock: false },
                  { feature: 'Customer Directory & Khata Udhar Ledger', owner: true, manager: true, cashier: true, stock: false },
                  { feature: 'Udhar Recovery & Payment Collection', owner: true, manager: true, cashier: true, stock: false },
                  { feature: 'Product Inventory & Stock Adjustments', owner: true, manager: true, cashier: false, stock: true },
                  { feature: 'Purchase Bills & Vendor Orders', owner: true, manager: true, cashier: false, stock: true },
                  { feature: 'Expense Management & Cash Galla', owner: true, manager: true, cashier: true, stock: false },
                  { feature: 'Reports & P&L Statement', owner: true, manager: true, cashier: false, stock: false },
                  { feature: 'Staff User Management (Add/Edit Staff)', owner: true, manager: false, cashier: false, stock: false },
                  { feature: 'Payment Gateway & UPI Settings', owner: true, manager: false, cashier: false, stock: false },
                  { feature: 'GST Filing & System Backup', owner: true, manager: false, cashier: false, stock: false },
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/40'}>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                      {row.feature}
                    </td>
                    <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                      {row.owner ? <span className="text-emerald-500 font-black text-sm">✓ Allowed</span> : <span className="text-slate-300">✗</span>}
                    </td>
                    <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                      {row.manager ? <span className="text-emerald-500 font-black text-sm">✓ Allowed</span> : <span className="text-rose-400 font-bold text-[11px]">🔒 Restricted</span>}
                    </td>
                    <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                      {row.cashier ? <span className="text-cyan-600 font-black text-sm">✓ Allowed</span> : <span className="text-rose-400 font-bold text-[11px]">🔒 Restricted</span>}
                    </td>
                    <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                      {row.stock ? <span className="text-indigo-500 font-black text-sm">✓ Allowed</span> : <span className="text-rose-400 font-bold text-[11px]">🔒 Restricted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPER ADMIN ALL MULTI-TENANT SHOPS */}
      {activeTab === 'shops' && isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((comp) => {
            const shopUsers = users.filter((u) => u.companyId === comp.id);
            const owner = shopUsers.find((u) => u.role === 'owner') || shopUsers[0];
            const isCurrentActive = company.id === comp.id;

            return (
              <div
                key={comp.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  isCurrentActive
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black shadow-sm">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-emerald-300">
                        {comp.name}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        shop_id: <span className="font-bold text-slate-700 dark:text-slate-300">{comp.id}</span>
                      </p>
                    </div>
                  </div>

                  {isCurrentActive ? (
                    <Badge variant="emerald" size="sm">ACTIVE WORKSPACE</Badge>
                  ) : (
                    <button
                      onClick={() => {
                        if (owner) {
                          ERPDatabase.setCurrentUser(owner);
                          onRefreshData();
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1"
                    >
                      <span>Switch Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Shopkeeper Owner</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{owner ? owner.name : 'N/A'}</span>
                    <span className="block text-[10px] text-slate-500">{comp.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Dedicated UPI VPA</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {comp.upiId || 'Not Configured'}
                    </span>
                    <span className="block text-[10px] text-slate-500">{comp.upiPayeeName || comp.name}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{comp.address}, {comp.city}, {comp.state} - {comp.pincode}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT STAFF MEMBER */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
          setEditingStaffUser(null);
        }}
        title={editingStaffUser ? `Edit Staff Member: ${editingStaffUser.name}` : `Add New Staff Member to ${company.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Shop Workspace *
            </label>
            <input
              type="text"
              disabled
              value={`${company.name} (${company.id})`}
              className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-emerald-600 dark:text-emerald-300 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Staff Full Name *
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Email / Login Username *
            </label>
            <input
              type="email"
              required
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="rahul@shop.com"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="+91 98000 00000"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Security Login PIN *
              </label>
              <input
                type="text"
                maxLength={6}
                value={userPin}
                onChange={(e) => setUserPin(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Assigned Role & Permissions *
            </label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            >
              <option value="cashier">💳 Cashier (POS Billing & Customer Udhar Recovery)</option>
              <option value="stock_keeper">📦 Stock Keeper (Inventory & Purchases)</option>
              <option value="accountant">📊 Accountant / CA (GST, Ledger, Accounts & Expenses)</option>
              <option value="manager">💼 Store Manager (Sales, Purchases & Daily Ops)</option>
              {isSuperAdmin && <option value="owner">👑 Owner / Partner (Full Access)</option>}
            </select>
            {!isSuperAdmin && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                🔒 Security Enforced: Shop owners can assign Staff roles (Cashier, Stock Keeper, Accountant, Manager) only.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAddUserModalOpen(false);
                setEditingStaffUser(null);
              }}
              className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
              {editingStaffUser ? 'Save Staff Changes' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ONBOARD NEW SHOP WORKSPACE */}
      {isSuperAdmin && (
        <Modal
          isOpen={isAddShopModalOpen}
          onClose={() => setIsAddShopModalOpen(false)}
          title="Super Admin: Manual Shop Onboarding (नई दुकान ऑनबोर्ड करें)"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateShop} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-3">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px] flex items-center gap-1.5">
                <Store className="w-4 h-4" />
                <span>1. Shop & Business Information</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Mahavir Supermarket"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Suresh Kumar"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="suresh@mahavir.com"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Owner Password / PIN *
                  </label>
                  <input
                    type="password"
                    required
                    value={ownerPin}
                    onChange={(e) => setOwnerPin(e.target.value)}
                    placeholder="e.g. owner123 (Set login password)"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dedicated UPI ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mahavir@ybl"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddShopModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md"
              >
                Onboard Shop & Activate
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: RESET STAFF SECURITY PIN / PASSWORD */}
      <Modal
        isOpen={isResetPinModalOpen}
        onClose={() => {
          setIsResetPinModalOpen(false);
          setResetPinStaffUser(null);
        }}
        title={`Reset PIN / Password for ${resetPinStaffUser?.name || 'Staff Member'}`}
        maxWidth="sm"
      >
        <form onSubmit={handleResetPinSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300">
            <p className="font-bold flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-600" />
              <span>Security Session Revocation</span>
            </p>
            <p className="text-[11px] mt-1">
              Resetting this staff member's password/PIN will hash the new PIN using bcrypt and immediately revoke all active session tokens on the server.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              New Security PIN / Password *
            </label>
            <input
              type="text"
              required
              minLength={4}
              value={resetPinValue}
              onChange={(e) => setResetPinValue(e.target.value)}
              placeholder="e.g. 5678"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsResetPinModalOpen(false);
                setResetPinStaffUser(null);
              }}
              className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md cursor-pointer">
              Reset PIN & Invalidate Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
