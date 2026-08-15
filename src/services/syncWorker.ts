/**
 * ============================================================================
 * OFFLINE-FIRST BACKGROUND SYNC WORKER (src/services/syncWorker.ts)
 * High-Resilience Background Sync Manager with Exponential Backoff Retry Strategy
 * Designed for unstable Mobile Hotspot connections & Network Transitions
 * ============================================================================
 */

import {
  markTransactionsAsSynced,
  getAllPendingTransactions,
  getPendingSyncCount,
  overwriteLocalBillWithServer,
  overwriteLocalPurchaseWithServer,
} from './offlineDb';
import { apiUrl } from '../config/api';

export class OfflineSyncWorker {
  private syncIntervalMs: number;
  private maxJitterMs: number;
  private timerId: any = null;
  public isSyncing: boolean = false;
  private retryAttempt: number = 0;
  private maxRetryAttempts: number = 5;
  private baseRetryDelayMs: number = 2000;
  private maxRetryDelayMs: number = 60000;

  constructor() {
    this.syncIntervalMs = 15 * 60 * 1000; // 15 Minutes Base Schedule
    this.maxJitterMs = 5 * 60 * 1000; // 0 to 5 Minutes Random Jitter

    // Initialize lastSyncedAt timestamp in localStorage if not set
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('erp_last_synced_at')) {
      localStorage.setItem('erp_last_synced_at', new Date().toISOString());
    }

    if (typeof window !== 'undefined') {
      this.registerEventListeners();
    }
  }

  // Register Network Online/Offline Listeners
  private registerEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Network Reconnected! Resetting retry count and initiating sync...');
      this.retryAttempt = 0;
      this.scheduleNextSync(1500);
    });

    window.addEventListener('offline', () => {
      console.warn('⚠️ Network Disconnected! Entering Offline-First Queue Mode.');
      this.notifyStatusChange();
    });

    this.scheduleNextSync();
  }

  // Calculate Exponential Backoff Delay with Jitter
  private calculateExponentialBackoffDelay(attempt: number): number {
    const exponentialDelay = this.baseRetryDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 1000);
    return Math.min(this.maxRetryDelayMs, exponentialDelay) + jitter;
  }

  // Schedule next sync run
  public scheduleNextSync(delayMs: number | null = null) {
    if (this.timerId) clearTimeout(this.timerId);

    let totalDelay: number;
    if (delayMs !== null) {
      totalDelay = delayMs;
    } else {
      const jitter = Math.floor(Math.random() * this.maxJitterMs);
      totalDelay = this.syncIntervalMs + jitter;
    }

    this.timerId = setTimeout(() => {
      this.executeSyncProcess();
    }, totalDelay);
  }

  public notifyStatusChange() {
    if (typeof window !== 'undefined') {
      const lastSyncedAt = localStorage.getItem('erp_last_synced_at') || new Date().toISOString();
      getPendingSyncCount().then((count) => {
        window.dispatchEvent(
          new CustomEvent('sync_status_changed', {
            detail: { pendingCount: count, isSyncing: this.isSyncing, retryAttempt: this.retryAttempt, lastSyncedAt },
          })
        );
      });
    }
  }

  // Execute Background Sync Process with Exponential Backoff
  public async executeSyncProcess() {
    if (this.isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    this.notifyStatusChange();

    try {
      const { pendingBills, pendingPurchases } = await getAllPendingTransactions();

      if (pendingBills.length === 0 && pendingPurchases.length === 0) {
        this.isSyncing = false;
        this.retryAttempt = 0;
        this.notifyStatusChange();
        this.scheduleNextSync();
        return;
      }

      const syncPayload = {
        bills: pendingBills,
        purchases: pendingPurchases,
      };

      const jwtToken =
        (typeof localStorage !== 'undefined' && localStorage.getItem('erp_jwt_token')) ||
        '';

      const response = await fetch(apiUrl('/api/sync/transactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': jwtToken ? `Bearer ${jwtToken}` : '',
        },
        body: JSON.stringify(syncPayload),
      });

      if (!response.ok) {
        throw new Error(`Sync HTTP server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success || result.status === 'SUCCESS') {
        const syncedBillUuids = result.syncedBillUuids || pendingBills.map((b) => b.bill_uuid);
        const syncedPurchaseUuids = result.syncedPurchaseUuids || pendingPurchases.map((p) => p.bill_uuid);
        await markTransactionsAsSynced(syncedBillUuids, syncedPurchaseUuids);

        if (result.conflicts && Array.isArray(result.conflicts)) {
          for (const conflict of result.conflicts) {
            if (conflict.type === 'BILL' && conflict.serverData) {
              await overwriteLocalBillWithServer(conflict.serverData);
            } else if (conflict.type === 'PURCHASE' && conflict.serverData) {
              await overwriteLocalPurchaseWithServer(conflict.serverData);
            }
          }
        }

        const nowIso = new Date().toISOString();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('erp_last_synced_at', nowIso);
        }

        this.retryAttempt = 0;
        this.isSyncing = false;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sync_completed', {
              detail: {
                syncedBillsCount: pendingBills.length,
                syncedPurchasesCount: pendingPurchases.length,
                conflictsCount: result.conflicts ? result.conflicts.length : 0,
                syncedAt: nowIso,
              },
            })
          );
        }

        this.notifyStatusChange();
        this.scheduleNextSync();
      } else {
        throw new Error(result.error || 'Server rejected batch sync payload.');
      }
    } catch (error: any) {
      this.isSyncing = false;
      this.retryAttempt++;

      if (this.retryAttempt <= this.maxRetryAttempts) {
        const backoffDelay = this.calculateExponentialBackoffDelay(this.retryAttempt);
        this.scheduleNextSync(backoffDelay);
      } else {
        this.scheduleNextSync();
      }

      this.notifyStatusChange();
    }
  }

  public forceManualSync() {
    this.retryAttempt = 0;
    this.scheduleNextSync(100);
  }
}

export const syncWorker = new OfflineSyncWorker();
