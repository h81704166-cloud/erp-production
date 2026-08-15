import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, Cloud, WifiOff, AlertTriangle, ShieldCheck, LogOut } from 'lucide-react';
import { getPendingSyncCount } from '../../services/offlineDb';

interface LogoutSyncModalProps {
  isOpen: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  onCompleteLogout: () => void;
  onCancel: () => void;
}

export const LogoutSyncModal: React.FC<LogoutSyncModalProps> = ({
  isOpen,
  isSyncing,
  pendingSyncCount,
  onTriggerSync,
  onCompleteLogout,
  onCancel,
}) => {
  const [currentCount, setCurrentCount] = useState<number>(pendingSyncCount);
  const [syncState, setSyncState] = useState<'syncing' | 'completed' | 'timeout'>('syncing');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSyncState('syncing');
      return;
    }

    // 1. Trigger manual background sync immediately upon opening modal
    onTriggerSync();

    // 2. Poll pending count every 500ms
    const interval = setInterval(async () => {
      const count = await getPendingSyncCount();
      setCurrentCount(count);

      if (count === 0) {
        setSyncState('completed');
        clearInterval(interval);
        // Automatically complete logout after 1 second of showing success status
        setTimeout(() => {
          onCompleteLogout();
        }, 1000);
      }
    }, 600);

    // Animated dots for UI
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    // Timeout fallback after 12 seconds if offline/slow network
    const timeout = setTimeout(() => {
      getPendingSyncCount().then((count) => {
        if (count > 0) {
          setSyncState('timeout');
        }
      });
    }, 12000);

    return () => {
      clearInterval(interval);
      clearInterval(dotInterval);
      clearTimeout(timeout);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-100 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
            {syncState === 'completed' ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
            ) : syncState === 'timeout' ? (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            ) : (
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            )}
          </div>

          <h3 className="text-lg font-black text-white tracking-tight">
            {syncState === 'completed'
              ? 'All Data Synced! Logging Out...'
              : syncState === 'timeout'
              ? 'Sync Taking Longer Than Expected'
              : `Syncing Pending Offline Data${dots}`}
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {syncState === 'completed'
              ? 'All sales, purchases, and ledger updates are safely stored in central database.'
              : syncState === 'timeout'
              ? 'Your pending offline transactions are saved locally in IndexedDB and will sync next time you log in.'
              : 'Verifying and uploading all unsynced bills, purchases, and khata entries before closing session.'}
          </p>
        </div>

        {/* Sync Progress Visualizer */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Unsynced Items Status:</span>
            <span className={currentCount === 0 ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
              {currentCount === 0 ? '0 Items Remaining' : `${currentCount} Item(s) Pending`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                syncState === 'completed'
                  ? 'w-full bg-emerald-500'
                  : currentCount === 0
                  ? 'w-full bg-emerald-500'
                  : 'w-2/3 bg-amber-500 animate-pulse'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Offline DB Protection Active</span>
            </span>
            <span>IndexedDB Queue</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-2">
          {syncState === 'timeout' ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSyncState('syncing');
                  onTriggerSync();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Retry Cloud Sync</span>
              </button>

              <button
                type="button"
                onClick={onCompleteLogout}
                className="w-full py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Force Logout Now (Offline Data Preserved)</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              disabled={syncState === 'completed'}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
