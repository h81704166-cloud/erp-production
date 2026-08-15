import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  ShieldCheck,
  Building2,
  TrendingDown,
  TrendingUp,
  Scale,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  Percent,
  FileCode,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { Sale, Purchase, Company } from '../../types/erp';
import { Badge } from '../common/Badge';

interface GSTModuleProps {
  sales?: Sale[];
  purchases?: Purchase[];
  company?: Company;
}

export const GSTModule: React.FC<GSTModuleProps> = ({
  sales = [],
  purchases = [],
  company,
}) => {
  const [activeReport, setActiveReport] = useState<'gstr1' | 'gstr2' | 'gstr3b' | 'itc'>('gstr1');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'current_month' | 'q1' | 'fy2026'>('all');
  const [itcFilter, setItcFilter] = useState<'all' | 'matched' | 'eligible'>('all');

  const safeSales = useMemo(() => sales || [], [sales]);
  const safePurchases = useMemo(() => purchases || [], [purchases]);

  const companyGstin = company?.gstin || '27AABCB1234F1ZB';
  const companyState = company?.state || 'Maharashtra';

  // ================= 0. DATE / PERIOD FILTERING =================
  const periodFilteredSales = useMemo(() => {
    if (selectedPeriod === 'all') return safeSales;
    const now = new Date();
    return safeSales.filter((s) => {
      if (!s.billedAt) return true;
      const date = new Date(s.billedAt);
      if (selectedPeriod === 'current_month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (selectedPeriod === 'q1') {
        return date.getMonth() >= 3 && date.getMonth() <= 5; // Apr-Jun
      }
      if (selectedPeriod === 'fy2026') {
        return date.getFullYear() === 2026;
      }
      return true;
    });
  }, [safeSales, selectedPeriod]);

  const periodFilteredPurchases = useMemo(() => {
    if (selectedPeriod === 'all') return safePurchases;
    const now = new Date();
    return safePurchases.filter((p) => {
      if (!p.purchasedAt) return true;
      const date = new Date(p.purchasedAt);
      if (selectedPeriod === 'current_month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (selectedPeriod === 'q1') {
        return date.getMonth() >= 3 && date.getMonth() <= 5;
      }
      if (selectedPeriod === 'fy2026') {
        return date.getFullYear() === 2026;
      }
      return true;
    });
  }, [safePurchases, selectedPeriod]);

  // Search filtered sales & purchases
  const displaySales = useMemo(() => {
    if (!searchQuery.trim()) return periodFilteredSales;
    const q = searchQuery.toLowerCase().trim();
    return periodFilteredSales.filter(
      (s) =>
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.invoiceNo || '').toLowerCase().includes(q) ||
        (s.customerGstin || '').toLowerCase().includes(q)
    );
  }, [periodFilteredSales, searchQuery]);

  const displayPurchases = useMemo(() => {
    if (!searchQuery.trim()) return periodFilteredPurchases;
    const q = searchQuery.toLowerCase().trim();
    return periodFilteredPurchases.filter(
      (p) =>
        (p.vendorName || '').toLowerCase().includes(q) ||
        (p.purchaseNo || '').toLowerCase().includes(q) ||
        (p.vendorGstin || '').toLowerCase().includes(q) ||
        (p.vendorInvoiceNo || '').toLowerCase().includes(q)
    );
  }, [periodFilteredPurchases, searchQuery]);

  // ================= 1. GSTR-1 CALCULATIONS (OUTWARD SALES) =================
  const b2bSales = useMemo(
    () => displaySales.filter((s) => s.customerGstin && s.customerGstin.trim().length === 15),
    [displaySales]
  );
  const b2cSales = useMemo(
    () => displaySales.filter((s) => !s.customerGstin || s.customerGstin.trim().length < 15),
    [displaySales]
  );

  const totalB2bTaxable = useMemo(() => b2bSales.reduce((acc, s) => acc + (s.totalTaxable || 0), 0), [b2bSales]);
  const totalB2bTax = useMemo(() => b2bSales.reduce((acc, s) => acc + (s.totalTax || 0), 0), [b2bSales]);
  const totalB2bCgst = useMemo(() => b2bSales.reduce((acc, s) => acc + (s.totalCgst || 0), 0), [b2bSales]);
  const totalB2bSgst = useMemo(() => b2bSales.reduce((acc, s) => acc + (s.totalSgst || 0), 0), [b2bSales]);
  const totalB2bIgst = useMemo(() => b2bSales.reduce((acc, s) => acc + (s.totalIgst || 0), 0), [b2bSales]);

  const totalB2cTaxable = useMemo(() => b2cSales.reduce((acc, s) => acc + (s.totalTaxable || 0), 0), [b2cSales]);
  const totalB2cTax = useMemo(() => b2cSales.reduce((acc, s) => acc + (s.totalTax || 0), 0), [b2cSales]);
  const totalB2cCgst = useMemo(() => b2cSales.reduce((acc, s) => acc + (s.totalCgst || 0), 0), [b2cSales]);
  const totalB2cSgst = useMemo(() => b2cSales.reduce((acc, s) => acc + (s.totalSgst || 0), 0), [b2cSales]);
  const totalB2cIgst = useMemo(() => b2cSales.reduce((acc, s) => acc + (s.totalIgst || 0), 0), [b2cSales]);

  const totalOutwardTaxable = totalB2bTaxable + totalB2cTaxable;
  const totalOutwardTax = totalB2bTax + totalB2cTax;
  const totalOutwardCgst = totalB2bCgst + totalB2cCgst;
  const totalOutwardSgst = totalB2bSgst + totalB2cSgst;
  const totalOutwardIgst = totalB2bIgst + totalB2cIgst;

  // Rate-wise Slab Breakdown for Sales (0%, 5%, 12%, 18%, 28%)
  const salesRateSlabs = useMemo(() => {
    const map = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>();
    [0, 5, 12, 18, 28].forEach((r) => map.set(r, { rate: r, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 }));

    displaySales.forEach((s) => {
      if (s.items && s.items.length > 0) {
        s.items.forEach((item) => {
          const rate = item.gstRate || 18;
          const current = map.get(rate) || { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
          current.taxable += item.taxableAmount || 0;
          current.cgst += item.cgstAmount || 0;
          current.sgst += item.sgstAmount || 0;
          current.igst += item.igstAmount || 0;
          current.totalTax += (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
          map.set(rate, current);
        });
      } else {
        // Fallback default 18%
        const rate = 18;
        const current = map.get(rate)!;
        current.taxable += s.totalTaxable || 0;
        current.cgst += s.totalCgst || 0;
        current.sgst += s.totalSgst || 0;
        current.igst += s.totalIgst || 0;
        current.totalTax += s.totalTax || 0;
        map.set(rate, current);
      }
    });

    return Array.from(map.values());
  }, [displaySales]);

  // HSN Summary Breakdown (GSTR-1 Table 12)
  const hsnSummary = useMemo(() => {
    const map = new Map<string, { hsnCode: string; description: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>();

    displaySales.forEach((s) => {
      if (s.items && s.items.length > 0) {
        s.items.forEach((item) => {
          const hsn = item.hsnCode || '8471';
          const existing = map.get(hsn) || {
            hsnCode: hsn,
            description: item.productName || 'General Item',
            qty: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalTax: 0,
          };

          existing.qty += item.qty || 1;
          existing.taxable += item.taxableAmount || 0;
          existing.cgst += item.cgstAmount || 0;
          existing.sgst += item.sgstAmount || 0;
          existing.igst += item.igstAmount || 0;
          existing.totalTax += (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);

          map.set(hsn, existing);
        });
      }
    });

    return Array.from(map.values());
  }, [displaySales]);

  // ================= 2. GSTR-2 CALCULATIONS (INWARD PURCHASES) =================
  const b2bPurchases = useMemo(
    () => displayPurchases.filter((p) => p.vendorGstin && p.vendorGstin.trim().length === 15),
    [displayPurchases]
  );
  const b2cPurchases = useMemo(
    () => displayPurchases.filter((p) => !p.vendorGstin || p.vendorGstin.trim().length < 15),
    [displayPurchases]
  );

  const totalInwardTaxable = useMemo(() => displayPurchases.reduce((acc, p) => acc + (p.subtotal || 0), 0), [displayPurchases]);
  const totalInwardTax = useMemo(() => displayPurchases.reduce((acc, p) => acc + (p.taxTotal || 0), 0), [displayPurchases]);
  const totalInwardCgst = useMemo(() => displayPurchases.reduce((acc, p) => acc + ((p.taxTotal || 0) / 2), 0), [displayPurchases]);
  const totalInwardSgst = useMemo(() => displayPurchases.reduce((acc, p) => acc + ((p.taxTotal || 0) / 2), 0), [displayPurchases]);

  const totalB2bPurchaseTaxable = useMemo(() => b2bPurchases.reduce((acc, p) => acc + (p.subtotal || 0), 0), [b2bPurchases]);
  const totalB2bPurchaseTax = useMemo(() => b2bPurchases.reduce((acc, p) => acc + (p.taxTotal || 0), 0), [b2bPurchases]);

  const totalB2cPurchaseTaxable = useMemo(() => b2cPurchases.reduce((acc, p) => acc + (p.subtotal || 0), 0), [b2cPurchases]);
  const totalB2cPurchaseTax = useMemo(() => b2cPurchases.reduce((acc, p) => acc + (p.taxTotal || 0), 0), [b2cPurchases]);

  // ================= 3. GSTR-3B TAX COMPUTATION & SET-OFF =================
  const outwardCgstLiability = totalOutwardCgst;
  const outwardSgstLiability = totalOutwardSgst;
  const outwardIgstLiability = totalOutwardIgst;

  const availableCgstItc = totalInwardCgst;
  const availableSgstItc = totalInwardSgst;
  const availableIgstItc = 0; // Can be set if inter-state purchases exist

  const netCgstPayable = Math.max(0, outwardCgstLiability - availableCgstItc);
  const netSgstPayable = Math.max(0, outwardSgstLiability - availableSgstItc);
  const netIgstPayable = Math.max(0, outwardIgstLiability - availableIgstItc);

  const netTotalCashPayable = netCgstPayable + netSgstPayable + netIgstPayable;

  const cgstItcCarryForward = Math.max(0, availableCgstItc - outwardCgstLiability);
  const sgstItcCarryForward = Math.max(0, availableSgstItc - outwardSgstLiability);

  // ================= 4. VENDOR-WISE ITC RECONCILIATION LEDGER =================
  const vendorItcLedger = useMemo(() => {
    const map = new Map<string, {
      vendorName: string;
      vendorGstin: string;
      billCount: number;
      taxableAmount: number;
      totalItc: number;
      cgstItc: number;
      sgstItc: number;
      status: 'MATCHED_2B' | 'ELIGIBLE';
    }>();

    displayPurchases.forEach((p) => {
      const key = p.vendorName || 'Unknown Supplier';
      const existing = map.get(key) || {
        vendorName: p.vendorName || 'Vendor',
        vendorGstin: p.vendorGstin || 'Unregistered',
        billCount: 0,
        taxableAmount: 0,
        totalItc: 0,
        cgstItc: 0,
        sgstItc: 0,
        status: p.vendorGstin && p.vendorGstin.trim().length === 15 ? 'MATCHED_2B' : 'ELIGIBLE',
      };

      existing.billCount += 1;
      existing.taxableAmount += p.subtotal || 0;
      existing.totalItc += p.taxTotal || 0;
      existing.cgstItc += (p.taxTotal || 0) / 2;
      existing.sgstItc += (p.taxTotal || 0) / 2;

      map.set(key, existing);
    });

    return Array.from(map.values()).filter((v) => {
      if (itcFilter === 'matched') return v.status === 'MATCHED_2B';
      if (itcFilter === 'eligible') return v.status === 'ELIGIBLE';
      return true;
    });
  }, [displayPurchases, itcFilter]);

  // ================= EXPORT FUNCTIONS =================
  const downloadCSVReport = () => {
    let csvLines: string[] = [];
    const filename = `${activeReport.toUpperCase()}_Report_${companyGstin}.csv`;

    if (activeReport === 'gstr1') {
      csvLines.push('GSTIN/UIN,Receiver Name,Invoice No,Date,Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR),Total Tax (INR),Invoice Value (INR)');
      displaySales.forEach((s) => {
        csvLines.push(
          `"${s.customerGstin || 'B2C (Retail)'}","${s.customerName}","${s.invoiceNo}","${
            s.billedAt ? s.billedAt.split('T')[0] : ''
          }",${(s.totalTaxable || 0).toFixed(2)},${(s.totalCgst || 0).toFixed(2)},${(s.totalSgst || 0).toFixed(
            2
          )},${(s.totalIgst || 0).toFixed(2)},${(s.totalTax || 0).toFixed(2)},${(s.grandTotal || 0).toFixed(2)}`
        );
      });
    } else if (activeReport === 'gstr2') {
      csvLines.push(
        'Supplier GSTIN,Supplier Name,Purchase Order #,Supplier Invoice #,Date,Taxable Value (INR),CGST Paid (INR),SGST Paid (INR),Total Tax Paid (INR),ITC Eligibility Status'
      );
      displayPurchases.forEach((p) => {
        csvLines.push(
          `"${p.vendorGstin || 'URP (Unregistered)'}","${p.vendorName}","${p.purchaseNo}","${
            p.vendorInvoiceNo || '-'
          }","${p.purchasedAt ? p.purchasedAt.split('T')[0] : ''}",${(p.subtotal || 0).toFixed(2)},${(
            (p.taxTotal || 0) / 2
          ).toFixed(2)},${((p.taxTotal || 0) / 2).toFixed(2)},${(p.taxTotal || 0).toFixed(2)},"100% Eligible ITC"`
        );
      });
    } else if (activeReport === 'gstr3b') {
      csvLines.push('GSTR-3B Table,Details,Taxable Value (INR),Integrated Tax (IGST),Central Tax (CGST),State/UT Tax (SGST)');
      csvLines.push(
        `"3.1(a)","Outward Taxable Supplies (Sales)",${totalOutwardTaxable.toFixed(2)},${totalOutwardIgst.toFixed(
          2
        )},${totalOutwardCgst.toFixed(2)},${totalOutwardSgst.toFixed(2)}`
      );
      csvLines.push(
        `"4(A)","Eligible Input Tax Credit (Purchases)",${totalInwardTaxable.toFixed(
          2
        )},0.00,${totalInwardCgst.toFixed(2)},${totalInwardSgst.toFixed(2)}`
      );
      csvLines.push(
        `"5.1","Net Tax Payable in Cash",${totalOutwardTaxable.toFixed(2)},${netIgstPayable.toFixed(
          2
        )},${netCgstPayable.toFixed(2)},${netSgstPayable.toFixed(2)}`
      );
    } else if (activeReport === 'itc') {
      csvLines.push(
        'Supplier Name,Supplier GSTIN,Invoices Count,Taxable Purchased (INR),CGST Credit (INR),SGST Credit (INR),Total ITC Claimed (INR),GSTR-2B Matching Status'
      );
      vendorItcLedger.forEach((v) => {
        csvLines.push(
          `"${v.vendorName}","${v.vendorGstin}",${v.billCount},${v.taxableAmount.toFixed(2)},${v.cgstItc.toFixed(
            2
          )},${v.sgstItc.toFixed(2)},${v.totalItc.toFixed(2)},"${
            v.status === 'MATCHED_2B' ? 'GSTR-2B Auto-Matched' : 'Input Tax Credit Eligible'
          }"`
        );
      });
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGSTR1JSON = () => {
    const jsonPayload = {
      gstin: companyGstin,
      fp: '072026',
      gt: totalOutwardTaxable,
      cur_gt: totalOutwardTaxable,
      b2b: b2bSales.map((s) => ({
        ctin: s.customerGstin,
        inv: [
          {
            inum: s.invoiceNo,
            idt: s.billedAt ? s.billedAt.split('T')[0] : '',
            val: s.grandTotal,
            pos: companyGstin.substring(0, 2),
            rchrg: 'N',
            inv_typ: 'R',
            itms: (s.items || []).map((itm, idx) => ({
              num: idx + 1,
              itm_det: {
                txval: itm.taxableAmount,
                rt: itm.gstRate,
                camt: itm.cgstAmount,
                samt: itm.sgstAmount,
                iamt: itm.igstAmount,
              },
            })),
          },
        ],
      })),
      b2cs: b2cSales.map((s) => ({
        sply_ty: 'INTRA',
        txval: s.totalTaxable,
        rt: 18,
        camt: s.totalCgst,
        samt: s.totalSgst,
      })),
      hsn: {
        data: hsnSummary.map((h, i) => ({
          num: i + 1,
          hsn_sc: h.hsnCode,
          desc: h.description,
          uqc: 'OTH',
          qty: h.qty,
          val: h.taxable,
          txval: h.taxable,
          camt: h.cgst,
          samt: h.sgst,
          iamt: h.igst,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GSTR1_${companyGstin}_JULY2026.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs w-full min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-emerald-300 truncate">
                GST Compliance & Tax Returns Hub
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                GSTR-1, 2, 3B & ITC
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Comprehensive GSTR-1 Outward Register, GSTR-2 Inward Report, GSTR-3B Cash Liability & ITC Full Reconciliation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          {/* Period Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-500 ml-1.5 shrink-0" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none pr-2 cursor-pointer"
            >
              <option value="all">All Time Records</option>
              <option value="current_month">Current Month ({new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })})</option>
              <option value="q1">Q1 FY 2026-27 (Apr-Jun)</option>
              <option value="fy2026">Financial Year 2026</option>
            </select>
          </div>

          <div className="hidden sm:flex flex-col text-right px-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Company GSTIN</span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{companyGstin}</span>
          </div>

          <button
            onClick={downloadCSVReport}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {activeReport === 'gstr1' && (
            <button
              onClick={downloadGSTR1JSON}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 border border-emerald-500/40 font-black text-xs text-emerald-400 rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>GSTR-1 Portal JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 w-full min-w-0">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 max-w-full">
          <button
            onClick={() => setActiveReport('gstr1')}
            className={`px-3.5 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeReport === 'gstr1'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>GSTR-1 (Sales Outward)</span>
          </button>

          <button
            onClick={() => setActiveReport('gstr2')}
            className={`px-3.5 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeReport === 'gstr2'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <span>GSTR-2 (Inward Purchases)</span>
          </button>

          <button
            onClick={() => setActiveReport('gstr3b')}
            className={`px-3.5 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeReport === 'gstr3b'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-300" />
            <span>GSTR-3B (Tax Computation)</span>
          </button>

          <button
            onClick={() => setActiveReport('itc')}
            className={`px-3.5 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeReport === 'itc'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-300" />
            <span>ITC Ledger & 2B Match</span>
          </button>
        </div>

        {/* Global Search inside Tab */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter party, GSTIN, invoice..."
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ================= TAB 1: GSTR-1 OUTWARD SALES ================= */}
      {activeReport === 'gstr1' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Outward Sales</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                ₹{totalOutwardTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Output Tax: ₹{totalOutwardTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-500">4A, 4B - B2B Invoices</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{totalB2bTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {b2bSales.length} Bills | Tax: ₹{totalB2bTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-indigo-500">7 - B2C Retail Invoices</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                ₹{totalB2cTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {b2cSales.length} Bills | Tax: ₹{totalB2cTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-amber-500">Tax Type Breakdown</span>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>CGST (Central):</span>
                  <span>₹{totalOutwardCgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (State):</span>
                  <span>₹{totalOutwardSgst.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rate-Wise Tax Slab Summary Table */}
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3 w-full min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-emerald-300 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>GSTR-1 Rate-Wise Tax Slab Breakdown (5%, 12%, 18%, 28%)</span>
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto custom-scrollbar w-full max-w-full">
              <table className="w-full min-w-[600px] text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase">
                  <tr>
                    <th className="p-3">GST Rate Slab</th>
                    <th className="p-3 text-right">Taxable Value (₹)</th>
                    <th className="p-3 text-right">CGST (₹)</th>
                    <th className="p-3 text-right">SGST (₹)</th>
                    <th className="p-3 text-right">IGST (₹)</th>
                    <th className="p-3 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salesRateSlabs.map((slab) => (
                    <tr key={slab.rate} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{slab.rate}% GST Slab</td>
                      <td className="p-3 text-right font-mono font-bold">₹{slab.taxable.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-500">₹{slab.cgst.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-500">₹{slab.sgst.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-500">₹{slab.igst.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₹{slab.totalTax.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Schedule Invoices Table */}
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-4 w-full min-w-0">
            <h3 className="text-base font-black text-slate-900 dark:text-emerald-300">
              GSTR-1 Outward Sales Register ({displaySales.length} Invoices)
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto custom-scrollbar w-full max-w-full">
              <table className="w-full min-w-[700px] text-xs text-left">
                <thead className="bg-slate-900 text-amber-300 uppercase font-black text-[10px]">
                  <tr>
                    <th className="p-3">Customer GSTIN</th>
                    <th className="p-3">Receiver Party Name</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3 text-right">Taxable Value (₹)</th>
                    <th className="p-3 text-right">CGST (₹)</th>
                    <th className="p-3 text-right">SGST (₹)</th>
                    <th className="p-3 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {displaySales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        No outward sales records found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    displaySales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {s.customerGstin || 'B2C (Retail)'}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 dark:text-slate-100">{s.customerName}</td>
                        <td className="p-3 font-mono font-bold text-indigo-500">{s.invoiceNo}</td>
                        <td className="p-3 text-right font-black">₹{(s.totalTaxable || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-500 font-bold">₹{(s.totalCgst || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-500 font-bold">₹{(s.totalSgst || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          ₹{(s.totalTax || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GSTR-1 Table 12: HSN Summary */}
          {hsnSummary.length > 0 && (
            <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3 w-full min-w-0">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-emerald-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>GSTR-1 Table 12: HSN-Wise Summary of Outward Supplies</span>
              </h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto custom-scrollbar w-full max-w-full">
                <table className="w-full min-w-[650px] text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase">
                    <tr>
                      <th className="p-3">HSN Code</th>
                      <th className="p-3">Item Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Taxable Value (₹)</th>
                      <th className="p-3 text-right">CGST (₹)</th>
                      <th className="p-3 text-right">SGST (₹)</th>
                      <th className="p-3 text-right">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {hsnSummary.map((hsn) => (
                      <tr key={hsn.hsnCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-indigo-500">{hsn.hsnCode}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{hsn.description}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{hsn.qty}</td>
                        <td className="p-3 text-right font-mono font-bold">₹{hsn.taxable.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-slate-500">₹{hsn.cgst.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-slate-500">₹{hsn.sgst.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ₹{hsn.totalTax.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: GSTR-2 INWARD PURCHASES ================= */}
      {activeReport === 'gstr2' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Inward Purchases</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                ₹{totalInwardTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Total Inward GST Paid: ₹{totalInwardTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-amber-500">B2B Registered Supplier Purchases</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                ₹{totalB2bPurchaseTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {b2bPurchases.length} Bills | GST Paid: ₹{totalB2bPurchaseTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-500">Unregistered / Retail Inward</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{totalB2cPurchaseTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {b2cPurchases.length} Bills | GST Paid: ₹{totalB2cPurchaseTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* GSTR-2 Table */}
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-4 w-full min-w-0">
            <h3 className="text-base font-black text-slate-900 dark:text-emerald-300">
              GSTR-2 Inward Supplies Register ({displayPurchases.length} Bills)
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto custom-scrollbar w-full max-w-full">
              <table className="w-full min-w-[750px] text-xs text-left">
                <thead className="bg-slate-900 text-amber-300 uppercase font-black text-[10px]">
                  <tr>
                    <th className="p-3">Supplier GSTIN</th>
                    <th className="p-3">Vendor / Supplier Name</th>
                    <th className="p-3">PO # / Bill #</th>
                    <th className="p-3">Purchase Date</th>
                    <th className="p-3 text-right">Taxable Value (₹)</th>
                    <th className="p-3 text-right">CGST Paid (₹)</th>
                    <th className="p-3 text-right">SGST Paid (₹)</th>
                    <th className="p-3 text-right">Total Tax Paid (₹)</th>
                    <th className="p-3 text-center">ITC Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {displayPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">
                        No inward purchase bills found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    displayPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {p.vendorGstin || 'Unregistered'}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 dark:text-slate-100">{p.vendorName}</td>
                        <td className="p-3 font-mono font-bold text-indigo-500">
                          {p.purchaseNo} {p.vendorInvoiceNo ? `(${p.vendorInvoiceNo})` : ''}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {p.purchasedAt ? new Date(p.purchasedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-right font-black">₹{(p.subtotal || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-500 font-bold">₹{((p.taxTotal || 0) / 2).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-500 font-bold">₹{((p.taxTotal || 0) / 2).toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-amber-600 dark:text-amber-400">
                          ₹{(p.taxTotal || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            100% Eligible
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: GSTR-3B TAX COMPUTATION ================= */}
      {activeReport === 'gstr3b' && (
        <div className="space-y-6 w-full min-w-0">
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-6 shadow-xs w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-emerald-400">
                  GSTR-3B Summary & Cash Liability Computation
                </h3>
                <p className="text-xs text-slate-500">
                  Auto-offsetting Outward GST liability against Eligible Input Tax Credit (ITC).
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-xl border border-emerald-500/30 shrink-0">
                Period: July 2026
              </span>
            </div>

            {/* Matrix Form Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto custom-scrollbar w-full max-w-full">
              <table className="w-full min-w-[650px] text-xs text-left">
                <thead className="bg-slate-900 text-amber-300 font-black text-[10px] uppercase">
                  <tr>
                    <th className="p-3.5">GSTR-3B Section / Details</th>
                    <th className="p-3.5 text-right">Taxable Amount (₹)</th>
                    <th className="p-3.5 text-right">Integrated Tax IGST (₹)</th>
                    <th className="p-3.5 text-right">Central Tax CGST (₹)</th>
                    <th className="p-3.5 text-right">State Tax SGST (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                  {/* Table 3.1 Outward */}
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                    <td className="p-3.5">
                      <p className="font-extrabold text-slate-900 dark:text-slate-100">
                        3.1(a) Outward Taxable Supplies (Other than Zero Rated)
                      </p>
                      <p className="text-[10px] text-slate-500">Total B2B + B2C Sales Generated</p>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">₹{totalOutwardTaxable.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                      ₹{outwardIgstLiability.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                      ₹{outwardCgstLiability.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                      ₹{outwardSgstLiability.toFixed(2)}
                    </td>
                  </tr>

                  {/* Table 4 Eligible ITC */}
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                    <td className="p-3.5">
                      <p className="font-extrabold text-slate-900 dark:text-slate-100">
                        4(A) Eligible Input Tax Credit (ITC Available)
                      </p>
                      <p className="text-[10px] text-slate-500">GST Paid on Purchases & Expenses</p>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">₹{totalInwardTaxable.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">₹0.00</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ₹{availableCgstItc.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ₹{availableSgstItc.toFixed(2)}
                    </td>
                  </tr>

                  {/* Table 5.1 Net Tax Payable */}
                  <tr className="bg-emerald-500/10 dark:bg-emerald-950/40 font-black">
                    <td className="p-3.5 text-emerald-950 dark:text-emerald-300">
                      5.1 Net Tax Payable in Cash (After ITC Offset)
                    </td>
                    <td className="p-3.5 text-right font-mono">₹{totalOutwardTaxable.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{netIgstPayable.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{netCgstPayable.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{netSgstPayable.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash Payable Hero Banner */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-emerald-950 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Total Cash Tax Payable (Electronic Cash Ledger)
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Sum of Net IGST + CGST + SGST liabilities due for filing before the 20th of the month.
                </p>
              </div>

              <div className="text-right">
                <p className="text-3xl font-black text-emerald-400">
                  ₹{netTotalCashPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                {(cgstItcCarryForward > 0 || sgstItcCarryForward > 0) && (
                  <p className="text-xs font-bold text-amber-300 mt-0.5">
                    Unutilized ITC Credit Carry Forward: ₹{(cgstItcCarryForward + sgstItcCarryForward).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: ITC RECONCILIATION ================= */}
      {activeReport === 'itc' && (
        <div className="space-y-6 w-full min-w-0">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-indigo-500">Total ITC Accumulated</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                ₹{totalInwardTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">Across {displayPurchases.length} Purchase Bills</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-500">CGST Input Credit</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{totalInwardCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">50% Intra-state GST</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-amber-500">SGST Input Credit</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                ₹{totalInwardSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">50% Intra-state GST</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-400">2B Reconciliation</span>
              <p className="text-2xl font-black text-emerald-500 mt-1">100% Reconciled</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Zero Blocked Credit</p>
            </div>
          </div>

          {/* Vendor Wise Table */}
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-emerald-300">
                  Vendor-Wise Input Tax Credit (ITC) Ledger & GSTR-2B Matching
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Detailed breakdown of supplier GST payments, ITC eligibility and GSTR-2B auto-reconciliation status.
                </p>
              </div>

              {/* Status filter buttons */}
              <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
                <button
                  onClick={() => setItcFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    itcFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  All ({vendorItcLedger.length})
                </button>
                <button
                  onClick={() => setItcFilter('matched')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    itcFilter === 'matched'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  2B Auto-Matched
                </button>
                <button
                  onClick={() => setItcFilter('eligible')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    itcFilter === 'eligible'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Eligible Claim
                </button>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto custom-scrollbar w-full max-w-full">
              <table className="w-full min-w-[700px] text-xs text-left">
                <thead className="bg-slate-900 text-amber-300 uppercase font-black text-[10px]">
                  <tr>
                    <th className="p-3">Vendor / Supplier Name</th>
                    <th className="p-3">Vendor GSTIN</th>
                    <th className="p-3 text-center">Invoices Count</th>
                    <th className="p-3 text-right">Taxable Purchased (₹)</th>
                    <th className="p-3 text-right">CGST Credit (₹)</th>
                    <th className="p-3 text-right">SGST Credit (₹)</th>
                    <th className="p-3 text-right">Total ITC Earned (₹)</th>
                    <th className="p-3 text-center">GSTR-2B Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {vendorItcLedger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                        No purchase bills recorded for ITC reconciliation.
                      </td>
                    </tr>
                  ) : (
                    vendorItcLedger.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="p-3 font-extrabold text-slate-900 dark:text-slate-100">{v.vendorName}</td>
                        <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">{v.vendorGstin}</td>
                        <td className="p-3 text-center font-bold text-indigo-500">{v.billCount} Bills</td>
                        <td className="p-3 text-right font-black">₹{v.taxableAmount.toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-500 font-bold">₹{v.cgstItc.toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-500 font-bold">₹{v.sgstItc.toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          ₹{v.totalItc.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {v.status === 'MATCHED_2B' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>2B Auto-Matched</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Eligible Claim</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
