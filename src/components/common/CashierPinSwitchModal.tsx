import React, { useState, useEffect } from 'react';
import { KeyRound, UserCheck, X, ShieldCheck, Store, Lock, ArrowRight, User as UserIcon } from 'lucide-react';
import { User, Company } from '../../types/erp';

interface CashierPinSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  company: Company;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
}

export const CashierPinSwitchModal: React.FC<CashierPinSwitchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  company,
  allUsers = [],
  onSwitchUser,
}) => {
  // STRICT COMPANY FILTER: Get cashiers / staff belonging strictly to this store
  const storeStaff = allUsers.filter(
    (u) => u.companyId === company.id && u.role !== 'super_admin'
  );

  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(currentUser.id);
      setPin('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleVerifyAndSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const targetUser = storeStaff.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      setErrorMsg('कृपया इस दुकान का वैध कैशियर / यूज़र चुनें।');
      return;
    }

    const userConfiguredPin = (targetUser as any).pin || (targetUser as any).password;

    if (!userConfiguredPin || !String(userConfiguredPin).trim()) {
      setErrorMsg('❌ इस यूज़र के लिए POS PIN सेट नहीं है। स्विच करने से पहले यूज़र सेटिंग्स में जाकर PIN कॉन्फ़िगर करें।');
      return;
    }

    if (pin.trim() === String(userConfiguredPin).trim()) {
      setSuccessMsg(`✅ कैशियर बदला गया: ${targetUser.name} (${targetUser.role.toUpperCase()})`);
      setTimeout(() => {
        onSwitchUser(targetUser);
        onClose();
      }, 500);
    } else {
      setErrorMsg('❌ गलत POS PIN! कृपया इस यूज़र के लिए कॉन्फ़िगर किया गया सही PIN दर्ज करें।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border-b border-emerald-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">
                कैशियर बदलें (POS PIN Switch)
              </h3>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <Store className="w-3 h-3" />
                <span>{company.name} (Shop ID: {company.id})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerifyAndSwitch} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl text-xs font-bold text-rose-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Active Cashier Indicator */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">वर्तमान कैशियर:</span>
            <span className="font-extrabold text-emerald-400 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5" />
              {currentUser.name} ({currentUser.role})
            </span>
          </div>

          {/* Company Cashier Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-300 flex items-center justify-between">
              <span>{company.name} के कैशियर / स्टाफ चुनें:</span>
              <span className="text-[10px] text-emerald-400 font-bold">({storeStaff.length} उपलब्ध)</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {storeStaff.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white font-semibold">
                  👤 {u.name} — [{u.role.toUpperCase()}] ({u.phone || u.email})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 font-medium">
              * केवल <strong className="text-emerald-300">{company.name}</strong> दुकान के ही कैशियर दिखाए जा रहे हैं।
            </p>
          </div>

          {/* POS PIN Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-300">4-अंकीय POS PIN दर्ज करें:</label>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 text-center text-xl font-mono text-emerald-400 tracking-[0.5em] focus:outline-none focus:border-emerald-500"
              />
              <KeyRound className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3.5 opacity-60" />
            </div>
            <p className="text-[10px] text-slate-400 text-center font-medium">
              (सुरक्षा हेतु चुने गए यूज़र का सही POS PIN दर्ज करें)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>वेरीफाई व बदलें</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
