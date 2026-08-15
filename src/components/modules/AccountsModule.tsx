import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Wallet,
  Building2,
  Plus,
  ArrowLeftRight,
  CheckCircle2,
  Printer,
  FileText,
  Search,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Scale,
  PlusCircle,
  MinusCircle,
  Clock,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Account, Company, AccountTransfer } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { BackupService } from '../../services/backupService';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CsvImportModal } from '../common/CsvImportModal';

interface AccountsModuleProps {
  accounts: Account[];
  company: Company;
  onRefreshData: () => void;
  onOpenAddAccount: () => void;
}

interface PassbookTxn {
  id: string;
  date: string;
  voucherNo: string;
  description: string;
  mode: string;
  type: 'credit' | 'debit';
  amount: number;
  runningBalance?: number;
}

export const AccountsModule: React.FC<AccountsModuleProps> = ({
  accounts = [],
  company,
  onRefreshData,
  onOpenAddAccount,
}) => {
  const safeAccounts = accounts || [];
  
  // Top Tab View State ('passbooks' | 'cashBook' | 'bankBook')
  const [viewTab, setViewTab] = useState<'passbooks' | 'cashBook' | 'bankBook'>('passbooks');

  // Selected Account for Passbook View (defaults to first account or default cash)
  const [selectedAccId, setSelectedAccId] = useState<string>(
    safeAccounts.find((a) => a.isDefault)?.id || safeAccounts[0]?.id || ''
  );

  // Modals state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Transfer Form State
  const [fromAccId, setFromAccId] = useState(safeAccounts[0]?.id || '');
  const [toAccId, setToAccId] = useState(safeAccounts[1]?.id || '');
  const [transferAmt, setTransferAmt] = useState('');
  const [transferNotes, setTransferNotes] = useState('Inter-account fund transfer');

  // Adjustment Form State
  const [adjustAccId, setAdjustAccId] = useState(safeAccounts[0]?.id || '');
  const [adjustType, setAdjustType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [adjustAmt, setAdjustAmt] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Passbook Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');

  // Get active account
  const activeAccount = safeAccounts.find((a) => a.id === selectedAccId) || safeAccounts[0];

  // Handle Inter-Account Transfer
  const handleFundTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmt) || 0;
    if (amt <= 0) {
      alert('Please enter a valid positive transfer amount.');
      return;
    }
    if (fromAccId === toAccId) {
      alert('Source and destination accounts must be different!');
      return;
    }

    const ok = ERPDatabase.transferFunds(fromAccId, toAccId, amt, transferNotes);
    if (ok) {
      setIsTransferModalOpen(false);
      setTransferAmt('');
      onRefreshData();
      alert(`₹${amt.toLocaleString('en-IN')} successfully transferred.`);
    } else {
      alert('Transfer failed! Insufficient funds in source account.');
    }
  };

  // Handle Manual Cash/Bank Adjustment
  const handleBalanceAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(adjustAmt) || 0;
    if (amt <= 0) {
      alert('Please enter a valid adjustment amount.');
      return;
    }

    const ok = ERPDatabase.adjustAccountBalance(adjustAccId, adjustType, amt, adjustNotes);
    if (ok) {
      setIsAdjustModalOpen(false);
      setAdjustAmt('');
      setAdjustNotes('');
      onRefreshData();
      alert(`Account balance updated: ${adjustType.toUpperCase()} of ₹${amt.toLocaleString('en-IN')}`);
    } else {
      alert('Failed to execute withdrawal: Insufficient balance!');
    }
  };

  // Compile Comprehensive Passbook Transactions for an Account
  const passbookData = useMemo(() => {
    if (!activeAccount) {
      return {
        openingBalance: 0,
        totalCredits: 0,
        totalDebits: 0,
        netMovement: 0,
        transactions: [],
      };
    }

    const acc = activeAccount;
    const rawTxns: PassbookTxn[] = [];

    // 1. Sales
    ERPDatabase.getSales().forEach((s) => {
      if (s.paidAmount <= 0) return;
      let matches = false;
      if (s.paymentMode === 'cash' && acc.accountType === 'cash') matches = true;
      else if (
        (s.paymentMode === 'upi' || s.paymentMode === 'card' || s.paymentMode === 'bank_transfer') &&
        acc.accountType === 'bank' &&
        acc.isDefault
      )
        matches = true;
      else if (s.paymentMode === acc.accountType) matches = true;

      if (matches) {
        rawTxns.push({
          id: `sale-${s.id}`,
          date: s.billedAt || new Date().toISOString(),
          voucherNo: s.invoiceNo,
          description: `POS/Invoice Sale Receipt - ${s.customerName || 'Walk-in Customer'}`,
          mode: s.paymentMode.toUpperCase(),
          type: 'credit',
          amount: s.paidAmount,
        });
      }
    });

    // 2. Sales Returns
    ERPDatabase.getSalesReturns().forEach((sr) => {
      if (sr.totalRefundAmount <= 0) return;
      if (acc.isDefault || acc.accountType === 'cash') {
        rawTxns.push({
          id: `sr-${sr.id}`,
          date: sr.returnedAt || new Date().toISOString(),
          voucherNo: sr.returnNo,
          description: `Sales Return Refund - Inv #${sr.originalInvoiceNo} (${sr.customerName})`,
          mode: 'REFUND',
          type: 'debit',
          amount: sr.totalRefundAmount,
        });
      }
    });

    // 3. Purchases
    ERPDatabase.getPurchases().forEach((p) => {
      if (p.paidAmount <= 0) return;
      let matches = false;
      if (p.paymentMode === 'cash' && acc.accountType === 'cash') matches = true;
      else if (
        (p.paymentMode === 'upi' || p.paymentMode === 'bank_transfer') &&
        acc.accountType === 'bank' &&
        acc.isDefault
      )
        matches = true;

      if (matches) {
        rawTxns.push({
          id: `pur-${p.id}`,
          date: p.purchasedAt || new Date().toISOString(),
          voucherNo: p.purchaseNo,
          description: `Purchase Payment Outflow - Supplier: ${p.vendorName}`,
          mode: p.paymentMode.toUpperCase(),
          type: 'debit',
          amount: p.paidAmount,
        });
      }
    });

    // 4. Purchase Returns
    ERPDatabase.getPurchaseReturns().forEach((pr) => {
      if (pr.refundAmount <= 0) return;
      if (acc.isDefault || acc.accountType === 'cash') {
        rawTxns.push({
          id: `pr-${pr.id}`,
          date: pr.returnedAt || new Date().toISOString(),
          voucherNo: pr.returnNo,
          description: `Purchase Return Refund Received - #${pr.originalPurchaseNo} (${pr.vendorName})`,
          mode: 'REFUND',
          type: 'credit',
          amount: pr.refundAmount,
        });
      }
    });

    // 5. Expenses
    ERPDatabase.getExpenses().forEach((e) => {
      let matches = false;
      if (e.paidFromAccountId && e.paidFromAccountId === acc.id) matches = true;
      else if (!e.paidFromAccountId && acc.accountType === 'cash' && e.paymentMode === 'cash') matches = true;
      else if (!e.paidFromAccountId && acc.accountType === 'bank' && acc.isDefault && e.paymentMode !== 'cash') matches = true;

      if (matches) {
        rawTxns.push({
          id: `exp-${e.id}`,
          date: e.expenseDate || new Date().toISOString(),
          voucherNo: e.voucherNo,
          description: `Expense Payment - ${e.category} (${e.notes || e.paidTo || 'Expense'})`,
          mode: (e.paymentMode || 'cash').toUpperCase(),
          type: 'debit',
          amount: e.amount,
        });
      }
    });

    // 6. Other Incomes
    ERPDatabase.getIncomes().forEach((i) => {
      let matches = false;
      if (i.receivedInAccountId && i.receivedInAccountId === acc.id) matches = true;
      else if (!i.receivedInAccountId && acc.isDefault) matches = true;

      if (matches) {
        rawTxns.push({
          id: `inc-${i.id}`,
          date: i.incomeDate || new Date().toISOString(),
          voucherNo: i.voucherNo,
          description: `Other Income Receipt - ${i.source} (${i.notes || 'Income'})`,
          mode: 'BANK/CASH',
          type: 'credit',
          amount: i.amount,
        });
      }
    });

    // 7. Khata Ledger Payments/Collections
    ERPDatabase.getKhataTransactions().forEach((k) => {
      if (k.paymentMode === 'khata_credit') return;
      let matches = false;
      if (acc.accountType === 'cash' && k.paymentMode === 'cash') matches = true;
      else if (acc.accountType === 'bank' && acc.isDefault && k.paymentMode !== 'cash') matches = true;

      if (matches) {
        if (k.type === 'debit') {
          rawTxns.push({
            id: `khata-${k.id}`,
            date: k.createdAt || new Date().toISOString(),
            voucherNo: k.referenceNo || `KHATA-${k.id.slice(-4)}`,
            description: `Khata Collection Received - ${k.partyName} (${k.notes || 'Ledger Settlement'})`,
            mode: k.paymentMode.toUpperCase(),
            type: 'credit',
            amount: k.amount,
          });
        } else {
          rawTxns.push({
            id: `khata-${k.id}`,
            date: k.createdAt || new Date().toISOString(),
            voucherNo: k.referenceNo || `KHATA-${k.id.slice(-4)}`,
            description: `Khata Payment Outflow - ${k.partyName} (${k.notes || 'Supplier Payment'})`,
            mode: k.paymentMode.toUpperCase(),
            type: 'debit',
            amount: k.amount,
          });
        }
      }
    });

    // 8. Inter-Account Transfers
    ERPDatabase.getAccountTransfers().forEach((t) => {
      if (t.fromAccountId === acc.id) {
        rawTxns.push({
          id: `trx-out-${t.id}`,
          date: t.transferredAt || new Date().toISOString(),
          voucherNo: t.id,
          description: `Inter-Account Transfer Outflow -> ${t.toAccountName} (${t.notes || ''})`,
          mode: 'TRANSFER',
          type: 'debit',
          amount: t.amount,
        });
      } else if (t.toAccountId === acc.id) {
        rawTxns.push({
          id: `trx-in-${t.id}`,
          date: t.transferredAt || new Date().toISOString(),
          voucherNo: t.id,
          description: `Inter-Account Transfer Inflow <- ${t.fromAccountName} (${t.notes || ''})`,
          mode: 'TRANSFER',
          type: 'credit',
          amount: t.amount,
        });
      }
    });

    // Sort chronologically (oldest to newest) to calculate running balance accurately
    rawTxns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalCredits = 0;
    let totalDebits = 0;
    rawTxns.forEach((t) => {
      if (t.type === 'credit') totalCredits += t.amount;
      if (t.type === 'debit') totalDebits += t.amount;
    });

    const openingBalance =
      acc.openingBalance !== undefined
        ? acc.openingBalance
        : Math.max(0, acc.currentBalance - (totalCredits - totalDebits));

    let runningBal = openingBalance;
    const txnsWithBalance = rawTxns.map((tx) => {
      if (tx.type === 'credit') {
        runningBal += tx.amount;
      } else {
        runningBal -= tx.amount;
      }
      return {
        ...tx,
        runningBalance: runningBal,
      };
    });

    // Return reversed for newest on top!
    return {
      openingBalance,
      totalCredits,
      totalDebits,
      netMovement: totalCredits - totalDebits,
      transactions: txnsWithBalance.reverse(),
    };
  }, [activeAccount]);

  // Apply User Filters (Search, Date, Type)
  const filteredTransactions = useMemo(() => {
    return passbookData.transactions.filter((t) => {
      // Type Filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          t.description.toLowerCase().includes(q) ||
          t.voucherNo.toLowerCase().includes(q) ||
          t.mode.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Date Range Filter
      if (dateFilter !== 'all') {
        const tDate = new Date(t.date);
        const now = new Date();
        if (dateFilter === 'today') {
          if (tDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);
          if (tDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);
          if (tDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [passbookData.transactions, searchQuery, dateFilter, typeFilter]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!activeAccount) return;
    const headers = ['Date & Time', 'Voucher / Ref', 'Description', 'Payment Mode', 'Type', 'Deposit (Credit ₹)', 'Withdrawal (Debit ₹)', 'Running Balance (₹)'];
    const rows = filteredTransactions.map((t) => [
      `"${new Date(t.date).toLocaleString()}"`,
      `"${t.voucherNo}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.mode}"`,
      `"${t.type.toUpperCase()}"`,
      t.type === 'credit' ? t.amount : 0,
      t.type === 'debit' ? t.amount : 0,
      t.runningBalance || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeAccount.accountName.replace(/\s+/g, '_')}_Passbook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // DEDICATED CASH BOOK & BANK BOOK AUTOMATED BACKUP DATA
  // -------------------------------------------------------------
  const rawCashBookData = useMemo(() => BackupService.getCashBookData(company?.id), [company?.id, safeAccounts]);
  const rawBankBookData = useMemo(() => BackupService.getBankBookData(company?.id), [company?.id, safeAccounts]);

  // Filtered Cash Book
  const filteredCashBook = useMemo(() => {
    return rawCashBookData.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.Particulars?.toLowerCase().includes(q) ||
          item.Voucher_No?.toLowerCase().includes(q) ||
          item.Category?.toLowerCase().includes(q) ||
          item.Notes?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rawCashBookData, searchQuery]);

  // Filtered Bank Book
  const filteredBankBook = useMemo(() => {
    return rawBankBookData.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.Particulars?.toLowerCase().includes(q) ||
          item.Voucher_No?.toLowerCase().includes(q) ||
          item.Bank_Name?.toLowerCase().includes(q) ||
          item.Payment_Mode?.toLowerCase().includes(q) ||
          item.Notes?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rawBankBookData, searchQuery]);

  // Totals for Cash Book
  const cashBookTotals = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    rawCashBookData.forEach((item) => {
      totalInflow += item.Inflow_Receipt_Cr || 0;
      totalOutflow += item.Outflow_Payment_Dr || 0;
    });
    const latestBalance = rawCashBookData[0]?.Cash_Running_Balance || 0;
    return { totalInflow, totalOutflow, netBalance: latestBalance };
  }, [rawCashBookData]);

  // Totals for Bank Book
  const bankBookTotals = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    rawBankBookData.forEach((item) => {
      totalInflow += item.Inflow_Deposit_Cr || 0;
      totalOutflow += item.Outflow_Withdrawal_Dr || 0;
    });
    const latestBalance = rawBankBookData[0]?.Bank_Running_Balance || 0;
    return { totalInflow, totalOutflow, netBalance: latestBalance };
  }, [rawBankBookData]);

  return (
    <div className="space-y-6">
      {/* Module Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-emerald-300">
                Cash & Bank Accounts (Book Passbooks)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Real-time cash registers, corporate bank passbooks, running balances, adjustments & inter-account transfers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 font-extrabold text-xs text-slate-200 rounded-2xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Import Bank & Cash Accounts from CSV"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => {
              setAdjustAccId(activeAccount?.id || safeAccounts[0]?.id || '');
              setIsAdjustModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 font-extrabold text-xs rounded-2xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Scale className="w-4 h-4 text-emerald-500" />
            <span>Deposit / Withdraw</span>
          </button>

          <button
            onClick={() => {
              setFromAccId(safeAccounts[0]?.id || '');
              setToAccId(safeAccounts[1]?.id || safeAccounts[0]?.id || '');
              setIsTransferModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={onOpenAddAccount}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 font-black text-xs text-white rounded-2xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Top Main Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/90 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewTab('passbooks')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
              viewTab === 'passbooks'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>All Accounts Passbooks (सभी खाते)</span>
          </button>

          <button
            onClick={() => setViewTab('cashBook')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
              viewTab === 'cashBook'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-300" />
            <span>Cash Book (कैश बुक / नगद बही)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-900/60 text-emerald-200 font-extrabold border border-emerald-500/30">
              {rawCashBookData.length}
            </span>
          </button>

          <button
            onClick={() => setViewTab('bankBook')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
              viewTab === 'bankBook'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-300" />
            <span>Bank Book (बैंक बुक / बैंक बही)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-900/60 text-indigo-200 font-extrabold border border-indigo-500/30">
              {rawBankBookData.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">
            Auto Backup Active (ऑटो बैकअप चालू)
          </span>
        </div>
      </div>

      {/* VIEW 1: ALL ACCOUNTS & PASSBOOKS */}
      {viewTab === 'passbooks' && (
        <>
          {/* Account Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {safeAccounts.map((acc) => {
          const isBank = acc.accountType === 'bank';
          const isSelected = acc.id === selectedAccId;

          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccId(acc.id)}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-emerald-950/20 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl ${
                        isBank
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      }`}
                    >
                      {isBank ? <Building2 className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-emerald-300">
                        {acc.accountName}
                      </h3>
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                        {acc.accountType} ACCOUNT
                      </p>
                    </div>
                  </div>
                  {acc.isDefault && <Badge variant="emerald" size="sm">DEFAULT</Badge>}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                  <p className="text-[10px] uppercase font-extrabold text-slate-400">Current Book Balance</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-emerald-400">
                    ₹{acc.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  {acc.accountNumber && (
                    <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                      A/C: {acc.accountNumber} {acc.ifscCode ? `| IFSC: ${acc.ifscCode}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isSelected ? 'Active Passbook' : 'Click to View Passbook'}</span>
                </span>
                {isSelected && (
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
                    Selected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Account Passbook / Book Ledger Section */}
      {activeAccount && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          
          {/* Header Banner & Selector Tabs */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
                  Official Book Passbook
                </span>
                <span className="text-xs font-bold text-slate-400">• {activeAccount.accountName}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                Account Ledger Statement
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Showing itemized cash inflows, outflows, reference numbers and historical running balance.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() =>
                  InvoicePrintService.printAccountLedger(
                    activeAccount,
                    filteredTransactions,
                    company
                  )
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Passbook</span>
              </button>
            </div>
          </div>

          {/* Passbook KPI Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Opening Balance</span>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">
                ₹{passbookData.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Total Inflow (Credit)</span>
              </span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                +₹{passbookData.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-rose-500 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                <span>Total Outflow (Debit)</span>
              </span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                -₹{passbookData.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-amber-500">Net Movement</span>
              <p
                className={`text-lg font-black ${
                  passbookData.netMovement >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {passbookData.netMovement >= 0 ? '+' : ''}₹
                {passbookData.netMovement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="col-span-2 lg:col-span-1 space-y-0.5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-2 lg:pt-0 lg:pl-4">
              <span className="text-[10px] font-black uppercase text-emerald-400">Current Book Balance</span>
              <p className="text-lg font-black text-slate-900 dark:text-emerald-300">
                ₹{activeAccount.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Passbook Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by voucher #, party, note..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Date Filter */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dateFilter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dateFilter === 'today'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter('week')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dateFilter === 'week'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dateFilter === 'month'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  30 Days
                </button>
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Movements</option>
                <option value="credit">Deposits (Credit +)</option>
                <option value="debit">Payouts (Debit -)</option>
              </select>
            </div>
          </div>

          {/* Passbook Transactions Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 dark:bg-slate-950 text-amber-300 uppercase text-[11px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Voucher / Ref #</th>
                    <th className="p-3">Particulars / Transaction Description</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Deposit (+ ₹)</th>
                    <th className="p-3 text-right">Payout (- ₹)</th>
                    <th className="p-3 text-right">Running Book Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900 text-xs font-medium">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                        <p>No transactions found matching your selected filters.</p>
                        <p className="text-[11px] text-slate-400 font-normal">
                          Try resetting your search query or selecting "All Time".
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString()}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {t.voucherNo || '-'}
                        </td>

                        <td className="p-3 font-extrabold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                          {t.description}
                        </td>

                        <td className="p-3 uppercase font-extrabold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">
                            {t.mode}
                          </span>
                        </td>

                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {t.type === 'credit'
                            ? `+₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>

                        <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {t.type === 'debit'
                            ? `-₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>

                        <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-emerald-300 text-sm whitespace-nowrap">
                          ₹{t.runningBalance !== undefined ? t.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* VIEW 2: DEDICATED CASH BOOK (कैश बुक / नगद बही) */}
      {viewTab === 'cashBook' && (
        <div className="space-y-6">
          {/* Header Banner & Actions */}
          <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 p-6 rounded-3xl border border-emerald-500/30 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-black text-[11px] rounded-full uppercase tracking-wider border border-emerald-500/40">
                  NAGAD BAHI (नगद बही)
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  • Automated Offline Local Backup Active
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">
                Official Cash Book (कैश बुक / नगद बही)
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl font-medium">
                Complete itemized record of all cash sales, cash purchases, counter drawer sessions, cash expenses, and cash udhar settlements with running balance tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => BackupService.downloadDedicatedBackupCSV('cashBook')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 font-black text-xs text-white rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Cash Book CSV</span>
              </button>

              <button
                onClick={() => {
                  BackupService.triggerAutoBackup('manual');
                  alert('Cash Book snapshot auto-backed up successfully!');
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-2xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Backup Cash Book Now</span>
              </button>
            </div>
          </div>

          {/* KPI Cards for Cash Book */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Cash Inflow (आवक Cr)</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                +₹{cashBookTotals.totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-slate-500">Sales, Khata receipts & income</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Cash Outflow (जावक Dr)</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                -₹{cashBookTotals.totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-slate-500">Purchases, expenses & bank deposits</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-emerald-500/40 space-y-1">
              <p className="text-[10px] font-black uppercase text-emerald-500">Net Cash Register Balance</p>
              <p className="text-2xl font-black text-slate-900 dark:text-emerald-300">
                ₹{cashBookTotals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-slate-500">Available physical cash in hand</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Cash Transactions</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {filteredCashBook.length} Records
              </p>
              <p className="text-[11px] font-medium text-slate-500">Auto-synced with backup snapshot</p>
            </div>
          </div>

          {/* Search Bar for Cash Book */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cash book by voucher #, category, particulars..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <span className="text-xs font-bold text-slate-500">
              Showing {filteredCashBook.length} of {rawCashBookData.length} Cash Entries
            </span>
          </div>

          {/* Cash Book Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Voucher #</th>
                    <th className="p-3.5">Particulars</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right text-emerald-600 dark:text-emerald-400">Cash Inflow (Cr +)</th>
                    <th className="p-3.5 text-right text-rose-600 dark:text-rose-400">Cash Outflow (Dr -)</th>
                    <th className="p-3.5 text-right">Running Cash Balance</th>
                    <th className="p-3.5">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredCashBook.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                        No cash transactions found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCashBook.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.Date}
                        </td>
                        <td className="p-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {row.Voucher_No}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                          {row.Particulars}
                          {row.Notes && <span className="block text-[10px] text-slate-400 font-normal">{row.Notes}</span>}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {row.Category}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {row.Inflow_Receipt_Cr > 0 ? `+₹${row.Inflow_Receipt_Cr.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {row.Outflow_Payment_Dr > 0 ? `-₹${row.Outflow_Payment_Dr.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-emerald-300 font-mono whitespace-nowrap">
                          ₹{row.Cash_Running_Balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-slate-500 font-bold whitespace-nowrap">
                          {row.Recorded_By}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DEDICATED BANK BOOK (बैंक बुक / बैंक बही) */}
      {viewTab === 'bankBook' && (
        <div className="space-y-6">
          {/* Header Banner & Actions */}
          <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-black text-[11px] rounded-full uppercase tracking-wider border border-indigo-500/40">
                  BANK BAHI (बैंक बही)
                </span>
                <span className="text-xs font-bold text-indigo-400">
                  • Automated Offline Local Backup Active
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">
                Official Bank Book & Statement (बैंक बुक और खाता विवरण)
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl font-medium">
                Comprehensive audit trail of UPI, Card payments, Netbanking transfers, Cheques, Bank deposits, and Withdrawals across all corporate bank accounts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => BackupService.downloadDedicatedBackupCSV('bankBook')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 font-black text-xs text-white rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Bank Book CSV</span>
              </button>

              <button
                onClick={() => {
                  BackupService.triggerAutoBackup('manual');
                  alert('Bank Book snapshot auto-backed up successfully!');
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-2xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>Backup Bank Book Now</span>
              </button>
            </div>
          </div>

          {/* KPI Cards for Bank Book */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Bank Inflow / Deposits (Cr)</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                +₹{bankBookTotals.totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-slate-500">UPI, Card sales, & Contra deposits</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Bank Outflow / Withdrawals (Dr)</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                -₹{bankBookTotals.totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-slate-500">Vendor transfers, expenses & withdrawals</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-indigo-500/40 space-y-1">
              <p className="text-[10px] font-black uppercase text-indigo-500">Net Bank Operating Balance</p>
              <p className="text-2xl font-black text-slate-900 dark:text-indigo-300">
                ₹{bankBookTotals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-slate-500">Total bank accounts liquid balance</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Bank Transactions</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {filteredBankBook.length} Records
              </p>
              <p className="text-[11px] font-medium text-slate-500">Auto-synced with backup snapshot</p>
            </div>
          </div>

          {/* Search Bar for Bank Book */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bank book by voucher #, bank name, payment mode, particulars..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <span className="text-xs font-bold text-slate-500">
              Showing {filteredBankBook.length} of {rawBankBookData.length} Bank Entries
            </span>
          </div>

          {/* Bank Book Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Voucher #</th>
                    <th className="p-3.5">Bank / Account</th>
                    <th className="p-3.5">Particulars</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5 text-right text-emerald-600 dark:text-emerald-400">Deposit (Cr +)</th>
                    <th className="p-3.5 text-right text-rose-600 dark:text-rose-400">Withdrawal (Dr -)</th>
                    <th className="p-3.5 text-right">Running Bank Balance</th>
                    <th className="p-3.5">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredBankBook.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-400 font-bold">
                        No bank transactions found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBankBook.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.Date}
                        </td>
                        <td className="p-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {row.Voucher_No}
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {row.Bank_Name}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                          {row.Particulars}
                          {row.Notes && <span className="block text-[10px] text-slate-400 font-normal">{row.Notes}</span>}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {row.Payment_Mode}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {row.Inflow_Deposit_Cr > 0 ? `+₹${row.Inflow_Deposit_Cr.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {row.Outflow_Withdrawal_Dr > 0 ? `-₹${row.Outflow_Withdrawal_Dr.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-indigo-300 font-mono whitespace-nowrap">
                          ₹{row.Bank_Running_Balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-slate-500 font-bold whitespace-nowrap">
                          {row.Recorded_By}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: INTER-ACCOUNT FUND TRANSFER */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Inter-Account Fund Transfer"
        maxWidth="md"
      >
        <form onSubmit={handleFundTransfer} className="space-y-4 text-xs p-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-black text-amber-500 uppercase">
                From Account *
              </label>
              <select
                value={fromAccId}
                onChange={(e) => setFromAccId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              >
                {safeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} (₹{a.currentBalance})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-black text-emerald-400 uppercase">
                To Account *
              </label>
              <select
                value={toAccId}
                onChange={(e) => setToAccId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              >
                {safeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} (₹{a.currentBalance})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-black text-emerald-400 uppercase">
              Transfer Amount (₹) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={transferAmt}
              onChange={(e) => setTransferAmt(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-black text-slate-300 uppercase">
              Transfer Notes / Reason
            </label>
            <input
              type="text"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="e.g. Weekly cash deposit to bank"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md uppercase cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Execute Transfer</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: DEPOSIT / WITHDRAWAL ADJUSTMENT */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Deposit or Withdraw Cash/Bank Adjustment"
        maxWidth="md"
      >
        <form onSubmit={handleBalanceAdjustment} className="space-y-4 text-xs p-1">
          <div className="space-y-1">
            <label className="block font-black text-slate-300 uppercase">
              Select Account *
            </label>
            <select
              value={adjustAccId}
              onChange={(e) => setAdjustAccId(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {safeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} (Current: ₹{a.currentBalance})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-black text-slate-300 uppercase">
              Adjustment Action *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('deposit')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  adjustType === 'deposit'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-300" />
                <span>Deposit (+ Credit)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustType('withdrawal')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  adjustType === 'withdrawal'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <MinusCircle className="w-4 h-4 text-rose-300" />
                <span>Withdraw (- Debit)</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-black text-emerald-400 uppercase">
              Amount (₹) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={adjustAmt}
              onChange={(e) => setAdjustAmt(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-black text-slate-300 uppercase">
              Remarks / Voucher Note *
            </label>
            <input
              type="text"
              required
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="e.g. Owner capital injection / Petty cash top-up"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 font-black text-white rounded-xl shadow-md uppercase cursor-pointer flex items-center gap-1.5 ${
                adjustType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <span>Confirm {adjustType.toUpperCase()}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="accounts"
      />
    </div>
  );
};
