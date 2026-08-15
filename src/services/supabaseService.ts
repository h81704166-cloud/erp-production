import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ERPDatabase } from './db';

const envVars = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const STORAGE_KEYS = {
  URL: 'erp_supabase_url',
  KEY: 'erp_supabase_anon_key',
  UUID_MAP: 'erp_supabase_uuid_map',
};

export function getSupabaseCredentials(): { url: string; key: string } {
  let url = '';
  let key = '';
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    url = localStorage.getItem(STORAGE_KEYS.URL) || '';
    key = localStorage.getItem(STORAGE_KEYS.KEY) || '';
  }
  if (!url) url = envVars.VITE_SUPABASE_URL || '';
  if (!key) key = envVars.VITE_SUPABASE_ANON_KEY || '';
  return { url: url.trim(), key: key.trim() };
}

export function saveSupabaseCredentials(url: string, key: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.URL, url.trim());
    localStorage.setItem(STORAGE_KEYS.KEY, key.trim());
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export const supabase = getSupabaseClient();

// ============================================================================
// STABLE UUID MAPPING MECHANISM
// ============================================================================

const IS_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inMemoryUuidMap: Record<string, string> = {};

function getUuidMap(): Record<string, string> {
  if (Object.keys(inMemoryUuidMap).length === 0 && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.UUID_MAP);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(inMemoryUuidMap, parsed);
      }
    } catch {
      // ignore
    }
  }
  return inMemoryUuidMap;
}

function saveUuidMap(map: Record<string, string>): void {
  Object.assign(inMemoryUuidMap, map);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.UUID_MAP, JSON.stringify(inMemoryUuidMap));
    } catch {
      // ignore
    }
  }
}

/**
 * Converts any local string ID (e.g. 'comp-001', 'sale-101') into a stable UUID.
 * - If already a valid UUID format, returns as-is.
 * - If mapped in localStorage, returns the previously generated UUID.
 * - Otherwise generates a new UUID, saves it to localStorage mapping, and returns it.
 */
export function toUUID(localId?: string | null): string | null {
  if (!localId || typeof localId !== 'string') return null;
  const trimmed = localId.trim();
  if (!trimmed) return null;

  if (IS_UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  const map = getUuidMap();
  if (map[trimmed] && IS_UUID_REGEX.test(map[trimmed])) {
    return map[trimmed];
  }

  let newUuid = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    newUuid = crypto.randomUUID();
  } else {
    newUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  map[trimmed] = newUuid;
  saveUuidMap(map);
  return newUuid;
}

// Helpers for schema enums
const mapPaymentMode = (pm?: string) => {
  if (!pm) return 'cash';
  const l = pm.toLowerCase();
  if (l.includes('card')) return 'card';
  if (l.includes('bank') || l.includes('netbanking')) return 'bank_transfer';
  if (l.includes('khata') || l.includes('credit')) return 'khata_credit';
  if (l.includes('paytm')) return 'upi_paytm';
  if (l.includes('phonepe')) return 'upi_phonepe';
  if (l.includes('upi')) return 'upi_paytm';
  return 'cash';
};

const mapUserRole = (r?: string) => {
  if (r === 'super_admin' || r === 'owner' || r === 'admin') return 'super_admin';
  if (r === 'manager') return 'manager';
  if (r === 'stock_keeper') return 'stock_keeper';
  return 'cashier';
};

/**
 * NOTE: Direct client-side Supabase sync with anon key was DEPRECATED and REMOVED.
 * All database operations are strictly routed through server.js using JWT authenticated
 * endpoints (/api/bills/sync, /api/sync/transactions, /api/backup/server/sync) which set
 * SET LOCAL app.current_company_id = ... via executeTenantQuery() for strict RLS policy compliance.
 */

