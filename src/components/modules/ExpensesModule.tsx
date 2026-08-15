import React, { useState } from 'react';
import { Receipt, Plus, DollarSign, TrendingDown, TrendingUp, Trash2, Upload } from 'lucide-react';
import { Expense, OtherIncome, Account, Company } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { CsvImportModal } from '../common/CsvImportModal';

interface ExpensesModuleProps {
  expenses: Expense[];
  incomes: OtherIncome[];
  accounts: Account[];
  company: Company;
  onRefreshData: () => void;
}

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  expenses = [],
  incomes = [],
  accounts = [],
  company,
  onRefreshData,
}) => {
  const safeExpenses = expenses || [];
  const safeIncomes = incomes || [];
  const safeAccounts = accounts || [];

  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null);
  const [deleteIncomeTarget, setDeleteIncomeTarget] = useState<OtherIncome | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const handleConfirmDeleteExpense = () => {
    if (!deleteExpenseTarget) return;
    ERPDatabase.deleteExpense(deleteExpenseTarget.id);
    setDeleteExpenseTarget(null);
    onRefreshData();
  };

  const handleConfirmDeleteIncome = () => {
    if (!deleteIncomeTarget) return;
    ERPDatabase.deleteIncome(deleteIncomeTarget.id);
    setDeleteIncomeTarget(null);
    onRefreshData();
  };

  // Expense State
  const [category, setCategory] = useState<any>('Rent');
  const [amount, setAmount] = useState('');
  const [paidFromAccId, setPaidFromAccId] = useState(safeAccounts[0]?.id || '');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');

  // Income State
  const [incomeSource, setIncomeSource] = useState<any>('Scrap Sale');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [receivedAccId, setReceivedAccId] = useState(accounts[0]?.id || '');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = accounts.find((a) => a.id === paidFromAccId);
    if (!acc) return;

    ERPDatabase.addExpense({
      companyId: company.id,
      category,
      amount: parseFloat(amount) || 0,
      paidFromAccountId: acc.id,
      paidFromAccountName: acc.accountName,
      paidTo: paidTo || 'Vendor / Service Provider',
      paymentMode: 'cash',
      notes: notes || 'Business operating expense',
      createdByName: 'System User',
    });

    setIsExpenseModalOpen(false);
    onRefreshData();
  };

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = accounts.find((a) => a.id === receivedAccId);
    if (!acc) return;

    ERPDatabase.addIncome({
      companyId: company.id,
      source: incomeSource,
      amount: parseFloat(incomeAmount) || 0,
      receivedInAccountId: acc.id,
      receivedInAccountName: acc.accountName,
      notes: notes || 'Misc business income',
      createdByName: 'System User',
    });

    setIsIncomeModalOpen(false);
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400">Expenses & Other Income</h2>
          <p className="text-xs text-slate-500">Record shop operating expenses, staff salaries, utilities & scrap income.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Import Expenses from CSV"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-colors ${
            activeTab === 'expenses'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Operating Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-colors ${
            activeTab === 'income'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Other Income ({incomes.length})
        </button>
      </div>

      {/* Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-3 rounded-l-lg">Voucher #</th>
              <th className="p-3">Category / Source</th>
              <th className="p-3">Paid From / Account</th>
              <th className="p-3">Notes</th>
              <th className="p-3 text-right">Date</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeTab === 'expenses'
              ? expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-emerald-300">{e.voucherNo}</td>
                    <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">{e.category}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{e.paidFromAccountName}</td>
                    <td className="p-3 text-slate-500">{e.notes}</td>
                    <td className="p-3 text-right text-slate-500">{new Date(e.expenseDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">
                      -₹{e.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setDeleteExpenseTarget(e)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              : incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-emerald-300">{inc.voucherNo}</td>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{inc.source}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{inc.receivedInAccountName}</td>
                    <td className="p-3 text-slate-500">{inc.notes}</td>
                    <td className="p-3 text-right text-slate-500">{new Date(inc.incomeDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      +₹{inc.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setDeleteIncomeTarget(inc)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="Delete Income"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Record Expense Voucher" maxWidth="md">
        <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            >
              <option value="Rent">Rent</option>
              <option value="Salaries">Staff Salaries</option>
              <option value="Electricity">Electricity & Utilities</option>
              <option value="Logistics & Freight">Logistics & Freight</option>
              <option value="Tea & Snacks">Tea & Refreshments</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Marketing">Marketing & Ads</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Paid From Account
              </label>
              <select
                value={paidFromAccId}
                onChange={(e) => setPaidFromAccId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
              Paid To (Recipient)
            </label>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Landlord Name / Power Board"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 font-bold text-slate-600">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 font-bold bg-rose-600 text-white rounded-xl">
              Record Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Income Modal */}
      <Modal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} title="Record Other Income Voucher" maxWidth="md">
        <form onSubmit={handleAddIncome} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
              Income Source *
            </label>
            <select
              value={incomeSource}
              onChange={(e) => setIncomeSource(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            >
              <option value="Scrap Sale">Scrap / Cardboard Sale</option>
              <option value="Interest Income">Bank Interest</option>
              <option value="Commission">Commission Received</option>
              <option value="Rent Income">Sub-lease Rent</option>
              <option value="Rebate">Supplier Rebate</option>
              <option value="Other">Other Miscellaneous</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Received In Account
              </label>
              <select
                value={receivedAccId}
                onChange={(e) => setReceivedAccId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsIncomeModalOpen(false)} className="px-4 py-2 font-bold text-slate-600">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl">
              Record Income
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Expense Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteExpenseTarget}
        onClose={() => setDeleteExpenseTarget(null)}
        onConfirm={handleConfirmDeleteExpense}
        title="Delete Expense Voucher"
        message={`Are you sure you want to PERMANENTLY DELETE expense voucher ${deleteExpenseTarget?.voucherNo}?`}
      />

      {/* Delete Income Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteIncomeTarget}
        onClose={() => setDeleteIncomeTarget(null)}
        onConfirm={handleConfirmDeleteIncome}
        title="Delete Other Income Voucher"
        message={`Are you sure you want to PERMANENTLY DELETE income voucher ${deleteIncomeTarget?.voucherNo}?`}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="expenses"
      />
    </div>
  );
};
