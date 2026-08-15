import React, { useState, useMemo } from 'react';
import { Users, Truck, Plus, Search, DollarSign, Send, FileText, CheckCircle2, Printer, ArrowUpRight, ArrowDownLeft, Calendar, Tag, Filter, RefreshCw, Trash2, Edit3, Ban, FileSpreadsheet } from 'lucide-react';
import { Party, KhataTransaction, Company } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CsvImportModal } from '../common/CsvImportModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface PartyModuleProps {
  parties: Party[];
  company: Company;
  partyType: 'customer' | 'vendor';
  onRefreshData: () => void;
  onOpenAddParty: (type?: 'customer' | 'vendor') => void;
}

export const PartyModule: React.FC<PartyModuleProps> = ({
  parties = [],
  company,
  partyType: initialPartyType,
  onRefreshData,
  onOpenAddParty,
}) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>(initialPartyType);
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Edit & Delete Party state
  const [deleteTargetParty, setDeleteTargetParty] = useState<Party | null>(null);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editPartyName, setEditPartyName] = useState('');
  const [editPartyPhone, setEditPartyPhone] = useState('');
  const [editPartyEmail, setEditPartyEmail] = useState('');
  const [editPartyGstin, setEditPartyGstin] = useState('');
  const [editPartyAddress, setEditPartyAddress] = useState('');
  const [editPartyCity, setEditPartyCity] = useState('');
  const [editPartyState, setEditPartyState] = useState('');
  const [editPartyPincode, setEditPartyPincode] = useState('');
  const [editPartyCompanyName, setEditPartyCompanyName] = useState('');

  const handleStartEditParty = (p: Party) => {
    setEditingParty(p);
    setEditPartyName(p.name || '');
    setEditPartyPhone(p.phone || '');
    setEditPartyEmail(p.email || '');
    setEditPartyGstin(p.gstin || '');
    setEditPartyAddress(p.address || '');
    setEditPartyCity(p.city || '');
    setEditPartyState(p.state || 'Maharashtra');
    setEditPartyPincode(p.pincode || '');
    setEditPartyCompanyName(p.companyName || '');
  };

  const handleSavePartyEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParty) return;

    ERPDatabase.updateParty(editingParty.id, {
      name: editPartyName,
      phone: editPartyPhone,
      email: editPartyEmail,
      gstin: editPartyGstin,
      address: editPartyAddress,
      city: editPartyCity,
      state: editPartyState,
      pincode: editPartyPincode,
      companyName: editPartyCompanyName,
    });

    setEditingParty(null);
    onRefreshData();
  };

  const handleConfirmDeleteParty = () => {
    if (!deleteTargetParty) return;
    ERPDatabase.deleteParty(deleteTargetParty.id);
    setDeleteTargetParty(null);
    onRefreshData();
  };

  // Khata Entry Direction: 'got' = Payment Received / Liya | 'gave' = Payment Given / Diya
  const [entryDirection, setEntryDirection] = useState<'got' | 'gave'>('got');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('upi');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilterType, setLedgerFilterType] = useState<string>('ALL');

  const safeParties = parties || [];
  const filteredParties = safeParties.filter(
    (p) =>
      p.type === activeTab &&
      ((p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.phone || '').includes(search) ||
        (p.gstin || '').toLowerCase().includes(search.toLowerCase()))
  );

  // Fetch updated party from fresh DB list when viewing ledger
  const activePartyInDb = selectedParty
    ? (parties || []).find((p) => p.id === selectedParty.id) || selectedParty
    : null;

  // Compute Unified Party Ledger (Sales, Purchases, Returns & Khata Entries)
  const partyUnifiedLedger = useMemo(() => {
    if (!activePartyInDb) return [];

    const partyId = activePartyInDb.id;
    const partyNameLower = (activePartyInDb.name || '').toLowerCase();
    const isCustomer = activePartyInDb.type === 'customer';

    const rawList: {
      id: string;
      rawDate: number;
      dateStr: string;
      voucherType: 'SALE INVOICE' | 'PURCHASE BILL' | 'SALE RETURN' | 'PURCHASE RETURN' | 'RECEIPT (GOT)' | 'PAYMENT (GAVE)';
      voucherNo: string;
      notes: string;
      mode: string;
      debit: number; // Diya / Billed / Debit
      credit: number; // Liya / Paid / Credit
    }[] = [];

    // 1. Sales Invoices
    const sales = ERPDatabase.getSales();
    sales.forEach((s) => {
      if (s.customerId === partyId || (s.customerName && s.customerName.toLowerCase() === partyNameLower)) {
        const d = s.billedAt || new Date().toISOString();
        rawList.push({
          id: `sale-${s.id}`,
          rawDate: new Date(d).getTime(),
          dateStr: d,
          voucherType: 'SALE INVOICE',
          voucherNo: s.invoiceNo || 'INV-POS',
          notes: `Billed Sale Invoice #${s.invoiceNo} (${s.items?.length || 0} items)`,
          mode: (s.paymentMode || 'CREDIT').toUpperCase(),
          debit: s.grandTotal || 0,
          credit: 0,
        });
      }
    });

    // 2. Sales Returns
    const salesReturns = ERPDatabase.getSalesReturns();
    salesReturns.forEach((sr) => {
      if (sr.customerId === partyId || (sr.customerName && sr.customerName.toLowerCase() === partyNameLower)) {
        const d = sr.returnedAt || new Date().toISOString();
        rawList.push({
          id: `sreturn-${sr.id}`,
          rawDate: new Date(d).getTime(),
          dateStr: d,
          voucherType: 'SALE RETURN',
          voucherNo: sr.returnNo || 'CN-001',
          notes: `Credit Note #${sr.returnNo} for returned goods`,
          mode: 'CREDIT NOTE',
          debit: 0,
          credit: sr.totalRefundAmount || 0,
        });
      }
    });

    // 3. Purchase Bills
    const purchases = ERPDatabase.getPurchases();
    purchases.forEach((p) => {
      if (p.vendorId === partyId || (p.vendorName && p.vendorName.toLowerCase() === partyNameLower)) {
        const d = p.purchasedAt || new Date().toISOString();
        rawList.push({
          id: `purchase-${p.id}`,
          rawDate: new Date(d).getTime(),
          dateStr: d,
          voucherType: 'PURCHASE BILL',
          voucherNo: p.purchaseNo || p.vendorInvoiceNo || 'BILL-01',
          notes: `Supplier Invoice / Purchase Bill #${p.purchaseNo || p.vendorInvoiceNo}`,
          mode: (p.paymentMode || 'CREDIT').toUpperCase(),
          debit: 0,
          credit: p.grandTotal || 0,
        });
      }
    });

    // 4. Purchase Returns
    const purchaseReturns = ERPDatabase.getPurchaseReturns();
    purchaseReturns.forEach((pr) => {
      if (pr.vendorId === partyId || (pr.vendorName && pr.vendorName.toLowerCase() === partyNameLower)) {
        const d = pr.returnedAt || new Date().toISOString();
        rawList.push({
          id: `preturn-${pr.id}`,
          rawDate: new Date(d).getTime(),
          dateStr: d,
          voucherType: 'PURCHASE RETURN',
          voucherNo: pr.returnNo || 'DN-001',
          notes: `Debit Note #${pr.returnNo} against Bill #${pr.originalPurchaseNo}`,
          mode: 'DEBIT NOTE',
          debit: pr.refundAmount || 0,
          credit: 0,
        });
      }
    });

    // 5. Khata Transactions
    const khataTxns = ERPDatabase.getKhataTransactions().filter((k) => k.partyId === partyId);
    khataTxns.forEach((k) => {
      const d = k.createdAt || new Date().toISOString();
      const isGot = k.type === 'debit'; // Customer paid us / Payment Received
      rawList.push({
        id: `khata-${k.id}`,
        rawDate: new Date(d).getTime(),
        dateStr: d,
        voucherType: isGot ? 'RECEIPT (GOT)' : 'PAYMENT (GAVE)',
        voucherNo: k.invoiceNo || `REC-${k.id.slice(-6).toUpperCase()}`,
        notes: k.notes || (isGot ? 'Payment Received / Paisa Liya' : 'Payment Made / Paisa Diya'),
        mode: (k.paymentMode || 'CASH').toUpperCase(),
        debit: isGot ? 0 : k.amount,
        credit: isGot ? k.amount : 0,
      });
    });

    // Sort chronologically ascending (oldest first) for running balance calculation
    rawList.sort((a, b) => a.rawDate - b.rawDate);

    let runningBal = activePartyInDb.openingBalance || 0;

    const listWithBalance = rawList.map((item) => {
      if (isCustomer) {
        // Customer: Debit (Sale/Diya) increases due balance, Credit (Receipt/Return) decreases due balance
        runningBal = runningBal + item.debit - item.credit;
      } else {
        // Vendor: Credit (Purchase) increases payable balance, Debit (Payment/Return) decreases payable balance
        runningBal = runningBal + item.credit - item.debit;
      }
      return {
        ...item,
        runningBalance: runningBal,
      };
    });

    // Return newest first for default display
    return listWithBalance.reverse();
  }, [activePartyInDb, parties]);

  // Filtered unified transactions for display
  const filteredLedgerTxns = useMemo(() => {
    return partyUnifiedLedger.filter((t) => {
      const matchesSearch =
        !ledgerSearch ||
        t.notes.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        t.voucherNo.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        t.mode.toLowerCase().includes(ledgerSearch.toLowerCase());

      const matchesType =
        ledgerFilterType === 'ALL' ||
        (ledgerFilterType === 'SALE' && t.voucherType === 'SALE INVOICE') ||
        (ledgerFilterType === 'PURCHASE' && t.voucherType === 'PURCHASE BILL') ||
        (ledgerFilterType === 'GOT' && t.voucherType === 'RECEIPT (GOT)') ||
        (ledgerFilterType === 'GAVE' && t.voucherType === 'PAYMENT (GAVE)') ||
        (ledgerFilterType === 'RETURN' && (t.voucherType === 'SALE RETURN' || t.voucherType === 'PURCHASE RETURN'));

      return matchesSearch && matchesType;
    });
  }, [partyUnifiedLedger, ledgerSearch, ledgerFilterType]);

  const handleOpenLedgerWithDirection = (party: Party, direction: 'got' | 'gave') => {
    setSelectedParty(party);
    setEntryDirection(direction);
    setPaymentAmount('');
    setPaymentNotes('');
    setLedgerSearch('');
    setLedgerFilterType('ALL');
  };

  const handleSaveKhataEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartyInDb) return;

    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const currentUser = ERPDatabase.getCurrentUser();
    const isCustomer = activePartyInDb.type === 'customer';

    // Calculate Balance Impact and Txn Type
    let balanceChange = 0;
    let txnType: 'debit' | 'credit' = 'debit';
    let defaultNote = '';

    if (isCustomer) {
      if (entryDirection === 'got') {
        // Customer paid money -> Reduces due balance
        balanceChange = -amt;
        txnType = 'debit';
        defaultNote = paymentNotes || 'Paisa Liya / Payment Received from Customer';
      } else {
        // You gave money/credit to Customer -> Increases due balance
        balanceChange = amt;
        txnType = 'credit';
        defaultNote = paymentNotes || 'Paisa Diya / Udhar Entry to Customer';
      }
    } else {
      // Vendor
      if (entryDirection === 'gave') {
        // You paid money to Vendor -> Reduces payable debt
        balanceChange = -amt;
        txnType = 'debit';
        defaultNote = paymentNotes || 'Payment Paid to Supplier / Vendor';
      } else {
        // Vendor gave credit items/refund -> Increases payable debt
        balanceChange = amt;
        txnType = 'credit';
        defaultNote = paymentNotes || 'Got Goods on Credit / Refund from Vendor';
      }
    }

    const newBalance = activePartyInDb.currentBalance + balanceChange;

    // 1. Update party balance in DB
    ERPDatabase.updatePartyBalance(activePartyInDb.id, balanceChange);

    // 2. Add Khata Transaction
    ERPDatabase.addKhataTransaction({
      companyId: company.id,
      partyId: activePartyInDb.id,
      partyName: activePartyInDb.name,
      partyType: activePartyInDb.type,
      type: txnType,
      amount: amt,
      balanceAfter: newBalance,
      paymentMode,
      notes: defaultNote,
      createdByName: currentUser ? currentUser.name : 'System User',
    });

    setPaymentAmount('');
    setPaymentNotes('');
    onRefreshData();

    alert(
      `✅ Khata Entry Saved!\nParty: ${activePartyInDb.name}\nDirection: ${
        entryDirection === 'got' ? 'YOU GOT (Liya)' : 'YOU GAVE (Diya)'
      }\nAmount: ₹${amt.toLocaleString('en-IN')}\nNew Balance: ₹${newBalance.toLocaleString('en-IN')}`
    );
  };

  const triggerWhatsAppReminder = (party: Party) => {
    const text = `Dear ${party.name}, gentle reminder from ${company.name}: Your outstanding balance is ₹${party.currentBalance.toLocaleString('en-IN')}. Please clear your dues via UPI or Bank Transfer. Thank you!`;
    const url = `https://wa.me/${party.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Party Type Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-emerald-300">
              {activeTab === 'customer' ? 'Customers & Khata Ledgers' : 'Vendors & Suppliers Directory'}
            </h2>
            <Badge variant={activeTab === 'customer' ? 'emerald' : 'amber'}>
              {filteredParties.length} {activeTab === 'customer' ? 'Customers' : 'Vendors'}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {activeTab === 'customer'
              ? 'Manage customer profiles, credit balances, payment receipts & WhatsApp debt reminders.'
              : 'Track supplier payables, credit purchases, purchase history & vendor balances.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Navigation Controls */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'customer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers</span>
            </button>
            <button
              onClick={() => setActiveTab('vendor')}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'vendor'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Vendors</span>
            </button>
          </div>

          {/* CSV Import Button */}
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 font-extrabold text-xs text-indigo-700 dark:text-indigo-300 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Bulk Import Contacts List via CSV File"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Import CSV</span>
          </button>

          {/* Add Action Button */}
          <button
            onClick={() => onOpenAddParty(activeTab)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-extrabold text-xs text-white rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New {activeTab === 'customer' ? 'Customer' : 'Vendor'}</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeTab === 'customer' ? 'customers' : 'vendors'} by name, phone, or GSTIN...`}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Grid of Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParties.map((party) => {
          const isDue = party.currentBalance > 0;
          return (
            <div
              key={party.id}
              className="p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-emerald-300">{party.name}</h3>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{party.companyName || (party.type === 'customer' ? 'Retail Customer' : 'Supplier')}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEditParty(party)}
                      className="p-1 text-slate-400 hover:text-emerald-500 rounded-lg cursor-pointer"
                      title="Edit Party Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetParty(party)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                      title="Delete Party Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Badge variant={isDue ? 'rose' : 'emerald'} size="sm">
                      {isDue ? 'DUE' : 'CLEAR'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <p><b className="text-slate-500 dark:text-slate-400">Phone:</b> <span className="font-bold text-slate-900 dark:text-slate-100">{party.phone}</span></p>
                  {party.gstin && <p><b className="text-slate-500 dark:text-slate-400">GSTIN:</b> <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{party.gstin}</span></p>}
                  <p><b className="text-slate-500 dark:text-slate-400">Address:</b> <span className="text-slate-800 dark:text-slate-200">{party.address}, {party.city}</span></p>
                </div>
              </div>

              {/* Balance & Khata Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Khata Balance:</span>
                  <span className={`text-base font-black ${isDue ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ₹{party.currentBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Quick Action Buttons for GAVE (Diya) and GOT (Liya) */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleOpenLedgerWithDirection(party, 'got')}
                    className="py-2 px-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-sm transition-all"
                    title="Record Payment Received (Paisa Liya)"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Got (Liya)</span>
                  </button>
                  <button
                    onClick={() => handleOpenLedgerWithDirection(party, 'gave')}
                    className="py-2 px-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-sm transition-all"
                    title="Record Payment / Credit Given (Paisa Diya)"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Gave (Diya)</span>
                  </button>
                  <button
                    onClick={() => handleOpenLedgerWithDirection(party, 'got')}
                    className="py-2 px-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ledger</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger Modal */}
      {activePartyInDb && (
        <Modal
          isOpen={!!selectedParty}
          onClose={() => setSelectedParty(null)}
          title={`Khata Account Ledger: ${activePartyInDb.name}`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            {/* Top Ledger Header Card with Print Button */}
            <div className="p-4 bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Statement of Account</p>
                <h3 className="text-lg font-black text-white">{activePartyInDb.name}</h3>
                <p className="text-xs text-slate-300 font-medium">
                  Phone: <b>{activePartyInDb.phone}</b> {activePartyInDb.gstin ? `| GSTIN: ${activePartyInDb.gstin}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-extrabold text-slate-400">Current Khata Balance</p>
                  <p className={`text-xl font-black ${activePartyInDb.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{activePartyInDb.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {activePartyInDb.currentBalance > 0 ? '(Due Payable)' : '(Settled / Advance)'}
                  </p>
                </div>
                <button
                  onClick={() => InvoicePrintService.printPartyLedger(activePartyInDb, partyUnifiedLedger, company)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Statement</span>
                </button>
              </div>
            </div>

            {/* Khata Entry Form with Explicit GAVE (Diya) / GOT (Liya) Toggle */}
            <form onSubmit={handleSaveKhataEntry} className="p-4 bg-slate-900 border-2 border-emerald-500/50 rounded-2xl space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <h4 className="font-black text-white uppercase tracking-wide flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Record New Khata Transaction</span>
                </h4>

                {/* Entry Direction Toggle (YOU GOT vs YOU GAVE) */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setEntryDirection('got')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      entryDirection === 'got'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-300" />
                    <span>YOU GOT (Liya / Receipt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryDirection('gave')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      entryDirection === 'gave'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-300" />
                    <span>YOU GAVE (Diya / Payment)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-black uppercase mb-1 text-[11px] text-slate-300">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className={`w-full p-2.5 bg-slate-950 border-2 rounded-xl font-mono font-bold text-sm text-white focus:outline-none ${
                      entryDirection === 'got'
                        ? 'border-emerald-500/80 focus:border-emerald-400'
                        : 'border-rose-500/80 focus:border-rose-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-black uppercase mb-1 text-[11px] text-slate-300">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl font-bold text-slate-200"
                  >
                    <option value="upi">UPI / GPay / PhonePe / Paytm</option>
                    <option value="cash">Cash / Cash Register</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-black uppercase mb-1 text-[11px] text-slate-300">
                    Notes / Ref No.
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder={
                      entryDirection === 'got'
                        ? 'e.g. Old bill payment / Advance'
                        : 'e.g. Credit sale / Loan given'
                    }
                    className="w-full p-2.5 bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl font-bold text-slate-200"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className={`w-full py-2.5 font-black text-white rounded-xl shadow-md transition-all uppercase flex items-center justify-center gap-1.5 ${
                      entryDirection === 'got'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    <span>Save {entryDirection === 'got' ? 'Receipt (Liya)' : 'Payment (Diya)'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* High-Contrast Visible Unified Ledger Table */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <h4 className="font-black text-slate-900 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Complete Account Ledger Statement (All Sales, Purchases & Payments)</span>
                </h4>
                <span className="text-[11px] font-extrabold text-slate-500">Showing {filteredLedgerTxns.length} of {partyUnifiedLedger.length} total entries</span>
              </div>

              {/* Search & Filter Bar inside Ledger */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Filter by voucher #, notes, or mode..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <select
                  value={ledgerFilterType}
                  onChange={(e) => setLedgerFilterType(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="ALL">All Vouchers & Transactions</option>
                  <option value="SALE">Sales Invoices</option>
                  <option value="PURCHASE">Purchase Bills</option>
                  <option value="GOT">Receipts (Paisa Liya)</option>
                  <option value="GAVE">Payments (Paisa Diya)</option>
                  <option value="RETURN">Returns / Credit Notes</option>
                </select>
              </div>

              <div className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 dark:bg-emerald-950 text-amber-300 uppercase text-[11px] font-black border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Voucher & Ref</th>
                      <th className="p-3">Particulars / Notes</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3 text-right">Debit (Gave ₹)</th>
                      <th className="p-3 text-right">Credit (Got ₹)</th>
                      <th className="p-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredLedgerTxns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500 font-bold">
                          No ledger transaction records found for this criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredLedgerTxns.map((t) => {
                        const isSale = t.voucherType === 'SALE INVOICE';
                        const isPurchase = t.voucherType === 'PURCHASE BILL';
                        const isGot = t.voucherType === 'RECEIPT (GOT)';
                        const isGave = t.voucherType === 'PAYMENT (GAVE)';

                        let badgeColor = 'bg-slate-800 text-slate-200';
                        if (isSale) badgeColor = 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800';
                        if (isPurchase) badgeColor = 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
                        if (isGot) badgeColor = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
                        if (isGave) badgeColor = 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';

                        return (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-xs">
                            <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {new Date(t.dateStr).toLocaleDateString('en-IN')}
                              <span className="block text-[10px] text-slate-500 font-normal">
                                {new Date(t.dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] uppercase border ${badgeColor}`}>
                                {t.voucherType}
                              </span>
                              <span className="block font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                                #{t.voucherNo}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                                {t.notes}
                              </span>
                            </td>
                            <td className="p-3 uppercase font-extrabold text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                              {t.mode}
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                              {t.debit > 0 ? `₹${t.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400">
                              {t.credit > 0 ? `₹${t.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                              ₹{Math.abs(t.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              <span className={`ml-1 text-[9px] px-1 py-0.2 rounded font-extrabold ${t.runningBalance > 0 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}`}>
                                {t.runningBalance > 0 ? 'Dr' : 'Cr'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="parties"
      />

      {/* Edit Party Modal */}
      {editingParty && (
        <Modal
          isOpen={!!editingParty}
          onClose={() => setEditingParty(null)}
          title={`Edit Party: ${editingParty.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSavePartyEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  value={editPartyName}
                  onChange={(e) => setEditPartyName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Mobile / Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editPartyPhone}
                  onChange={(e) => setEditPartyPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Company / Firm Name</label>
                <input
                  type="text"
                  value={editPartyCompanyName}
                  onChange={(e) => setEditPartyCompanyName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={editPartyGstin}
                  onChange={(e) => setEditPartyGstin(e.target.value)}
                  placeholder="27AAAAA0000A1Z5"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editPartyEmail}
                  onChange={(e) => setEditPartyEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">City</label>
                <input
                  type="text"
                  value={editPartyCity}
                  onChange={(e) => setEditPartyCity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={editPartyAddress}
                  onChange={(e) => setEditPartyAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingParty(null)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer"
              >
                Save Party Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Party Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetParty}
        onClose={() => setDeleteTargetParty(null)}
        onConfirm={handleConfirmDeleteParty}
        title="Delete Party Entry"
        message={`Are you sure you want to DELETE ${deleteTargetParty?.type === 'customer' ? 'Customer' : 'Vendor'} "${deleteTargetParty?.name}"?`}
      />

      {/* CSV Bulk Upload Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="parties"
      />
    </div>
  );
};

