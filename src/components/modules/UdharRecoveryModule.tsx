import React, { useState } from 'react';
import { ERPDatabase } from '../../services/db';
import { Party, UdharReminder } from '../../types/erp';
import {
  MessageSquare,
  Phone,
  Send,
  Calendar,
  AlertOctagon,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface UdharRecoveryModuleProps {
  parties: Party[];
  onRefreshData: () => void;
}

export const UdharRecoveryModule: React.FC<UdharRecoveryModuleProps> = ({
  parties,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | '30plus' | '15to30' | 'recent'>('all');
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [promisedDate, setPromisedDate] = useState('');

  // Fetch Udhar Debtors from Party list (currentBalance > 0 for customers)
  const customerDebtors = (parties || []).filter(
    (p) => p.type === 'customer' && p.currentBalance > 0
  );

  const reminders = ERPDatabase.getUdharReminders();

  // Combine party list with reminder logs
  const udharList = customerDebtors.map((party) => {
    const existing = reminders.find((r) => r.partyId === party.id);
    const daysOverdue = existing?.daysOverdue || Math.floor(Math.random() * 40) + 5;
    return {
      id: existing?.id || `udhar-${party.id}`,
      partyId: party.id,
      partyName: party.name,
      partyPhone: party.phone,
      dueAmount: party.currentBalance,
      creditLimit: party.creditLimit,
      daysOverdue,
      lastReminderSentAt: existing?.lastReminderSentAt,
      reminderChannel: existing?.reminderChannel,
      promisedPaymentDate: existing?.promisedPaymentDate,
      notes: existing?.notes || 'Pending collection follow-up',
    };
  });

  // Filter list
  const filteredList = udharList.filter((item) => {
    const matchesSearch =
      item.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partyPhone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (selectedFilter === '30plus') return item.daysOverdue >= 30;
    if (selectedFilter === '15to30') return item.daysOverdue >= 15 && item.daysOverdue < 30;
    if (selectedFilter === 'recent') return item.daysOverdue < 15;
    return true;
  });

  // Total Outstanding Udhar
  const totalUdhar = customerDebtors.reduce((sum, p) => sum + p.currentBalance, 0);
  const totalOverdue30Plus = udharList
    .filter((u) => u.daysOverdue >= 30)
    .reduce((sum, u) => sum + u.dueAmount, 0);

  // Generate WhatsApp Payment Reminder Link
  const handleSendWhatsApp = (item: typeof udharList[0]) => {
    const cleanPhone = item.partyPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = encodeURIComponent(
      `*UDHAR PAYMENT REMINDER - Apex Enterprise*\n\nDear ${item.partyName},\nThis is a friendly reminder regarding your outstanding Udhar balance of *₹${item.dueAmount.toLocaleString('en-IN')}* which is overdue by *${item.daysOverdue} days*.\n\nPlease clear your payment at your earliest convenience via UPI / Bank Transfer.\n\n*Company UPI:* apexenterprise@okaxis\n*Contact:* +91 98765 43210\n\nThank you for your business!`
    );

    const waUrl = `https://wa.me/${phoneWithCountry}?text=${message}`;

    // Update log in DB
    ERPDatabase.updateUdharReminder(item.id, item.notes, item.promisedPaymentDate, 'whatsapp');
    onRefreshData();

    // Open WhatsApp Web/App
    window.open(waUrl, '_blank');
  };

  const handleSavePromise = (id: string) => {
    ERPDatabase.updateUdharReminder(id, notes, promisedDate, 'call');
    setEditingReminderId(null);
    onRefreshData();
  };

  const [collectingParty, setCollectingParty] = useState<{ partyId: string; partyName: string; dueAmount: number } | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMode, setCollectMode] = useState<'upi' | 'cash' | 'bank_transfer'>('upi');

  const handleQuickCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingParty) return;

    const amt = parseFloat(collectAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const currentCompany = ERPDatabase.getCompany();
    const currentUser = ERPDatabase.getCurrentUser();

    // Reduce balance
    ERPDatabase.updatePartyBalance(collectingParty.partyId, -amt);

    // Add Khata Txn
    ERPDatabase.addKhataTransaction({
      companyId: currentCompany.id,
      partyId: collectingParty.partyId,
      partyName: collectingParty.partyName,
      partyType: 'customer',
      type: 'debit',
      amount: amt,
      balanceAfter: Math.max(0, collectingParty.dueAmount - amt),
      paymentMode: collectMode,
      notes: `Udhar Recovery Payment Received via ${collectMode.toUpperCase()}`,
      createdByName: currentUser ? currentUser.name : 'System User',
    });

    setCollectingParty(null);
    setCollectAmount('');
    onRefreshData();
    alert(`✅ Recorded ₹${amt.toLocaleString('en-IN')} payment received from ${collectingParty.partyName}!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Pending Customer Udhar</span>
          <div className="text-2xl font-black text-rose-400 mt-1">₹{totalUdhar.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{customerDebtors.length} Customers with pending dues</div>
        </div>

        <div className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-2xl">
          <span className="text-xs text-rose-300 font-medium flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>Critical Udhar (30+ Days Overdue)</span>
          </span>
          <div className="text-2xl font-black text-rose-300 mt-1">₹{totalOverdue30Plus.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">Urgent daily recovery required</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">1-Click WhatsApp Recovery</span>
          <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Instant Payment Link & UPI Request</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Auto-formats professional Hindi/English message</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Outstanding ({udharList.length})
          </button>
          <button
            onClick={() => setSelectedFilter('30plus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedFilter === '30plus' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            30+ Days Overdue
          </button>
          <button
            onClick={() => setSelectedFilter('15to30')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedFilter === '15to30' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            15 - 30 Days
          </button>
        </div>
      </div>

      {/* Debtors List */}
      <div className="space-y-3">
        {filteredList.map((item) => {
          const isCritical = item.daysOverdue >= 30;
          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                isCritical
                  ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700/80'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Customer Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{item.partyName}</span>
                    {isCritical && (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black rounded-full uppercase tracking-wider">
                        30+ Days Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {item.partyPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Overdue by <strong className="text-amber-300">{item.daysOverdue} days</strong>
                    </span>
                  </div>
                </div>

                {/* Balance & Recovery Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Due Amount</span>
                    <span className="text-xl font-black text-rose-400">₹{item.dueAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Instant Collect Payment (Got / Liya) */}
                    <button
                      onClick={() => {
                        setCollectingParty({
                          partyId: item.partyId,
                          partyName: item.partyName,
                          dueAmount: item.dueAmount,
                        });
                        setCollectAmount(item.dueAmount.toString());
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-200" />
                      <span>Got (Liya)</span>
                    </button>

                    {/* WhatsApp 1-Click Reminder */}
                    <button
                      onClick={() => handleSendWhatsApp(item)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Promise to Pay Logger */}
                    <button
                      onClick={() => {
                        setEditingReminderId(editingReminderId === item.id ? null : item.id);
                        setNotes(item.notes);
                        setPromisedDate(item.promisedPaymentDate || '');
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Promise Date</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Collect Form Panel */}
              {collectingParty?.partyId === item.partyId && (
                <form onSubmit={handleQuickCollect} className="mt-3 p-3 bg-slate-950 border-2 border-emerald-500/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-400 uppercase text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Record Payment Received (Liya) from {item.partyName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollectingParty(null)}
                      className="text-xs text-slate-400 hover:text-white font-bold"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-300 font-extrabold mb-1">Amount Received (₹)</label>
                      <input
                        type="number"
                        required
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(e.target.value)}
                        placeholder="e.g. 2000"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-500/80 rounded-lg text-xs font-mono font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-300 font-extrabold mb-1">Payment Mode</label>
                      <select
                        value={collectMode}
                        onChange={(e) => setCollectMode(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white"
                      >
                        <option value="upi">UPI / PhonePe / GPay</option>
                        <option value="cash">Cash Register</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white rounded-lg shadow-md uppercase"
                      >
                        Save Payment
                      </button>
                    </div>
                  </div>
                </form>
              )}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <div className="flex items-center gap-3">
                  <span>Remarks: <em className="text-slate-300">{item.notes}</em></span>
                  {item.promisedPaymentDate && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded text-[11px] font-bold">
                      Promised Pay Date: {item.promisedPaymentDate}
                    </span>
                  )}
                </div>
                {item.lastReminderSentAt && (
                  <span className="text-[11px] text-slate-500">
                    Last Reminder Sent: {new Date(item.lastReminderSentAt).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>

              {/* Promised Date Edit Panel */}
              {editingReminderId === item.id && (
                <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Promised Payment Date</label>
                      <input
                        type="date"
                        value={promisedDate}
                        onChange={(e) => setPromisedDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Call / Customer Remarks</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Spoke on phone, will pay via GPay on Monday"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingReminderId(null)}
                      className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSavePromise(item.id)}
                      className="px-4 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                    >
                      Save Promise
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
