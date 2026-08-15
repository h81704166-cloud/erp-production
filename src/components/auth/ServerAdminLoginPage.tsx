import React, { useState } from 'react';
import { ServerAdminService } from '../../services/serverAdminService';
import { Shield, Server, Lock, AlertTriangle, ArrowRight, Activity, CheckCircle2 } from 'lucide-react';

interface ServerAdminLoginPageProps {
  onLoginSuccess: () => void;
  onBackToApp?: () => void;
}

export const ServerAdminLoginPage: React.FC<ServerAdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToApp,
}) => {
  const [email, setEmail] = useState('sysadmin@billkart.shop');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await ServerAdminService.login(email, password);
      setLoading(false);

      if (!result.success) {
        setError(result.error || 'Server Admin Login Failed');
        if (result.remainingSeconds) {
          setLockCountdown(result.remainingSeconds);
        }
        return;
      }

      onLoginSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Network error connecting to Server Monitoring API');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Gradient Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
            <Server className="h-8 w-8" />
          </div>
        </div>

        <h2 className="text-center text-2xl font-bold tracking-tight text-white font-mono">
          SERVER ADMIN PORTAL
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Isolated Infrastructure & Hardware Monitoring Control
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="w-3 h-3" />
            Security Boundary Enforced
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Activity className="w-3 h-3" />
            System Metrics Engine
          </span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-6 rounded-xl bg-red-950/80 border border-red-800/80 p-4 text-sm text-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-100">Access Denied</p>
                <p className="mt-0.5 text-red-300/90 text-xs">{error}</p>
                {lockCountdown !== null && (
                  <p className="mt-2 text-xs font-mono font-bold text-amber-300">
                    Lockout expires in: {lockCountdown} seconds
                  </p>
                )}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                SysAdmin ID / Email
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-colors"
                  placeholder="sysadmin@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Server Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-colors"
                  placeholder="••••••••••••••••"
                />
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Security Rules:
              </p>
              <p className="pl-5 text-[11px] text-slate-400">
                • 5 max failed attempts before automatic IP lockout
              </p>
              <p className="pl-5 text-[11px] text-slate-400">
                • Isolated token boundary separate from ERP Shop Owner sessions
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-indigo-500/50 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating System...</span>
                  </>
                ) : (
                  <>
                    <span>Access Server Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {onBackToApp && (
            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={onBackToApp}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ← Return to ERP Main Application
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 font-mono">
          BillKart ERP Server Monitoring Engine • v2.8.0-cloud
        </p>
      </div>
    </div>
  );
};
