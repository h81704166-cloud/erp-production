import Dexie, { Table } from 'dexie';

export interface OfflineBillItem {
  productId: string;
  productName: string;
  hsnCode?: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
  taxableAmount: number;
  totalAmount: number;
}

export interface OfflineBill {
  bill_uuid: string; // Unique UUID for idempotency
  company_id: string;
  counter_id?: string;
  counter_name?: string;
  shift_id?: string;
  invoice_no: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_gstin?: string;
  subtotal: number;
  discount_amount?: number;
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_mode: string;
  items: OfflineBillItem[];
  billed_by_user_id?: string;
  billed_at: string;
  updated_at?: string; // Timestamp for Last-Write-Wins conflict resolution
  sync_status: 'PENDING' | 'SYNCED' | 'CONFLICT_RESOLVED';
  synced_at?: string;
}

export interface OfflinePurchaseItem {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
  gstRate: number;
  totalAmount: number;
}

export interface OfflinePurchase {
  bill_uuid: string; // Unique UUID for idempotency
  company_id: string;
  purchase_no: string;
  vendor_id?: string;
  vendor_name: string;
  vendor_gstin?: string;
  subtotal: number;
  total_tax: number;
  grand_total: number;
  paid_amount: number;
  payment_mode: string;
  items: OfflinePurchaseItem[];
  purchased_at: string;
  updated_at?: string; // Timestamp for Last-Write-Wins conflict resolution
  sync_status: 'PENDING' | 'SYNCED' | 'CONFLICT_RESOLVED';
  synced_at?: string;
}

export interface OfflineShift {
  id: string;
  company_id: string;
  counter_id: string;
  counter_name: string;
  cashier_name: string;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
  sync_status: 'PENDING' | 'SYNCED';
  updated_at: string;
}

export class ERPLocalDatabase extends Dexie {
  pendingBills!: Table<OfflineBill, string>;
  pendingPurchases!: Table<OfflinePurchase, string>;
  shifts!: Table<OfflineShift, string>;

  constructor() {
    super('SecureLocalERP_DexieDB');
    this.version(1).stores({
      pendingBills: 'bill_uuid, company_id, sync_status, invoice_no, billed_at',
      pendingPurchases: 'bill_uuid, company_id, sync_status, purchase_no, purchased_at',
    });
    this.version(2).stores({
      pendingBills: 'bill_uuid, company_id, sync_status, invoice_no, billed_at, updated_at',
      pendingPurchases: 'bill_uuid, company_id, sync_status, purchase_no, purchased_at, updated_at',
    });
    this.version(3).stores({
      pendingBills: 'bill_uuid, company_id, sync_status, invoice_no, counter_id, billed_at, updated_at',
      pendingPurchases: 'bill_uuid, company_id, sync_status, purchase_no, purchased_at, updated_at',
      shifts: 'id, company_id, counter_id, status, sync_status, opened_at, updated_at',
    });
  }
}

export const offlineDb = new ERPLocalDatabase();

// Request browser persistent storage on app startup
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[PERSISTENT STORAGE] Granted: ${isPersisted}`);
      return isPersisted;
    } catch (err) {
      console.warn('[PERSISTENT STORAGE] Could not request persistence:', err);
      return false;
    }
  }
  return false;
}

// Client-side math calculation utility
export function calculateBillTotals(
  items: Array<{ qty: number; unitPrice: number; gstRate: number }>,
  discountPercentage: number = 0,
  isInterstate: boolean = false
) {
  let subtotal = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const itemCalculations = items.map((item) => {
    const rawTotal = item.qty * item.unitPrice;
    subtotal += rawTotal;

    const gstRate = item.gstRate || 0;
    const taxableAmount = +(rawTotal / (1 + gstRate / 100)).toFixed(2);
    const taxAmount = +(rawTotal - taxableAmount).toFixed(2);

    if (isInterstate) {
      totalIgst += taxAmount;
    } else {
      totalCgst += +(taxAmount / 2).toFixed(2);
      totalSgst += +(taxAmount / 2).toFixed(2);
    }

    totalTaxable += taxableAmount;

    return {
      ...item,
      taxableAmount,
      totalAmount: rawTotal,
    };
  });

  const discountAmount = +((subtotal * discountPercentage) / 100).toFixed(2);
  const grandTotal = Math.round(subtotal - discountAmount);

  return {
    subtotal: +subtotal.toFixed(2),
    discountAmount,
    totalTaxable: +totalTaxable.toFixed(2),
    totalCgst: +totalCgst.toFixed(2),
    totalSgst: +totalSgst.toFixed(2),
    totalIgst: +totalIgst.toFixed(2),
    grandTotal,
    items: itemCalculations,
  };
}

// Save pending bill locally to IndexedDB without duplicate entries
export async function saveOfflineBill(bill: Omit<OfflineBill, 'sync_status'>): Promise<OfflineBill> {
  const now = new Date().toISOString();
  let targetUuid = bill.bill_uuid;

  // Deduplication check: verify if an entry with the same invoice_no and company_id already exists in Dexie
  if (bill.invoice_no && bill.company_id) {
    try {
      const existing = await offlineDb.pendingBills
        .where('invoice_no')
        .equals(bill.invoice_no)
        .first();
      if (existing && existing.company_id === bill.company_id) {
        targetUuid = existing.bill_uuid;
      }
    } catch (err) {
      console.warn('[OFFLINE DB] Deduplication check fallback:', err);
    }
  }

  const fullBill: OfflineBill = {
    ...bill,
    bill_uuid: targetUuid,
    updated_at: bill.updated_at || bill.billed_at || now,
    sync_status: 'PENDING',
  };
  await offlineDb.pendingBills.put(fullBill);
  console.log(`[OFFLINE DB] Saved bill ${fullBill.bill_uuid} (${fullBill.invoice_no}) to IndexedDB without duplicates.`);
  return fullBill;
}

// Save pending purchase locally to IndexedDB without duplicate entries
export async function saveOfflinePurchase(purchase: Omit<OfflinePurchase, 'sync_status'>): Promise<OfflinePurchase> {
  const now = new Date().toISOString();
  let targetUuid = purchase.bill_uuid;

  // Deduplication check: verify if an entry with the same purchase_no and company_id already exists in Dexie
  if (purchase.purchase_no && purchase.company_id) {
    try {
      const existing = await offlineDb.pendingPurchases
        .where('purchase_no')
        .equals(purchase.purchase_no)
        .first();
      if (existing && existing.company_id === purchase.company_id) {
        targetUuid = existing.bill_uuid;
      }
    } catch (err) {
      console.warn('[OFFLINE DB] Deduplication check fallback:', err);
    }
  }

  const fullPurchase: OfflinePurchase = {
    ...purchase,
    bill_uuid: targetUuid,
    updated_at: purchase.updated_at || purchase.purchased_at || now,
    sync_status: 'PENDING',
  };
  await offlineDb.pendingPurchases.put(fullPurchase);
  console.log(`[OFFLINE DB] Saved purchase ${fullPurchase.bill_uuid} (${fullPurchase.purchase_no}) to IndexedDB without duplicates.`);
  return fullPurchase;
}

// Overwrite local bill with newer server state during Last-Write-Wins conflict resolution
export async function overwriteLocalBillWithServer(serverBill: OfflineBill): Promise<void> {
  await offlineDb.pendingBills.put({
    ...serverBill,
    sync_status: 'SYNCED',
    synced_at: new Date().toISOString(),
  });
  console.log(`[OFFLINE DB] Resolved Conflict: Local bill ${serverBill.bill_uuid} overwritten by newer server record.`);
}

// Overwrite local purchase with newer server state during Last-Write-Wins conflict resolution
export async function overwriteLocalPurchaseWithServer(serverPurchase: OfflinePurchase): Promise<void> {
  await offlineDb.pendingPurchases.put({
    ...serverPurchase,
    sync_status: 'SYNCED',
    synced_at: new Date().toISOString(),
  });
  console.log(`[OFFLINE DB] Resolved Conflict: Local purchase ${serverPurchase.bill_uuid} overwritten by newer server record.`);
}

// Get count of pending items
export async function getPendingSyncCount(): Promise<number> {
  try {
    const pendingBillsCount = await offlineDb.pendingBills.where('sync_status').equals('PENDING').count();
    const pendingPurchasesCount = await offlineDb.pendingPurchases.where('sync_status').equals('PENDING').count();
    return pendingBillsCount + pendingPurchasesCount;
  } catch (err) {
    console.warn('Error counting pending sync items:', err);
    return 0;
  }
}

// Get all pending bills & purchases
export async function getAllPendingTransactions() {
  const pendingBills = await offlineDb.pendingBills.where('sync_status').equals('PENDING').toArray();
  const pendingPurchases = await offlineDb.pendingPurchases.where('sync_status').equals('PENDING').toArray();
  return { pendingBills, pendingPurchases };
}

// Mark bills as synced
export async function markTransactionsAsSynced(syncedBillUuids: string[], syncedPurchaseUuids: string[]) {
  const now = new Date().toISOString();
  await offlineDb.transaction('rw', [offlineDb.pendingBills, offlineDb.pendingPurchases], async () => {
    for (const uuid of syncedBillUuids) {
      await offlineDb.pendingBills.update(uuid, { sync_status: 'SYNCED', synced_at: now });
    }
    for (const uuid of syncedPurchaseUuids) {
      await offlineDb.pendingPurchases.update(uuid, { sync_status: 'SYNCED', synced_at: now });
    }
  });
}
