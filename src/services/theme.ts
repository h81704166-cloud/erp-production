export interface ThemeCssVars {
  '--color-primary': string;
  '--color-primary-hover': string;
  '--color-primary-light': string;
  '--color-primary-rgb': string;
  '--color-accent': string;
  '--color-accent-hover': string;
  '--color-accent-light': string;
  '--color-card-bg': string;
  '--color-card-border': string;
  '--color-surface-elevated': string;
  '--color-app-bg': string;
  '--color-app-bg-light': string;
  '--color-text': string;
  '--color-glow': string;
  '--color-border-glow': string;
  '--theme-gradient': string;
  '--glass-bg': string;
  '--glass-card-bg': string;
  '--glass-border': string;
  '--glass-shadow': string;
  '--glass-blur': string;
}

export interface AppTheme {
  id: string;
  name: string;
  nameHindi: string;
  mode: 'dark' | 'light';
  bgGradient: string;
  cardBg: string;
  accentColor: string;
  primaryClass: string;
  badgeClass: string;
  previewBg: string;
  description: string;
  colorDots: string[];
  cssVars: ThemeCssVars;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'emerald',
    name: 'Enterprise Dark (SAP/Zoho Feel)',
    nameHindi: 'डार्क मोड (आँखों के लिए आरामदायक)',
    mode: 'dark',
    bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    cardBg: '#1E293B',
    accentColor: '#14B8A6',
    primaryClass: 'bg-blue-600 hover:bg-blue-700 text-white font-black',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    previewBg: 'bg-blue-600',
    description: 'Modern enterprise dark mode with #0B1220 bg, #111827 sidebar & #3B82F6 accents.',
    colorDots: ['#3B82F6', '#14B8A6', '#1E293B'],
    cssVars: {
      '--color-primary': '#3B82F6',
      '--color-primary-hover': '#2563EB',
      '--color-primary-light': 'rgba(59, 130, 246, 0.15)',
      '--color-primary-rgb': '59, 130, 246',
      '--color-accent': '#14B8A6',
      '--color-accent-hover': '#0D9488',
      '--color-accent-light': 'rgba(20, 184, 166, 0.15)',
      '--color-app-bg': '#0B1220',
      '--color-card-bg': '#1E293B',
      '--color-card-border': 'rgba(59, 130, 246, 0.25)',
      '--color-surface-elevated': '#1E293B',
      '--color-app-bg-light': '#F8FAFC',
      '--color-text': '#F8FAFC',
      '--color-glow': 'rgba(59, 130, 246, 0.25)',
      '--color-border-glow': 'rgba(59, 130, 246, 0.45)',
      '--theme-gradient': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #14B8A6 100%)',
      '--glass-bg': 'rgba(30, 41, 59, 0.85)',
      '--glass-card-bg': 'rgba(30, 41, 59, 0.92)',
      '--glass-border': 'rgba(59, 130, 246, 0.25)',
      '--glass-shadow': '0 10px 30px -5px rgba(11, 18, 32, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      '--glass-blur': 'blur(16px)',
    },
  },
  {
    id: 'royal-indigo',
    name: 'Royal Indigo',
    nameHindi: 'रॉयल इंडिगो (शाही नीला/बैंगनी)',
    mode: 'dark',
    bgGradient: 'from-slate-950 via-indigo-950 to-purple-950',
    cardBg: '#151B42',
    accentColor: '#EC4899',
    primaryClass: 'bg-indigo-500 hover:bg-indigo-600 text-white font-black',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    previewBg: 'bg-indigo-600',
    description: 'Corporate executive theme with deep navy and royal indigo tones.',
    colorDots: ['#6366F1', '#EC4899', '#151B42'],
    cssVars: {
      '--color-primary': '#6366F1',
      '--color-primary-hover': '#4F46E5',
      '--color-primary-light': 'rgba(99, 102, 241, 0.15)',
      '--color-primary-rgb': '99, 102, 241',
      '--color-accent': '#EC4899',
      '--color-accent-hover': '#DB2777',
      '--color-accent-light': 'rgba(236, 72, 153, 0.15)',
      '--color-app-bg': '#0B0E28',
      '--color-card-bg': '#151B42',
      '--color-card-border': 'rgba(99, 102, 241, 0.3)',
      '--color-surface-elevated': '#20285C',
      '--color-app-bg-light': '#F5F5FF',
      '--color-text': '#F8FAFC',
      '--color-glow': 'rgba(99, 102, 241, 0.25)',
      '--color-border-glow': 'rgba(99, 102, 241, 0.45)',
      '--theme-gradient': 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #EC4899 100%)',
      '--glass-bg': 'rgba(21, 27, 66, 0.85)',
      '--glass-card-bg': 'rgba(21, 27, 66, 0.92)',
      '--glass-border': 'rgba(99, 102, 241, 0.3)',
      '--glass-shadow': '0 10px 30px -5px rgba(11, 14, 40, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
      '--glass-blur': 'blur(16px)',
    },
  },
  {
    id: 'pure-white',
    name: 'Enterprise Light Mode',
    nameHindi: 'लाइट थीम (#F8FAFC Canvas)',
    mode: 'light',
    bgGradient: 'from-slate-100 via-white to-blue-50',
    cardBg: '#FFFFFF',
    accentColor: '#10B981',
    primaryClass: 'bg-blue-600 hover:bg-blue-700 text-white font-bold',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    previewBg: 'bg-blue-600',
    description: 'Clean enterprise light mode with #F8FAFC bg, #0F172A sidebar & #2563EB primary.',
    colorDots: ['#F8FAFC', '#FFFFFF', '#2563EB'],
    cssVars: {
      '--color-primary': '#2563EB',
      '--color-primary-hover': '#1D4ED8',
      '--color-primary-light': 'rgba(37, 99, 235, 0.1)',
      '--color-primary-rgb': '37, 99, 235',
      '--color-accent': '#10B981',
      '--color-accent-hover': '#059669',
      '--color-accent-light': 'rgba(16, 185, 129, 0.1)',
      '--color-app-bg': '#F8FAFC',
      '--color-card-bg': '#FFFFFF',
      '--color-card-border': '#E2E8F0',
      '--color-surface-elevated': '#FFFFFF',
      '--color-app-bg-light': '#F8FAFC',
      '--color-text': '#0F172A',
      '--color-glow': 'rgba(37, 99, 235, 0.15)',
      '--color-border-glow': 'rgba(37, 99, 235, 0.35)',
      '--theme-gradient': 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #10B981 100%)',
      '--glass-bg': 'rgba(255, 255, 255, 0.95)',
      '--glass-card-bg': '#FFFFFF',
      '--glass-border': '#E2E8F0',
      '--glass-shadow': '0 4px 20px -2px rgba(15, 23, 42, 0.08), inset 0 1px 1px rgba(255, 255, 255, 1)',
      '--glass-blur': 'blur(12px)',
    },
  },
];

// Default theme ID is classic Emerald
export const DEFAULT_THEME_ID = 'emerald';

export function applyTheme(themeId: string, isManual: boolean = false): AppTheme {
  if (typeof document === 'undefined') return APP_THEMES[0];

  const theme = APP_THEMES.find((t) => t.id === themeId) || 
                APP_THEMES.find((t) => t.id === DEFAULT_THEME_ID) || 
                APP_THEMES[0];
  
  const root = document.documentElement;
  const body = document.body;

  // Set standard data attributes for CSS targeting
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-ui-theme', theme.id);
  if (body) {
    body.setAttribute('data-theme', theme.id);
    body.setAttribute('data-ui-theme', theme.id);
  }

  // Inject CSS Variables dynamically
  if (theme.cssVars) {
    Object.entries(theme.cssVars).forEach(([varName, varVal]) => {
      root.style.setProperty(varName, varVal);
      if (body) {
        body.style.setProperty(varName, varVal);
      }
    });
  }

  // Handle Dark / Light mode class on document element
  if (theme.mode === 'dark') {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
    localStorage.setItem('erp_theme_mode', 'night');
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
    localStorage.setItem('erp_theme_mode', 'day');
  }

  // Save in localStorage across key aliases for persistence
  localStorage.setItem('unierp_theme', theme.id);
  localStorage.setItem('billkart_ui_theme', theme.id);
  localStorage.setItem('erp_ui_theme', theme.id);

  if (isManual) {
    setManualThemePalette(true);
  }

  return theme;
}

export function resetThemeToDefault(): AppTheme {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('unierp_theme');
    localStorage.removeItem('billkart_ui_theme');
    localStorage.removeItem('erp_ui_theme');
    localStorage.removeItem('erp_theme_mode');
    localStorage.removeItem('erp_theme_mode_manual');
    localStorage.removeItem('erp_theme_palette_manual');
  }
  return applyTheme(DEFAULT_THEME_ID, false);
}

export function getCurrentTheme(): AppTheme {
  let themeId = DEFAULT_THEME_ID;
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('unierp_theme') || 
                localStorage.getItem('erp_ui_theme') || 
                localStorage.getItem('billkart_ui_theme');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string') themeId = parsed;
      } catch {
        themeId = raw.replace(/^"|"$/g, '').trim();
      }
    }
  }

  return APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];
}

// Helpers for manual override tracking
export function hasManualThemeModeSet(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('erp_theme_mode_manual') === 'true';
}

export function setManualThemeMode(isManual: boolean = true): void {
  if (typeof localStorage === 'undefined') return;
  if (isManual) {
    localStorage.setItem('erp_theme_mode_manual', 'true');
  } else {
    localStorage.removeItem('erp_theme_mode_manual');
  }
}

export function hasManualThemePaletteSet(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('erp_theme_palette_manual') === 'true';
}

export function setManualThemePalette(isManual: boolean = true): void {
  if (typeof localStorage === 'undefined') return;
  if (isManual) {
    localStorage.setItem('erp_theme_palette_manual', 'true');
  } else {
    localStorage.removeItem('erp_theme_palette_manual');
  }
}

export function hasManualThemeSet(): boolean {
  return hasManualThemeModeSet() || hasManualThemePaletteSet();
}

export function getSavedThemeMode(): 'day' | 'night' {
  const currTheme = getCurrentTheme();
  return currTheme.mode === 'dark' ? 'night' : 'day';
}

export function setAppThemeMode(mode: 'day' | 'night', isManual: boolean = true) {
  if (typeof document === 'undefined') return;
  const isDark = mode === 'night';
  const root = document.documentElement;
  const body = document.body;

  if (isDark) {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
  }
  localStorage.setItem('erp_theme_mode', mode);

  if (isManual) {
    setManualThemeMode(true);
  }
}

export function getSystemPreferredThemeMode(): 'day' | 'night' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  }
  return 'night';
}

export function initAppTheme(): { mode: 'day' | 'night'; themeId: string } {
  // Clear any leftover slate-teal from localStorage to enforce classic emerald
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('unierp_theme') || localStorage.getItem('erp_ui_theme');
    if (saved === 'slate-teal') {
      localStorage.setItem('unierp_theme', 'emerald');
      localStorage.setItem('erp_ui_theme', 'emerald');
      localStorage.setItem('billkart_ui_theme', 'emerald');
    }
  }
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme.id, hasManualThemePaletteSet());
  return { mode: currentTheme.mode === 'dark' ? 'night' : 'day', themeId: currentTheme.id };
}

export type ThemeObserverCallback = (systemMode: 'day' | 'night') => void;

export function initSystemThemeObserver(callback?: ThemeObserverCallback): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleSystemSchemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
    if (!hasManualThemeModeSet()) {
      const isDark = e.matches;
      const systemMode: 'day' | 'night' = isDark ? 'night' : 'day';
      setAppThemeMode(systemMode, false);
      if (callback) {
        callback(systemMode);
      }
    }
  };

  if (!hasManualThemeModeSet()) {
    handleSystemSchemeChange(mediaQuery);
  }

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemSchemeChange);
  } else if ((mediaQuery as any).addListener) {
    (mediaQuery as any).addListener(handleSystemSchemeChange);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemSchemeChange);
    } else if ((mediaQuery as any).removeListener) {
      (mediaQuery as any).removeListener(handleSystemSchemeChange);
    }
  };
}
