import React, { useState, useEffect } from 'react';
import {
  Palette,
  Printer,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  QrCode,
  FileText,
  Type,
  Layout,
  Layers,
  Settings2,
  Check,
  Eye,
  Sliders
} from 'lucide-react';
import { Company, Sale } from '../../types/erp';
import {
  PrintLayoutConfig,
  ColorThemePreset,
  PrintPaperSize,
  PRESET_COLOR_THEMES,
  PrintLayoutService
} from '../../services/printLayoutService';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface PrintLayoutDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onLayoutSaved?: () => void;
}

// Sample Sale Data for Live Preview
const SAMPLE_SALE: Sale = {
  id: 'preview-sale-101',
  companyId: 'company-1',
  invoiceNo: 'POS-2026-8892',
  customerName: 'Aman Sharma (Retail Customer)',
  customerPhone: '+91 98765 43210',
  customerGstin: '07AAAAA0000A1Z5',
  items: [
    {
      productId: 'p1',
      productName: 'Premium Basmati Rice 5kg Pack',
      sku: 'RICE-5KG',
      hsnCode: '1006',
      qty: 2,
      unit: 'Box',
      unitPrice: 650,
      discountAmount: 50,
      gstRate: 5,
      taxableAmount: 1250,
      cgstAmount: 31.25,
      sgstAmount: 31.25,
      igstAmount: 0,
      totalAmount: 1312.5,
    },
    {
      productId: 'p2',
      productName: 'Refined Sunflower Oil 1L Pouch',
      sku: 'OIL-1L',
      hsnCode: '1512',
      qty: 5,
      unit: 'Pcs',
      unitPrice: 140,
      discountAmount: 0,
      gstRate: 12,
      taxableAmount: 700,
      cgstAmount: 42,
      sgstAmount: 42,
      igstAmount: 0,
      totalAmount: 784,
    },
  ],
  subtotal: 1950,
  totalDiscount: 50,
  totalTaxable: 1950,
  totalCgst: 73.25,
  totalSgst: 73.25,
  totalIgst: 0,
  totalTax: 146.5,
  grandTotal: 2096.5,
  paidAmount: 2096.5,
  dueAmount: 0,
  paymentMode: 'upi',
  paymentDetails: { transactionId: 'UPI-992019283102' },
  status: 'completed',
  billedAt: new Date().toISOString(),
  billedByName: 'Cashier Desk 1',
};

export const PrintLayoutDesignerModal: React.FC<PrintLayoutDesignerModalProps> = ({
  isOpen,
  onClose,
  company,
  onLayoutSaved,
}) => {
  const [layouts, setLayouts] = useState<PrintLayoutConfig[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [editingLayout, setEditingLayout] = useState<PrintLayoutConfig | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  // Load Layouts on Mount
  useEffect(() => {
    if (isOpen) {
      const all = PrintLayoutService.getLayouts();
      setLayouts(all);
      const def = all.find((l) => l.isDefault) || all[0];
      if (def) {
        setSelectedLayoutId(def.id);
        setEditingLayout({ ...def });
      }
    }
  }, [isOpen]);

  // Update Live Preview when Editing Layout changes
  useEffect(() => {
    if (editingLayout) {
      const html = InvoicePrintService.generatePrintHTML(SAMPLE_SALE, company, editingLayout);
      setPreviewHtml(html);
    }
  }, [editingLayout, company]);

  const handleSelectLayout = (id: string) => {
    setSelectedLayoutId(id);
    const found = layouts.find((l) => l.id === id);
    if (found) {
      setEditingLayout({ ...found });
    }
  };

  const handleSaveCurrentLayout = () => {
    if (!editingLayout) return;
    PrintLayoutService.saveLayout(editingLayout);
    const updated = PrintLayoutService.getLayouts();
    setLayouts(updated);
    alert(`Print layout template "${editingLayout.name}" saved successfully!`);
    if (onLayoutSaved) onLayoutSaved();
  };

  const handleSetDefault = () => {
    if (!editingLayout) return;
    const updated = { ...editingLayout, isDefault: true };
    setEditingLayout(updated);
    PrintLayoutService.saveLayout(updated);
    setLayouts(PrintLayoutService.getLayouts());
    alert(`"${editingLayout.name}" is now set as the POS Default Print Layout!`);
    if (onLayoutSaved) onLayoutSaved();
  };

  const handleCreateNewLayout = () => {
    const newId = `custom-layout-${Date.now()}`;
    const newLayout: PrintLayoutConfig = {
      id: newId,
      name: `Custom Multi-Color Layout #${layouts.length + 1}`,
      isDefault: false,
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
      upiId: 'enterprise@upi',
      tagline: company.legalName || 'Tax Invoice & POS Receipt',
      termsText: '1. Goods once sold will not be returned.\n2. All disputes subject to local jurisdiction.',
      footerNote: 'Thank you for shopping with us!',
    };
    PrintLayoutService.saveLayout(newLayout);
    const all = PrintLayoutService.getLayouts();
    setLayouts(all);
    setSelectedLayoutId(newId);
    setEditingLayout(newLayout);
  };

  const handleDeleteLayout = () => {
    if (!editingLayout) return;
    PrintLayoutService.deleteLayout(editingLayout.id);
    const all = PrintLayoutService.getLayouts();
    setLayouts(all);
    const first = all[0];
    if (first) {
      setSelectedLayoutId(first.id);
      setEditingLayout({ ...first });
    }
  };

  const handleTestPrint = () => {
    if (!editingLayout) return;
    InvoicePrintService.printCustomLayout(SAMPLE_SALE, company, editingLayout);
  };

  if (!editingLayout) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="POS Custom Invoice & Print Layout Designer"
      maxWidth="7xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[80vh] overflow-y-auto pr-1 custom-scrollbar">
        {/* Left 6 Cols: Customization Controls & Color Themes */}
        <div className="lg:col-span-6 space-y-5">
          {/* Layout Template Selector Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-500" />
                Select Layout Template
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCreateNewLayout}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" /> New Layout
                </button>
                {layouts.length > 1 && (
                  <button
                    onClick={handleDeleteLayout}
                    className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-900 border rounded-lg"
                    title="Delete Current Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedLayoutId}
                onChange={(e) => handleSelectLayout(e.target.value)}
                className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              >
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.isDefault ? '⭐ [POS DEFAULT] ' : ''}{l.name} ({l.paperSize})
                  </option>
                ))}
              </select>
              {!editingLayout.isDefault && (
                <button
                  onClick={handleSetDefault}
                  className="px-3 py-2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 flex items-center gap-1 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" /> Set Default
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Template Profile Name
              </label>
              <input
                type="text"
                value={editingLayout.name}
                onChange={(e) => setEditingLayout({ ...editingLayout, name: e.target.value })}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              />
            </div>
          </div>

          {/* 1. Paper Format */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-500" />
              1. Paper Size & Printing Standard
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'A4', label: 'A4 Full Sheet', sub: 'Standard Tax Invoice' },
                { id: 'Thermal80mm', label: 'Thermal 80mm', sub: 'Standard POS Receipt' },
                { id: 'Thermal58mm', label: 'Thermal 58mm', sub: 'Mini POS Receipt' },
                { id: 'A5', label: 'A5 Half Sheet', sub: 'Compact Billing' },
              ].map((ps) => {
                const isSel = editingLayout.paperSize === ps.id;
                return (
                  <button
                    key={ps.id}
                    onClick={() => setEditingLayout({ ...editingLayout, paperSize: ps.id as PrintPaperSize })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSel
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                    }`}
                  >
                    <p className="font-black text-xs">{ps.label}</p>
                    <p className={`text-[10px] ${isSel ? 'text-emerald-100' : 'text-slate-400'}`}>{ps.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Multicolor Theme Presets */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-emerald-500" />
              2. Multicolor Theme & Accent Palette
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PRESET_COLOR_THEMES) as ColorThemePreset[]).map((themeKey) => {
                const themeObj = PRESET_COLOR_THEMES[themeKey];
                const isSel = editingLayout.colorTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => {
                      setEditingLayout({
                        ...editingLayout,
                        colorTheme: themeKey,
                        customColors: themeObj.colors,
                      });
                    }}
                    className={`p-2.5 rounded-xl border transition-all text-left relative overflow-hidden ${
                      isSel
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-900 text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs line-clamp-1">{themeObj.label}</span>
                      {isSel && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    {/* Color Swatch Bar */}
                    <div className="flex h-3.5 rounded-lg overflow-hidden border border-slate-300/40">
                      <div className="flex-1" style={{ backgroundColor: themeObj.colors.headerBg }} />
                      <div className="flex-1" style={{ backgroundColor: themeObj.colors.primary }} />
                      <div className="flex-1" style={{ backgroundColor: themeObj.colors.secondary }} />
                      <div className="flex-1" style={{ backgroundColor: themeObj.colors.border }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fine-Tune Colors */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Custom Accent Adjustments</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div>
                  <span className="block text-slate-500">Header Banner</span>
                  <input
                    type="color"
                    value={editingLayout.customColors?.headerBg || '#059669'}
                    onChange={(e) =>
                      setEditingLayout({
                        ...editingLayout,
                        colorTheme: 'custom',
                        customColors: {
                          ...editingLayout.customColors,
                          headerBg: e.target.value,
                        },
                      })
                    }
                    className="w-full h-8 cursor-pointer rounded border border-slate-300"
                  />
                </div>
                <div>
                  <span className="block text-slate-500">Primary Accent</span>
                  <input
                    type="color"
                    value={editingLayout.customColors?.primary || '#059669'}
                    onChange={(e) =>
                      setEditingLayout({
                        ...editingLayout,
                        colorTheme: 'custom',
                        customColors: {
                          ...editingLayout.customColors,
                          primary: e.target.value,
                        },
                      })
                    }
                    className="w-full h-8 cursor-pointer rounded border border-slate-300"
                  />
                </div>
                <div>
                  <span className="block text-slate-500">Table Light Fill</span>
                  <input
                    type="color"
                    value={editingLayout.customColors?.secondary || '#ECFDF5'}
                    onChange={(e) =>
                      setEditingLayout({
                        ...editingLayout,
                        colorTheme: 'custom',
                        customColors: {
                          ...editingLayout.customColors,
                          secondary: e.target.value,
                        },
                      })
                    }
                    className="w-full h-8 cursor-pointer rounded border border-slate-300"
                  />
                </div>
                <div>
                  <span className="block text-slate-500">Borders</span>
                  <input
                    type="color"
                    value={editingLayout.customColors?.border || '#A7F3D0'}
                    onChange={(e) =>
                      setEditingLayout({
                        ...editingLayout,
                        colorTheme: 'custom',
                        customColors: {
                          ...editingLayout.customColors,
                          border: e.target.value,
                        },
                      })
                    }
                    className="w-full h-8 cursor-pointer rounded border border-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Header & Table Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Header Layout Style
              </label>
              <select
                value={editingLayout.headerStyle}
                onChange={(e) => setEditingLayout({ ...editingLayout, headerStyle: e.target.value as any })}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              >
                <option value="modern">Modern Colored Banner</option>
                <option value="banner">Solid Top Header Box</option>
                <option value="classic">Classic Centered Box</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Table Grid Style
              </label>
              <select
                value={editingLayout.tableStyle}
                onChange={(e) => setEditingLayout({ ...editingLayout, tableStyle: e.target.value as any })}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              >
                <option value="striped">Striped Alternating Rows</option>
                <option value="bordered">Clean Bordered Box</option>
                <option value="grid">High-Contrast Grid</option>
                <option value="minimal">Minimal Lines</option>
              </select>
            </div>
          </div>

          {/* 4. Font Family */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-emerald-500" /> Font Typography
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'sans', label: 'Clean Sans (Segoe)' },
                { id: 'serif', label: 'Classic Serif (Georgia)' },
                { id: 'mono', label: 'Monospace (Courier)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setEditingLayout({ ...editingLayout, fontFamily: f.id as any })}
                  className={`p-2 rounded-xl border text-xs font-bold ${
                    editingLayout.fontFamily === f.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Section Toggles */}
          <div className="space-y-2 border-t pt-3 border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-500" />
              5. Section Display Toggles
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'showGstBreakdown', label: 'GST Rate & HSN Breakdown' },
                { key: 'showUpiQrCode', label: 'Dynamic UPI QR Code' },
                { key: 'showTerms', label: 'Terms & Conditions Text' },
                { key: 'showSignature', label: 'Customer/Authorised Signature' },
              ].map((item) => {
                const val = (editingLayout as any)[item.key];
                return (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer font-bold text-slate-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setEditingLayout({ ...editingLayout, [item.key]: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 rounded shrink-0"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>

            {editingLayout.showUpiQrCode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  UPI VPA ID for QR Code
                </label>
                <input
                  type="text"
                  value={editingLayout.upiId || ''}
                  onChange={(e) => setEditingLayout({ ...editingLayout, upiId: e.target.value })}
                  placeholder="e.g. yourbusiness@upi"
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Custom Terms & Conditions
              </label>
              <textarea
                value={editingLayout.termsText}
                onChange={(e) => setEditingLayout({ ...editingLayout, termsText: e.target.value })}
                rows={2}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-emerald-300"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSaveCurrentLayout}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Print Layout
            </button>
            <button
              onClick={handleTestPrint}
              className="px-4 py-2.5 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-slate-800"
            >
              <Printer className="w-4 h-4" /> Test Print
            </button>
          </div>
        </div>

        {/* Right 6 Cols: Real-Time Live Preview Frame */}
        <div className="lg:col-span-6 bg-slate-900 p-4 rounded-2xl flex flex-col justify-between border border-slate-800 min-h-[620px] shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-300 text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="font-black text-emerald-400">Live High-Resolution Invoice Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="sm">
                {editingLayout.paperSize} | {editingLayout.colorTheme.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Render Preview iFrame with Crisp High-Resolution Container */}
          <div className="flex-1 bg-slate-950 p-4 my-3 rounded-xl overflow-auto custom-scrollbar flex justify-center items-start border border-slate-800/80 shadow-inner">
            <iframe
              title="Invoice Live Print Preview"
              srcDoc={previewHtml}
              className="bg-white rounded-lg shadow-2xl border-2 border-slate-700 transition-all duration-300"
              style={{
                width: editingLayout.paperSize === 'Thermal80mm' ? '340px' : editingLayout.paperSize === 'Thermal58mm' ? '260px' : '100%',
                height: '100%',
                minHeight: '520px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>

          <div className="text-[11px] text-slate-400 text-center font-mono flex items-center justify-between px-2">
            <span>* High-contrast vector print preview</span>
            <span className="text-emerald-400 font-bold">100% Crisp Render</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
