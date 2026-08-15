import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sun, Moon, Sparkles, ChevronDown, RotateCcw } from 'lucide-react';
import { APP_THEMES, applyTheme, getCurrentTheme, AppTheme, DEFAULT_THEME_ID } from '../../services/theme';

interface ThemeSwitcherProps {
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AppTheme>(() => getCurrentTheme());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (themeId: string) => {
    const updatedTheme = applyTheme(themeId, true);
    setActiveTheme(updatedTheme);
    setIsOpen(false);
  };

  const handleResetDefault = () => {
    handleSelectTheme(DEFAULT_THEME_ID);
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-emerald-300 font-bold text-xs transition-all border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer select-none shrink-0"
        title="Change Theme Palette"
      >
        <div className="flex items-center gap-1 shrink-0">
          <Palette className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span className="w-2 h-2 rounded-full shrink-0 shadow-xs border border-white/40" style={{ backgroundColor: activeTheme.accentColor }} />
        </div>
        {!compact && (
          <span className="hidden md:inline text-[11px] font-extrabold max-w-[80px] truncate">
            {activeTheme.name.split(' ')[0]}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl liquid-glass bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 dark:border-slate-800 shadow-2xl p-3 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-xs font-black tracking-tight text-white uppercase">Theme Palette</h3>
                <p className="text-[10px] text-slate-400 font-medium">UNIERP Enterprise Themes</p>
              </div>
            </div>
            <button
              onClick={handleResetDefault}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors text-[10px] flex items-center gap-1 font-bold cursor-pointer"
              title="Reset to Default Slate + Teal"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Theme Preset Cards */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-0.5">
            {APP_THEMES.map((theme) => {
              const isSelected = activeTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                      : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Swatch Preview Grid */}
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 shrink-0 flex flex-col shadow-xs">
                      <div className="h-1/2 w-full flex">
                        <div className="w-1/2 h-full" style={{ backgroundColor: theme.colorDots[0] }} />
                        <div className="w-1/2 h-full" style={{ backgroundColor: theme.colorDots[1] }} />
                      </div>
                      <div className="h-1/2 w-full flex">
                        <div className="w-1/2 h-full" style={{ backgroundColor: theme.colorDots[2] }} />
                        <div className="w-1/2 h-full" style={{ backgroundColor: theme.colorDots[3] }} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{theme.name}</span>
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border ${
                            theme.mode === 'dark'
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {theme.mode}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{theme.nameHindi}</p>
                    </div>
                  </div>

                  {/* Active Indicator Checkmark */}
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-extrabold shrink-0 ml-2 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-medium">
            <span>Saved in LocalStorage</span>
            <span className="font-mono text-emerald-400 font-bold">data-theme</span>
          </div>
        </div>
      )}
    </div>
  );
};
