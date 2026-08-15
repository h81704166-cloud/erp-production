import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo' | 'cyan' | 'sky' | 'purple' | 'gray' | 'success' | 'info' | 'warning' | 'danger' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'emerald', size = 'md', className = '' }) => {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/50',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/50',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/50',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/50',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/50',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/50',
    slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    default: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    gray: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800/50',
    cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800/50',
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800/50',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800/50',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/50',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs font-semibold rounded-md border border-transparent',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-md border border-transparent',
  };

  const selectedStyle = styles[variant] || styles.emerald;

  return <span className={`${selectedStyle} ${sizes[size]} ${className} inline-flex items-center gap-1`}>{children}</span>;
};

