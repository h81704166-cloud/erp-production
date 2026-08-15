import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileCode, Copy, Check, Download, Database, Server, RefreshCw, Key, Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '../common/Badge';

interface ArchitectureDocsData {
  schemaSql?: string;
  serverJs?: string;
  syncWorkerTs?: string;
  envKeys?: string[];
  fetchedAt?: string;
}

export const SystemArchitectureModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'server' | 'sync' | 'env'>('schema');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [docsData, setDocsData] = useState<ArchitectureDocsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArchitectureDocs = async () => {
    setIsLoading(true);
    setError(null);

    const token =
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem('cpanel_master_token') ||
          localStorage.getItem('erp_token') ||
          localStorage.getItem('erp_jwt_token') ||
          localStorage.getItem('erp_server_admin_token'))) ||
      '';

    try {
      const res = await fetch('/api/admin/architecture-docs', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Access Restricted: Super Admin authorization token required to view live server architecture files.');
        }
        throw new Error(`Server error HTTP ${res.status}`);
      }

      const data: ArchitectureDocsData = await res.json();
      setDocsData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch architecture deliverables from server.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArchitectureDocs();
  }, []);

  const getActiveCode = (): string => {
    if (!docsData) {
      if (error) {
        return `-- Authorization Required --\n${error}\n\nPlease authenticate as Super Admin / C-Panel Master to fetch live architecture code files.`;
      }
      return isLoading ? 'Loading live architecture files securely from backend server...' : 'No data loaded.';
    }

    switch (activeTab) {
      case 'schema':
        return docsData.schemaSql || '-- schema.sql not available';
      case 'server':
        return docsData.serverJs || '// server.js not available';
      case 'sync':
        return docsData.syncWorkerTs || '// syncWorker.ts not available';
      case 'env':
        if (docsData.envKeys && docsData.envKeys.length > 0) {
          return `# Sanitized Environment Configuration Keys Schema\n# Sensitive values and raw .env files are omitted for information protection.\n\n${docsData.envKeys.map((k) => `${k}=<SECURED_SERVER_SIDE_ONLY>`).join('\n')}`;
        }
        return '# Environment configuration schema keys not available';
      default:
        return docsData.schemaSql || '';
    }
  };

  const getActiveFilename = () => {
    switch (activeTab) {
      case 'schema':
        return 'schema.sql';
      case 'server':
        return 'server.js';
      case 'sync':
        return 'syncWorker.ts';
      case 'env':
        return 'env_schema_keys.txt';
      default:
        return 'schema.sql';
    }
  };

  const handleCopyCode = () => {
    const code = getActiveCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedTab(activeTab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownloadFile = () => {
    const code = getActiveCode();
    if (!code) return;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getActiveFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-black text-white">System Security Architecture & Deliverables Inspector</h2>
            </div>
            <p className="text-xs text-slate-300 font-medium max-w-2xl">
              Inspect production source deliverables safely from protected server endpoints.
              Server source code is fetched dynamically on demand for Super Admin roles and never bundled into client JavaScript.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="md">SERVER-READ ONLY</Badge>
            <Badge variant="amber" size="md">ZERO CLIENT BUNDLE</Badge>
          </div>
        </div>

        {/* Security Checklist Pills */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-800 text-[11px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>1. Zero Raw Bundle Imports</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. RBAC Endpoint Protected</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>3. Dynamic Server Reads</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>4. Super Admin Restricted</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>5. Sanitized Env Schema</span>
          </div>
        </div>
      </div>

      {/* Security Info & Refresh Banner */}
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                Authorization Restricted
              </h4>
              <p className="text-slate-600 dark:text-slate-300 font-medium mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchArchitectureDocs}
            disabled={isLoading}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Retry Server Fetch</span>
          </button>
        </div>
      )}

      {/* Navigation Tabs for Deliverable Code Files */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>schema.sql (PostgreSQL)</span>
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'server'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>server.js (Express Logic)</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>syncWorker.ts (Background Sync)</span>
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'env'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Sanitized Env Keys</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchArchitectureDocs}
            disabled={isLoading}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Reload from server"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCopyCode}
            disabled={!docsData}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {copiedTab === activeTab ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedTab === activeTab ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownloadFile}
            disabled={!docsData}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download {getActiveFilename()}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Display Box */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[550px] custom-scrollbar shadow-inner relative">
        {docsData?.fetchedAt && (
          <div className="text-[10px] text-slate-500 mb-2 border-b border-slate-800 pb-1 flex justify-between items-center">
            <span>Server Fetch Timestamp: {docsData.fetchedAt}</span>
            <span className="text-emerald-400 font-semibold">🔒 Protected API Endpoint: /api/admin/architecture-docs</span>
          </div>
        )}
        <pre className="whitespace-pre-wrap">{getActiveCode()}</pre>
      </div>
    </div>
  );
};
