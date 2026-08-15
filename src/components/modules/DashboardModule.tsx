import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Wallet,
  ShoppingCart,
  PlusCircle,
  ArrowRight,
  Zap,
  Printer,
  FileText,
  Boxes,
  Users,
  CreditCard,
  PieChart as PieChartIcon,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Activity,
  Calendar,
  Layers,
  CheckCircle2,
  Receipt,
  DollarSign,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Sale, Product, Party, Account, Expense } from '../../types/erp';
import { ActiveModule } from '../layout/Sidebar';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { ERPDatabase } from '../../services/db';

// Custom Recharts Tooltip for Sales Trends
const SalesTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/40 shadow-2xl text-white text-xs space-y-1 z-50">
        <p className="font-black text-emerald-400 border-b border-slate-800 pb-1 mb-1">{data.month || label}</p>
        <p className="font-extrabold text-sm text-white">
          Revenue: <span className="text-emerald-400">₹{Number(data.amount || data.sales || 0).toLocaleString('en-IN')}</span>
        </p>
        {data.count !== undefined && (
          <p className="text-[11px] text-slate-300 font-medium">Invoices Billed: {data.count}</p>
        )}
        {data.avgOrder !== undefined && data.avgOrder > 0 && (
          <p className="text-[11px] text-teal-300 font-medium">Avg Order Value: ₹{Number(data.avgOrder).toLocaleString('en-IN')}</p>
        )}
      </div>
    );
  }
  return null;
};

// Custom Recharts Tooltip for Expense Categorization
const ExpenseTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md p-3 rounded-2xl border border-cyan-500/40 shadow-2xl text-white text-xs space-y-1 z-50">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload?.color || '#3b82f6' }} />
          <span className="font-black text-slate-100">{data.name}</span>
        </div>
        <p className="font-black text-sm text-cyan-300 pt-0.5">
          ₹{Number(data.value || 0).toLocaleString('en-IN')}
        </p>
      </div>
    );
  }
  return null;
};

interface DashboardModuleProps {
  sales: Sale[];
  products: Product[];
  parties: Party[];
  accounts: Account[];
  expenses: Expense[];
  onNavigate: (module: ActiveModule) => void;
  onOpenAddModal: (type: 'product' | 'customer' | 'vendor' | 'account') => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  sales = [],
  products = [],
  parties = [],
  accounts = [],
  expenses = [],
  onNavigate,
  onOpenAddModal,
}) => {
  const [chartTimeframe, setChartTimeframe] = useState<'7days' | 'monthly'>('monthly');
  const company = ERPDatabase.getCompany();

  const safeSales = sales || [];
  const safeProducts = products || [];
  const safeParties = parties || [];
  const safeAccounts = accounts || [];
  const safeExpenses = expenses || [];

  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = safeSales.filter((s) => s.billedAt && s.billedAt.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);

  // Yesterday's Sales & Real Growth Trend Calculation
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  const yesterdaySales = safeSales.filter((s) => s.billedAt && s.billedAt.startsWith(yesterdayStr));
  const yesterdaySalesTotal = yesterdaySales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);

  let todaySalesTrendValue = 'No previous data';
  let todaySalesTrend: 'up' | 'down' | 'neutral' = 'neutral';

  if (yesterdaySalesTotal > 0) {
    const diffPct = ((todaySalesTotal - yesterdaySalesTotal) / yesterdaySalesTotal) * 100;
    if (diffPct > 0) {
      todaySalesTrendValue = `+${diffPct.toFixed(1)}% vs yesterday`;
      todaySalesTrend = 'up';
    } else if (diffPct < 0) {
      todaySalesTrendValue = `${diffPct.toFixed(1)}% vs yesterday`;
      todaySalesTrend = 'down';
    } else {
      todaySalesTrendValue = `0.0% vs yesterday`;
      todaySalesTrend = 'neutral';
    }
  } else if (todaySalesTotal > 0) {
    todaySalesTrendValue = '+100% vs yesterday';
    todaySalesTrend = 'up';
  }

  const lowStockProducts = safeProducts.filter((p) => (p.stockQty || 0) <= (p.minStockAlert || 0));
  const totalKhataDue = safeParties
    .filter((p) => p.type === 'customer' && (p.currentBalance || 0) > 0)
    .reduce((acc, p) => acc + (p.currentBalance || 0), 0);

  const totalCash = safeAccounts
    .filter((a) => a.accountType === 'cash')
    .reduce((acc, a) => acc + (a.currentBalance || 0), 0);

  const totalBank = safeAccounts
    .filter((a) => a.accountType === 'bank')
    .reduce((acc, a) => acc + (a.currentBalance || 0), 0);

  const totalExpenses = safeExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const grossSales = safeSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const avgTicketSize = safeSales.length > 0 ? Math.round(grossSales / safeSales.length) : 0;

  // Real Cost of Goods Sold (COGS) & Net Operating Profit Calculation
  const { totalCOGS, itemsWithCostCount, totalItemsCount } = useMemo(() => {
    let cogs = 0;
    let knownCostQty = 0;
    let totalQty = 0;

    safeSales.forEach((s) => {
      if (s.status === 'returned' || s.status === 'cancelled') return;
      (s.items || []).forEach((item) => {
        const qty = item.qty || 1;
        totalQty += qty;

        const prod = safeProducts.find((p) => p.id === item.productId || (p.sku && p.sku === item.sku));
        if (prod && typeof prod.purchasePrice === 'number' && prod.purchasePrice >= 0) {
          cogs += qty * prod.purchasePrice;
          knownCostQty += qty;
        }
      });
    });

    return { totalCOGS: cogs, itemsWithCostCount: knownCostQty, totalItemsCount: totalQty };
  }, [safeSales, safeProducts]);

  const hasSufficientCostData = totalItemsCount > 0 && itemsWithCostCount > 0;
  const actualNetProfit = hasSufficientCostData ? Math.max(0, grossSales - totalCOGS - totalExpenses) : 0;
  const netProfitMarginPct = hasSufficientCostData && grossSales > 0 ? ((actualNetProfit / grossSales) * 100) : 0;

  // Compute 6-Month Monthly Sales Data for Recharts from REAL Sales Records
  const monthlySalesData = useMemo(() => {
    const result = [];
    const now = new Date();

    const monthMap: Record<string, { sales: number; count: number }> = {};
    safeSales.forEach((s) => {
      if (s.billedAt) {
        const monthKey = s.billedAt.slice(0, 7); // YYYY-MM
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { sales: 0, count: 0 };
        }
        monthMap[monthKey].sales += s.grandTotal || 0;
        monthMap[monthKey].count += 1;
      }
    });

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2);

      const real = monthMap[monthKey];
      const salesVal = real ? real.sales : 0;
      const countVal = real ? real.count : 0;

      result.push({
        month: monthLabel,
        key: monthKey,
        amount: salesVal,
        sales: salesVal,
        count: countVal,
        avgOrder: countVal > 0 ? Math.round(salesVal / countVal) : 0,
      });
    }

    return result;
  }, [safeSales]);

  // Compute 7-Days Sales Data for Recharts from REAL Sales Records
  const dailySalesData = useMemo(() => {
    const result = [];
    const now = new Date();

    const dayMap: Record<string, { sales: number; count: number }> = {};
    safeSales.forEach((s) => {
      if (s.billedAt) {
        const dateKey = s.billedAt.slice(0, 10); // YYYY-MM-DD
        if (!dayMap[dateKey]) {
          dayMap[dateKey] = { sales: 0, count: 0 };
        }
        dayMap[dateKey].sales += s.grandTotal || 0;
        dayMap[dateKey].count += 1;
      }
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const real = dayMap[dateKey];
      const salesVal = real ? real.sales : 0;
      const countVal = real ? real.count : 0;

      result.push({
        month: dayLabel,
        dateKey,
        amount: salesVal,
        sales: salesVal,
        count: countVal,
        avgOrder: countVal > 0 ? Math.round(salesVal / countVal) : 0,
      });
    }

    return result;
  }, [safeSales]);

  const activeSalesChartData = chartTimeframe === 'monthly' ? monthlySalesData : dailySalesData;

  // Peak Performance Month Calculation
  const peakMonth = useMemo(() => {
    return monthlySalesData.reduce(
      (max, item) => (item.sales > max.sales ? item : max),
      { month: 'N/A', sales: 0 }
    );
  }, [monthlySalesData]);

  // Expense Categorization Data for Recharts PieChart
  const expenseCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    safeExpenses.forEach((exp) => {
      const cat = exp.category || 'Miscellaneous';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (exp.amount || 0);
    });

    const categories = Object.keys(categoryTotals);
    const COLOR_MAP: Record<string, string> = {
      Rent: '#3b82f6',
      Salaries: '#8b5cf6',
      Electricity: '#f59e0b',
      'Logistics & Freight': '#06b6d4',
      'Tea & Snacks': '#ec4899',
      Maintenance: '#10b981',
      Marketing: '#6366f1',
      'Office Supplies': '#14b8a6',
      Miscellaneous: '#f43f5e',
    };

    if (categories.length === 0) {
      return [];
    }

    return categories.map((cat, idx) => ({
      name: cat,
      value: categoryTotals[cat],
      color: COLOR_MAP[cat] || ['#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#6366f1'][idx % 7],
    }));
  }, [safeExpenses]);

  const totalExpenseSum = expenseCategoryData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Liquid Glass Futuristic Hero Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl liquid-glass-card border border-white/40 dark:border-emerald-500/30 shadow-2xl transition-all">
        {/* Animated Background Mesh Orbs */}
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none liquid-orb-1" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none liquid-orb-2" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-emerald-400/40 to-transparent" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Liquid ERP v4.0
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/40 px-2.5 py-0.5 rounded-full border border-slate-200/50 dark:border-emerald-900/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Offline PWA Vault Synced
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{company.name || 'Executive Command Center'}</span>
              <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-bounce" />
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
              Real-time financial telemetry, instant billing operations, automated stock reorder triggers & master khata ledgers.
            </p>
          </div>

          {/* Quick Action Liquid Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => onNavigate('pos')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-slate-950" />
              <span>Open POS Counter</span>
            </button>

            <button
              onClick={() => onNavigate('services')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200/80 dark:border-emerald-500/30 backdrop-blur-md shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Quick Service Bill</span>
            </button>

            <button
              onClick={() => onOpenAddModal('product')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200/80 dark:border-emerald-500/30 backdrop-blur-md shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-cyan-500" />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Billed Sales"
          value={`₹${todaySalesTotal.toLocaleString('en-IN')}`}
          subtext={`${todaySales.length} Invoices Generated Today`}
          icon={TrendingUp}
          trend={todaySalesTrend}
          trendValue={todaySalesTrendValue}
          variant="emerald"
          onClick={() => onNavigate('sales')}
        />
        <StatCard
          title="Low Stock Reorders"
          value={lowStockProducts.length}
          subtext={`${lowStockProducts.length} Items Below Minimum Alert Level`}
          icon={AlertTriangle}
          trend={lowStockProducts.length > 0 ? 'down' : 'neutral'}
          trendValue={lowStockProducts.length > 0 ? 'Reorder Needed' : 'Optimal Stock'}
          variant="amber"
          onClick={() => onNavigate('inventory')}
        />
        <StatCard
          title="Outstanding Khata Dues"
          value={`₹${totalKhataDue.toLocaleString('en-IN')}`}
          subtext="Pending Receivables from Customers"
          icon={Clock}
          variant="rose"
          onClick={() => onNavigate('customers')}
        />
        <StatCard
          title="Total Liquidity (Cash + Bank)"
          value={`₹${(totalCash + totalBank).toLocaleString('en-IN')}`}
          subtext={`Cash: ₹${totalCash.toLocaleString('en-IN')} | Bank: ₹${totalBank.toLocaleString('en-IN')}`}
          icon={Wallet}
          variant="cyan"
          onClick={() => onNavigate('accounts')}
        />
      </div>

      {/* Operational Module Launch Tiles (Liquid Glass Shortcuts) */}
      <div className="p-5 rounded-3xl liquid-glass-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-emerald-400">
              Instant Operations Launcher
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">1-Click Module Switch</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'POS Terminal', icon: ShoppingCart, module: 'pos', color: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
            { label: 'Sales History', icon: FileText, module: 'sales', color: 'from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
            { label: 'Stock Manager', icon: Boxes, module: 'inventory', color: 'from-amber-500/20 to-yellow-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
            { label: 'Khata Parties', icon: Users, module: 'customers', color: 'from-rose-500/20 to-pink-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
            { label: 'Cash & Accounts', icon: CreditCard, module: 'accounts', color: 'from-cyan-500/20 to-teal-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
            { label: 'Analytics Reports', icon: PieChart, module: 'reports', color: 'from-purple-500/20 to-indigo-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
          ].map((tile) => {
            const TileIcon = tile.icon;
            return (
              <button
                key={tile.module}
                onClick={() => onNavigate(tile.module as ActiveModule)}
                className={`p-3 rounded-2xl bg-gradient-to-br ${tile.color} border border-white/50 dark:border-emerald-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all flex flex-col items-center text-center gap-2 cursor-pointer shadow-sm`}
              >
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
                  <TileIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white drop-shadow-xs">{tile.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Revenue Velocity Analytics & Operational Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Revenue Velocity & Recent Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Trajectory & Sales Velocity Widget */}
          <div className="p-4 sm:p-6 rounded-3xl liquid-glass-card space-y-4 overflow-hidden w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    Sales & Revenue Trends
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 truncate">
                  {chartTimeframe === 'monthly' ? 'Monthly revenue trajectory & sales performance' : 'Daily sales velocity & invoice volume'}
                </p>
              </div>

              {/* Timeframe Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-300/60 dark:border-emerald-900/40 backdrop-blur-md shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setChartTimeframe('monthly')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                    chartTimeframe === 'monthly'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  6-Month Trend
                </button>
                <button
                  onClick={() => setChartTimeframe('7days')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                    chartTimeframe === '7days'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Last 7 Days
                </button>
              </div>
            </div>

            {/* Top Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-emerald-900/40">
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300 block truncate">Total Revenue Volume</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">₹{grossSales.toLocaleString('en-IN')}</p>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300 block truncate">Avg Ticket Value</span>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">₹{avgTicketSize.toLocaleString('en-IN')}</p>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300 block truncate">Peak Performance Month</span>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 truncate">
                  {peakMonth.sales > 0 ? `${peakMonth.month} (₹${peakMonth.sales.toLocaleString('en-IN')})` : 'No Sales Data'}
                </p>
              </div>
            </div>

            {/* Recharts Area Chart for Monthly / Daily Sales Trends */}
            <div className="pt-2 pb-1 w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeSalesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                  />
                  <RechartsTooltip content={<SalesTrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#salesTrendGradient)"
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent POS Billed Invoices Table */}
          <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  Recent POS Billed Transactions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live sales queue and billing stream</p>
              </div>
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-200/80 dark:bg-slate-950/80 text-slate-800 dark:text-slate-200 uppercase font-extrabold text-[10px] rounded-xl">
                  <tr>
                    <th className="p-3 rounded-l-xl">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-emerald-900/40">
                  {safeSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        No sales invoices created yet. Open POS to start billing!
                      </td>
                    </tr>
                  ) : (
                    safeSales.slice(0, 5).map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="p-3 font-black text-slate-900 dark:text-emerald-300">
                          {sale.invoiceNo}
                        </td>
                        <td className="p-3 text-slate-900 dark:text-slate-100 font-bold">
                          {sale.customerName || 'Walk-in Retail Customer'}
                        </td>
                        <td className="p-3 uppercase font-extrabold text-slate-700 dark:text-slate-300 text-[11px]">
                          {sale.paymentMode || 'cash'}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          ₹{(sale.grandTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={sale.status === 'completed' ? 'emerald' : 'amber'} size="sm">
                            {(sale.status || 'completed').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => InvoicePrintService.printA4Invoice(sale, company)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                            title="Print Thermal / A4 Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Inventory Monitor & Financial Snapshot */}
        <div className="space-y-6">
          {/* Low Stock Reorder Monitor & 1-Click PO Generator */}
          <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Inventory Stock Monitor</h3>
              </div>
              <Badge variant="amber">{lowStockProducts.length}</Badge>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {lowStockProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-emerald-500/30 rounded-2xl bg-white/30 dark:bg-slate-950/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold">All Inventory Stocked Optimally</p>
                  <p className="text-[11px] text-slate-400 mt-1">No products below reorder alert limits.</p>
                </div>
              ) : (
                lowStockProducts.map((p) => {
                  const pct = Math.min(100, Math.round(((p.stockQty || 0) / (p.minStockAlert || 5)) * 100));
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 space-y-2 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-amber-200">{p.name}</p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400">SKU: {p.sku || 'N/A'}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          {p.stockQty || 0} {p.unit || 'pcs'} left
                        </span>
                      </div>

                      {/* Stock Percentage Bar */}
                      <div className="w-full bg-slate-200/80 dark:bg-slate-900/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => onNavigate('inventory')}
              className="w-full py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 hover:brightness-110 text-xs font-bold text-emerald-400 rounded-2xl border border-emerald-500/30 transition-all cursor-pointer shadow-md"
            >
              Manage Full Inventory Stock
            </button>
          </div>

          {/* Business Financial Position & Expense Categorization PieChart */}
          <div className="p-6 rounded-3xl liquid-glass-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-emerald-900/40 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-cyan-500" />
                Expense Categorization
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Recharts Analytics
              </span>
            </div>

            {/* Recharts PieChart for Expense Categorization */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ExpenseTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Center Donut Text */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">Outflow</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  ₹{totalExpenseSum >= 100000 ? `${(totalExpenseSum / 100000).toFixed(1)}L` : `${(totalExpenseSum / 1000).toFixed(1)}k`}
                </p>
              </div>
            </div>

            {/* Category Badges Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              {expenseCategoryData.slice(0, 6).map((item, idx) => {
                const percentage = totalExpenseSum > 0 ? Math.round((item.value / totalExpenseSum) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-emerald-900/30 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-600 dark:text-slate-400 text-[10px] shrink-0">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Summary Row */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-200/60 dark:border-emerald-900/40">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Gross Invoiced Revenue:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{grossSales.toLocaleString('en-IN')}</span>
              </div>
              {hasSufficientCostData && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Est. Cost of Goods Sold (COGS):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">-₹{totalCOGS.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Total Recorded Expenses:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">-₹{totalExpenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-emerald-900/40">
                <span className="font-bold text-slate-800 dark:text-slate-200">Est. Net Operating Profit:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {hasSufficientCostData ? (
                    `₹${actualNetProfit.toLocaleString('en-IN')} (${netProfitMarginPct >= 0 ? '+' : ''}${netProfitMarginPct.toFixed(1)}%)`
                  ) : grossSales === 0 ? (
                    '₹0 (No Sales)'
                  ) : (
                    'Data Insufficient'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
