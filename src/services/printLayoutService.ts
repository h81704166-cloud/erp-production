/**
 * Print Layout & Custom Invoice Template Management Service
 * Supports Custom Multicolor Themes, Paper Sizes, Header/Table Styles & Toggles
 */

export type PrintPaperSize = 'A4' | 'A5' | 'Thermal80mm' | 'Thermal58mm';

export type ColorThemePreset = 'emerald' | 'blue' | 'crimson' | 'amber' | 'indigo' | 'midnight' | 'custom';

export interface PrintThemeColors {
  primary: string;       // Accent / Main color (e.g. #059669)
  secondary: string;     // Sub-accent / Light background fill (e.g. #ECFDF5)
  headerBg: string;      // Top banner or table header background (e.g. #065F46)
  headerText: string;    // Text color on top banner (e.g. #FFFFFF)
  textDark: string;      // Heading text color (e.g. #064E3B)
  border: string;        // Table / Divider border color (e.g. #A7F3D0)
}

export interface PrintLayoutConfig {
  id: string;
  name: string;
  isDefault: boolean;
  paperSize: PrintPaperSize;
  colorTheme: ColorThemePreset;
  customColors: PrintThemeColors;
  headerStyle: 'modern' | 'classic' | 'minimal' | 'banner';
  tableStyle: 'striped' | 'bordered' | 'grid' | 'minimal';
  fontFamily: 'sans' | 'serif' | 'mono' | 'segoe';
  showCompanyLogo: boolean;
  showGstBreakdown: boolean;
  showPaymentInfo: boolean;
  showTerms: boolean;
  showSignature: boolean;
  showUpiQrCode: boolean;
  upiId?: string;
  tagline: string;
  termsText: string;
  footerNote: string;
}

export const PRESET_COLOR_THEMES: Record<ColorThemePreset, { label: string; colors: PrintThemeColors }> = {
  emerald: {
    label: 'Emerald Corporate (Green)',
    colors: {
      primary: '#059669',
      secondary: '#ECFDF5',
      headerBg: '#065F46',
      headerText: '#FFFFFF',
      textDark: '#064E3B',
      border: '#A7F3D0',
    },
  },
  blue: {
    label: 'Royal Blue Professional',
    colors: {
      primary: '#2563EB',
      secondary: '#EFF6FF',
      headerBg: '#1E40AF',
      headerText: '#FFFFFF',
      textDark: '#1E3A8A',
      border: '#BFDBFE',
    },
  },
  crimson: {
    label: 'Ruby Crimson Luxury',
    colors: {
      primary: '#DC2626',
      secondary: '#FEF2F2',
      headerBg: '#991B1B',
      headerText: '#FFFFFF',
      textDark: '#881337',
      border: '#FECACA',
    },
  },
  amber: {
    label: 'Amber Gold Classic',
    colors: {
      primary: '#D97706',
      secondary: '#FFFBEB',
      headerBg: '#B45309',
      headerText: '#FFFFFF',
      textDark: '#78350F',
      border: '#FDE68A',
    },
  },
  indigo: {
    label: 'Purple Indigo Modern',
    colors: {
      primary: '#4F46E5',
      secondary: '#EEF2FF',
      headerBg: '#4338CA',
      headerText: '#FFFFFF',
      textDark: '#312E81',
      border: '#C7D2FE',
    },
  },
  midnight: {
    label: 'Midnight Slate (Dark Accent)',
    colors: {
      primary: '#334155',
      secondary: '#F8FAFC',
      headerBg: '#0F172A',
      headerText: '#FFFFFF',
      textDark: '#0F172A',
      border: '#CBD5E1',
    },
  },
  custom: {
    label: 'Custom Color Palette',
    colors: {
      primary: '#0891B2',
      secondary: '#ECFEFF',
      headerBg: '#155E75',
      headerText: '#FFFFFF',
      textDark: '#164E63',
      border: '#A5F3FC',
    },
  },
};

const DEFAULT_LAYOUTS: PrintLayoutConfig[] = [
  {
    id: 'preset-emerald-a4',
    name: 'Emerald Corporate (A4 Tax Invoice)',
    isDefault: true,
    paperSize: 'A4',
    colorTheme: 'emerald',
    customColors: PRESET_COLOR_THEMES.emerald.colors,
    headerStyle: 'modern',
    tableStyle: 'striped',
    fontFamily: 'sans',
    showCompanyLogo: true,
    showGstBreakdown: true,
    showPaymentInfo: true,
    showTerms: true,
    showSignature: true,
    showUpiQrCode: true,
    upiId: 'apexenterprise@upi',
    tagline: 'Leading Wholesale & Retail Distribution',
    termsText: '1. Goods once sold will not be returned.\n2. Interest @18% p.a. will be charged after due date.\n3. All disputes subject to local jurisdiction.',
    footerNote: 'Thank you for doing business with us!',
  },
  {
    id: 'preset-blue-thermal',
    name: 'Royal Blue (Thermal 80mm POS Receipt)',
    isDefault: false,
    paperSize: 'Thermal80mm',
    colorTheme: 'blue',
    customColors: PRESET_COLOR_THEMES.blue.colors,
    headerStyle: 'classic',
    tableStyle: 'minimal',
    fontFamily: 'mono',
    showCompanyLogo: true,
    showGstBreakdown: true,
    showPaymentInfo: true,
    showTerms: false,
    showSignature: false,
    showUpiQrCode: true,
    upiId: 'apexenterprise@upi',
    tagline: 'Express Counter POS',
    termsText: 'Items can be exchanged within 3 days with bill.',
    footerNote: 'Visit Again! Follow us for offers.',
  },
  {
    id: 'preset-crimson-a5',
    name: 'Ruby Crimson (A5 Compact Invoice)',
    isDefault: false,
    paperSize: 'A5',
    colorTheme: 'crimson',
    customColors: PRESET_COLOR_THEMES.crimson.colors,
    headerStyle: 'banner',
    tableStyle: 'bordered',
    fontFamily: 'serif',
    showCompanyLogo: true,
    showGstBreakdown: true,
    showPaymentInfo: true,
    showTerms: true,
    showSignature: true,
    showUpiQrCode: true,
    upiId: 'apexenterprise@upi',
    tagline: 'Premium Goods & Supplies',
    termsText: 'Subject to local city jurisdiction.',
    footerNote: 'Thank you for your valuable order!',
  },
  {
    id: 'preset-amber-a4',
    name: 'Amber Gold Classic (A4 Full Sheet)',
    isDefault: false,
    paperSize: 'A4',
    colorTheme: 'amber',
    customColors: PRESET_COLOR_THEMES.amber.colors,
    headerStyle: 'classic',
    tableStyle: 'grid',
    fontFamily: 'segoe',
    showCompanyLogo: true,
    showGstBreakdown: true,
    showPaymentInfo: true,
    showTerms: true,
    showSignature: true,
    showUpiQrCode: true,
    upiId: 'apexenterprise@upi',
    tagline: 'Quality You Can Trust',
    termsText: '1. Standard warranty applies.\n2. Payment strictly on receipt.',
    footerNote: 'Computer generated tax invoice.',
  }
];

const STORAGE_KEY = 'erp_custom_print_layouts_v1';

export class PrintLayoutService {
  public static getLayouts(): PrintLayoutConfig[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_LAYOUTS;
  }

  public static getDefaultLayout(): PrintLayoutConfig {
    const layouts = this.getLayouts();
    return layouts.find((l) => l.isDefault) || layouts[0] || DEFAULT_LAYOUTS[0];
  }

  public static saveLayout(layout: PrintLayoutConfig): void {
    const layouts = this.getLayouts();
    const existingIdx = layouts.findIndex((l) => l.id === layout.id);

    let updated = [...layouts];
    if (layout.isDefault) {
      updated = updated.map((l) => ({ ...l, isDefault: false }));
    }

    if (existingIdx >= 0) {
      updated[existingIdx] = layout;
    } else {
      updated.push(layout);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  public static deleteLayout(id: string): void {
    let layouts = this.getLayouts();
    if (layouts.length <= 1) {
      alert('At least one print layout template must remain.');
      return;
    }
    layouts = layouts.filter((l) => l.id !== id);
    if (!layouts.some((l) => l.isDefault)) {
      layouts[0].isDefault = true;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  }

  public static setDefaultLayout(id: string): void {
    const layouts = this.getLayouts();
    const updated = layouts.map((l) => ({ ...l, isDefault: l.id === id }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}
