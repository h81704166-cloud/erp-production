import React, { useState, useEffect } from 'react';
import {
  Crown,
  Globe,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { User as ERPUser } from '../../types/erp';
import { ERPDatabase } from '../../services/db';

interface CPanelLoginPageProps {
  onLoginSuccess: (user: ERPUser, masterToken?: string) => void;
  onNavigateToMerchantLogin?: () => void;
  onNavigateToSignup?: () => void;
  onNavigateToDemo?: () => void;
}

export const CPanelLoginPage: React.FC<CPanelLoginPageProps> = ({
  onLoginSuccess,
  onNavigateToMerchantLogin,
  onNavigateToSignup,
  onNavigateToDemo,
}) => {
  // Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Security state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isIpBlocked, setIsIpBlocked] = useState<boolean>(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Check URL route for visual header
  const fullDisplayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/secure-master-cpanel-auth`
    : 'www.websitename.com/secure-master-cpanel-auth';

  // Handle Lockout countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsIpBlocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Handle Super Admin C-Panel Auth Submission
  const handleCPanelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isIpBlocked) {
      setErrorMsg(`⚠️ Too many failed attempts! IP locked out for ${lockoutTimer} seconds.`);
      return;
    }

    if (!adminEmail.trim() || !adminPassword.trim()) {
      setErrorMsg('कृपया Super Admin Email और Master Password दोनों भरें।');
      return;
    }

    setIsSubmitting(true);

    try {
      // Attempt backend isolated authentication API call first
      const response = await fetch('/api/auth/cpanel-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim(),
          masterPassword: adminPassword.trim(),
        }),
      }).catch(() => null);

      if (response && response.status === 429) {
        setIsIpBlocked(true);
        setLockoutTimer(900); // 15 mins
        setIsSubmitting(false);
        setErrorMsg('🛑 Rate Limit Exceeded: IP temporarily blocked due to 5 consecutive failed C-Panel login attempts.');
        return;
      }

      if (response && response.ok) {
        const data = await response.json();
        setIsSubmitting(false);
        setSuccessMsg('✅ Super Admin C-Panel token generated! Isolated Master Access granted.');
        
        // Save C-Panel Master token in localStorage
        if (data.cpanelMasterToken) {
          localStorage.setItem('cpanel_master_token', data.cpanelMasterToken);
        }
        localStorage.setItem('erp_is_cpanel_authenticated', 'true');

        // Security update: Never store plain-text master password in local storage
        const superUser = ERPDatabase.addOrUpdateSuperAdmin({
          name: data.user?.name || 'Super Admin (Billkart)',
          email: adminEmail.trim(),
          phone: '+91 99999 00000',
          pin: '******', // Masked placeholder: Real authentication relies on server JWT token
        });

        setTimeout(() => {
          onLoginSuccess(superUser, data.cpanelMasterToken);
        }, 400);
        return;
      }

      // Offline / Local database fallback authentication logic
      setTimeout(() => {
        setIsSubmitting(false);
        const newFails = failedAttempts + 1;
        setFailedAttempts(newFails);
        if (newFails >= 5) {
          setIsIpBlocked(true);
          setLockoutTimer(300);
          setErrorMsg('🔒 Security Alert: 5 consecutive invalid master passwords. C-Panel access locked for 5 minutes.');
        } else {
          setErrorMsg(`❌ C-Panel Master Authentication failed. Invalid Super Admin credentials or server unreachable! Attempt ${newFails}/5 before lockout.`);
        }
      }, 400);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg('Error: ' + (err?.message || 'Authentication system error.'));
    }
  };

  const handleDirectOpenPath = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/secure-master-cpanel-auth');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1220] text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans relative overflow-x-hidden">
      {/* Background Cyber Glowing Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-xl z-10 space-y-4">
        
        {/* Top Header Navigation Tabs matching screenshot */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#0F172A] p-2 rounded-2xl border border-slate-800 text-center shadow-xl">
          <button
            type="button"
            onClick={onNavigateToMerchantLogin}
            className="py-2.5 px-2 text-[11px] sm:text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>व्यापारी लॉगिन</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToSignup}
            className="py-2.5 px-2 text-[11px] sm:text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>नया खाता बनाएं</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToDemo}
            className="py-2.5 px-2 text-[11px] sm:text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 text-amber-400 hover:bg-slate-800 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>डेमो चलाएं</span>
          </button>

          <button
            type="button"
            className="py-2.5 px-2 text-[11px] sm:text-xs font-black rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-950/60 flex items-center justify-center gap-1.5"
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>C-Panel</span>
          </button>
        </div>

        {/* Main C-Panel Form Card */}
        <div className="bg-[#1E293B]/95 border border-rose-900/60 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-2xl space-y-5 relative">
          
          {/* C-Panel Banner Box */}
          <div className="p-4 bg-gradient-to-br from-rose-950/80 via-slate-900 to-rose-950/60 border border-rose-500/30 rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
                <Crown className="w-5 h-5 text-rose-400" />
                <span className="text-white">बिलकार्ट मुख्य एडमिन पोर्टल (C-Panel Control)</span>
              </div>
            </div>

            <p className="text-xs text-rose-200/90 font-medium leading-relaxed">
              सॉफ़्टवेयर ओनर एडमिन के लिए सुरक्षित Control Panel पोर्टल।
            </p>

            {/* Direct Open URL Banner */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-2.5 bg-[#0B1220]/90 border border-rose-500/40 rounded-xl gap-2">
              <div className="flex items-center gap-2 text-rose-300 font-mono text-[11px] sm:text-xs truncate">
                <Globe className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-slate-300 truncate">URL: <strong className="text-rose-300">{fullDisplayUrl}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleDirectOpenPath}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs rounded-lg shadow-md cursor-pointer transition-all shrink-0 text-center"
              >
                Direct Open
              </button>
            </div>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/90 border border-rose-600/80 rounded-xl text-xs font-bold text-rose-200 flex items-center gap-2.5 animate-shake">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message Display */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-950/90 border border-emerald-600/80 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleCPanelSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                <span>Super Admin Email *</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@billkart.shop"
                  className="w-full bg-white text-slate-900 font-bold border border-slate-300 rounded-2xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                <span>Super Admin Security Password *</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white text-slate-900 font-bold border border-slate-300 rounded-2xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono shadow-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Main Glowing Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || isIpBlocked}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-rose-500 active:scale-98 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-rose-900/50 transition-all cursor-pointer flex items-center justify-center gap-2.5 mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>C-Panel सुरक्षा जाँच की जा रही है...</span>
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 text-amber-300" />
                  <span>C-Panel सुपर एडमिन लॉगिन करें</span>
                </>
              )}
            </button>
          </form>

          {/* Security Badges Footer */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 font-semibold">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>256-Bit Encrypted Vyapar Session</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Multi-Tenant RLS Guard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

