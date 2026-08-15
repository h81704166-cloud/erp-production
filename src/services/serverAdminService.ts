/**
 * Server Admin Monitoring & Security API Service
 * Handles Server Admin Authentication, Real-time Metrics, ERP Health,
 * Threshold Alerts, and Audit Logging.
 */

import { apiUrl } from '../config/api';

export interface ServerMetrics {
  timestamp: string;
  environment: {
    hostingType: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    cpusCount: number;
    cpuModel: string;
    uptimeSeconds: number;
    processUptimeSeconds: number;
    containerName: string;
  };
  cpu: {
    usagePercent: number;
    loadAvg: [number, number, number];
    processCpuPercent: number;
  };
  ram: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    usagePercent: number;
    processRssMB: number;
    processHeapTotalMB: number;
    processHeapUsedMB: number;
  };
  disk: {
    available: boolean;
    totalGB?: number;
    usedGB?: number;
    freeGB?: number;
    usagePercent?: number;
    reasonIfNotAvailable?: string;
  };
  network: {
    available: boolean;
    rxBytesPerSec: number;
    txBytesPerSec: number;
    rxKBPerSec: number;
    txKBPerSec: number;
  };
  database: {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxPoolLimit: number;
    utilizationPercent: number;
    lastQueryError?: string;
  };
  api: {
    totalRequests: number;
    requestsPerMin: number;
    avgResponseTimeMs: number;
    errorRatePerMin: number;
    lastErrorTimestamp?: string;
    lastErrorMessage?: string;
  };
  businessAndJobs: {
    activeUsersCount: number;
    activeTenantsCount: number;
    pendingSyncJobsCount: number;
    failedSyncJobsCount: number;
    syncWorkerStatus: 'RUNNING' | 'STOPPED' | 'PAUSED';
    fifteenMinSyncStatus: 'HEALTHY' | 'DELAYED' | 'FAILED';
    googleSheetsBackupStatus: 'HEALTHY' | 'DELAYED' | 'FAILED';
    lastSuccessfulSyncAt?: string;
    lastSuccessfulBackupAt?: string;
  };
}

export interface MetricHistoryPoint {
  timestamp: string;
  timeLabel: string;
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  networkKbSec: number;
  avgResponseTimeMs: number;
  errorRate: number;
  rpm: number;
}

export interface AlertThresholds {
  cpuWarningPercent: number;
  cpuCriticalPercent: number;
  ramWarningPercent: number;
  ramCriticalPercent: number;
  diskWarningPercent: number;
  diskCriticalPercent: number;
  dbPoolWarningPercent: number;
  errorRateWarningPerMin: number;
}

export interface AlertItem {
  id: string;
  type: 'CPU' | 'RAM' | 'DISK' | 'DB' | 'ERROR_RATE';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  currentValue: number;
  thresholdValue: number;
}

export interface ServerAdminAuditLog {
  id: string;
  timestamp: string;
  action: string;
  adminEmail: string;
  ip: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  details?: string;
}

export interface ErpHealthReport {
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  api: 'Healthy' | 'Degraded' | 'Down';
  database: 'Healthy' | 'Degraded' | 'Down';
  syncWorker: 'Running' | 'Stopped' | 'Paused';
  fifteenMinSync: 'Healthy' | 'Delayed' | 'Failed';
  googleSheetsBackup: 'Healthy' | 'Delayed' | 'Failed';
  backgroundJobs: {
    pending: number;
    failed: number;
    processedTotal: number;
  };
  lastSuccessfulSync: string | null;
  lastSuccessfulBackup: string | null;
  lastApplicationError: string | null;
}

const SERVER_ADMIN_TOKEN_KEY = 'erp_server_admin_token';
const SERVER_ADMIN_USER_KEY = 'erp_server_admin_user';

export class ServerAdminService {
  /**
   * Check if client has an active server admin token
   */
  static isAuthenticated(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const token = localStorage.getItem(SERVER_ADMIN_TOKEN_KEY);
    return !!token && token.length > 10;
  }

  /**
   * Get cached Server Admin email
   */
  static getAdminEmail(): string {
    if (typeof localStorage === 'undefined') return 'sysadmin@billkart.shop';
    return localStorage.getItem(SERVER_ADMIN_USER_KEY) || 'sysadmin@billkart.shop';
  }

  /**
   * Get Server Admin Token
   */
  static getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(SERVER_ADMIN_TOKEN_KEY);
  }

  /**
   * Authenticate Server Admin with Email & Password
   */
  static async login(email: string, password: string, totpCode?: string): Promise<{ success: boolean; token?: string; error?: string; remainingSeconds?: number }> {
    try {
      const response = await fetch(apiUrl('/api/server-admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Server Admin Authentication Failed',
          remainingSeconds: data.remainingSeconds,
        };
      }

      if (data.token) {
        localStorage.setItem(SERVER_ADMIN_TOKEN_KEY, data.token);
        localStorage.setItem(SERVER_ADMIN_USER_KEY, email);
      }

      return { success: true, token: data.token };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during server admin login' };
    }
  }

  /**
   * Logout Server Admin
   */
  static async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(apiUrl('/api/server-admin/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (_) {}
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SERVER_ADMIN_TOKEN_KEY);
      localStorage.removeItem(SERVER_ADMIN_USER_KEY);
    }
  }

  /**
   * Fetch Live Server Metrics
   */
  static async fetchMetrics(): Promise<ServerMetrics> {
    const token = this.getToken();
    const response = await fetch(apiUrl('/api/server-admin/metrics'), {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.logout();
        throw new Error('UNAUTHORIZED_SERVER_ADMIN');
      }
      throw new Error(`Failed to fetch server metrics (${response.status})`);
    }

    return await response.json();
  }

  /**
   * Fetch Historical Metric Graphs Data (1h / 6h / 24h)
   */
  static async fetchHistory(timeframe: '1h' | '6h' | '24h'): Promise<MetricHistoryPoint[]> {
    const token = this.getToken();
    const response = await fetch(apiUrl(`/api/server-admin/history?timeframe=${timeframe}`), {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch metric history');
    }

    const data = await response.json();
    return data.history || [];
  }

  /**
   * Fetch ERP Health Report
   */
  static async fetchHealthReport(): Promise<ErpHealthReport> {
    const token = this.getToken();
    const response = await fetch(apiUrl('/api/server-admin/health'), {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ERP health report');
    }

    return await response.json();
  }

  /**
   * Fetch Threshold Alerts
   */
  static async fetchAlerts(): Promise<{ thresholds: AlertThresholds; activeAlerts: AlertItem[] }> {
    const token = this.getToken();
    const response = await fetch(apiUrl('/api/server-admin/alerts'), {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch threshold alerts');
    }

    return await response.json();
  }

  /**
   * Update Alert Threshold Configurations
   */
  static async updateThresholds(thresholds: Partial<AlertThresholds>): Promise<AlertThresholds> {
    const token = this.getToken();
    const response = await fetch(apiUrl('/api/server-admin/alerts/config'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify(thresholds),
    });

    if (!response.ok) {
      throw new Error('Failed to update alert thresholds');
    }

    const data = await response.json();
    return data.thresholds;
  }

  /**
   * Fetch Server Admin Audit Logs
   */
  static async fetchAuditLogs(): Promise<ServerAdminAuditLog[]> {
    const token = this.getToken();
    const response = await fetch(apiUrl('/api/server-admin/audit-logs'), {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch server admin audit logs');
    }

    const data = await response.json();
    return data.auditLogs || [];
  }
}
