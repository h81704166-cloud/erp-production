import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  variant = 'emerald',
  onClick,
}) => {
  const iconBg = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-inner',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-inner',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-inner',
  };

  const ambientGlow = {
    emerald: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    amber: 'bg-amber-500/10 dark:bg-amber-500/15',
    rose: 'bg-rose-500/10 dark:bg-rose-500/15',
    indigo: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    cyan: 'bg-cyan-500/10 dark:bg-cyan-500/15',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-5 rounded-3xl liquid-glass-card transition-all duration-300 group ${
        onClick ? 'cursor-pointer hover:border-emerald-500/50' : ''
      }`}
    >
      {/* Background Ambient Glowing Orb */}
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-500 group-hover:scale-125 ${ambientGlow[variant]}`} />

      {/* Top Specular Edge Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-emerald-400/30 to-transparent" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 font-sans">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-2xl backdrop-blur-md transition-transform duration-300 group-hover:scale-110 ${iconBg[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtext || trendValue) && (
        <div className="relative z-10 mt-3.5 flex items-center justify-between text-xs border-t border-slate-200/80 dark:border-slate-700/60 pt-2.5">
          <span className="truncate pr-2 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{subtext}</span>
          {trendValue && (
            <span
              className={`shrink-0 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-sm ${
                trend === 'up'
                  ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                  : trend === 'down'
                  ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/40'
                  : 'bg-slate-500/20 text-slate-800 dark:text-slate-100 border border-slate-500/40'
              }`}
            >
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

