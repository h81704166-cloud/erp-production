import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Printer,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  UserCheck,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { Company, Party } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { Badge } from '../common/Badge';

export interface LedgerTransaction {
  id: string;
  date: string;
  voucherType: 'SALES' | 'PURCHASE' | 'SALE RETURN' | 'PURCHASE RETURN' | 'PAYMENT' | 'RECEIPT';
  voucherNo: string;
  partyName: string;
  partyId?: string;
  particulars: string;
  mode: string;
  debit: number;
  credit: number;
  rawDate: number;
}

interface MasterLedgerModuleProps {
  company: Company;
  parties?: Party[];
  onRefreshData?: () => void;
}

export const MasterLedgerModule: React.FC<MasterLedgerModuleProps> = ({
  company,
  parties = [],
  onRefreshData
}) => {
  const [search, setSearch] = useState('');
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>('ALL');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Load and assemble all transactions into a single Master General Ledger
  const rawLedgerTransactions = useMemo(() => {
    const list: LedgerTransaction[] = [];

    // 1. Sales Invoices
    const sales = ERPDatabase.getSales();
    sales.forEach((s) => {
      const d = s.billedAt || new Date().toISOString();
      list.push({
        id: `sale-${s.id}`,
        date: d,
        voucherType: 'SALES',
        voucherNo: s.invoiceNo || 'INV-POS',
        partyName: s.customerName || 'Walk-in Customer',
        partyId: s.customerId,
        particulars: `To Sales Account - Sale Invoice #${s.invoiceNo} (${s.customerName || 'Walk-in'})`,
        mode: (s.paymentMode || 'CASH').toUpperCase(),
        debit: s.grandTotal || 0,
        credit: 0,
        rawDate: new Date(d).getTime(),
      });
    });

    // 2. Purchases (Vendor Bills)
    const purchases = ERPDatabase.getPurchases();
    purchases.forEach((p) => {
      const d = p.purchasedAt || new Date().toISOString();
      list.push({
        id: `purchase-${p.id}`,
        date: d,
        voucherType: 'PURCHASE',
        voucherNo: p.purchaseNo || p.vendorInvoiceNo || 'BILL-PO',
        partyName: p.vendorName || 'Supplier',
        partyId: p.vendorId,
        particulars: `By Purchase Account - Supplier Bill #${p.purchaseNo || p.vendorInvoiceNo} (${p.vendorName})`,
        mode: (p.paymentMode || 'CREDIT').toUpperCase(),
        debit: 0,
        credit: p.grandTotal || 0,
        rawDate: new Date(d).getTime(),
      });
    });

    // 3. Sales Returns (Credit Notes)
    const salesReturns = ERPDatabase.getSalesReturns();
    salesReturns.forEach((sr) => {
      const d = sr.returnedAt || new Date().toISOString();
      list.push({
        id: `sreturn-${sr.id}`,
        date: d,
        voucherType: 'SALE RETURN',
        voucherNo: sr.returnNo || 'CN-001',
        partyName: sr.customerName || 'Customer',
        partyId: sr.customerId,
        particulars: `By Sale Return Account - Credit Note #${sr.returnNo} against Invoice #${sr.originalInvoiceNo}`,
        mode: 'CREDIT NOTE',
        debit: 0,
        credit: sr.totalRefundAmount || 0,
        rawDate: new Date(d).getTime(),
      });
    });

    // 4. Purchase Returns (Debit Notes)
    const purchaseReturns = ERPDatabase.getPurchaseReturns();
    purchaseReturns.forEach((pr) => {
      const d = pr.returnedAt || new Date().toISOString();
      list.push({
        id: `preturn-${pr.id}`,
        date: d,
        voucherType: 'PURCHASE RETURN',
        voucherNo: pr.returnNo || 'DN-001',
        partyName: pr.vendorName || 'Vendor',
        partyId: pr.vendorId,
        particulars: `To Purchase Return Account - Debit Note #${pr.returnNo} against Bill #${pr.originalPurchaseNo}`,
        mode: 'DEBIT NOTE',
        debit: pr.refundAmount || 0,
        credit: 0,
        rawDate: new Date(d).getTime(),
      });
    });

    // 5. Khata Transactions (Customer / Vendor Receipts and Pay Outs)
    const khataTxns = ERPDatabase.getKhataTransactions();
    khataTxns.forEach((k) => {
      const d = k.createdAt || new Date().toISOString();
      const isReceipt = k.type === 'debit'; // Customer paid us / Khata credit clearance
      list.push({
        id: `khata-${k.id}`,
        date: d,
        voucherType: isReceipt ? 'RECEIPT' : 'PAYMENT',
        voucherNo: `REC-${k.id.slice(-6).toUpperCase()}`,
        partyName: k.partyName || 'Party',
        partyId: k.partyId,
        particulars: isReceipt
          ? `By Payment Received - ${k.partyName} (${k.notes || 'Khata Clearance'})`
          : `To Payment Paid - ${k.partyName} (${k.notes || 'Khata Out'})`,
        mode: (k.paymentMode || 'CASH').toUpperCase(),
        debit: isReceipt ? 0 : k.amount,
        credit: isReceipt ? k.amount : 0,
        rawDate: new Date(d).getTime(),
      });
    });

    // 6. Expense Outflows
    const expenses = ERPDatabase.getExpenses();
    expenses.forEach((e) => {
      const d = e.expenseDate || new Date().toISOString();
      list.push({
        id: `exp-${e.id}`,
        date: d,
        voucherType: 'PAYMENT',
        voucherNo: `EXP-${e.id.slice(-6).toUpperCase()}`,
        partyName: e.paidTo || e.category || 'Expense Payout',
        particulars: `To Expense Account - ${e.category} (${e.notes || e.paidTo || 'Operational Exp'})`,
        mode: (e.paymentMode || 'CASH').toUpperCase(),
        debit: e.amount || 0,
        credit: 0,
        rawDate: new Date(d).getTime(),
      });
    });

    // 7. Other Incomes
    const incomes = ERPDatabase.getIncomes();
    incomes.forEach((i) => {
      const d = i.incomeDate || new Date().toISOString();
      list.push({
        id: `inc-${i.id}`,
        date: d,
        voucherType: 'RECEIPT',
        voucherNo: `INC-${i.id.slice(-6).toUpperCase()}`,
        partyName: i.source || 'Other Income',
        particulars: `By Income Account - ${i.source} (${i.notes || 'Direct Receipt'})`,
        mode: 'BANK/CASH',
        debit: 0,
        credit: i.amount || 0,
        rawDate: new Date(d).getTime(),
      });
    });

    // Sort chronologically ascending for correct running balance calculation
    return list.sort((a, b) => a.rawDate - b.rawDate);
  }, [onRefreshData]);

  // Filtered Ledger Stream
  const filteredLedger = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return rawLedgerTransactions.filter((t) => {
      // Voucher Type Filter
      if (selectedVoucherType !== 'ALL' && t.voucherType !== selectedVoucherType) {
        return false;
      }

      // Party Filter
      if (selectedPartyId !== 'ALL') {
        if (t.partyId !== selectedPartyId && !t.partyName.toLowerCase().includes(selectedPartyId.toLowerCase())) {
          return false;
        }
      }

      // Date Range Filter
      if (dateFilter === 'TODAY' && t.rawDate < todayStart) return false;
      if (dateFilter === 'WEEK' && t.rawDate < weekStart) return false;
      if (dateFilter === 'MONTH' && t.rawDate < monthStart) return false;

      // Text Search Filter
      if (search) {
        const q = search.toLowerCase();
        const matchNo = t.voucherNo.toLowerCase().includes(q);
        const matchParty = t.partyName.toLowerCase().includes(q);
        const matchParticulars = t.particulars.toLowerCase().includes(q);
        if (!matchNo && !matchParty && !matchParticulars) return false;
      }

      return true;
    });
  }, [rawLedgerTransactions, selectedVoucherType, selectedPartyId, dateFilter, search]);

  // Calculate Cumulative Running Balances for filtered list
  const ledgerWithRunningBalance = useMemo(() => {
    let running = 0;
    return filteredLedger.map((t) => {
      // In General Ledger: Dr increases balance, Cr decreases balance
      running += t.debit - t.credit;
      return {
        ...t,
        balance: running,
        balanceType: (running >= 0 ? 'Dr' : 'Cr') as 'Dr' | 'Cr',
      };
    });
  }, [filteredLedger]);

  // Totals
  const totalDebit = useMemo(() => filteredLedger.reduce((sum, item) => sum + item.debit, 0), [filteredLedger]);
  const totalCredit = useMemo(() => filteredLedger.reduce((sum, item) => sum + item.credit, 0), [filteredLedger]);
  const netDifference = totalDebit - totalCredit;

  // Print Action
  const handlePrintLedger = () => {
    let filterLabel = 'Master General Ledger (All Transactions)';
    if (selectedVoucherType !== 'ALL') filterLabel = `Type: ${selectedVoucherType}`;
    if (selectedPartyId !== 'ALL') {
      const p = parties.find((party) => party.id === selectedPartyId);
      filterLabel += ` | Party: ${p ? p.name : selectedPartyId}`;
    }

    InvoicePrintService.printMasterLedger(
      ledgerWithRunningBalance,
      company,
      filterLabel
    );
  };

  // Export CSV Action
  const handleExportCSV = () => {
    const headers = ['Sr', 'Date', 'Voucher Type', 'Voucher No', 'Particulars', 'Payment Mode', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance', 'Dr/Cr'];
    const rows = ledgerWithRunningBalance.map((t, idx) => [
      idx + 1,
      new Date(t.date).toLocaleDateString(),
      t.voucherType,
      t.voucherNo,
      `"${t.particulars.replace(/"/g, '""')}"`,
      t.mode,
      t.debit,
      t.credit,
      Math.abs(t.balance),
      t.balanceType,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Master_General_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-emerald-300">
                General Master Ledger (Cr / Dr Format)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Comprehensive accounting ledger tracking Sales, Purchases, Sales Returns, Purchase Returns, Payments & Receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-extrabold text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintLedger}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-black text-xs text-white rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Master Ledger</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Debit Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
            <span>Total Debit (Dr)</span>
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Sales, Payments Out & Purchase Returns</p>
        </div>

        {/* Total Credit Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border-2 border-indigo-500/30 dark:border-indigo-500/20 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
            <span>Total Credit (Cr)</span>
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Purchases, Payment Receipts & Sales Returns</p>
        </div>

        {/* Net Ledger Balance */}
        <div className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
            <span>Net Period Balance</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                netDifference >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {netDifference >= 0 ? 'Dr SURPLUS' : 'Cr PAYABLE'}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            ₹{Math.abs(netDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <span className="text-xs font-sans text-slate-700 dark:text-slate-300 ml-1">
              {netDifference >= 0 ? 'Dr' : 'Cr'}
            </span>
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Net accounting difference for period</p>
        </div>

        {/* Total Vouchers */}
        <div className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
            <span>Total Vouchers</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {filteredLedger.length} <span className="text-xs text-slate-500 font-normal">Entries</span>
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Total transaction vouchers matched</p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Field */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voucher #, party name..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Voucher Type Filter */}
          <div>
            <select
              value={selectedVoucherType}
              onChange={(e) => setSelectedVoucherType(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Voucher Types (Sales, Purchase, Returns, Pay)</option>
              <option value="SALES">🛍️ Sales Invoices</option>
              <option value="PURCHASE">📦 Purchase Bills</option>
              <option value="SALE RETURN">↩️ Sales Returns (Credit Notes)</option>
              <option value="PURCHASE RETURN">🔙 Purchase Returns (Debit Notes)</option>
              <option value="PAYMENT">💸 Payment Out (Expense/Vendor)</option>
              <option value="RECEIPT">💰 Payment Receipts (Customer/Income)</option>
            </select>
          </div>

          {/* Party Selector Filter */}
          <div>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Customers & Vendors Directory</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.type === 'customer' ? '👤 Customer: ' : '🚚 Vendor: '}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Time History</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
              General Master Ledger Journal
            </span>
            <span className="text-xs text-slate-400">| Standard Cr/Dr Double Entry Format</span>
          </div>
          <div className="text-xs text-slate-300 font-bold">
            Showing {ledgerWithRunningBalance.length} Entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 dark:bg-slate-950 text-slate-200 uppercase text-[10px] font-black tracking-wider border-b border-slate-700">
              <tr>
                <th className="p-3 text-center w-10">#</th>
                <th className="p-3 w-32">Date & Time</th>
                <th className="p-3 w-32">Voucher Type</th>
                <th className="p-3 w-32">Voucher No.</th>
                <th className="p-3">Particulars / Transaction Account</th>
                <th className="p-3 w-24">Mode</th>
                <th className="p-3 text-right w-36">Debit (Dr ₹)</th>
                <th className="p-3 text-right w-36">Credit (Cr ₹)</th>
                <th className="p-3 text-right w-40">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
              {ledgerWithRunningBalance.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-bold">
                    No ledger transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                ledgerWithRunningBalance.map((t, idx) => {
                  const isDr = t.debit > 0;
                  const isCr = t.credit > 0;

                  let badgeColor: 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate' | 'cyan' = 'slate';
                  if (t.voucherType === 'SALES') badgeColor = 'emerald';
                  else if (t.voucherType === 'PURCHASE') badgeColor = 'indigo';
                  else if (t.voucherType === 'SALE RETURN') badgeColor = 'amber';
                  else if (t.voucherType === 'PURCHASE RETURN') badgeColor = 'rose';
                  else if (t.voucherType === 'RECEIPT') badgeColor = 'cyan';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {new Date(t.date).toLocaleDateString()}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={badgeColor} size="sm">
                          {t.voucherType}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-extrabold text-sky-600 dark:text-sky-400 text-xs">
                        {t.voucherNo}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {t.particulars}
                      </td>
                      <td className="p-3 uppercase font-extrabold text-[10px] text-slate-600 dark:text-slate-400">
                        {t.mode}
                      </td>
                      <td className={`p-3 text-right font-black font-mono text-sm ${isDr ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-700'}`}>
                        {isDr ? `₹${t.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`p-3 text-right font-black font-mono text-sm ${isCr ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-700'}`}>
                        {isCr ? `₹${t.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="p-3 text-right font-black font-mono text-xs text-slate-900 dark:text-slate-100">
                        ₹{Math.abs(t.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span
                          className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-black ${
                            t.balanceType === 'Dr'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}
                        >
                          {t.balanceType}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ledgerWithRunningBalance.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-950 font-black text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-800">
                <tr>
                  <td colSpan={6} className="p-3.5 text-right uppercase text-xs tracking-wider font-extrabold text-slate-600 dark:text-slate-400">
                    Grand Total
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                    ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right font-mono text-xs">
                    ₹{Math.abs(netDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <span className="ml-1 text-[10px] text-emerald-500 font-bold">
                      {netDifference >= 0 ? 'Dr' : 'Cr'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
