import React, { useState } from 'react';
import { ERPDatabase } from '../../services/db';
import { Modal } from '../common/Modal';
import { Coins, CheckCircle, AlertTriangle, Calculator, DollarSign, RefreshCw } from 'lucide-react';

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCounterName: string;
  cashierName: string;
}

export const CashDrawerModal: React.FC<CashDrawerModalProps> = ({
  isOpen,
  onClose,
  currentCounterName,
  cashierName,
}) => {
  const [openingCash, setOpeningCash] = useState<number>(2000);
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Denominations
  const [counts, setCounts] = useState({
    c2000: 0,
    c500: 0,
    c200: 0,
    c100: 0,
    c50: 0,
    c20: 0,
    c10: 0,
    coins: 0,
  });

  // Calculate System Expected Cash from today's completed cash sales
  const sales = ERPDatabase.getSales();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCashSalesTotal = sales
    .filter((s) => s.billedAt.startsWith(todayStr) && s.paymentMode === 'cash')
    .reduce((sum, s) => sum + (s.paymentDetails?.cashAmount || s.paidAmount || 0), 0);

  const systemExpectedCash = openingCash + todayCashSalesTotal;

  // Calculate physical total
  const totalPhysicalCash =
    counts.c2000 * 2000 +
    counts.c500 * 500 +
    counts.c200 * 200 +
    counts.c100 * 100 +
    counts.c50 * 50 +
    counts.c20 * 20 +
    counts.c10 * 10 +
    counts.coins * 1;

  const discrepancy = totalPhysicalCash - systemExpectedCash;

  const handleDenominationChange = (key: keyof typeof counts, val: number) => {
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, val || 0) }));
  };

  const handleSaveReconciliation = () => {
    ERPDatabase.addCashDrawerSession({
      companyId: 'comp-001',
      counterId: 'cnt-01',
      counterName: currentCounterName,
      cashierName: cashierName,
      openedAt: new Date(Date.now() - 28800000).toISOString(),
      closedAt: new Date().toISOString(),
      openingCash,
      expectedCash: systemExpectedCash,
      systemExpectedCash,
      physicalCashCount: counts,
      totalPhysicalCash,
      discrepancy,
      status: 'reconciled_closed',
      notes,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  const denominationsList: { key: keyof typeof counts; label: string; value: number; color: string }[] = [
    { key: 'c2000', label: '₹2000 Note', value: 2000, color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
    { key: 'c500', label: '₹500 Note', value: 500, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    { key: 'c200', label: '₹200 Note', value: 200, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { key: 'c100', label: '₹100 Note', value: 100, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
    { key: 'c50', label: '₹50 Note', value: 50, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    { key: 'c20', label: '₹20 Note', value: 20, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
    { key: 'c10', label: '₹10 Note', value: 10, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { key: 'coins', label: 'Coins & Change', value: 1, color: 'text-slate-300 border-slate-700 bg-slate-800' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💵 Cash Drawer & Galla Reconciliation (Shift Closing)" maxWidth="max-w-4xl">
      <div className="space-y-6 text-slate-200">
        {savedSuccess ? (
          <div className="p-8 text-center bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-emerald-300">Galla Reconciliation Saved Successfully!</h3>
            <p className="text-sm text-slate-400">Shift closing record logged to audit trail and financial database.</p>
          </div>
        ) : (
          <>
            {/* Shift Context Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block">Active Counter</span>
                <span className="font-bold text-emerald-400 text-sm">{currentCounterName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Cashier / Staff</span>
                <span className="font-bold text-white text-sm">{cashierName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Today Cash Sales (System)</span>
                <span className="font-bold text-cyan-400 text-sm">₹{todayCashSalesTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Reconciliation Math Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-xs text-slate-400">Opening Cash + Sales = Expected</span>
                <div className="text-xl font-black text-cyan-300 mt-1">₹{systemExpectedCash.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Opening: ₹{openingCash} | Sales: ₹{todayCashSalesTotal}</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-xs text-slate-400">Physical Counted Cash</span>
                <div className="text-xl font-black text-emerald-400 mt-1">₹{totalPhysicalCash.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Sum of all notes & coins</div>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  discrepancy === 0
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : discrepancy > 0
                    ? 'bg-blue-950/30 border-blue-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}
              >
                <span className="text-xs text-slate-300 flex items-center justify-between">
                  <span>Discrepancy (Galla Math)</span>
                  {discrepancy === 0 ? (
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded">MATCHED</span>
                  ) : discrepancy > 0 ? (
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded">EXCESS</span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded">SHORTAGE</span>
                  )}
                </span>
                <div
                  className={`text-xl font-black mt-1 ${
                    discrepancy === 0 ? 'text-emerald-400' : discrepancy > 0 ? 'text-blue-400' : 'text-rose-400'
                  }`}
                >
                  {discrepancy >= 0 ? `+₹${discrepancy.toLocaleString('en-IN')}` : `-₹${Math.abs(discrepancy).toLocaleString('en-IN')}`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {discrepancy === 0
                    ? 'Physical cash perfectly matches system logs!'
                    : discrepancy > 0
                    ? 'Excess cash found in galla drawer.'
                    : 'Galla cash is less than system expected sales.'}
                </div>
              </div>
            </div>

            {/* Currency Denominations Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Enter Physical Cash Denomination Count</span>
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    setCounts({ c2000: 0, c500: 0, c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, coins: 0 })
                  }
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Counts
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {denominationsList.map((d) => {
                  const count = counts[d.key];
                  const lineTotal = count * d.value;
                  return (
                    <div key={d.key} className={`p-3 rounded-xl border ${d.color} flex flex-col justify-between space-y-2`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{d.label}</span>
                        <span className="text-[10px] opacity-80">₹{lineTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={count || ''}
                          onChange={(e) => handleDenominationChange(d.key, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs text-slate-400 shrink-0">pcs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opening Cash Adjustment & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Shift Opening Float Cash (₹)</label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Closing Remarks / Discrepancy Reason</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. ₹50 change given to vendor, verified by supervisor"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReconciliation}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save & Close Galla Shift</span>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
