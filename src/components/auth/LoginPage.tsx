import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Building,
  User,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Wifi,
  WifiOff,
  Sparkles,
  CheckCircle2,
  Users,
  Store,
  BadgeCheck,
  Zap,
  Phone,
  PlusCircle,
  FileText,
  Smartphone,
  Crown,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { User as ERPUser, Company, UserRole } from '../../types/erp';
import { ERPDatabase } from '../../services/db';

interface LoginPageProps {
  onLoginSuccess: (user: ERPUser) => void;
  companies?: Company[];
  allUsers?: ERPUser[];
  autoLogoutNotice?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  companies = [],
  allUsers = [],
  autoLogoutNotice = null,
}) => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Active Login Mode ('login' or 'reset')
  const [authTab, setAuthTab] = useState<'login' | 'reset'>('login');

  // Login Form State
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('otp');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentOtpCode, setSentOtpCode] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Reset Password Form State
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const availableUsers = allUsers.length > 0 ? allUsers : ERPDatabase.getUsers();
  const availableCompanies = companies.length > 0 ? companies : ERPDatabase.getCompanies();

  // Security Rate Limiting & Lockout State (Brute-Force Protection)
  const [failedOtpCount, setFailedOtpCount] = useState<number>(0);
  const [failedPasswordCount, setFailedPasswordCount] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);

  // Resend Cooldown (60s) & OTP Expiry Countdown (300s = 5m)
  const [resendCooldownSec, setResendCooldownSec] = useState<number>(0);
  const [otpExpirySec, setOtpExpirySec] = useState<number>(0);

  // Resend Cooldown Timer Effect
  useEffect(() => {
    if (resendCooldownSec <= 0) return;
    const timer = setInterval(() => {
      setResendCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldownSec]);

  // OTP Expiry Countdown Effect
  useEffect(() => {
    if (otpExpirySec <= 0) return;
    const timer = setInterval(() => {
      setOtpExpirySec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpExpirySec]);

  // Lockout Countdown Timer Effect
  useEffect(() => {
    if (lockoutRemainingSec <= 0) {
      if (isLockedOut) {
        setIsLockedOut(false);
        setErrorMsg(null);
        setSuccessMsg('🎉 Lockout की समय सीमा समाप्त हो गई है! अब आप पुनः OTP दर्ज कर सकते हैं।');
      }
      return;
    }
    const timer = setInterval(() => {
      setLockoutRemainingSec((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          setErrorMsg(null);
          setSuccessMsg('🎉 Lockout की समय सीमा समाप्त हो गई है! अब आप पुनः OTP दर्ज कर सकते हैं।');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemainingSec, isLockedOut]);

  // Handle Dispatching Free Email OTP
  const handleSendOtp = async () => {
    if (isLockedOut) {
      setErrorMsg(`🚨 सुरक्षा अलर्ट: 5 बार गलत OTP प्रयास के कारण आपका अकाउंट locked है। कृपया ${Math.ceil(lockoutRemainingSec / 60)} मिनट प्रतीक्षा करें।`);
      return;
    }
    if (resendCooldownSec > 0) {
      setErrorMsg(`कृपया पुनः OTP भेजने के लिए ${resendCooldownSec} सेकंड प्रतीक्षा करें।`);
      return;
    }
    if (!emailOrPhone.trim()) {
      setErrorMsg('कृपया OTP प्राप्त करने के लिए अपना ईमेल या मोबाइल दर्ज करें।');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSendingOtp(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrPhone.trim() }),
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setOtpSent(true);
        setSentOtpCode(data.otp);
        setOtp('');
        setResendCooldownSec(data.resendInSeconds || 60);
        setOtpExpirySec(data.expiresInSeconds || 300);
        setSuccessMsg(
          data.smtpSent
            ? `📧 Email OTP dispatched successfully to ${emailOrPhone.trim()}! Check your inbox.`
            : `📧 OTP generated for ${emailOrPhone.trim()}! Code: [ ${data.otp} ]`
        );
      } else if (response && response.status === 429) {
        const data = await response.json().catch(() => ({}));
        if (data.isLocked) {
          setIsLockedOut(true);
          setLockoutRemainingSec(data.remainingSeconds || 900);
          setErrorMsg(data.error || '🚨 लगातार 5 बार गलत OTP प्रयास के कारण यह अकाउंट 15 मिनट के लिए लॉक है।');
        } else {
          setResendCooldownSec(data.resendInSeconds || 30);
          setErrorMsg(data.error || 'कृपया पुनः OTP भेजने के लिए प्रतीक्षा करें।');
        }
      } else {
        const data = await response?.json().catch(() => ({}));
        setErrorMsg(data?.error || 'सर्वर से संपर्क नहीं हो सका। OTP नहीं भेजा जा सका (Server Unreachable)।');
      }
    } catch (err) {
      setErrorMsg('सर्वर से संपर्क नहीं हो सका। OTP नहीं भेजा जा सका (Server Unreachable)।');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Dispatch Password Reset Email OTP
  const handleSendResetOtp = async () => {
    if (resendCooldownSec > 0) {
      setErrorMsg(`कृपया पुनः OTP भेजने के लिए ${resendCooldownSec} सेकंड प्रतीक्षा करें।`);
      return;
    }
    if (!emailOrPhone.trim()) {
      setErrorMsg('कृपया पासवर्ड रीसेट OTP प्राप्त करने के लिए अपना ईमेल दर्ज करें।');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSendingResetOtp(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrPhone.trim() }),
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setResetOtpSent(true);
        setResetOtp('');
        setResendCooldownSec(data.resendInSeconds || 60);
        setOtpExpirySec(data.expiresInSeconds || 300);
        setSuccessMsg(
          data.smtpSent
            ? `📧 Password Reset Email OTP dispatched to ${emailOrPhone.trim()}! Check your inbox.`
            : `📧 Password Reset OTP dispatched to ${emailOrPhone.trim()}! Code: [ ${data.otp} ]`
        );
      } else {
        const data = await response?.json().catch(() => ({}));
        setErrorMsg(data?.error || 'सर्वर से संपर्क नहीं हो सका। पासवर्ड रीसेट OTP नहीं भेजा जा सका।');
      }
    } catch (err) {
      setErrorMsg('सर्वर से संपर्क नहीं हो सका। पासवर्ड रीसेट OTP नहीं भेजा जा सका।');
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!emailOrPhone.trim()) {
      setErrorMsg('कृपया अपना ईमेल आईडी दर्ज करें।');
      return;
    }
    if (!resetOtp.trim()) {
      setErrorMsg('कृपया ईमेल में प्राप्त 6-अंकीय OTP दर्ज करें।');
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 4) {
      setErrorMsg('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('नया पासवर्ड और कन्फर्म पासवर्ड एक समान नहीं हैं!');
      return;
    }

    setIsSubmittingReset(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailOrPhone.trim(),
          otp: resetOtp.trim(),
          newPassword: resetNewPassword,
        }),
      }).catch(() => null);

      if (response && !response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.error) {
          setErrorMsg(data.error);
          setIsSubmittingReset(false);
          return;
        }
      }

      ERPDatabase.updateUserPassword(emailOrPhone.trim(), resetNewPassword);
      setPassword(resetNewPassword);
      setSuccessMsg('🎉 आपका पासवर्ड सफलतापूर्वक रीसेट हो गया है! अब नए पासवर्ड के साथ लॉगिन करें।');
      setAuthTab('login');
      setLoginMethod('password');
    } catch (err) {
      ERPDatabase.updateUserPassword(emailOrPhone.trim(), resetNewPassword);
      setPassword(resetNewPassword);
      setSuccessMsg('🎉 आपका पासवर्ड सफलतापूर्वक रीसेट हो गया है!');
      setAuthTab('login');
      setLoginMethod('password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Standard Shopkeeper Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (loginMethod === 'otp') {
      if (isLockedOut) {
        setErrorMsg(`🚨 सुरक्षा अलर्ट: 5 बार गलत OTP प्रयास के कारण यह अकाउंट locked है। (बचा समय: ${Math.floor(lockoutRemainingSec / 60)} मि ${lockoutRemainingSec % 60} से)`);
        return;
      }
      if (!otpSent) {
        setErrorMsg('कृपया पहले "OTP भेजें" पर क्लिक करके OTP प्राप्त करें।');
        return;
      }
      if (!otp.trim()) {
        setErrorMsg('कृपया ईमेल में प्राप्त 6-अंकीय OTP दर्ज करें।');
        return;
      }

      setIsSubmitting(true);
      try {
        const verifyRes = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailOrPhone.trim(), otp: otp.trim() }),
        }).catch(() => null);

        if (!verifyRes) {
          setIsSubmitting(false);
          setErrorMsg('🚨 सर्वर अनुपलब्ध है (Server Unreachable)। बिना सर्वर वेरिफिकेशन के लॉगिन की अनुमति नहीं है।');
          return;
        }

        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok) {
          setIsSubmitting(false);
          if (verifyData.isLocked || verifyRes.status === 429) {
            setIsLockedOut(true);
            setLockoutRemainingSec(verifyData.remainingSeconds || 900);
            setFailedOtpCount(5);
            setErrorMsg(verifyData.error || '🚨 5 बार गलत OTP प्रयास के कारण आपका अकाउंट 15 मिनट के लिए लॉक है!');
            return;
          } else {
            const attempts = verifyData.attempts !== undefined ? verifyData.attempts : failedOtpCount + 1;
            setFailedOtpCount(attempts);
            if (attempts >= 5) {
              setIsLockedOut(true);
              setLockoutRemainingSec(900);
              setErrorMsg('🚨 लगातार 5 बार गलत OTP दर्ज करने के कारण आपका अकाउंट 15 मिनट के लिए लॉक कर दिया गया है!');
              return;
            }
            setErrorMsg(verifyData.error || `गलत या अमान्य OTP! (गलत प्रयास: ${attempts}/5 - केवल ${5 - attempts} प्रयास शेष)`);
            return;
          }
        } else {
          // Reset counter on successful login
          setFailedOtpCount(0);
          setIsLockedOut(false);
          setLockoutRemainingSec(0);
          if (verifyData.token) {
            localStorage.setItem('erp_token', verifyData.token);
          }
        }
      } catch (err) {
        setIsSubmitting(false);
        setErrorMsg('🚨 OTP सत्यापन में त्रुटि या सर्वर अनुपलब्ध है। लॉगिन विफल।');
        return;
      }
    } else {
      if (isLockedOut) {
        setErrorMsg(`🚨 सुरक्षा अलर्ट: 5 बार गलत प्रयास के कारण यह अकाउंट locked है। (बचा समय: ${Math.floor(lockoutRemainingSec / 60)} मि ${lockoutRemainingSec % 60} से)`);
        return;
      }
      if (!password) {
        setErrorMsg('कृपया पासवर्ड दर्ज करें।');
        return;
      }

      setIsSubmitting(true);
      try {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailOrPhone.trim(), password }),
        }).catch(() => null);

        if (!loginRes) {
          setIsSubmitting(false);
          setErrorMsg('🚨 सर्वर अनुपलब्ध है (Server Unreachable)। बिना सर्वर वेरिफिकेशन के लॉगिन की अनुमति नहीं है।');
          return;
        }

        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) {
          setIsSubmitting(false);
          if (loginData.isLocked || loginRes.status === 429 || loginRes.status === 423) {
            setIsLockedOut(true);
            setLockoutRemainingSec(loginData.remainingSeconds || 900);
            setFailedPasswordCount(5);
            setErrorMsg(loginData.error || '🚨 5 बार गलत पासवर्ड प्रयास के कारण आपका अकाउंट 15 मिनट के लिए लॉक है!');
            return;
          } else {
            const attempts = loginData.attempts !== undefined ? loginData.attempts : failedPasswordCount + 1;
            setFailedPasswordCount(attempts);
            if (attempts >= 5) {
              setIsLockedOut(true);
              setLockoutRemainingSec(900);
              setErrorMsg('🚨 लगातार 5 बार गलत पासवर्ड दर्ज करने के कारण आपका अकाउंट 15 मिनट के लिए लॉक कर दिया गया है!');
              return;
            }
            setErrorMsg(loginData.error || `Galat email ya password! (गलत प्रयास: ${attempts}/5 - केवल ${5 - attempts} प्रयास शेष)`);
            return;
          }
        } else {
          // Reset password lockout counter on successful login
          setFailedPasswordCount(0);
          setIsLockedOut(false);
          setLockoutRemainingSec(0);
          if (loginData.token) {
            localStorage.setItem('erp_token', loginData.token);
          }
        }
      } catch (err) {
        setIsSubmitting(false);
        setErrorMsg('🚨 पासवर्ड सत्यापन में त्रुटि या सर्वर अनुपलब्ध है। लॉगिन विफल।');
        return;
      }
    }

    setTimeout(() => {
      const targetQuery = emailOrPhone.trim().toLowerCase();
      
      // 1. Try to find user matching targetQuery directly by email, phone, or username
      let matchedUser = availableUsers.find(
        (u) =>
          u.email.toLowerCase() === targetQuery ||
          (u.phone && u.phone.includes(targetQuery)) ||
          (u as any).username?.toLowerCase() === targetQuery
      );

      if (matchedUser) {
        // Set both active user and their specific company
        ERPDatabase.setCurrentUser(matchedUser);
        if (matchedUser.companyId) {
          ERPDatabase.setActiveCompany(matchedUser.companyId);
        }
        setIsSubmitting(false);
        onLoginSuccess(matchedUser);
      } else {
        setIsSubmitting(false);
        setErrorMsg('गलत लॉगिन जानकारी! कृपया सही पंजीकृत ईमेल, आईडी या मोबाइल नंबर दर्ज करें।');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans relative overflow-x-hidden">
      {/* Background Glow Decorations */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center z-10">
        
        {/* Left Column: Commercial Vyapar & MyBillBook Style Value Proposition */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 shadow-xl backdrop-blur-md">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/80">
                #1 Billing & Vyapar Software
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                BillKart Vyapar Billing
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
            भारत के छोटे एवं मध्यम व्यापारियों, रिटेल स्टोर्स और होलसेलर्स के लिए सबसे तेज़ और आसान GST बिलिंग, स्टॉक और Udhar Khata सॉफ्टवेयर। (Vyapar & myBillBook Style)
          </p>

          {/* Key Feature Badges */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-start gap-3 p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl backdrop-blur-md hover:border-emerald-500/40 transition-colors">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-100">1-सैकंड सुपरफ़ास्ट बिलिंग</h4>
                <p className="text-[11px] text-slate-400 font-medium">बारकोड स्कैनर, थर्मल प्रिंटर और व्हाट्सएप पर बिल भेजें।</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl backdrop-blur-md hover:border-emerald-500/40 transition-colors">
              <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-100">GST और गैर-GST इनवॉइस</h4>
                <p className="text-[11px] text-slate-400 font-medium">GSTR-1, GSTR-3B रिपोर्ट्स और ऑटो CGST/SGST टैक्स कैलकुलेशन।</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl backdrop-blur-md hover:border-emerald-500/40 transition-colors">
              <Phone className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-100">ग्राहक उधार खाता (Udhar Khata)</h4>
                <p className="text-[11px] text-slate-400 font-medium">ग्राहक का जमा-बकाया हिसाब और व्हाट्सएप पेमेन्ट रिमाइंडर अलर्ट।</p>
              </div>
            </div>
          </div>

          {/* Network Status Badge */}
          <div className="pt-1 flex items-center justify-between text-xs">
            {isOnline ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-950/90 border border-emerald-700/80 text-emerald-300 rounded-xl font-extrabold text-[11px]">
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>क्लाउड सर्वर एक्टिव (Online Sync Ready)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-950/90 border border-amber-700/80 text-amber-300 rounded-xl font-extrabold text-[11px]">
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>ऑफ़लाइन मोड (बिना इंटरनेट बिल बनाएं)</span>
              </div>
            )}

            <span className="text-[11px] font-bold text-slate-400">v2.4 Ready for Retailers</span>
          </div>
        </div>

        {/* Right Column: Secure Merchant Login Container */}
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-2xl space-y-5">
          
          {/* Header Title */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span>व्यापारी सुरक्षित लॉगिन (Merchant Login)</span>
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                कृपया अपना पंजीकृत मोबाइल नंबर / ईमेल आईडी और पासवर्ड या OTP दर्ज करें।
              </p>
            </div>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-extrabold px-2.5 py-1 rounded-full">
              2FA Protected
            </span>
          </div>

          {/* Auto Logout Alert */}
          {autoLogoutNotice && (
            <div className="p-3 bg-amber-950/90 border border-amber-700/80 rounded-xl text-xs font-bold text-amber-200 flex items-center gap-2 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{autoLogoutNotice}</span>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/90 border border-rose-700/80 rounded-xl text-xs font-bold text-rose-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {successMsg && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-700/80 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: SHOPKEEPER LOGIN */}
          {authTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Login Method Sub-Toggle */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLoginMethod('otp')}
                  className={`py-2 px-1 text-[11px] sm:text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    loginMethod === 'otp'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ईमेल OTP से</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`py-2 px-1 text-[11px] sm:text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    loginMethod === 'password'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>पासवर्ड से</span>
                </button>
              </div>

              {loginMethod === 'otp' && (
                <div className="space-y-3">
                  {/* Account Lockout Red Alert Banner */}
                  {isLockedOut ? (
                    <div className="p-3.5 bg-rose-950/90 border-2 border-rose-600 rounded-2xl text-rose-100 text-xs font-bold space-y-1.5 shadow-xl">
                      <div className="flex items-center gap-2 text-rose-300 font-black">
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                        <span className="uppercase tracking-wider">🚨 ACCOUNT TEMPORARILY LOCKED OUT</span>
                      </div>
                      <p className="text-[11px] leading-relaxed font-semibold">
                        सुरक्षा कारणों से लगातार 5 बार गलत OTP दर्ज करने के कारण यह अकाउंट 15 मिनट के लिए लॉक कर दिया गया है। (Brute-Force Rate Limiting Active)
                      </p>
                      <div className="flex items-center justify-between text-xs text-amber-300 font-mono font-black pt-1 border-t border-rose-800/80">
                        <span>अनलॉक होने में बचा समय:</span>
                        <span className="bg-rose-900/90 px-2.5 py-0.5 rounded-lg border border-amber-500/40 text-white font-extrabold">
                          {Math.floor(lockoutRemainingSec / 60)} मि {lockoutRemainingSec % 60} से
                        </span>
                      </div>
                    </div>
                  ) : failedOtpCount > 0 ? (
                    <div className="px-3.5 py-2 bg-amber-950/80 border border-amber-500/60 rounded-xl text-amber-300 text-xs font-extrabold flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>सुरक्षा चेतावनी: गलत OTP प्रयास {failedOtpCount}/5</span>
                      </div>
                      <span className="text-amber-200 font-bold text-[11px]">
                        ({5 - failedOtpCount} प्रयास शेष)
                      </span>
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-300">ईमेल आईडी या मोबाइल नंबर *</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="email"
                          required
                          disabled={isLockedOut}
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                          placeholder="pinnacle@business.com या +91 9876543210"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || isLockedOut || resendCooldownSec > 0}
                        className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        {isSendingOtp ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isLockedOut
                            ? 'अकाउंट लॉक है'
                            : resendCooldownSec > 0
                            ? `Resend in ${resendCooldownSec}s`
                            : otpSent
                            ? 'पुनः OTP भेजें'
                            : 'Free OTP भेजें'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="space-y-1.5 bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-emerald-300">
                          6-अंकीय Email OTP दर्ज करें *
                        </label>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${otpExpirySec > 0 ? 'bg-emerald-900/80 text-emerald-300' : 'bg-rose-900/80 text-rose-300'}`}>
                          {otpExpirySec > 0
                            ? `⏱️ OTP valid: ${Math.floor(otpExpirySec / 60)}:${(otpExpirySec % 60).toString().padStart(2, '0')}`
                            : '⚠️ OTP Expired - Click Resend'}
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="8 4 9 2 0 1"
                        className="w-full bg-slate-950 border border-emerald-500 rounded-xl py-2.5 text-center text-lg font-mono font-bold text-emerald-400 tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>मुझे याद रखें (Remember Me)</span>
                    </label>
                  </div>
                </div>
              )}

              {loginMethod === 'password' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-300">ईमेल आईडी / मोबाइल नंबर / यूज़रनेम *</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        placeholder="pinnacle@business.com या +91 98111 55443"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-extrabold text-slate-300">गुप्त पासवर्ड *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('reset');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>पासवर्ड भूल गए?</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <span>दुकान में प्रवेश किया जा रहा है...</span>
                ) : (
                  <>
                    <span>दुकान में लॉगिन करें (Log In)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 font-semibold flex items-center justify-between">
                <span>नोट: नया व्यापारी/दुकान खाता केवल सी-पैनल (Super Admin) द्वारा बनाया जाता है।</span>
              </div>
            </form>
          )}

          {/* MODE: PASSWORD RESET VIA EMAIL OTP */}
          {authTab === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>पासवर्ड रीसेट करें (Reset Password)</span>
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  अपने पंजीकृत ईमेल आईडी पर Free Email OTP प्राप्त करके नया पासवर्ड बनाएं।
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300">ईमेल आईडी (Mail ID / Mobile) *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder="owner@apex.com"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={isSendingResetOtp}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSendingResetOtp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>{resetOtpSent ? 'पुनः OTP भेजें' : 'Free OTP भेजें'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300">6-अंकीय Email OTP दर्ज करें *</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  placeholder="8 4 9 2 0 1"
                  className="w-full bg-slate-950 border border-emerald-500/80 rounded-xl py-2 text-center text-base font-mono font-bold text-emerald-400 tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300">नया गुप्त पासवर्ड (New Password) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="नया पासवर्ड दर्ज करें (उदा: pass123)"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-300">नया पासवर्ड पुनः लिखें (Confirm Password) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="नया पासवर्ड पुनः टाइप करें"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthTab('login'); setErrorMsg(null); }}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmittingReset ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>पासवर्ड रीसेट करें (Save Password)</span>
                </button>
              </div>
            </form>
          )}
          {/* Security & System Footer */}
          <div className="pt-3 border-t border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit Encrypted Vyapar Session</span>
            </span>
            <span>Multi-Tenant RLS Guard</span>
          </div>

        </div>

      </div>
    </div>
  );
};

