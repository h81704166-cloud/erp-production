import React, { useState, useEffect, useCallback } from 'react';
import {
  ServerAdminService,
  ServerMetrics,
  MetricHistoryPoint,
  ErpHealthReport,
  AlertItem,
  AlertThresholds,
  ServerAdminAuditLog,
} from '../../services/serverAdminService';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  Database,
  Wifi,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
  Sliders,
  FileText,
  Users,
  Building2,
  TrendingUp,
  BarChart3,
  Layers,
  Info,
  Lock,
} from 'lucide-react';

interface ServerAdminDashboardModuleProps {
  onLogout: () => void;
  onReturnToErp?: () => void;
}

export const ServerAdminDashboardModule: React.FC<ServerAdminDashboardModuleProps> = ({
  onLogout,
  onReturnToErp,
}) => {
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [history, setHistory] = useState<MetricHistoryPoint[]>([]);
  const [health, setHealth] = useState<ErpHealthReport | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    cpuWarningPercent: 80,
    cpuCriticalPercent: 90,
    ramWarningPercent: 80,
    ramCriticalPercent: 90,
    diskWarningPercent: 80,
    diskCriticalPercent: 90,
    dbPoolWarningPercent: 80,
    errorRateWarningPerMin: 10,
  });
  const [auditLogs, setAuditLogs] = useState<ServerAdminAuditLog[]>([]);

  const [timeframe, setTimeframe] = useState<'1h' | '6h' | '24h'>('1h');
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5 seconds default
  const [autoRefreshActive, setAutoRefreshActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'graphs' | 'health' | 'audit' | 'limitations'>('overview');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [metricsRes, historyRes, healthRes, alertsRes, auditRes] = await Promise.all([
        ServerAdminService.fetchMetrics(),
        ServerAdminService.fetchHistory(timeframe),
        ServerAdminService.fetchHealthReport(),
        ServerAdminService.fetchAlerts(),
        ServerAdminService.fetchAuditLogs(),
      ]);

      setMetrics(metricsRes);
      setHistory(historyRes);
      setHealth(healthRes);
      setAlerts(alertsRes.activeAlerts);
      setThresholds(alertsRes.thresholds);
      setAuditLogs(auditRes);
      setLastRefreshedAt(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (err: any) {
      if (err?.message === 'UNAUTHORIZED_SERVER_ADMIN') {
        onLogout();
        return;
      }
      setError(err?.message || 'Failed to connect to Server Monitoring Service');
      setLoading(false);
    }
  }, [timeframe, onLogout]);

  // Initial load and interval loop
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefreshActive || refreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadData();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefreshActive, refreshInterval, loadData]);

  const handleUpdateThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await ServerAdminService.updateThresholds(thresholds);
      setThresholds(updated);
      setShowConfigModal(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to update thresholds: ${err.message}`);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Sampling Real-Time Server Hardware Metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono tracking-tight text-white">SERVER MONITORING DASHBOARD</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SECURE ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Host: <span className="text-slate-200">{metrics?.environment.containerName}</span> ({metrics?.environment.hostingType})
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Updated: {lastRefreshedAt}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setAutoRefreshActive(!autoRefreshActive)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                autoRefreshActive ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {autoRefreshActive ? 'AUTO ON' : 'PAUSED'}
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefreshActive}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs"
            >
              <option value={5000} className="bg-slate-900">5s</option>
              <option value={10000} className="bg-slate-900">10s</option>
              <option value={30000} className="bg-slate-900">30s</option>
            </select>
          </div>

          <button
            onClick={() => loadData()}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Refresh Now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Configure Alert Thresholds"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Alerts Config</span>
          </button>

          {onReturnToErp && (
            <button
              onClick={onReturnToErp}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              Back to ERP
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition-colors cursor-pointer"
            title="Logout Server Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* Error Alert Banner */}
        {error && (
          <div className="rounded-xl bg-red-950/80 border border-red-800/80 p-4 text-sm text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => loadData()} className="text-xs underline font-mono text-red-300">
              Retry Connection
            </button>
          </div>
        )}

        {/* Active Threshold Alerts Notice */}
        {alerts.length > 0 && (
          <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold font-mono text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>ACTIVE SERVER ALERTS ({alerts.length})</span>
              </div>
              <span className="text-xs text-amber-400/80 font-mono">Threshold warnings triggered</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    alt.severity === 'CRITICAL'
                      ? 'bg-red-950/60 border-red-800 text-red-200'
                      : 'bg-amber-900/40 border-amber-700 text-amber-200'
                  }`}
                >
                  <span className="font-semibold">[{alt.severity}] {alt.message}</span>
                  <span className="text-[11px] opacity-75">{new Date(alt.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-sm font-mono">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Hardware Overview
          </button>

          <button
            onClick={() => setActiveTab('graphs')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'graphs'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Performance Graphs
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'health'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            ERP Health Matrix
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Security Audit Logs
          </button>

          <button
            onClick={() => setActiveTab('limitations')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'limitations'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Info className="w-4 h-4" />
            Hosting Capabilities
          </button>
        </div>

        {/* TAB 1: LIVE HARDWARE OVERVIEW */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            {/* Top Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU Usage Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    CPU USAGE
                  </span>
                  <span>{metrics.environment.cpusCount} vCPU</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-mono text-white">{metrics.cpu.usagePercent}%</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    metrics.cpu.usagePercent > 80 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {metrics.cpu.usagePercent > 80 ? 'HIGH LOAD' : 'NORMAL'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      metrics.cpu.usagePercent > 80 ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, metrics.cpu.usagePercent)}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1">
                  <span>Load Avg: {metrics.cpu.loadAvg.join(' • ')}</span>
                  <span>Proc CPU: {metrics.cpu.processCpuPercent}%</span>
                </div>
              </div>

              {/* RAM Usage Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    RAM MEMORY
                  </span>
                  <span>{metrics.ram.totalMB} MB Total</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-mono text-white">{metrics.ram.usagePercent}%</span>
                  <span className="text-xs font-mono text-slate-400">
                    {metrics.ram.usedMB} MB Used
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics.ram.usagePercent)}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1">
                  <span>Free: {metrics.ram.freeMB} MB</span>
                  <span>Node Heap: {metrics.ram.processHeapUsedMB} MB</span>
                </div>
              </div>

              {/* Disk Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-amber-400" />
                    DISK STORAGE
                  </span>
                  <span>{metrics.disk.available ? `${metrics.disk.totalGB} GB` : 'Host Restricted'}</span>
                </div>
                {metrics.disk.available ? (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold font-mono text-white">{metrics.disk.usagePercent}%</span>
                      <span className="text-xs font-mono text-slate-400">{metrics.disk.usedGB} GB Used</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${metrics.disk.usagePercent}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      <span>Free Space: {metrics.disk.freeGB} GB</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-mono font-bold text-amber-300 block">Not available on current hosting</span>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {metrics.disk.reasonIfNotAvailable}
                    </p>
                  </div>
                )}
              </div>

              {/* Network Bandwidth Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    NETWORK I/O
                  </span>
                  <span>Live Speed</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {metrics.network.rxKBPerSec + metrics.network.txKBPerSec} <span className="text-sm font-normal text-slate-400">KB/s</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400">ONLINE</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">IN (RX)</span>
                    <span className="text-slate-200 font-bold">{metrics.network.rxKBPerSec} KB/s</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">OUT (TX)</span>
                    <span className="text-slate-200 font-bold">{metrics.network.txKBPerSec} KB/s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row: API & Database & Business Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* API & Request Performance */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-mono font-bold text-sm text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    API Performance & Throughput
                  </h3>
                  <span className="text-xs font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                    Express Middleware
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs font-mono text-slate-400 block">Requests / Min</span>
                    <span className="text-xl font-bold font-mono text-white">{metrics.api.requestsPerMin}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs font-mono text-slate-400 block">Avg Response Time</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{metrics.api.avgResponseTimeMs} ms</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs font-mono text-slate-400 block">Total Requests</span>
                    <span className="text-lg font-bold font-mono text-slate-200">{metrics.api.totalRequests}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs font-mono text-slate-400 block">Error Rate</span>
                    <span className={`text-lg font-bold font-mono ${metrics.api.errorRatePerMin > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {metrics.api.errorRatePerMin} / min
                    </span>
                  </div>
                </div>

                {metrics.api.lastErrorMessage && (
                  <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-xs font-mono text-red-300">
                    <span className="font-bold block text-red-200">Last App Error:</span>
                    <span>{metrics.api.lastErrorMessage}</span>
                  </div>
                )}
              </div>

              {/* Database Connections & Health */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-mono font-bold text-sm text-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Database Connections & Health
                  </h3>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    metrics.database.status === 'HEALTHY'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {metrics.database.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">Connection Pool Utilization</span>
                    <span className="text-white font-bold">{metrics.database.utilizationPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${metrics.database.utilizationPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Active</span>
                      <span className="text-base font-bold text-emerald-400">{metrics.database.activeConnections}</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Idle</span>
                      <span className="text-base font-bold text-slate-300">{metrics.database.idleConnections}</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Max Limit</span>
                      <span className="text-base font-bold text-indigo-400">{metrics.database.maxPoolLimit}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business & Background Jobs Status */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-mono font-bold text-sm text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Tenants & Sync Worker Status
                  </h3>
                  <span className="text-xs font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
                    Background Sync
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <div>
                      <span className="text-slate-400 block text-[11px]">Active Users</span>
                      <span className="text-base font-bold text-white">{metrics.businessAndJobs.activeUsersCount}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    <div>
                      <span className="text-slate-400 block text-[11px]">Active Tenants</span>
                      <span className="text-base font-bold text-white">{metrics.businessAndJobs.activeTenantsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono pt-1">
                  <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Sync Worker Engine</span>
                    <span className="text-emerald-400 font-bold">{metrics.businessAndJobs.syncWorkerStatus}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400">15-Minute Sync Status</span>
                    <span className="text-emerald-400 font-bold">{metrics.businessAndJobs.fifteenMinSyncStatus}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Google Sheets Backup</span>
                    <span className="text-emerald-400 font-bold">{metrics.businessAndJobs.googleSheetsBackupStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Environment Information Strip */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-4">
                <Server className="w-5 h-5 text-indigo-400" />
                <div>
                  <span className="text-slate-400 block text-[11px]">ENVIRONMENT SPECIFICATION</span>
                  <span className="text-slate-200 font-bold">
                    {metrics.environment.platform} ({metrics.environment.arch}) • Node {metrics.environment.nodeVersion}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">SYSTEM UPTIME</span>
                <span className="text-emerald-400 font-bold">{formatUptime(metrics.environment.uptimeSeconds)}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">PROCESS UPTIME</span>
                <span className="text-indigo-400 font-bold">{formatUptime(metrics.environment.processUptimeSeconds)}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERFORMANCE GRAPHS */}
        {activeTab === 'graphs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                HISTORICAL PERFORMANCE TRENDS
              </h2>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                {(['1h', '6h', '24h'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      timeframe === tf ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CPU Trend Graph */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-indigo-300">CPU Usage % ({timeframe})</span>
                  <span className="text-slate-400">Peak: {Math.max(...history.map((h) => h.cpuPercent), 0)}%</span>
                </div>
                <div className="h-44 flex items-end gap-1 pt-4 border-b border-slate-800">
                  {history.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-indigo-500/80 hover:bg-indigo-400 rounded-t transition-all group relative cursor-pointer"
                      style={{ height: `${Math.max(8, pt.cpuPercent)}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-20 pointer-events-none">
                        {pt.timeLabel}: {pt.cpuPercent}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>{history[0]?.timeLabel || 'Start'}</span>
                  <span>{history[history.length - 1]?.timeLabel || 'Now'}</span>
                </div>
              </div>

              {/* RAM Trend Graph */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-emerald-300">RAM Usage % ({timeframe})</span>
                  <span className="text-slate-400">Avg: {Math.round(history.reduce((a, b) => a + b.ramPercent, 0) / (history.length || 1))}%</span>
                </div>
                <div className="h-44 flex items-end gap-1 pt-4 border-b border-slate-800">
                  {history.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all group relative cursor-pointer"
                      style={{ height: `${Math.max(8, pt.ramPercent)}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-20 pointer-events-none">
                        {pt.timeLabel}: {pt.ramPercent}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>{history[0]?.timeLabel || 'Start'}</span>
                  <span>{history[history.length - 1]?.timeLabel || 'Now'}</span>
                </div>
              </div>

              {/* Response Time Graph */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-cyan-300">API Response Time (ms)</span>
                  <span className="text-slate-400">Avg: {metrics?.api.avgResponseTimeMs} ms</span>
                </div>
                <div className="h-44 flex items-end gap-1 pt-4 border-b border-slate-800">
                  {history.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all group relative cursor-pointer"
                      style={{ height: `${Math.max(8, Math.min(100, pt.avgResponseTimeMs * 2))}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-20 pointer-events-none">
                        {pt.timeLabel}: {pt.avgResponseTimeMs} ms
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>{history[0]?.timeLabel || 'Start'}</span>
                  <span>{history[history.length - 1]?.timeLabel || 'Now'}</span>
                </div>
              </div>

              {/* Requests Per Minute Graph */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-amber-300">Throughput (RPM)</span>
                  <span className="text-slate-400">Live RPM: {metrics?.api.requestsPerMin}</span>
                </div>
                <div className="h-44 flex items-end gap-1 pt-4 border-b border-slate-800">
                  {history.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-amber-500/80 hover:bg-amber-400 rounded-t transition-all group relative cursor-pointer"
                      style={{ height: `${Math.max(8, Math.min(100, pt.rpm * 2.5))}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-20 pointer-events-none">
                        {pt.timeLabel}: {pt.rpm} RPM
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>{history[0]?.timeLabel || 'Start'}</span>
                  <span>{history[history.length - 1]?.timeLabel || 'Now'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ERP HEALTH MATRIX */}
        {activeTab === 'health' && health && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ERP INFRASTRUCTURE HEALTH MATRIX
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time status of backend services and background workers</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  health.overallHealth === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  SYSTEM {health.overallHealth}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block">Express API Subsystem</span>
                  <span className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {health.api}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block">Database Storage Layer</span>
                  <span className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {health.database}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block">Sync Worker Daemon</span>
                  <span className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {health.syncWorker}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block">15-Min Incremental Sync</span>
                  <span className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {health.fifteenMinSync}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block">Google Sheets Backup Engine</span>
                  <span className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {health.googleSheetsBackup}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block">Background Queue Jobs</span>
                  <span className="text-lg font-bold text-indigo-400">
                    {health.backgroundJobs.processedTotal} Processed
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-xs space-y-2 text-slate-300">
                <p>• Last Successful Sync: <span className="text-white font-bold">{health.lastSuccessfulSync ? new Date(health.lastSuccessfulSync).toLocaleString() : 'N/A'}</span></p>
                <p>• Last Successful Backup: <span className="text-white font-bold">{health.lastSuccessfulBackup ? new Date(health.lastSuccessfulBackup).toLocaleString() : 'N/A'}</span></p>
                <p>• Last Application Error: <span className="text-slate-400">{health.lastApplicationError || 'None recorded'}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                SERVER ADMIN SECURITY AUDIT LOGS
              </h2>
              <span className="text-xs text-slate-400">{auditLogs.length} events recorded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Admin Email</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{log.action}</td>
                      <td className="py-2.5 px-3 text-indigo-300">{log.adminEmail}</td>
                      <td className="py-2.5 px-3 text-slate-400">{log.ip}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : log.status === 'BLOCKED'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: HOSTING LIMITATIONS */}
        {activeTab === 'limitations' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 font-mono">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Info className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="text-base font-bold text-white">CURRENT ENVIRONMENT CAPABILITIES & LIMITATIONS</h2>
                <p className="text-xs text-slate-400">Honest audit of hardware metrics available in current container environment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> AVAILABLE METRICS (ACTIVE)
                </h3>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                  <li><strong className="text-white">vCPU Core Count & Load Average:</strong> Sampled directly from Kernel OS APIs.</li>
                  <li><strong className="text-white">RAM Memory Breakdown:</strong> System total, used, free, and Node.js process RSS/Heap allocation.</li>
                  <li><strong className="text-white">API Response Time & RPM:</strong> Measured cleanly via Express request middleware.</li>
                  <li><strong className="text-white">Database Pool Health:</strong> Connection utilization, active vs idle pool handles.</li>
                  <li><strong className="text-white">Sync Worker & Google Sheets Backup:</strong> Live status and job queues.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> HOST RESTRICTED METRICS & REASONS
                </h3>
                <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                  <li>
                    <strong className="text-amber-200">Host Disk Filesystem statvfs:</strong>
                    <p className="text-slate-400 text-[11px]">Restricted in standard non-privileged container runtimes to prevent host kernel leaks. Displays clear "Not available on current hosting" badge rather than fake data.</p>
                  </li>
                  <li>
                    <strong className="text-amber-200">System Process Table (ps aux):</strong>
                    <p className="text-slate-400 text-[11px]">Requires full root host access on dedicated VPS/cPanel SSH. Unlocked automatically if transferred to standard VPS.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Alert Thresholds Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                CONFIGURE ALERT THRESHOLDS
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateThresholds} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">CPU Warning (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={thresholds.cpuWarningPercent}
                    onChange={(e) => setThresholds({ ...thresholds, cpuWarningPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">CPU Critical (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={thresholds.cpuCriticalPercent}
                    onChange={(e) => setThresholds({ ...thresholds, cpuCriticalPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">RAM Warning (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={thresholds.ramWarningPercent}
                    onChange={(e) => setThresholds({ ...thresholds, ramWarningPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">RAM Critical (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={thresholds.ramCriticalPercent}
                    onChange={(e) => setThresholds({ ...thresholds, ramCriticalPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Disk Warning (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={thresholds.diskWarningPercent}
                    onChange={(e) => setThresholds({ ...thresholds, diskWarningPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Error Rate Warning (/min)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={thresholds.errorRateWarningPerMin}
                    onChange={(e) => setThresholds({ ...thresholds, errorRateWarningPerMin: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 cursor-pointer"
                >
                  Save Thresholds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
