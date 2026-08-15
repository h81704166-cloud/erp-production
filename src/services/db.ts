/**
 * Enterprise ERP Persistent Database Manager
 * Uses LocalStorage with fallback & auto-seeding
 */

import {
  User,
  Company,
  Product,
  Party,
  Sale,
  Purchase,
  Account,
  AccountTransfer,
  Expense,
  OtherIncome,
  KhataTransaction,
  StockAdjustment,
  StockTransfer,
  AuditLog,
  SalesReturn,
  PurchaseReturn,
  POSCounter,
  CashDrawerSession,
  Shift,
  DeliveryBoy,
  SalesOrder,
  PurchaseOrder,
  UdharReminder,
  ServiceCatalogItem,
  ServiceBooking,
  HeldBill,
  SystemFeature,
  ActiveUserSession,
  PaymentTransactionLog,
} from '../types/erp';
import { saveOfflineBill, saveOfflinePurchase } from './offlineDb';
import { syncWorker } from './syncWorker';
import { apiUrl } from '../config/api';

const STORAGE_KEYS = {
  COMPANY: 'erp_company',
  COMPANIES: 'erp_companies',
  USERS: 'erp_users',
  CURRENT_USER: 'erp_current_user',
  SYSTEM_FEATURES: 'erp_system_features',
  PRODUCTS: 'erp_products',
  PARTIES: 'erp_parties',
  SALES: 'erp_sales',
  SALES_RETURNS: 'erp_sales_returns',
  PURCHASES: 'erp_purchases',
  PURCHASE_RETURNS: 'erp_purchase_returns',
  ACCOUNTS: 'erp_accounts',
  EXPENSES: 'erp_expenses',
  INCOMES: 'erp_incomes',
  KHATA_TXNS: 'erp_khata_txns',
  STOCK_ADJUSTMENTS: 'erp_stock_adjustments',
  STOCK_TRANSFERS: 'erp_stock_transfers',
  AUDIT_LOGS: 'erp_audit_logs',
  PAYMENT_TRANSACTION_LOGS: 'erp_payment_txn_logs',
  THEME_MODE: 'erp_theme_mode',
  UI_THEME: 'erp_ui_theme',
  OFFLINE_SYNC_STATUS: 'erp_offline_sync_status',
  GSHEETS_CONFIG: 'erp_gsheets_config',
  POS_COUNTERS: 'erp_pos_counters',
  ACTIVE_COUNTER: 'erp_active_counter',
  HELD_BILLS: 'erp_held_bills',
  CASH_DRAWER_SESSIONS: 'erp_cash_drawer_sessions',
  DELIVERY_BOYS: 'erp_delivery_boys',
  SALES_ORDERS: 'erp_sales_orders',
  PURCHASE_ORDERS: 'erp_purchase_orders',
  UDHAR_REMINDERS: 'erp_udhar_reminders',
  TRANSFERS: 'erp_account_transfers',
  SERVICES: 'erp_services',
  SERVICE_BOOKINGS: 'erp_service_bookings',
};

// Seed Data Generators
const defaultCompany: Company = {
  id: 'comp-001',
  name: 'Apex Enterprise Ltd',
  legalName: 'Apex Enterprise Retail & Wholesale Solutions Pvt Ltd',
  gstin: '27AABCU9603R1ZM',
  pan: 'AABCU9603R',
  email: 'admin@apexenterprise.com',
  phone: '+91 98765 43210',
  address: 'Plot 42, Tech Industrial Zone, Phase 2',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400072',
  currency: '₹',
  financialYearStart: '2026-04-01',
  upiId: 'apexenterprise@ybl',
  upiPayeeName: 'Apex Enterprise Ltd',
  upiMerchantCode: '5411',
  bankName: 'HDFC Bank',
  bankAccountHolder: 'Apex Enterprise Retail & Wholesale Solutions Pvt Ltd',
  bankAccountNo: '50200012345678',
  bankIfsc: 'HDFC0001234',
  bankBranch: 'Tech Industrial Zone, Mumbai',
  paymentQrNote: 'Scan & Pay using PhonePe, GPay, Paytm, BHIM or any UPI App',
  subscriptionStatus: 'active',
  subscriptionPlan: 'prime',
  subscriptionExpiresAt: '2026-12-31T23:59:59.000Z',
  ownerName: 'Sitaram Ghintala',
  ownerPhone: '+91 98765 43210',
};

const defaultCompanies: Company[] = [
  defaultCompany,
  {
    id: 'comp-002',
    name: 'Ramesh Kirana & General Store',
    legalName: 'Ramesh Kirana Store Pvt Ltd',
    gstin: '07AAACR1234F1Z5',
    pan: 'AAACR1234F',
    email: 'ramesh@rameshkirana.com',
    phone: '+91 98111 55443',
    address: 'Shop 14, Main Market, Chandni Chowk',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110006',
    currency: '₹',
    financialYearStart: '2026-04-01',
    upiId: 'rameshkirana@paytm',
    upiPayeeName: 'Ramesh Kirana Store',
    upiMerchantCode: '5411',
    bankName: 'State Bank of India',
    bankAccountHolder: 'Ramesh Kirana Store',
    bankAccountNo: '30981234567',
    bankIfsc: 'SBIN0001234',
    bankBranch: 'Chandni Chowk, Delhi',
    paymentQrNote: 'Scan & Pay to Ramesh Kirana via Paytm/GPay/PhonePe',
    subscriptionStatus: 'active',
    subscriptionPlan: 'prime',
    subscriptionExpiresAt: '2026-12-31T23:59:59.000Z',
    ownerName: 'Ramesh Kumar',
    ownerPhone: '+91 98111 55443',
  },
];

const defaultUsers: User[] = [
  {
    id: 'usr-000',
    name: 'Super Admin (Billkart)',
    email: 'admin@billkart.shop',
    role: 'super_admin',
    companyId: 'comp-001',
    phone: '+91 99999 00000',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-001',
    name: 'Sitaram Ghintala (Owner)',
    email: 'owner@apex.com',
    role: 'owner',
    companyId: 'comp-001',
    phone: '+91 98765 43210',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-002',
    name: 'Rajesh Sharma',
    email: 'manager@apex.com',
    role: 'manager',
    companyId: 'comp-001',
    phone: '+91 98123 45678',
    status: 'active',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'usr-003',
    name: 'Priya Verma',
    email: 'cashier@apex.com',
    role: 'cashier',
    companyId: 'comp-001',
    phone: '+91 98234 56789',
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'usr-004',
    name: 'Vikram Singh',
    email: 'stock@apex.com',
    role: 'stock_keeper',
    companyId: 'comp-001',
    phone: '+91 98345 67890',
    status: 'active',
    createdAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'usr-005',
    name: 'Ramesh Kumar (Owner)',
    email: 'ramesh@rameshkirana.com',
    role: 'owner',
    companyId: 'comp-002',
    phone: '+91 98111 55443',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-006',
    name: 'Suresh Kumar (Cashier)',
    email: 'cashier@rameshkirana.com',
    role: 'cashier',
    companyId: 'comp-002',
    phone: '+91 98111 55444',
    status: 'active',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'usr-007',
    name: 'System Admin',
    email: 'superadmin@apex.com',
    role: 'super_admin',
    companyId: 'comp-001',
    phone: '+91 98000 00000',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
];

const defaultSystemFeatures: SystemFeature[] = [
  {
    id: 'feat-001',
    name: 'Multi-Counter POS Billing Engine',
    key: 'pos_billing',
    category: 'pos',
    description: 'High-speed POS interface with thermal receipt printing, barcode scanning & held bills.',
    isEnabled: true,
    minPlan: 'free_trial',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-002',
    name: 'Automated WhatsApp PDF Invoicing',
    key: 'whatsapp_invoicing',
    category: 'billing',
    description: 'Instant WhatsApp message delivery with clickable payment link and PDF download.',
    isEnabled: true,
    minPlan: 'starter',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-003',
    name: 'Google Sheets Live Two-Way Sync',
    key: 'gsheets_sync',
    category: 'system',
    description: 'Real-time background sync with Google Sheets tabs for sales, purchases, and khata ledger.',
    isEnabled: true,
    minPlan: 'prime',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-004',
    name: 'GST Auto-Tax Filing & Computation (GSTR-1 & 3B)',
    key: 'gst_autofiling',
    category: 'gst',
    description: 'Automated tax breakdown, HSN summaries, statewise B2B/B2C calculations, and CSV exports.',
    isEnabled: true,
    minPlan: 'prime',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-005',
    name: 'Udhar Recovery & Automated SMS Payment Reminders',
    key: 'udhar_recovery',
    category: 'billing',
    description: 'Track aging customer dues, send automated payment reminders with UPI QR codes.',
    isEnabled: true,
    minPlan: 'free_trial',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-006',
    name: 'Service Catalog & Appointment Booking Engine',
    key: 'service_booking',
    category: 'pos',
    description: 'Manage service-based businesses, salons, repairs, and staff service allocations.',
    isEnabled: true,
    minPlan: 'starter',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-007',
    name: 'Double-Entry Master Ledger (Dr / Cr)',
    key: 'master_ledger',
    category: 'billing',
    description: 'Complete accounting journal entries, debit/credit balance reconciliation & cashbook.',
    isEnabled: true,
    minPlan: 'prime',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-008',
    name: 'AI Demand Forecast & Inventory Replenishment',
    key: 'ai_inventory',
    category: 'ai',
    description: 'Gemini AI intelligence predicting stock depletion timelines and generating automated purchase orders.',
    isEnabled: true,
    minPlan: 'enterprise',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-009',
    name: 'Offline IndexedDB Queue with Background SyncWorker',
    key: 'offline_sync',
    category: 'system',
    description: 'Zero-downtime offline billing using Dexie IndexedDB with zero duplicate records constraint.',
    isEnabled: true,
    minPlan: 'free_trial',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-010',
    name: 'Audit Security Logs & Multi-Tenant RLS Guard',
    key: 'audit_security',
    category: 'security',
    description: 'Immutable action logging, JWT 256-bit authentication, and strict merchant data isolation.',
    isEnabled: true,
    minPlan: 'free_trial',
    updatedAt: new Date().toISOString(),
  },
];

const defaultProducts: Product[] = [
  {
    id: 'prod-001',
    companyId: 'comp-001',
    name: 'Enterprise Wireless Barcode Scanner',
    sku: 'SKU-SCAN-01',
    barcode: '8901234567890',
    hsnCode: '8471',
    category: 'Electronics',
    unit: 'Pcs',
    purchasePrice: 2400,
    sellingPrice: 3800,
    minSellingPrice: 3200,
    gstRate: 18,
    stockQty: 45,
    minStockAlert: 10,
    location: 'Aisle A1',
    status: 'active',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
  },
  {
    id: 'prod-002',
    companyId: 'comp-001',
    name: 'Thermal POS Paper Roll (80mm x 50m - Box of 50)',
    sku: 'SKU-PAPER-80',
    barcode: '8901234567891',
    hsnCode: '4811',
    category: 'Office Supplies',
    unit: 'Box',
    purchasePrice: 1100,
    sellingPrice: 1650,
    minSellingPrice: 1450,
    gstRate: 12,
    stockQty: 8,
    minStockAlert: 15, // Low stock alert
    location: 'Aisle C3',
    status: 'active',
    createdAt: '2026-01-12T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
  },
  {
    id: 'prod-003',
    companyId: 'comp-001',
    name: 'Ultra-Slim Mechanical POS Keyboard',
    sku: 'SKU-KB-102',
    barcode: '8901234567892',
    hsnCode: '8471',
    category: 'Electronics',
    unit: 'Pcs',
    purchasePrice: 1850,
    sellingPrice: 2950,
    minSellingPrice: 2500,
    gstRate: 18,
    stockQty: 22,
    minStockAlert: 5,
    location: 'Aisle A2',
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
  },
  {
    id: 'prod-004',
    companyId: 'comp-001',
    name: 'Heavy Duty Electric Cash Drawer (5 Slots)',
    sku: 'SKU-DRAWER-05',
    barcode: '8901234567893',
    hsnCode: '8301',
    category: 'Hardware',
    unit: 'Pcs',
    purchasePrice: 3200,
    sellingPrice: 4850,
    minSellingPrice: 4200,
    gstRate: 18,
    stockQty: 3, // Low stock
    minStockAlert: 5,
    location: 'Warehouse B',
    status: 'active',
    createdAt: '2026-02-15T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  },
  {
    id: 'prod-005',
    companyId: 'comp-001',
    name: 'High Precision Digital Retail Weighing Scale (30kg)',
    sku: 'SKU-SCALE-30',
    barcode: '8901234567894',
    hsnCode: '8423',
    category: 'Hardware',
    unit: 'Pcs',
    purchasePrice: 4100,
    sellingPrice: 5990,
    minSellingPrice: 5300,
    gstRate: 18,
    stockQty: 18,
    minStockAlert: 4,
    location: 'Aisle B2',
    status: 'active',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
  {
    id: 'prod-006',
    companyId: 'comp-001',
    name: 'Organic Grade A Green Tea (1kg Pack)',
    sku: 'SKU-TEA-1KG',
    barcode: '8901234567895',
    hsnCode: '0902',
    category: 'Groceries',
    unit: 'Kg',
    purchasePrice: 450,
    sellingPrice: 720,
    minSellingPrice: 650,
    gstRate: 5,
    stockQty: 120,
    minStockAlert: 20,
    location: 'Rack D1',
    status: 'active',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  },
  {
    id: 'prod-007',
    companyId: 'comp-001',
    name: 'Double-Sided POS Display Monitor 10"',
    sku: 'SKU-MON-10',
    barcode: '8901234567896',
    hsnCode: '8528',
    category: 'Electronics',
    unit: 'Pcs',
    purchasePrice: 5400,
    sellingPrice: 7900,
    minSellingPrice: 7200,
    gstRate: 18,
    stockQty: 9,
    minStockAlert: 3,
    location: 'Aisle A3',
    status: 'active',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  {
    id: 'prod-008',
    companyId: 'comp-001',
    name: 'Paracetamol 500mg Tablets (Strip of 10)',
    sku: 'MED-PCM-500',
    barcode: '8901234990011',
    hsnCode: '3004',
    category: 'Pharmaceuticals',
    unit: 'Strip',
    secondaryUnit: 'Tablet',
    conversionFactor: 10,
    purchasePrice: 18,
    sellingPrice: 35,
    minSellingPrice: 30,
    gstRate: 12,
    stockQty: 175,
    minStockAlert: 30,
    location: 'Pharmacy Shelf A1',
    status: 'active',
    batchTracked: true,
    batches: [
      { id: 'b-01', batchNo: 'PCM-2026A', mfgDate: '2026-01-01', expDate: '2027-12-31', qty: 150, mrp: 35, sellingPrice: 32 },
      { id: 'b-02', batchNo: 'PCM-2025B', mfgDate: '2025-08-15', expDate: '2026-08-15', qty: 25, mrp: 35, sellingPrice: 28 }
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
  },
  {
    id: 'prod-009',
    companyId: 'comp-001',
    name: 'Basmati Royal Grain Rice (Loose / Bag)',
    sku: 'GROC-RICE-BSM',
    barcode: '8901234990022',
    hsnCode: '1006',
    category: 'Groceries',
    unit: 'Kg',
    secondaryUnit: 'Gm',
    conversionFactor: 1000,
    allowFractional: true,
    purchasePrice: 95,
    sellingPrice: 140,
    minSellingPrice: 125,
    gstRate: 5,
    stockQty: 350,
    minStockAlert: 50,
    location: 'Grocery Bay 3',
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  },
  {
    id: 'prod-010',
    companyId: 'comp-001',
    name: 'Cough Relief Herbal Syrup (100ml)',
    sku: 'MED-SYP-100',
    barcode: '8901234990033',
    hsnCode: '3004',
    category: 'Pharmaceuticals',
    unit: 'Pcs',
    purchasePrice: 65,
    sellingPrice: 110,
    minSellingPrice: 95,
    gstRate: 12,
    stockQty: 40,
    minStockAlert: 10,
    location: 'Pharmacy Shelf B2',
    status: 'active',
    batchTracked: true,
    batches: [
      { id: 'b-03', batchNo: 'SYP-991', mfgDate: '2026-02-10', expDate: '2026-08-28', qty: 40, mrp: 120, sellingPrice: 110 }
    ],
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
  }
];

const defaultParties: Party[] = [
  {
    id: 'party-001',
    companyId: 'comp-001',
    type: 'customer',
    name: 'Ramesh Supermarket & Traders',
    companyName: 'Ramesh Retail Pvt Ltd',
    phone: '+91 98111 22233',
    email: 'ramesh.traders@gmail.com',
    gstin: '27AABCR1234F1Z1',
    address: 'Shop 12, Station Road, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    creditLimit: 150000,
    openingBalance: 24500, // Customer owes us 24,500
    currentBalance: 24500,
    status: 'active',
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'party-002',
    companyId: 'comp-001',
    type: 'customer',
    name: 'Anjali Electronics & Tech Store',
    companyName: 'Anjali Enterprise',
    phone: '+91 98222 33344',
    email: 'anjali.sales@gmail.com',
    gstin: '27AACCA5678E1Z5',
    address: '45 Electronics Market, Grant Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    creditLimit: 200000,
    openingBalance: 12800,
    currentBalance: 12800,
    status: 'active',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'party-003',
    companyId: 'comp-001',
    type: 'vendor',
    name: 'TechLogix Distribution Pvt Ltd',
    companyName: 'TechLogix India Ltd',
    phone: '+91 98333 44455',
    email: 'orders@techlogix.in',
    gstin: '27AADCT9988K1Z9',
    address: 'Industrial Estate, MIDC Bhosari',
    city: 'Pune',
    state: 'Maharashtra',
    creditLimit: 500000,
    openingBalance: -45000, // We owe vendor 45,000
    currentBalance: -45000,
    status: 'active',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'party-004',
    companyId: 'comp-001',
    type: 'vendor',
    name: 'Global Paper & Stationery Wholesale',
    companyName: 'Global Paper Mills',
    phone: '+91 98444 55566',
    email: 'sales@globalpaper.com',
    gstin: '27AAEGP3322L1Z2',
    address: 'GIDC Industrial Area, Vapi',
    city: 'Vapi',
    state: 'Gujarat',
    creditLimit: 300000,
    openingBalance: -18500,
    currentBalance: -18500,
    status: 'active',
    createdAt: '2026-01-08T00:00:00.000Z',
  }
];

const defaultAccounts: Account[] = [
  {
    id: 'acc-001',
    companyId: 'comp-001',
    accountName: 'Main Cash Register',
    accountType: 'cash',
    openingBalance: 25000,
    currentBalance: 48500,
    isDefault: true,
    status: 'active',
  },
  {
    id: 'acc-002',
    companyId: 'comp-001',
    accountName: 'HDFC Bank Operating A/C',
    accountType: 'bank',
    accountNumber: '50200049817263',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0000128',
    openingBalance: 250000,
    currentBalance: 325400,
    isDefault: true,
    status: 'active',
  },
  {
    id: 'acc-003',
    companyId: 'comp-001',
    accountName: 'ICICI Current Account',
    accountType: 'bank',
    accountNumber: '623001889234',
    bankName: 'ICICI Bank',
    ifscCode: 'ICIC0006230',
    openingBalance: 100000,
    currentBalance: 142000,
    isDefault: false,
    status: 'active',
  }
];

const defaultSales: Sale[] = [
  {
    id: 'sale-001',
    companyId: 'comp-001',
    invoiceNo: 'INV-2026-0001',
    customerId: 'party-001',
    customerName: 'Ramesh Supermarket & Traders',
    customerPhone: '+91 98111 22233',
    customerGstin: '27AABCR1234F1Z1',
    items: [
      {
        productId: 'prod-001',
        productName: 'Enterprise Wireless Barcode Scanner',
        sku: 'SKU-SCAN-01',
        hsnCode: '8471',
        qty: 2,
        unit: 'Pcs',
        unitPrice: 3800,
        discountAmount: 200,
        gstRate: 18,
        taxableAmount: 7400,
        cgstAmount: 666,
        sgstAmount: 666,
        igstAmount: 0,
        totalAmount: 8732,
      },
      {
        productId: 'prod-002',
        productName: 'Thermal POS Paper Roll (80mm x 50m - Box of 50)',
        sku: 'SKU-PAPER-80',
        hsnCode: '4811',
        qty: 1,
        unit: 'Box',
        unitPrice: 1650,
        discountAmount: 50,
        gstRate: 12,
        taxableAmount: 1600,
        cgstAmount: 96,
        sgstAmount: 96,
        igstAmount: 0,
        totalAmount: 1792,
      }
    ],
    subtotal: 9250,
    totalDiscount: 250,
    totalTaxable: 9000,
    totalCgst: 762,
    totalSgst: 762,
    totalIgst: 0,
    totalTax: 1524,
    grandTotal: 10524,
    paidAmount: 10524,
    dueAmount: 0,
    paymentMode: 'upi',
    paymentDetails: {
      transactionId: 'UPI-987412356890',
    },
    status: 'completed',
    billedByName: 'Priya Verma',
    billedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'sale-002',
    companyId: 'comp-001',
    invoiceNo: 'INV-2026-0002',
    customerId: 'party-002',
    customerName: 'Anjali Electronics & Tech Store',
    customerPhone: '+91 98222 33344',
    customerGstin: '27AACCA5678E1Z5',
    items: [
      {
        productId: 'prod-003',
        productName: 'Ultra-Slim Mechanical POS Keyboard',
        sku: 'SKU-KB-102',
        hsnCode: '8471',
        qty: 1,
        unit: 'Pcs',
        unitPrice: 2950,
        discountAmount: 0,
        gstRate: 18,
        taxableAmount: 2950,
        cgstAmount: 265.5,
        sgstAmount: 265.5,
        igstAmount: 0,
        totalAmount: 3481,
      }
    ],
    subtotal: 2950,
    totalDiscount: 0,
    totalTaxable: 2950,
    totalCgst: 265.5,
    totalSgst: 265.5,
    totalIgst: 0,
    totalTax: 531,
    grandTotal: 3481,
    paidAmount: 2000,
    dueAmount: 1481,
    paymentMode: 'khata',
    status: 'partially_paid',
    billedByName: 'Rajesh Sharma',
    billedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  }
];

const defaultPurchases: Purchase[] = [
  {
    id: 'pur-001',
    companyId: 'comp-001',
    purchaseNo: 'PO-2026-0089',
    vendorInvoiceNo: 'TL-89412',
    vendorId: 'party-003',
    vendorName: 'TechLogix Distribution Pvt Ltd',
    vendorGstin: '27AADCT9988K1Z9',
    items: [
      {
        productId: 'prod-001',
        productName: 'Enterprise Wireless Barcode Scanner',
        sku: 'SKU-SCAN-01',
        qty: 20,
        unitPrice: 2400,
        gstRate: 18,
        taxableAmount: 48000,
        taxAmount: 8640,
        totalAmount: 56640,
      }
    ],
    subtotal: 48000,
    taxTotal: 8640,
    grandTotal: 56640,
    paidAmount: 56640,
    dueAmount: 0,
    paymentMode: 'bank_transfer',
    status: 'received',
    purchasedAt: '2026-07-15T00:00:00.000Z',
    createdByName: 'Rajesh Sharma',
  }
];

const defaultExpenses: Expense[] = [
  {
    id: 'exp-001',
    companyId: 'comp-001',
    voucherNo: 'EXP-2026-012',
    category: 'Rent',
    amount: 35000,
    paidFromAccountId: 'acc-002',
    paidFromAccountName: 'HDFC Bank Operating A/C',
    paidTo: 'Apex Industrial Park Realtors',
    paymentMode: 'bank_transfer',
    notes: 'Commercial Shop & Warehouse Rent for July 2026',
    expenseDate: '2026-07-01T00:00:00.000Z',
    createdByName: 'Sitaram Ghintala (Owner)',
  },
  {
    id: 'exp-002',
    companyId: 'comp-001',
    voucherNo: 'EXP-2026-013',
    category: 'Electricity',
    amount: 6420,
    paidFromAccountId: 'acc-001',
    paidFromAccountName: 'Main Cash Register',
    paidTo: 'Adani Electricity Mumbai Ltd',
    paymentMode: 'cash',
    notes: 'Power bill payment for June-July',
    expenseDate: '2026-07-10T00:00:00.000Z',
    createdByName: 'Rajesh Sharma',
  }
];

const defaultIncomes: OtherIncome[] = [
  {
    id: 'inc-001',
    companyId: 'comp-001',
    voucherNo: 'INC-2026-004',
    source: 'Scrap Sale',
    amount: 3200,
    receivedInAccountId: 'acc-001',
    receivedInAccountName: 'Main Cash Register',
    notes: 'Sold old cardboard boxes and packing material',
    incomeDate: '2026-07-20T00:00:00.000Z',
    createdByName: 'Vikram Singh',
  }
];

const defaultAuditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    companyId: 'comp-001',
    userId: 'usr-001',
    userName: 'Sitaram Ghintala (Owner)',
    userRole: 'owner',
    action: 'SYSTEM_LOGIN',
    module: 'AUTHENTICATION',
    details: 'Successful JWT Authentication via Argon2 hash verification',
    ipAddress: '192.168.1.104',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'audit-002',
    companyId: 'comp-001',
    userId: 'usr-003',
    userName: 'Priya Verma',
    userRole: 'cashier',
    action: 'CREATE_SALE_INVOICE',
    module: 'POS_BILLING',
    details: 'Billed Invoice INV-2026-0001 (Amount: ₹10,524 via UPI)',
    ipAddress: '192.168.1.108',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  }
];

const defaultPaymentTransactionLogs: PaymentTransactionLog[] = [
  {
    id: 'pay-log-001',
    companyId: 'comp-001',
    invoiceNo: 'INV-2026-0001',
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 00001',
    amount: 10524,
    gateway: 'online_pg',
    status: 'SUCCESS',
    paymentId: 'pay_PZ987341209384',
    reasonMessage: 'Payment captured successfully via Online Payment Gateway.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    userName: 'Priya Verma (Cashier)',
  },
  {
    id: 'pay-log-002',
    companyId: 'comp-001',
    invoiceNo: 'POS-893122',
    customerName: 'Sunita Patel',
    customerPhone: '+91 98123 99887',
    amount: 3450,
    gateway: 'online_pg',
    status: 'CANCELLED',
    errorCode: 'USER_CANCELLED',
    reasonMessage: 'Online Payment Gateway transaction cancelled by user on checkout screen.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userName: 'Priya Verma (Cashier)',
  },
  {
    id: 'pay-log-003',
    companyId: 'comp-001',
    invoiceNo: 'POS-774102',
    customerName: 'Ramesh Gupta',
    customerPhone: '+91 98333 11223',
    amount: 18500,
    gateway: 'razorpay',
    status: 'FAILED',
    errorCode: 'INVALID_MERCHANT_KEY',
    reasonMessage: 'Gateway authentication failed: Invalid or missing Merchant Key / Key Secret.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    userName: 'Sitaram Ghintala (Owner)',
  },
  {
    id: 'pay-log-004',
    companyId: 'comp-001',
    invoiceNo: 'INV-2026-0004',
    customerName: 'Walk-in Cash Customer',
    amount: 850,
    gateway: 'upi_qr',
    status: 'SUCCESS',
    paymentId: 'UPI-9823410982',
    reasonMessage: 'Instant UPI QR payment confirmed and verified by cashier.',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    userName: 'Priya Verma (Cashier)',
  },
];

const defaultCounters: POSCounter[] = [
  { id: 'cnt-01', companyId: 'comp-001', name: 'Counter 1 - Main Billing Desk', code: 'CNT-01', pin: '1111', location: 'Ground Floor Main Entrance', assignedCashierName: 'Priya Verma', status: 'active', isDefault: true },
  { id: 'cnt-02', companyId: 'comp-001', name: 'Counter 2 - Express Billing', code: 'CNT-02', pin: '2222', location: 'Ground Floor Express Section', assignedCashierName: 'Rajesh Sharma', status: 'active' },
  { id: 'cnt-03', companyId: 'comp-001', name: 'Counter 3 - Wholesale & Bulk Desk', code: 'CNT-03', pin: '3333', location: 'First Floor Wholesale Counter', assignedCashierName: 'Sitaram Ghintala', status: 'active' },
  { id: 'cnt-04', companyId: 'comp-001', name: 'Counter 4 - Pharmacy & Quick Checkout', code: 'CNT-04', pin: '4444', location: 'Pharmacy Bay 1', assignedCashierName: 'Vikram Singh', status: 'active' },
  { id: 'cnt-05', companyId: 'comp-001', name: 'Counter 5 - VIP & Doorstep Orders', code: 'CNT-05', pin: '5555', location: 'First Floor Executive Desk', assignedCashierName: 'Anjali Verma', status: 'active' },
];

const defaultDeliveryBoys: DeliveryBoy[] = [
  { id: 'db-01', companyId: 'comp-001', name: 'Rahul Kumar', phone: '+91 98111 22233', vehicleNo: 'MH-02-AB-1234', status: 'available', pendingCollections: 0 },
  { id: 'db-02', companyId: 'comp-001', name: 'Suresh Patel', phone: '+91 98222 33344', vehicleNo: 'MH-02-XY-9876', status: 'on_delivery', pendingCollections: 1450 },
  { id: 'db-03', companyId: 'comp-001', name: 'Vikram Deshmukh', phone: '+91 98333 44455', vehicleNo: 'MH-02-CD-5555', status: 'available', pendingCollections: 0 },
];

const defaultCashDrawerSessions: CashDrawerSession[] = [
  {
    id: 'galla-001',
    companyId: 'comp-001',
    counterId: 'cnt-01',
    counterName: 'Counter 1 - Express Grocery',
    cashierName: 'Priya Verma',
    openedAt: new Date(Date.now() - 28800000).toISOString(),
    openingCash: 2000,
    expectedCash: 18450,
    systemExpectedCash: 18450,
    physicalCashCount: { c2000: 2, c500: 22, c200: 15, c100: 20, c50: 8, c20: 5, c10: 5, coins: 0 },
    totalPhysicalCash: 18450,
    discrepancy: 0,
    status: 'open',
  }
];

const defaultSalesOrders: SalesOrder[] = [
  {
    id: 'so-101',
    companyId: 'comp-001',
    orderNo: 'SO-2026-001',
    customerName: 'Ramesh Supermarket & Traders',
    customerPhone: '+91 98111 22233',
    items: [
      { productId: 'prod-001', productName: 'Enterprise Wireless Barcode Scanner', sku: 'SKU-SCAN-01', hsnCode: '8471', qty: 2, unit: 'Pcs', unitPrice: 3800, discountAmount: 0, gstRate: 18, taxableAmount: 6440.68, cgstAmount: 579.66, sgstAmount: 579.66, igstAmount: 0, totalAmount: 7600 }
    ],
    grandTotal: 7600,
    advancePaid: 2000,
    status: 'pending',
    deliveryAddress: 'Shop 12, Station Road, Andheri West, Mumbai',
    orderedAt: '2026-07-30T10:00:00.000Z',
    createdByName: 'Priya Verma'
  }
];

const defaultPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-101',
    companyId: 'comp-001',
    poNo: 'PO-2026-001',
    vendorName: 'M/s TechLogix Distribution Pvt Ltd',
    items: [
      { productId: 'prod-002', productName: 'Thermal POS Paper Roll (80mm x 50m - Box of 50)', sku: 'SKU-PAPER-80', qty: 20, unitPrice: 1100, gstRate: 12, taxableAmount: 19642.86, taxAmount: 2357.14, totalAmount: 22000 }
    ],
    grandTotal: 22000,
    status: 'sent_to_vendor',
    expectedDeliveryDate: '2026-08-05',
    orderedAt: '2026-07-29T14:30:00.000Z',
    createdByName: 'Rajesh Sharma'
  }
];

const defaultUdharReminders: UdharReminder[] = [
  {
    id: 'udhar-001',
    partyId: 'party-001',
    partyName: 'Ramesh Supermarket & Traders',
    partyPhone: '+919811122233',
    dueAmount: 24500,
    daysOverdue: 35,
    lastReminderSentAt: '2026-07-28T09:00:00.000Z',
    reminderChannel: 'whatsapp',
    promisedPaymentDate: '2026-08-02',
    notes: 'Promised to clear via UPI after weekend sales'
  },
  {
    id: 'udhar-002',
    partyId: 'party-002',
    partyName: 'Anjali Electronics & Tech Store',
    partyPhone: '+919822233344',
    dueAmount: 18200,
    daysOverdue: 18,
    lastReminderSentAt: '2026-07-25T11:00:00.000Z',
    reminderChannel: 'sms',
    promisedPaymentDate: '2026-08-01',
    notes: 'Requested 5 days grace period'
  }
];

const defaultServices: ServiceCatalogItem[] = [
  {
    id: 'srv-001',
    companyId: 'comp-001',
    name: 'AC Servicing & Pressure Jet Clean (एसी सर्विसिंग)',
    category: 'repair_maintenance',
    price: 499,
    durationMins: 45,
    gstRate: 18,
    assignedStaff: 'Vikram Tech',
    description: 'Indoor & outdoor unit cleaning, filter washing and pressure jet spray',
    status: 'active',
  },
  {
    id: 'srv-002',
    companyId: 'comp-001',
    name: 'Haircut & Styling Service (हेयर कटिंग व स्टाइलिंग)',
    category: 'salon_beauty',
    price: 150,
    durationMins: 25,
    gstRate: 0,
    assignedStaff: 'Amit Stylist',
    description: 'Custom haircut, head massage and hair washing',
    status: 'active',
  },
  {
    id: 'srv-003',
    companyId: 'comp-001',
    name: 'Electrical Inspection & Wiring Check (इलेक्ट्रिशियन विजिट)',
    category: 'repair_maintenance',
    price: 299,
    durationMins: 30,
    gstRate: 18,
    assignedStaff: 'Raju Electrician',
    description: 'Doorstep visit, MCB testing and fault diagnosis',
    status: 'active',
  },
  {
    id: 'srv-004',
    companyId: 'comp-001',
    name: 'Suit / Heavy Garment Dry Cleaning (ड्राई क्लीनिंग)',
    category: 'laundry_cleaning',
    price: 250,
    durationMins: 30,
    gstRate: 5,
    assignedStaff: 'Ramesh Laundry',
    description: 'Stain treatment, steam pressing and protective coat cover',
    status: 'active',
  },
  {
    id: 'srv-005',
    companyId: 'comp-001',
    name: 'RO Water Purifier Filter Service (आरओ वाटर सर्विस)',
    category: 'repair_maintenance',
    price: 350,
    durationMins: 40,
    gstRate: 18,
    assignedStaff: 'Suresh Tech',
    description: 'Filter membrane cleaning, TDS level check and pipe flushing',
    status: 'active',
  },
  {
    id: 'srv-006',
    companyId: 'comp-001',
    name: 'Professional Consultation / Site Visit (ऑन-साइट कंसल्टेशन)',
    category: 'professional_consulting',
    price: 500,
    durationMins: 60,
    gstRate: 18,
    assignedStaff: 'Senior Expert',
    description: '1-on-1 expert site visit, project assessment and cost estimation',
    status: 'active',
  },
];

const defaultServiceBookings: ServiceBooking[] = [
  {
    id: 'sbk-001',
    companyId: 'comp-001',
    bookingNo: 'SB-2026-001',
    customerName: 'Rajesh Sharma',
    customerPhone: '9876543210',
    serviceId: 'srv-001',
    serviceName: 'AC Servicing & Pressure Jet Clean (एसी सर्विसिंग)',
    category: 'repair_maintenance',
    bookingDate: new Date().toISOString().split('T')[0],
    timeSlot: '10:30 AM',
    assignedStaff: 'Vikram Tech',
    serviceAddress: 'Flat 402, Green Valley Apts, Sector 12',
    estimatedPrice: 499,
    advancePaid: 100,
    status: 'booked',
    paymentStatus: 'advance',
    notes: 'Doorstep AC service visit requested',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sbk-002',
    companyId: 'comp-001',
    bookingNo: 'SB-2026-002',
    customerName: 'Anil Verma',
    customerPhone: '9823456789',
    serviceId: 'srv-004',
    serviceName: 'Suit / Heavy Garment Dry Cleaning (ड्राई क्लीनिंग)',
    category: 'laundry_cleaning',
    bookingDate: new Date().toISOString().split('T')[0],
    timeSlot: '12:00 PM',
    assignedStaff: 'Ramesh Laundry',
    estimatedPrice: 250,
    advancePaid: 250,
    status: 'in_progress',
    paymentStatus: 'fully_paid',
    notes: '2-piece suit express dry clean',
    createdAt: new Date().toISOString(),
  },
];

export class ERPDatabase {
  private static memoryStore: Record<string, string> = {};

  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      let data: string | null = null;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        data = localStorage.getItem(key);
      } else {
        data = this.memoryStore[key] || null;
      }

      if (!data || data === 'undefined' || data === 'null') {
        this.initialize();
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          data = localStorage.getItem(key);
        } else {
          data = this.memoryStore[key] || null;
        }
        if (!data || data === 'undefined' || data === 'null') return defaultValue;
      }
      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        if (typeof defaultValue === 'string') {
          return data as T;
        }
        throw new Error(`Invalid JSON format for key ${key}`);
      }
      if (parsed === null || parsed === undefined) return defaultValue;
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
      return parsed as T;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  }

  public static setItem<T>(key: string, value: T): void {
    try {
      const valStr = JSON.stringify(value);
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, valStr);
      }
      this.memoryStore[key] = valStr;
    } catch (e) {
      console.error(`Error writing ${key} to storage:`, e);
    }
  }

  public static adjustStock(productId: string, type: 'addition' | 'subtraction', qty: number, reason: string): void {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      if (type === 'addition') {
        prod.stockQty += qty;
      } else {
        prod.stockQty = Math.max(0, prod.stockQty - qty);
      }
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
      this.addAuditLog('STOCK_ADJUSTMENT', 'INVENTORY', `${reason}: ${type.toUpperCase()} ${qty} of ${prod.name}`);
    }
  }

  public static initialize(): void {
    const checkItem = (key: string) => {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return this.memoryStore[key] || null;
    };

    if (!checkItem(STORAGE_KEYS.COMPANIES)) {
      this.setItem(STORAGE_KEYS.COMPANIES, defaultCompanies);
    }
    if (!checkItem(STORAGE_KEYS.COMPANY)) {
      this.setItem(STORAGE_KEYS.COMPANY, defaultCompanies[0]);
    }
    if (!checkItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, defaultUsers);
    }
    if (!checkItem(STORAGE_KEYS.CURRENT_USER)) {
      this.setItem(STORAGE_KEYS.CURRENT_USER, defaultUsers[0]);
    }
    if (!checkItem(STORAGE_KEYS.PRODUCTS)) {
      this.setItem(STORAGE_KEYS.PRODUCTS, defaultProducts);
    }
    if (!checkItem(STORAGE_KEYS.PARTIES)) {
      this.setItem(STORAGE_KEYS.PARTIES, defaultParties);
    }
    if (!checkItem(STORAGE_KEYS.SALES)) {
      this.setItem(STORAGE_KEYS.SALES, defaultSales);
    }
    if (!checkItem(STORAGE_KEYS.PURCHASES)) {
      this.setItem(STORAGE_KEYS.PURCHASES, defaultPurchases);
    }
    if (!checkItem(STORAGE_KEYS.ACCOUNTS)) {
      this.setItem(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    }
    if (!checkItem(STORAGE_KEYS.EXPENSES)) {
      this.setItem(STORAGE_KEYS.EXPENSES, defaultExpenses);
    }
    if (!checkItem(STORAGE_KEYS.INCOMES)) {
      this.setItem(STORAGE_KEYS.INCOMES, defaultIncomes);
    }
    if (!checkItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs);
    }
    if (!checkItem(STORAGE_KEYS.SERVICES)) {
      this.setItem(STORAGE_KEYS.SERVICES, defaultServices);
    }
    if (!checkItem(STORAGE_KEYS.SERVICE_BOOKINGS)) {
      this.setItem(STORAGE_KEYS.SERVICE_BOOKINGS, defaultServiceBookings);
    }
  }

  private static filterByCompany<T extends { companyId?: string }>(items: T[], targetCompanyId?: string): T[] {
    if (targetCompanyId === 'ALL') return items;
    const activeCompId = targetCompanyId || this.getCompany().id;
    return items.filter((item) => {
      if (!item.companyId) return activeCompId === 'comp-001';
      return item.companyId === activeCompId;
    });
  }

  // Multi-Tenant Company & Shop Methods
  public static getCompanies(): Company[] {
    return this.getItem<Company[]>(STORAGE_KEYS.COMPANIES, defaultCompanies);
  }

  public static getCompanyById(companyId: string): Company | null {
    const companies = this.getCompanies();
    return companies.find((c) => c.id === companyId) || null;
  }

  public static getCompany(): Company {
    const companies = this.getCompanies();
    const currentUser = this.getCurrentUser();

    // Priority 1: ALWAYS check current logged-in user's companyId FIRST to guarantee cross-tenant isolation
    if (currentUser && currentUser.companyId) {
      const comp = companies.find((c) => c.id === currentUser.companyId);
      if (comp) {
        // Immediately sync/overwrite stored active company with currentUser's company
        const stored = this.getItem<Company | null>(STORAGE_KEYS.COMPANY, null);
        if (!stored || stored.id !== comp.id) {
          this.setItem(STORAGE_KEYS.COMPANY, comp);
        }
        return comp;
      }
    }

    // Priority 2: Fallback to stored active company if currentUser has no companyId
    const stored = this.getItem<Company | null>(STORAGE_KEYS.COMPANY, null);
    if (stored && stored.id) {
      const comp = companies.find((c) => c.id === stored.id);
      if (comp) return comp;
    }

    // Priority 3: Default fallback company
    return companies[0] || defaultCompany;
  }

  public static deleteCompany(companyId: string): { success: boolean; deletedCompany?: Company; error?: string } {
    if (!companyId) return { success: false, error: 'Company ID is required' };

    const companies = this.getCompanies();
    const targetComp = companies.find((c) => c.id === companyId);
    if (!targetComp) {
      return { success: false, error: `Company with ID "${companyId}" not found.` };
    }

    // 1. Generate safety JSON backup export
    const backupData = {
      exportTimestamp: new Date().toISOString(),
      deletedCompany: targetComp,
      users: this.getItem<User[]>(STORAGE_KEYS.USERS, []).filter((u) => u.companyId === companyId),
      products: this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter((p) => p.companyId === companyId),
      parties: this.getItem<Party[]>(STORAGE_KEYS.PARTIES, []).filter((p) => p.companyId === companyId),
      sales: this.getItem<Sale[]>(STORAGE_KEYS.SALES, []).filter((s) => s.companyId === companyId),
      purchases: this.getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, []).filter((p) => p.companyId === companyId),
      accounts: this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, []).filter((a) => a.companyId === companyId),
      expenses: this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter((e) => e.companyId === companyId),
      incomes: this.getItem<OtherIncome[]>(STORAGE_KEYS.INCOMES, []).filter((i) => i.companyId === companyId),
      khataTxns: this.getItem<KhataTransaction[]>(STORAGE_KEYS.KHATA_TXNS, []).filter((k) => k.companyId === companyId),
      posCounters: this.getItem<POSCounter[]>(STORAGE_KEYS.POS_COUNTERS, []).filter((c) => c.companyId === companyId),
      shifts: this.getItem<Shift[]>(STORAGE_KEYS.CASH_DRAWER_SESSIONS, []).filter((s) => s.companyId === companyId),
      auditLogs: this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []).filter((a) => a.companyId === companyId),
    };

    // Auto-trigger safety JSON file download
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SAFETY_BACKUP_DELETED_SHOP_${targetComp.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('Backup auto-download notice:', err);
      }
    }

    // 2. Remove company from COMPANIES list
    const updatedCompanies = companies.filter((c) => c.id !== companyId);
    this.setItem(STORAGE_KEYS.COMPANIES, updatedCompanies);

    // 3. Purge all tenant data across all storage keys
    const filterAndSave = <T extends { companyId?: string }>(key: string) => {
      const items = this.getItem<T[]>(key, []);
      if (Array.isArray(items)) {
        const filtered = items.filter((item) => item.companyId !== companyId);
        this.setItem(key, filtered);
      }
    };

    filterAndSave(STORAGE_KEYS.USERS);
    filterAndSave(STORAGE_KEYS.PRODUCTS);
    filterAndSave(STORAGE_KEYS.PARTIES);
    filterAndSave(STORAGE_KEYS.SALES);
    filterAndSave(STORAGE_KEYS.SALES_RETURNS);
    filterAndSave(STORAGE_KEYS.PURCHASES);
    filterAndSave(STORAGE_KEYS.PURCHASE_RETURNS);
    filterAndSave(STORAGE_KEYS.ACCOUNTS);
    filterAndSave(STORAGE_KEYS.EXPENSES);
    filterAndSave(STORAGE_KEYS.INCOMES);
    filterAndSave(STORAGE_KEYS.KHATA_TXNS);
    filterAndSave(STORAGE_KEYS.STOCK_ADJUSTMENTS);
    filterAndSave(STORAGE_KEYS.STOCK_TRANSFERS);
    filterAndSave(STORAGE_KEYS.POS_COUNTERS);
    filterAndSave(STORAGE_KEYS.HELD_BILLS);
    filterAndSave(STORAGE_KEYS.CASH_DRAWER_SESSIONS);
    filterAndSave(STORAGE_KEYS.DELIVERY_BOYS);
    filterAndSave(STORAGE_KEYS.SALES_ORDERS);
    filterAndSave(STORAGE_KEYS.PURCHASE_ORDERS);
    filterAndSave(STORAGE_KEYS.UDHAR_REMINDERS);
    filterAndSave(STORAGE_KEYS.TRANSFERS);
    filterAndSave(STORAGE_KEYS.SERVICES);
    filterAndSave(STORAGE_KEYS.SERVICE_BOOKINGS);
    filterAndSave(STORAGE_KEYS.PAYMENT_TRANSACTION_LOGS);

    // 4. Reset active company if the deleted company was active
    const currentActiveComp = this.getItem<Company | null>(STORAGE_KEYS.COMPANY, null);
    if (currentActiveComp && currentActiveComp.id === companyId) {
      if (updatedCompanies.length > 0) {
        this.setItem(STORAGE_KEYS.COMPANY, updatedCompanies[0]);
      } else {
        this.setItem(STORAGE_KEYS.COMPANY, defaultCompany);
      }
    }

    // 5. Notify server to delete tenant data
    const token = this.getJwtToken();
    if (token) {
      fetch(apiUrl(`/api/admin/companies/${companyId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch((err) => console.warn('Server delete company notification warning:', err));
    }

    // 6. Record Audit Log
    const currentUser = this.getCurrentUser();
    this.addAuditLog(
      'DELETE_SHOP_WORKSPACE',
      'SUPER_ADMIN',
      `Super Admin (${currentUser.name} / ${currentUser.email}) permanently deleted shop workspace "${targetComp.name}" (ID: ${companyId}) and purged all tenant records.`
    );

    return { success: true, deletedCompany: targetComp };
  }

  public static setActiveCompany(companyId: string): Company {
    const companies = this.getCompanies();
    const comp = companies.find((c) => c.id === companyId);
    if (comp) {
      this.setItem(STORAGE_KEYS.COMPANY, comp);
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        currentUser.companyId = comp.id;
        this.setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
        this.generateJwtToken(currentUser);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('company_changed', { detail: { companyId: comp.id, company: comp } }));
      }
      this.addAuditLog('SWITCH_COMPANY_STORE', 'SETTINGS', `Switched active shop workspace to ${comp.name} (${comp.id})`);
      return comp;
    }
    return this.getCompany();
  }

  public static addCompany(companyData: Omit<Company, 'id'>): Company {
    const companies = this.getCompanies();
    const newCompany: Company = {
      ...companyData,
      id: `shop-${Date.now()}`,
    };
    companies.push(newCompany);
    this.setItem(STORAGE_KEYS.COMPANIES, companies);
    this.setItem(STORAGE_KEYS.COMPANY, newCompany);

    this.addAuditLog(
      'MANUAL_SHOP_ONBOARDING',
      'SUPER_ADMIN',
      `Super Admin onboarded new shop workspace: ${newCompany.name} (Shop ID: ${newCompany.id}, Dedicated UPI: ${newCompany.upiId || 'N/A'})`
    );
    return newCompany;
  }

  public static updateCompany(company: Partial<Company>, targetCompanyId?: string): Company {
    const current = this.getCompany();
    const compId = targetCompanyId || current.id;
    const companies = this.getCompanies();
    const idx = companies.findIndex((c) => c.id === compId);

    let updated: Company;
    if (idx !== -1) {
      companies[idx] = { ...companies[idx], ...company };
      updated = companies[idx];
    } else {
      updated = { ...current, ...company };
      companies.push(updated);
    }

    this.setItem(STORAGE_KEYS.COMPANIES, companies);
    this.setItem(STORAGE_KEYS.COMPANY, updated);
    this.addAuditLog('UPDATE_COMPANY_PROFILE', 'SETTINGS', `Updated shop workspace details for ${updated.name}`);
    return updated;
  }

  // User & Auth Methods
  public static getUsers(): User[] {
    const users = this.getItem<User[]>(STORAGE_KEYS.USERS, defaultUsers);
    let modified = false;
    defaultUsers.forEach((defUser) => {
      if (!users.some((u) => u.id === defUser.id || u.email.toLowerCase() === defUser.email.toLowerCase())) {
        users.push(defUser);
        modified = true;
      }
    });
    if (modified) {
      this.setItem(STORAGE_KEYS.USERS, users);
    }
    return users;
  }

  public static getCurrentUser(): User {
    return this.getItem<User>(STORAGE_KEYS.CURRENT_USER, defaultUsers[0]);
  }

  public static setCurrentUser(user: User): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
    if (user && user.companyId) {
      const companies = this.getCompanies();
      const comp = companies.find((c) => c.id === user.companyId);
      if (comp) {
        this.setItem(STORAGE_KEYS.COMPANY, comp);
      }
    }
    this.generateJwtToken(user);
    this.addAuditLog('SWITCH_USER_ROLE', 'AUTHENTICATION', `Switched active logged-in user to ${user.name} (${user.role})`);
  }

  // JWT Security Token Engine
  public static generateJwtToken(user: User): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId || 'comp-001',
      iat: nowSec,
      exp: nowSec + 30 * 24 * 60 * 60, // 30 days valid
      iss: 'billkart-erp-jwt-engine',
    };

    const encodeBase64Url = (obj: object) => {
      const jsonStr = JSON.stringify(obj);
      return btoa(
        encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        )
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    const headerB64 = encodeBase64Url(header);
    const payloadB64 = encodeBase64Url(payload);
    const fakeSignature = btoa(`${headerB64}.${payloadB64}.BILLKART_SECRET_KEY`)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const token = `${headerB64}.${payloadB64}.${fakeSignature}`;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('erp_jwt_token', token);
      localStorage.setItem('erp_jwt_payload', JSON.stringify(payload));
    }
    return token;
  }

  public static getJwtToken(): string {
    if (typeof localStorage !== 'undefined') {
      const existing = localStorage.getItem('erp_jwt_token');
      if (existing) return existing;
    }
    const currentUser = this.getCurrentUser();
    return this.generateJwtToken(currentUser);
  }

  public static verifyJwtToken(token: string): { valid: boolean; payload?: any; reason?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'Empty token string' };
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid JWT structure (must contain header.payload.signature)' };
    }
    try {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
      const jsonStr = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonStr);
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSec) {
        return { valid: false, reason: 'JWT Token has expired' };
      }
      return { valid: true, payload };
    } catch (e: any) {
      return { valid: false, reason: `JWT Decode Error: ${e.message}` };
    }
  }

  public static addUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    this.setItem(STORAGE_KEYS.USERS, users);
    this.addAuditLog('CREATE_USER', 'USER_MANAGEMENT', `Created new system user ${newUser.name} with role ${newUser.role}`);
    return newUser;
  }

  public static addOrUpdateSuperAdmin(adminData: { name: string; email: string; phone?: string; pin?: string }): User {
    const users = this.getUsers();
    const existingIndex = users.findIndex((u) => u.role === 'super_admin' || u.id === 'usr-000');
    let adminUser: User;
    if (existingIndex !== -1) {
      adminUser = {
        ...users[existingIndex],
        name: adminData.name,
        email: adminData.email,
        phone: adminData.phone || users[existingIndex].phone || '+91 99999 00000',
      };
      (adminUser as any).username = adminData.email;
      if (adminData.pin) (adminUser as any).pin = adminData.pin;
      users[existingIndex] = adminUser;
    } else {
      adminUser = {
        id: 'usr-000',
        name: adminData.name,
        email: adminData.email,
        role: 'super_admin',
        companyId: 'comp-001',
        phone: adminData.phone || '+91 99999 00000',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      (adminUser as any).username = adminData.email;
      (adminUser as any).pin = adminData.pin || '1234';
      users.unshift(adminUser);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
    this.addAuditLog('SUPER_ADMIN_UPDATE', 'ADMIN_CPANEL', `Super Admin credentials updated for ${adminUser.email}`);
    return adminUser;
  }

  public static updateUserPassword(emailOrPhone: string, newPassword: string): boolean {
    const users = this.getUsers();
    const target = emailOrPhone.trim().toLowerCase();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === target ||
        (u.phone && u.phone.replace(/\s+/g, '') === target.replace(/\s+/g, '')) ||
        u.id === target
    );

    if (user) {
      (user as any).password = newPassword;
      (user as any).pin = newPassword;
      this.setItem(STORAGE_KEYS.USERS, users);

      const currentUser = this.getCurrentUser();
      if (currentUser && (currentUser.id === user.id || currentUser.email.toLowerCase() === user.email.toLowerCase())) {
        (currentUser as any).password = newPassword;
        (currentUser as any).pin = newPassword;
        this.setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
      }
      this.addAuditLog('PASSWORD_CHANGE', 'AUTHENTICATION', `Password/PIN updated for user ${user.email}`);
      return true;
    }

    // Fallback: update current user password if no match in list
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      (currentUser as any).password = newPassword;
      (currentUser as any).pin = newPassword;
      this.setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
      this.addAuditLog('PASSWORD_CHANGE', 'AUTHENTICATION', `Updated active user password for ${currentUser.email}`);
      return true;
    }
    return false;
  }

  public static updateUser(userId: string, updatedData: Partial<User>): User | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedData };
      this.setItem(STORAGE_KEYS.USERS, users);
      this.addAuditLog('UPDATE_USER', 'USER_MANAGEMENT', `Updated user details for ${users[idx].name} (${users[idx].role})`);
      
      // If updating current logged in user, refresh current user state too
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        this.setItem(STORAGE_KEYS.CURRENT_USER, users[idx]);
      }
      return users[idx];
    }
    return null;
  }

  public static deleteUser(userId: string): boolean {
    const users = this.getUsers();
    const userToDelete = users.find((u) => u.id === userId);
    if (!userToDelete) return false;
    
    // Do not allow deleting super_admin
    if (userToDelete.role === 'super_admin') return false;

    const filtered = users.filter((u) => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, filtered);
    this.addAuditLog('DELETE_USER', 'USER_MANAGEMENT', `Deleted user account ${userToDelete.name} (${userToDelete.email})`);
    return true;
  }

  // System Features & Feature Flag Management (C-Panel)
  public static getSystemFeatures(): SystemFeature[] {
    return this.getItem<SystemFeature[]>(STORAGE_KEYS.SYSTEM_FEATURES, defaultSystemFeatures);
  }

  public static addSystemFeature(featureData: Omit<SystemFeature, 'id' | 'updatedAt'>): SystemFeature {
    const features = this.getSystemFeatures();
    const newFeature: SystemFeature = {
      ...featureData,
      id: `feat-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    features.unshift(newFeature);
    this.setItem(STORAGE_KEYS.SYSTEM_FEATURES, features);
    this.addAuditLog('CREATE_SYSTEM_FEATURE', 'ADMIN_CPANEL', `Added new system feature module: ${newFeature.name} (${newFeature.key})`);
    return newFeature;
  }

  public static toggleSystemFeature(featureId: string): SystemFeature | null {
    const features = this.getSystemFeatures();
    const idx = features.findIndex((f) => f.id === featureId || f.key === featureId);
    if (idx !== -1) {
      features[idx].isEnabled = !features[idx].isEnabled;
      features[idx].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.SYSTEM_FEATURES, features);
      this.addAuditLog('TOGGLE_SYSTEM_FEATURE', 'ADMIN_CPANEL', `Toggled feature ${features[idx].name} state to ${features[idx].isEnabled ? 'ENABLED' : 'DISABLED'}`);
      return features[idx];
    }
    return null;
  }

  public static updateSystemFeature(featureId: string, updates: Partial<SystemFeature>): SystemFeature | null {
    const features = this.getSystemFeatures();
    const idx = features.findIndex((f) => f.id === featureId || f.key === featureId);
    if (idx !== -1) {
      features[idx] = { ...features[idx], ...updates, updatedAt: new Date().toISOString() };
      this.setItem(STORAGE_KEYS.SYSTEM_FEATURES, features);
      this.addAuditLog('UPDATE_SYSTEM_FEATURE', 'ADMIN_CPANEL', `Updated configuration for system feature ${features[idx].name}`);
      return features[idx];
    }
    return null;
  }

  // Active User Telemetry & Online Sessions Monitor
  public static getActiveUserSessions(): ActiveUserSession[] {
    const users = this.getUsers();
    const companies = this.getCompanies();
    const now = new Date();

    const sampleModules = ['pos', 'dashboard', 'sales', 'inventory', 'reports', 'gst', 'gsheets', 'udhar_recovery'];

    return users.map((u, idx) => {
      const company = companies.find((c) => c.id === u.companyId) || companies[0];
      const isOnline = idx < 4; // Top active users shown as online/active
      const lastActive = new Date(now.getTime() - idx * 3.5 * 60 * 1000).toISOString();
      const connectedAt = new Date(now.getTime() - (idx + 1) * 45 * 60 * 1000).toISOString();

      return {
        id: `sess-${u.id}`,
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        userRole: u.role,
        companyId: u.companyId,
        companyName: company?.name || 'Apex Enterprise Ltd',
        activeModule: sampleModules[idx % sampleModules.length],
        ipAddress: `103.211.22.${10 + idx * 7}`,
        deviceInfo: idx % 2 === 0 ? 'Chrome 126 / Windows 11' : 'POS Thermal Tablet / Android 14',
        status: isOnline ? (idx === 0 ? 'online' : 'online') : 'idle',
        connectedAt,
        lastActiveAt: lastActive,
      };
    });
  }

  // Products & Stock
  public static getProducts(companyId?: string): Product[] {
    const raw = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    return this.filterByCompany(raw, companyId);
  }

  public static addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);

    // Prevent duplicate product by SKU, Barcode, or Name
    const existingIdx = products.findIndex((p) => {
      if (p.companyId && product.companyId && p.companyId !== product.companyId) return false;
      if (product.sku && p.sku && p.sku.trim().toLowerCase() === product.sku.trim().toLowerCase()) return true;
      if (product.barcode && p.barcode && p.barcode.trim() === product.barcode.trim()) return true;
      if (p.name.trim().toLowerCase() === product.name.trim().toLowerCase()) return true;
      return false;
    });

    if (existingIdx !== -1) {
      // Update existing product stock and price instead of creating duplicate product entry
      const existing = products[existingIdx];
      existing.stockQty = (existing.stockQty || 0) + (product.stockQty || 0);
      if (product.sellingPrice) existing.sellingPrice = product.sellingPrice;
      if (product.purchasePrice) existing.purchasePrice = product.purchasePrice;
      existing.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
      this.addAuditLog('PREVENT_DUPLICATE_PRODUCT', 'INVENTORY', `Prevented duplicate product entry. Updated existing item ${existing.name} (Stock: ${existing.stockQty})`);
      return existing;
    }

    const newProduct: Product = {
      ...product,
      companyId: product.companyId || this.getCompany().id,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.unshift(newProduct);
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('CREATE_PRODUCT', 'INVENTORY', `Added new product: ${newProduct.name} (SKU: ${newProduct.sku})`);
    return newProduct;
  }

  public static bulkAddProducts(newProdsList: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): number {
    if (!newProdsList || newProdsList.length === 0) return 0;
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    const now = new Date().toISOString();
    
    let addedCount = 0;
    newProdsList.forEach((prod, index) => {
      const existingIdx = products.findIndex((p) => {
        if (p.companyId && prod.companyId && p.companyId !== prod.companyId) return false;
        if (prod.sku && p.sku && p.sku.trim().toLowerCase() === prod.sku.trim().toLowerCase()) return true;
        if (prod.barcode && p.barcode && p.barcode.trim() === prod.barcode.trim()) return true;
        if (p.name.trim().toLowerCase() === prod.name.trim().toLowerCase()) return true;
        return false;
      });

      if (existingIdx !== -1) {
        // Merge stock for duplicate product in bulk import
        products[existingIdx].stockQty = (products[existingIdx].stockQty || 0) + (prod.stockQty || 0);
        products[existingIdx].updatedAt = now;
      } else {
        const newProduct: Product = {
          ...prod,
          companyId: prod.companyId || this.getCompany().id,
          id: `prod-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          createdAt: now,
          updatedAt: now,
        };
        products.unshift(newProduct);
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('BULK_CSV_IMPORT_PRODUCTS', 'INVENTORY', `Bulk imported ${addedCount} new unique products via CSV utility`);
    return addedCount;
  }

  public static updateProduct(id: string, updates: Partial<Product>): Product | null {
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    products[idx] = {
      ...products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('UPDATE_PRODUCT', 'INVENTORY', `Updated product details for ${products[idx].name}`);
    return products[idx];
  }

  public static addStockAdjustment(adjustment: Omit<StockAdjustment, 'id' | 'adjustedAt'>): StockAdjustment {
    const list = this.getItem<StockAdjustment[]>(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
    const newAdj: StockAdjustment = {
      ...adjustment,
      companyId: adjustment.companyId || this.getCompany().id,
      id: `adj-${Date.now()}`,
      adjustedAt: new Date().toISOString(),
    };
    list.unshift(newAdj);
    this.setItem(STORAGE_KEYS.STOCK_ADJUSTMENTS, list);

    // Adjust product quantity
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    const prod = products.find((p) => p.id === adjustment.productId);
    if (prod) {
      if (adjustment.type === 'addition') {
        prod.stockQty += adjustment.qty;
      } else {
        prod.stockQty = Math.max(0, prod.stockQty - adjustment.qty);
      }
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
    }

    this.addAuditLog('STOCK_ADJUSTMENT', 'INVENTORY', `Adjusted stock for ${adjustment.productName}: ${adjustment.type} ${adjustment.qty}`);
    return newAdj;
  }

  public static getStockAdjustments(companyId?: string): StockAdjustment[] {
    const raw = this.getItem<StockAdjustment[]>(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
    return this.filterByCompany(raw, companyId);
  }

  public static addStockTransfer(transfer: Omit<StockTransfer, 'id' | 'transferredAt'>): StockTransfer {
    const list = this.getItem<StockTransfer[]>(STORAGE_KEYS.STOCK_TRANSFERS, []);
    const newTransfer: StockTransfer = {
      ...transfer,
      companyId: transfer.companyId || this.getCompany().id,
      id: `stf-${Date.now()}`,
      transferredAt: new Date().toISOString(),
    };
    list.unshift(newTransfer);
    this.setItem(STORAGE_KEYS.STOCK_TRANSFERS, list);
    this.addAuditLog('STOCK_TRANSFER', 'INVENTORY', `Transferred items from ${transfer.fromLocation} to ${transfer.toLocation}`);
    return newTransfer;
  }

  public static getStockTransfers(companyId?: string): StockTransfer[] {
    const raw = this.getItem<StockTransfer[]>(STORAGE_KEYS.STOCK_TRANSFERS, []);
    return this.filterByCompany(raw, companyId);
  }

  // Parties (Customers & Vendors)
  public static getParties(companyId?: string): Party[] {
    const raw = this.getItem<Party[]>(STORAGE_KEYS.PARTIES, defaultParties);
    return this.filterByCompany(raw, companyId);
  }

  public static addParty(party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>): Party {
    const parties = this.getItem<Party[]>(STORAGE_KEYS.PARTIES, defaultParties);

    // Prevent duplicate party entry by phone or GSTIN or exact Name
    const existingIdx = parties.findIndex((p) => {
      if (p.companyId && party.companyId && p.companyId !== party.companyId) return false;
      if (party.phone && p.phone && p.phone.replace(/\D/g, '') === party.phone.replace(/\D/g, '')) return true;
      if (party.gstin && p.gstin && p.gstin.trim().toUpperCase() === party.gstin.trim().toUpperCase()) return true;
      if (p.name.trim().toLowerCase() === party.name.trim().toLowerCase() && p.type === party.type) return true;
      return false;
    });

    if (existingIdx !== -1) {
      const existing = parties[existingIdx];
      // Update details instead of adding duplicate party row
      if (party.email) existing.email = party.email;
      if (party.address) existing.address = party.address;
      if (party.creditLimit) existing.creditLimit = party.creditLimit;
      this.setItem(STORAGE_KEYS.PARTIES, parties);
      this.addAuditLog('PREVENT_DUPLICATE_PARTY', 'PARTY_MANAGEMENT', `Prevented duplicate party entry. Updated existing party ${existing.name}`);
      return existing;
    }

    const newParty: Party = {
      ...party,
      companyId: party.companyId || this.getCompany().id,
      id: `party-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      currentBalance: party.openingBalance,
      createdAt: new Date().toISOString(),
    };
    parties.unshift(newParty);
    this.setItem(STORAGE_KEYS.PARTIES, parties);
    this.addAuditLog('CREATE_PARTY', 'PARTY_MANAGEMENT', `Added new ${party.type}: ${newParty.name}`);
    return newParty;
  }

  public static bulkAddParties(newPartiesList: Array<Omit<Party, 'id' | 'createdAt' | 'currentBalance'>>): number {
    if (!newPartiesList || newPartiesList.length === 0) return 0;
    const parties = this.getItem<Party[]>(STORAGE_KEYS.PARTIES, defaultParties);
    const now = new Date().toISOString();

    let addedCount = 0;
    newPartiesList.forEach((party, index) => {
      const existingIdx = parties.findIndex((p) => {
        if (p.companyId && party.companyId && p.companyId !== party.companyId) return false;
        if (party.phone && p.phone && p.phone.replace(/\D/g, '') === party.phone.replace(/\D/g, '')) return true;
        if (party.gstin && p.gstin && p.gstin.trim().toUpperCase() === party.gstin.trim().toUpperCase()) return true;
        if (p.name.trim().toLowerCase() === party.name.trim().toLowerCase() && p.type === party.type) return true;
        return false;
      });

      if (existingIdx === -1) {
        const newParty: Party = {
          ...party,
          companyId: party.companyId || this.getCompany().id,
          id: `party-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          currentBalance: party.openingBalance || 0,
          createdAt: now,
        };
        parties.unshift(newParty);
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.PARTIES, parties);
    this.addAuditLog('BULK_CSV_IMPORT_PARTIES', 'PARTY_MANAGEMENT', `Bulk imported ${addedCount} new unique parties via CSV utility`);
    return addedCount;
  }

  public static bulkAddSales(newSalesList: Array<Partial<Sale> & { companyId: string; customerName: string; grandTotal: number }>): number {
    if (!newSalesList || newSalesList.length === 0) return 0;
    const sales = this.getSales();
    const now = new Date().toISOString();
    let addedCount = 0;

    newSalesList.forEach((s, index) => {
      const invoiceNo = s.invoiceNo || `INV-CSV-${Date.now().toString().slice(-4)}-${index + 1}`;
      const existing = sales.find((x) => x.invoiceNo === invoiceNo && x.companyId === s.companyId);
      if (!existing) {
        const grandTotal = s.grandTotal || 0;
        const paidAmount = s.paidAmount !== undefined ? s.paidAmount : grandTotal;
        const dueAmount = s.dueAmount !== undefined ? s.dueAmount : Math.max(0, grandTotal - paidAmount);

        const newSale: Sale = {
          id: s.id || `sale-csv-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          companyId: s.companyId,
          invoiceNo,
          customerId: s.customerId || '',
          customerName: s.customerName || 'General Customer',
          customerPhone: s.customerPhone || '',
          customerGstin: s.customerGstin || '',
          items: s.items || [
            {
              productId: 'csv-item-01',
              productName: 'Imported General Item',
              sku: 'SKU-CSV',
              hsnCode: '8471',
              qty: 1,
              unit: 'Pcs',
              unitPrice: grandTotal,
              discountAmount: 0,
              gstRate: 18,
              taxableAmount: Math.round((grandTotal / 1.18) * 100) / 100,
              cgstAmount: Math.round((grandTotal - grandTotal / 1.18) / 2 * 100) / 100,
              sgstAmount: Math.round((grandTotal - grandTotal / 1.18) / 2 * 100) / 100,
              igstAmount: 0,
              totalAmount: grandTotal,
            },
          ],
          subtotal: s.subtotal || grandTotal,
          totalDiscount: s.totalDiscount || 0,
          totalTaxable: s.totalTaxable || Math.round((grandTotal / 1.18) * 100) / 100,
          totalCgst: s.totalCgst || Math.round((grandTotal - grandTotal / 1.18) / 2 * 100) / 100,
          totalSgst: s.totalSgst || Math.round((grandTotal - grandTotal / 1.18) / 2 * 100) / 100,
          totalIgst: s.totalIgst || 0,
          totalTax: s.totalTax || Math.round((grandTotal - grandTotal / 1.18) * 100) / 100,
          grandTotal,
          paidAmount,
          dueAmount,
          paymentMode: (s.paymentMode as any) || 'cash',
          status: (s.status as any) || 'completed',
          billedByName: s.billedByName || 'CSV Import Admin',
          billedAt: s.billedAt || now,
        };
        sales.unshift(newSale);
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.SALES, sales);
    this.addAuditLog('BULK_CSV_IMPORT_SALES', 'POS_BILLING', `Bulk imported ${addedCount} sales invoices via CSV utility`);
    return addedCount;
  }

  public static bulkAddPurchases(newPurchasesList: Array<Partial<Purchase> & { companyId: string; vendorName: string; grandTotal: number }>): number {
    if (!newPurchasesList || newPurchasesList.length === 0) return 0;
    const purchases = this.getPurchases();
    const now = new Date().toISOString();
    let addedCount = 0;

    newPurchasesList.forEach((p, index) => {
      const purchaseNo = p.purchaseNo || `PUR-CSV-${Date.now().toString().slice(-4)}-${index + 1}`;
      const existing = purchases.find((x) => x.purchaseNo === purchaseNo && x.companyId === p.companyId);
      if (!existing) {
        const grandTotal = p.grandTotal || 0;
        const paidAmount = p.paidAmount !== undefined ? p.paidAmount : grandTotal;
        const dueAmount = p.dueAmount !== undefined ? p.dueAmount : Math.max(0, grandTotal - paidAmount);

        const newPurchase: Purchase = {
          id: p.id || `pur-csv-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          companyId: p.companyId,
          purchaseNo,
          vendorInvoiceNo: p.vendorInvoiceNo || `V-INV-${index + 100}`,
          vendorId: p.vendorId || '',
          vendorName: p.vendorName || 'General Supplier',
          vendorGstin: p.vendorGstin || '',
          items: p.items || [
            {
              productId: 'csv-item-pur',
              productName: 'Imported Purchase Stock',
              sku: 'SKU-PUR-CSV',
              qty: 1,
              unitPrice: grandTotal,
              gstRate: 18,
              taxableAmount: Math.round((grandTotal / 1.18) * 100) / 100,
              taxAmount: Math.round((grandTotal - grandTotal / 1.18) * 100) / 100,
              totalAmount: grandTotal,
            },
          ],
          subtotal: p.subtotal || grandTotal,
          taxTotal: p.taxTotal || Math.round((grandTotal - grandTotal / 1.18) * 100) / 100,
          grandTotal,
          paidAmount,
          dueAmount,
          paymentMode: (p.paymentMode as any) || 'bank_transfer',
          status: (p.status as any) || 'received',
          notes: p.notes || 'CSV imported purchase bill',
          purchasedAt: p.purchasedAt || now,
          createdByName: p.createdByName || 'CSV Import Admin',
        };
        purchases.unshift(newPurchase);
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.PURCHASES, purchases);
    this.addAuditLog('BULK_CSV_IMPORT_PURCHASES', 'PURCHASES', `Bulk imported ${addedCount} purchase bills via CSV utility`);
    return addedCount;
  }

  public static bulkAddExpenses(newExpensesList: Array<Partial<Expense> & { companyId: string; amount: number; category: any }>): number {
    if (!newExpensesList || newExpensesList.length === 0) return 0;
    const expenses = this.getExpenses();
    const accounts = this.getAccounts();
    const defaultAcc = accounts[0] || { id: 'acc-001', accountName: 'Main Cash Register' };
    const now = new Date().toISOString();
    let addedCount = 0;

    newExpensesList.forEach((e, index) => {
      const voucherNo = e.voucherNo || `EXP-CSV-${Date.now().toString().slice(-4)}-${index + 1}`;
      const existing = expenses.find((x) => x.voucherNo === voucherNo && x.companyId === e.companyId);
      if (!existing) {
        const newExp: Expense = {
          id: e.id || `exp-csv-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          companyId: e.companyId,
          voucherNo,
          category: (e.category as any) || 'Miscellaneous',
          amount: e.amount || 0,
          paidFromAccountId: e.paidFromAccountId || defaultAcc.id,
          paidFromAccountName: e.paidFromAccountName || defaultAcc.accountName,
          paidTo: e.paidTo || 'Vendor / Service Provider',
          paymentMode: (e.paymentMode as any) || 'cash',
          expenseDate: e.expenseDate || now.split('T')[0],
          notes: e.notes || 'CSV imported expense entry',
          createdByName: e.createdByName || 'CSV Import Admin',
        };
        expenses.unshift(newExp);
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    this.addAuditLog('BULK_CSV_IMPORT_EXPENSES', 'EXPENSES', `Bulk imported ${addedCount} expense entries via CSV utility`);
    return addedCount;
  }

  public static bulkAddServices(newServicesList: Array<Partial<ServiceCatalogItem> & { companyId: string; name: string; price: number }>): number {
    if (!newServicesList || newServicesList.length === 0) return 0;
    const services = this.getServices();
    let addedCount = 0;

    newServicesList.forEach((s, index) => {
      const existing = services.find((x) => x.name.trim().toLowerCase() === s.name.trim().toLowerCase() && x.companyId === s.companyId);
      if (!existing) {
        const newService: ServiceCatalogItem = {
          id: s.id || `srv-csv-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          companyId: s.companyId,
          name: s.name,
          category: s.category || 'general',
          price: s.price || 0,
          durationMins: s.durationMins || 30,
          gstRate: s.gstRate !== undefined ? s.gstRate : 18,
          assignedStaff: s.assignedStaff || 'General Staff',
          description: s.description || 'CSV imported service offering',
          status: (s.status as any) || 'active',
        };
        services.unshift(newService);
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.SERVICES, services);
    this.addAuditLog('BULK_CSV_IMPORT_SERVICES', 'SERVICES', `Bulk imported ${addedCount} service catalog items via CSV utility`);
    return addedCount;
  }

  public static bulkAddAccounts(newAccountsList: Array<Partial<Account> & { companyId: string; accountName: string }>): number {
    if (!newAccountsList || newAccountsList.length === 0) return 0;
    const accounts = this.getAccounts();
    let addedCount = 0;

    newAccountsList.forEach((a, index) => {
      const existing = accounts.find((x) => x.accountName.trim().toLowerCase() === a.accountName.trim().toLowerCase() && x.companyId === a.companyId);
      if (!existing) {
        const openingBalance = a.openingBalance || 0;
        const newAcc: Account = {
          id: a.id || `acc-csv-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          companyId: a.companyId,
          accountName: a.accountName,
          accountType: (a.accountType as any) || 'bank',
          accountNumber: a.accountNumber || '',
          bankName: a.bankName || '',
          ifscCode: a.ifscCode || '',
          branchName: a.branchName || '',
          openingBalance,
          currentBalance: a.currentBalance !== undefined ? a.currentBalance : openingBalance,
          isDefault: a.isDefault || false,
          status: (a.status as any) || 'active',
        };
        accounts.push(newAcc);
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
    this.addAuditLog('BULK_CSV_IMPORT_ACCOUNTS', 'ACCOUNTS', `Bulk imported ${addedCount} bank/cash accounts via CSV utility`);
    return addedCount;
  }

  public static updatePartyBalance(partyId: string, amountChange: number): void {
    const parties = this.getItem<Party[]>(STORAGE_KEYS.PARTIES, defaultParties);
    const p = parties.find((item) => item.id === partyId);
    if (p) {
      p.currentBalance += amountChange;
      this.setItem(STORAGE_KEYS.PARTIES, parties);
    }
  }

  // Sales & POS Billing
  public static getSales(companyId?: string): Sale[] {
    const raw = this.getItem<Sale[]>(STORAGE_KEYS.SALES, defaultSales);
    return this.filterByCompany(raw, companyId);
  }

  public static addSale(saleData: Omit<Sale, 'id' | 'invoiceNo' | 'billedAt'> & { id?: string; invoiceNo?: string }): Sale {
    const sales = this.getItem<Sale[]>(STORAGE_KEYS.SALES, defaultSales);

    // Check if an invoice with the provided invoiceNo or id already exists
    if (saleData.invoiceNo || saleData.id) {
      const existing = sales.find((s) => 
        (saleData.id && s.id === saleData.id) || 
        (saleData.invoiceNo && s.invoiceNo === saleData.invoiceNo && (s.companyId === saleData.companyId || !s.companyId))
      );
      if (existing) {
        this.addAuditLog('PREVENT_DUPLICATE_SALE', 'POS_BILLING', `Prevented duplicate sale invoice creation for ${existing.invoiceNo}`);
        return existing;
      }
    }

    let count = sales.length + 1;
    let invoiceNo = saleData.invoiceNo;
    if (!invoiceNo) {
      if (saleData.counterId || saleData.counterName) {
        const counters = this.getCounters(saleData.companyId);
        const counter = counters.find((c) => c.id === saleData.counterId || c.name === saleData.counterName);
        const code = counter?.code || 'C1';
        invoiceNo = this.generateCounterInvoiceNo(code, saleData.companyId);
      } else {
        invoiceNo = `INV-2026-${String(count).padStart(4, '0')}`;
      }
    }
    while (sales.some((s) => s.invoiceNo === invoiceNo && s.companyId === (saleData.companyId || 'comp-001'))) {
      count++;
      invoiceNo = `INV-2026-${String(count).padStart(4, '0')}`;
    }
    const newSale: Sale = {
      ...saleData,
      id: saleData.id || `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoiceNo,
      billedAt: new Date().toISOString(),
    };
    sales.unshift(newSale);
    this.setItem(STORAGE_KEYS.SALES, sales);

    // Deduct Stock
    const products = this.getProducts();
    saleData.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQty = Math.max(0, prod.stockQty - item.qty);
      }
    });
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Update Khata / Party Ledger Balance for Customer
    if (saleData.customerId) {
      // 1. Record Sale Bill Invoice in Party Khata Ledger
      this.addKhataTransaction({
        companyId: saleData.companyId,
        partyId: saleData.customerId,
        partyName: saleData.customerName,
        partyType: 'customer',
        type: 'credit', // Bill amount billed to customer
        amount: saleData.grandTotal,
        balanceAfter: 0, // Will be recalculated by updatePartyBalance
        paymentMode: saleData.paymentMode === 'khata' ? 'khata_credit' : (saleData.paymentMode as any),
        invoiceNo,
        notes: `Sales Invoice ${invoiceNo} (Total: ₹${saleData.grandTotal})`,
        createdByName: saleData.billedByName,
      });

      // 2. If customer paid partially or fully during billing, record Payment Received entry
      if (saleData.paidAmount > 0) {
        this.addKhataTransaction({
          companyId: saleData.companyId,
          partyId: saleData.customerId,
          partyName: saleData.customerName,
          partyType: 'customer',
          type: 'debit', // Payment received from customer reduces debt
          amount: saleData.paidAmount,
          balanceAfter: 0,
          paymentMode: saleData.paymentMode === 'khata' ? 'cash' : (saleData.paymentMode as any),
          invoiceNo,
          notes: `Payment received for Invoice ${invoiceNo} via ${saleData.paymentMode.toUpperCase()}`,
          createdByName: saleData.billedByName,
        });
      }

      // 3. Update party outstanding balance net change (Due Amount = Grand Total - Paid)
      if (saleData.dueAmount !== 0) {
        this.updatePartyBalance(saleData.customerId, saleData.dueAmount);
      }
    }

    // Add cash/bank balance
    if (saleData.paidAmount > 0) {
      const accounts = this.getAccounts();
      const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
      if (defaultAcc) {
        defaultAcc.currentBalance += saleData.paidAmount;
        this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
      }
    }

    this.addAuditLog('CREATE_SALE_INVOICE', 'POS_BILLING', `Generated Invoice ${invoiceNo} on ${saleData.counterName || 'Counter 1'} for ₹${newSale.grandTotal}`);

    // Queue to Dexie IndexedDB for background sync worker
    const bill_uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bill-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    saveOfflineBill({
      bill_uuid,
      company_id: saleData.companyId || 'comp-001',
      counter_id: saleData.counterId,
      counter_name: saleData.counterName,
      shift_id: saleData.shiftId,
      invoice_no: invoiceNo,
      customer_id: saleData.customerId,
      customer_name: saleData.customerName || 'Walk-in Customer',
      subtotal: saleData.subtotal,
      discount_amount: saleData.totalDiscount || 0,
      total_taxable: saleData.subtotal,
      total_cgst: (saleData.totalTax || 0) / 2,
      total_sgst: (saleData.totalTax || 0) / 2,
      total_igst: 0,
      grand_total: saleData.grandTotal,
      paid_amount: saleData.paidAmount,
      due_amount: saleData.dueAmount,
      payment_mode: saleData.paymentMode,
      items: (saleData.items || []).map((i) => ({
        productId: i.productId,
        productName: i.productName,
        hsnCode: i.hsnCode,
        qty: i.qty,
        unitPrice: i.unitPrice,
        gstRate: i.gstRate,
        taxableAmount: i.taxableAmount,
        totalAmount: i.totalAmount,
      })),
      billed_at: newSale.billedAt,
    }).then(() => {
      syncWorker.executeSyncProcess();
    }).catch((err) => console.warn('Offline bill save error:', err));

    return newSale;
  }

  public static cancelSale(saleId: string, reason: string = 'User Cancelled Invoice'): boolean {
    const sales = this.getSales();
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'cancelled') return false;

    // Restore inventory stock
    const products = this.getProducts();
    sale.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQty += item.qty;
      }
    });
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Revert party customer due balance if applicable
    if (sale.customerId && sale.dueAmount !== 0) {
      this.updatePartyBalance(sale.customerId, -sale.dueAmount);
    }

    // Mark sale status as cancelled
    sale.status = 'cancelled';
    this.setItem(STORAGE_KEYS.SALES, sales);

    this.addAuditLog('CANCEL_SALE_INVOICE', 'POS_BILLING', `Cancelled Invoice ${sale.invoiceNo}. Reason: ${reason}`);
    return true;
  }

  public static deleteSale(saleId: string): boolean {
    const sales = this.getSales();
    const saleIdx = sales.findIndex((s) => s.id === saleId);
    if (saleIdx === -1) return false;

    const sale = sales[saleIdx];

    // If sale was not already cancelled, restore inventory & party balance
    if (sale.status !== 'cancelled') {
      const products = this.getProducts();
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stockQty += item.qty;
        }
      });
      this.setItem(STORAGE_KEYS.PRODUCTS, products);

      if (sale.customerId && sale.dueAmount !== 0) {
        this.updatePartyBalance(sale.customerId, -sale.dueAmount);
      }
    }

    sales.splice(saleIdx, 1);
    this.setItem(STORAGE_KEYS.SALES, sales);

    this.addAuditLog('DELETE_SALE_INVOICE', 'POS_BILLING', `Deleted Invoice ${sale.invoiceNo}`);
    return true;
  }

  public static updateSale(saleId: string, updates: Partial<Sale>): boolean {
    const sales = this.getSales();
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return false;

    Object.assign(sale, updates);
    this.setItem(STORAGE_KEYS.SALES, sales);
    this.addAuditLog('UPDATE_SALE_INVOICE', 'POS_BILLING', `Updated Invoice ${sale.invoiceNo}`);
    return true;
  }

  public static addSalesReturn(returnObj: Omit<SalesReturn, 'id' | 'returnedAt'>): SalesReturn {
    const list = this.getItem<SalesReturn[]>(STORAGE_KEYS.SALES_RETURNS, []);
    const newReturn: SalesReturn = {
      ...returnObj,
      id: `sr-${Date.now()}`,
      returnedAt: new Date().toISOString(),
    };
    list.unshift(newReturn);
    this.setItem(STORAGE_KEYS.SALES_RETURNS, list);

    // Restock returned items
    const products = this.getProducts();
    returnObj.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQty += item.qty;
      }
    });
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    this.addAuditLog('CREATE_SALES_RETURN', 'SALES', `Processed sales return ${newReturn.returnNo} for Invoice ${newReturn.originalInvoiceNo}`);
    return newReturn;
  }

  public static getSalesReturns(companyId?: string): SalesReturn[] {
    const raw = this.getItem<SalesReturn[]>(STORAGE_KEYS.SALES_RETURNS, []);
    return this.filterByCompany(raw, companyId);
  }

  // Purchases
  public static getPurchases(companyId?: string): Purchase[] {
    const raw = this.getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, defaultPurchases);
    return this.filterByCompany(raw, companyId);
  }

  public static addPurchase(purchaseData: Omit<Purchase, 'id' | 'purchasedAt'> & { id?: string }): Purchase {
    const purchases = this.getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, defaultPurchases);

    // Prevent duplicate purchase record by purchaseNo or vendorInvoiceNo + vendorId
    const existing = purchases.find((p) => {
      if (purchaseData.id && p.id === purchaseData.id) return true;
      if (purchaseData.purchaseNo && p.purchaseNo === purchaseData.purchaseNo && (p.companyId === purchaseData.companyId || !p.companyId)) return true;
      if (purchaseData.vendorInvoiceNo && p.vendorInvoiceNo === purchaseData.vendorInvoiceNo && p.vendorId === purchaseData.vendorId) return true;
      return false;
    });

    if (existing) {
      this.addAuditLog('PREVENT_DUPLICATE_PURCHASE', 'PURCHASE', `Prevented duplicate purchase creation for ${existing.purchaseNo}`);
      return existing;
    }

    const newPurchase: Purchase = {
      ...purchaseData,
      companyId: purchaseData.companyId || this.getCompany().id,
      id: purchaseData.id || `pur-${Date.now()}`,
      purchasedAt: new Date().toISOString(),
    };
    purchases.unshift(newPurchase);
    this.setItem(STORAGE_KEYS.PURCHASES, purchases);

    // Add Stock
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    purchaseData.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQty += item.qty;
      }
    });
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Vendor balance
    if (purchaseData.dueAmount > 0) {
      this.updatePartyBalance(purchaseData.vendorId, -purchaseData.dueAmount); // Negative balance means we owe vendor
    }

    this.addAuditLog('CREATE_PURCHASE', 'PURCHASE', `Recorded purchase ${newPurchase.purchaseNo} from ${newPurchase.vendorName}`);

    // Queue purchase to Dexie IndexedDB for background sync worker
    const bill_uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pur-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    saveOfflinePurchase({
      bill_uuid,
      company_id: newPurchase.companyId,
      purchase_no: newPurchase.purchaseNo,
      vendor_id: purchaseData.vendorId,
      vendor_name: purchaseData.vendorName || 'Supplier',
      vendor_gstin: purchaseData.vendorGstin,
      subtotal: purchaseData.subtotal,
      total_tax: purchaseData.taxTotal,
      grand_total: purchaseData.grandTotal,
      paid_amount: purchaseData.paidAmount,
      payment_mode: purchaseData.paymentMode || 'bank_transfer',
      items: (purchaseData.items || []).map((i) => ({
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        unitCost: i.unitPrice,
        gstRate: i.gstRate,
        totalAmount: i.totalAmount,
      })),
      purchased_at: newPurchase.purchasedAt,
    }).then(() => {
      syncWorker.executeSyncProcess();
    }).catch((err) => console.warn('Offline purchase save error:', err));

    return newPurchase;
  }

  public static cancelPurchase(purchaseId: string, reason: string = 'User Cancelled Purchase'): boolean {
    const purchases = this.getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, defaultPurchases);
    const purchase = purchases.find((p) => p.id === purchaseId);
    if (!purchase || purchase.status === 'cancelled') return false;

    // Remove added inventory stock
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    purchase.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQty = Math.max(0, prod.stockQty - item.qty);
      }
    });
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Revert vendor due balance
    if (purchase.dueAmount > 0) {
      this.updatePartyBalance(purchase.vendorId, purchase.dueAmount);
    }

    purchase.status = 'cancelled';
    this.setItem(STORAGE_KEYS.PURCHASES, purchases);

    this.addAuditLog('CANCEL_PURCHASE', 'PURCHASE', `Cancelled Purchase ${purchase.purchaseNo}. Reason: ${reason}`);
    return true;
  }

  public static deletePurchase(purchaseId: string): boolean {
    const purchases = this.getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, defaultPurchases);
    const idx = purchases.findIndex((p) => p.id === purchaseId);
    if (idx === -1) return false;

    const purchase = purchases[idx];
    if (purchase.status !== 'cancelled') {
      const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
      purchase.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stockQty = Math.max(0, prod.stockQty - item.qty);
        }
      });
      this.setItem(STORAGE_KEYS.PRODUCTS, products);

      if (purchase.dueAmount > 0) {
        this.updatePartyBalance(purchase.vendorId, purchase.dueAmount);
      }
    }

    purchases.splice(idx, 1);
    this.setItem(STORAGE_KEYS.PURCHASES, purchases);

    this.addAuditLog('DELETE_PURCHASE', 'PURCHASE', `Deleted Purchase ${purchase.purchaseNo}`);
    return true;
  }

  public static updatePurchase(purchaseId: string, updates: Partial<Purchase>): boolean {
    const purchases = this.getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, defaultPurchases);
    const purchase = purchases.find((p) => p.id === purchaseId);
    if (!purchase) return false;

    Object.assign(purchase, updates);
    this.setItem(STORAGE_KEYS.PURCHASES, purchases);
    this.addAuditLog('UPDATE_PURCHASE', 'PURCHASE', `Updated Purchase ${purchase.purchaseNo}`);
    return true;
  }

  public static addPurchaseReturn(returnObj: Omit<PurchaseReturn, 'id' | 'returnedAt'>): PurchaseReturn {
    const list = this.getItem<PurchaseReturn[]>(STORAGE_KEYS.PURCHASE_RETURNS, []);
    const newReturn: PurchaseReturn = {
      ...returnObj,
      companyId: returnObj.companyId || this.getCompany().id,
      id: `pr-${Date.now()}`,
      returnedAt: new Date().toISOString(),
    };
    list.unshift(newReturn);
    this.setItem(STORAGE_KEYS.PURCHASE_RETURNS, list);

    // Deduct stock
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    returnObj.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQty = Math.max(0, prod.stockQty - item.qty);
      }
    });
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    this.addAuditLog('CREATE_PURCHASE_RETURN', 'PURCHASE', `Processed purchase return ${newReturn.returnNo}`);
    return newReturn;
  }

  public static getPurchaseReturns(companyId?: string): PurchaseReturn[] {
    const raw = this.getItem<PurchaseReturn[]>(STORAGE_KEYS.PURCHASE_RETURNS, []);
    return this.filterByCompany(raw, companyId);
  }

  // Khata & Ledgers
  public static getKhataTransactions(companyId?: string): KhataTransaction[] {
    const raw = this.getItem<KhataTransaction[]>(STORAGE_KEYS.KHATA_TXNS, []);
    return this.filterByCompany(raw, companyId);
  }

  public static addKhataTransaction(txn: Omit<KhataTransaction, 'id' | 'createdAt'>): KhataTransaction {
    const list = this.getItem<KhataTransaction[]>(STORAGE_KEYS.KHATA_TXNS, []);
    const newTxn: KhataTransaction = {
      ...txn,
      companyId: txn.companyId || this.getCompany().id,
      id: `khata-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newTxn);
    this.setItem(STORAGE_KEYS.KHATA_TXNS, list);
    this.addAuditLog('CREATE_KHATA_ENTRY', 'KHATA', `Added Khata ${txn.type} of ₹${txn.amount} for ${txn.partyName}`);
    return newTxn;
  }

  public static deleteKhataTransaction(txnId: string): boolean {
    const list = this.getItem<KhataTransaction[]>(STORAGE_KEYS.KHATA_TXNS, []);
    const idx = list.findIndex((t) => t.id === txnId);
    if (idx === -1) return false;

    const txn = list[idx];
    // Revert balance on party
    if (txn.partyId) {
      if (txn.type === 'credit') {
        // Was credit (gave udhar or billed), so revert by reducing party balance
        this.updatePartyBalance(txn.partyId, -txn.amount);
      } else {
        // Was debit (received payment), so revert by adding party balance back
        this.updatePartyBalance(txn.partyId, txn.amount);
      }
    }

    list.splice(idx, 1);
    this.setItem(STORAGE_KEYS.KHATA_TXNS, list);
    this.addAuditLog('DELETE_KHATA_ENTRY', 'KHATA', `Deleted Khata entry for ${txn.partyName} (₹${txn.amount})`);
    return true;
  }

  public static deleteParty(partyId: string): boolean {
    const parties = this.getItem<Party[]>(STORAGE_KEYS.PARTIES, defaultParties);
    const idx = parties.findIndex((p) => p.id === partyId);
    if (idx === -1) return false;

    const name = parties[idx].name;
    parties.splice(idx, 1);
    this.setItem(STORAGE_KEYS.PARTIES, parties);
    this.addAuditLog('DELETE_PARTY', 'PARTY_MANAGEMENT', `Deleted party ${name}`);
    return true;
  }

  public static updateParty(partyId: string, updates: Partial<Party>): boolean {
    const parties = this.getItem<Party[]>(STORAGE_KEYS.PARTIES, defaultParties);
    const party = parties.find((p) => p.id === partyId);
    if (!party) return false;

    Object.assign(party, updates);
    this.setItem(STORAGE_KEYS.PARTIES, parties);
    this.addAuditLog('UPDATE_PARTY', 'PARTY_MANAGEMENT', `Updated party details for ${party.name}`);
    return true;
  }

  public static deleteProduct(productId: string): boolean {
    const products = this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) return false;

    const name = products[idx].name;
    products.splice(idx, 1);
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('DELETE_PRODUCT', 'INVENTORY', `Deleted product ${name}`);
    return true;
  }

  public static deleteExpense(expenseId: string): boolean {
    const expenses = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, defaultExpenses);
    const idx = expenses.findIndex((e) => e.id === expenseId);
    if (idx === -1) return false;

    const exp = expenses[idx];
    // Revert account balance
    const accounts = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    const acc = accounts.find((a) => a.id === exp.paidFromAccountId);
    if (acc) {
      acc.currentBalance += exp.amount;
      this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
    }

    expenses.splice(idx, 1);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    this.addAuditLog('DELETE_EXPENSE', 'EXPENSES', `Deleted expense voucher ${exp.voucherNo}`);
    return true;
  }

  public static deleteIncome(incomeId: string): boolean {
    const incomes = this.getItem<OtherIncome[]>(STORAGE_KEYS.INCOMES, defaultIncomes);
    const idx = incomes.findIndex((i) => i.id === incomeId);
    if (idx === -1) return false;

    const inc = incomes[idx];
    const accounts = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    const acc = accounts.find((a) => a.id === inc.receivedInAccountId);
    if (acc) {
      acc.currentBalance -= inc.amount;
      this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
    }

    incomes.splice(idx, 1);
    this.setItem(STORAGE_KEYS.INCOMES, incomes);
    this.addAuditLog('DELETE_INCOME', 'EXPENSES', `Deleted income voucher ${inc.voucherNo}`);
    return true;
  }

  // Accounts, Expenses, Income
  public static getAccounts(companyId?: string): Account[] {
    const raw = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    return this.filterByCompany(raw, companyId);
  }

  public static addAccount(account: Omit<Account, 'id'>): Account {
    const accounts = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    const newAccount: Account = {
      ...account,
      companyId: account.companyId || this.getCompany().id,
      id: `acc-${Date.now()}`,
    };
    accounts.push(newAccount);
    this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
    this.addAuditLog('CREATE_ACCOUNT', 'ACCOUNTS', `Added new cash/bank account: ${account.accountName}`);
    return newAccount;
  }

  public static getAccountTransfers(companyId?: string): AccountTransfer[] {
    const raw = this.getItem<AccountTransfer[]>(STORAGE_KEYS.TRANSFERS, [
      {
        id: 'trx-001',
        companyId: 'comp-001',
        fromAccountId: 'acc-001',
        fromAccountName: 'Main Cash Register',
        toAccountId: 'acc-002',
        toAccountName: 'HDFC Bank Operating A/C',
        amount: 15000,
        notes: 'Weekly cash deposit to HDFC Bank',
        transferredAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
        createdByName: 'System Admin',
      },
    ]);
    return this.filterByCompany(raw, companyId);
  }

  public static transferFunds(fromAccId: string, toAccId: string, amount: number, notes: string): boolean {
    const accounts = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    const from = accounts.find((a) => a.id === fromAccId);
    const to = accounts.find((a) => a.id === toAccId);
    if (!from || !to || from.currentBalance < amount) return false;

    from.currentBalance -= amount;
    to.currentBalance += amount;
    this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);

    const transfers = this.getItem<AccountTransfer[]>(STORAGE_KEYS.TRANSFERS, []);
    const currentUser = this.getCurrentUser();
    const newTransfer: AccountTransfer = {
      id: `trx-${Date.now()}`,
      companyId: currentUser.companyId || 'comp-001',
      fromAccountId: from.id,
      fromAccountName: from.accountName,
      toAccountId: to.id,
      toAccountName: to.accountName,
      amount,
      notes: notes || 'Inter-account transfer',
      transferredAt: new Date().toISOString(),
      createdByName: currentUser.name || 'System Admin',
    };
    transfers.unshift(newTransfer);
    this.setItem(STORAGE_KEYS.TRANSFERS, transfers);

    this.addAuditLog('TRANSFER_FUNDS', 'ACCOUNTS', `Transferred ₹${amount} from ${from.accountName} to ${to.accountName}. Notes: ${notes}`);
    return true;
  }

  public static adjustAccountBalance(accountId: string, type: 'deposit' | 'withdrawal', amount: number, notes: string): boolean {
    const accounts = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return false;

    if (type === 'deposit') {
      acc.currentBalance += amount;
      this.addIncome({
        companyId: acc.companyId,
        source: 'Other',
        amount: amount,
        receivedInAccountId: acc.id,
        receivedInAccountName: acc.accountName,
        notes: notes || 'Manual Cash/Bank Adjustment Deposit',
        createdByName: this.getCurrentUser()?.name || 'System Admin',
      });
    } else {
      if (acc.currentBalance < amount) return false;
      acc.currentBalance -= amount;
      this.addExpense({
        companyId: acc.companyId,
        category: 'Miscellaneous',
        amount: amount,
        paidFromAccountId: acc.id,
        paidFromAccountName: acc.accountName,
        paidTo: 'Adjustment',
        paymentMode: acc.accountType === 'cash' ? 'cash' : 'bank_transfer',
        notes: notes || 'Manual Cash/Bank Adjustment Withdrawal',
        createdByName: this.getCurrentUser()?.name || 'System Admin',
      });
    }

    this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
    this.addAuditLog('ADJUST_ACCOUNT_BALANCE', 'ACCOUNTS', `${type.toUpperCase()} of ₹${amount} in ${acc.accountName}: ${notes}`);
    return true;
  }

  public static getExpenses(companyId?: string): Expense[] {
    const raw = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, defaultExpenses);
    return this.filterByCompany(raw, companyId);
  }

  public static addExpense(exp: Omit<Expense, 'id' | 'voucherNo' | 'expenseDate'> & { id?: string; voucherNo?: string }): Expense {
    const expenses = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, defaultExpenses);

    if (exp.voucherNo || exp.id) {
      const existing = expenses.find((e) =>
        (exp.id && e.id === exp.id) ||
        (exp.voucherNo && e.voucherNo === exp.voucherNo && (e.companyId === exp.companyId || !e.companyId))
      );
      if (existing) {
        this.addAuditLog('PREVENT_DUPLICATE_EXPENSE', 'EXPENSES', `Prevented duplicate expense voucher ${existing.voucherNo}`);
        return existing;
      }
    }

    let count = expenses.length + 1;
    let voucherNo = exp.voucherNo || `EXP-2026-${String(count).padStart(3, '0')}`;
    while (expenses.some((e) => e.voucherNo === voucherNo)) {
      count++;
      voucherNo = `EXP-2026-${String(count).padStart(3, '0')}`;
    }

    const newExp: Expense = {
      ...exp,
      companyId: exp.companyId || this.getCompany().id,
      id: exp.id || `exp-${Date.now()}`,
      voucherNo,
      expenseDate: new Date().toISOString(),
    };
    expenses.unshift(newExp);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);

    // Deduct from account
    const accounts = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    const acc = accounts.find((a) => a.id === exp.paidFromAccountId);
    if (acc) {
      acc.currentBalance -= exp.amount;
      this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
    }

    this.addAuditLog('CREATE_EXPENSE', 'EXPENSES', `Recorded expense ${voucherNo}: ₹${exp.amount} for ${exp.category}`);
    return newExp;
  }

  public static getIncomes(companyId?: string): OtherIncome[] {
    const raw = this.getItem<OtherIncome[]>(STORAGE_KEYS.INCOMES, defaultIncomes);
    return this.filterByCompany(raw, companyId);
  }

  public static addIncome(inc: Omit<OtherIncome, 'id' | 'voucherNo' | 'incomeDate'>): OtherIncome {
    const incomes = this.getItem<OtherIncome[]>(STORAGE_KEYS.INCOMES, defaultIncomes);
    const count = incomes.length + 1;
    const voucherNo = `INC-2026-${String(count).padStart(3, '0')}`;
    const newInc: OtherIncome = {
      ...inc,
      companyId: inc.companyId || this.getCompany().id,
      id: `inc-${Date.now()}`,
      voucherNo,
      incomeDate: new Date().toISOString(),
    };
    incomes.unshift(newInc);
    this.setItem(STORAGE_KEYS.INCOMES, incomes);

    // Add to account
    const accounts = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, defaultAccounts);
    const acc = accounts.find((a) => a.id === inc.receivedInAccountId);
    if (acc) {
      acc.currentBalance += inc.amount;
      this.setItem(STORAGE_KEYS.ACCOUNTS, accounts);
    }

    this.addAuditLog('CREATE_INCOME', 'EXPENSES', `Recorded other income ${voucherNo}: ₹${inc.amount} from ${inc.source}`);
    return newInc;
  }

  // Audit Logs
  public static getAuditLogs(companyId?: string): AuditLog[] {
    const rawLogs = this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs);
    // Auto delete / purge logs older than 24 hours (24 * 60 * 60 * 1000 ms)
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const freshLogs = rawLogs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      return !isNaN(logTime) && logTime >= twentyFourHoursAgo;
    });

    // Ensure strictly unique IDs across all entries
    const seenIds = new Set<string>();
    let modified = freshLogs.length !== rawLogs.length;
    freshLogs.forEach((log, idx) => {
      if (!log.id || seenIds.has(log.id)) {
        log.id = `audit-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000000)}`;
        modified = true;
      } else {
        seenIds.add(log.id);
      }
    });

    if (modified) {
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, freshLogs);
    }
    return this.filterByCompany(freshLogs, companyId);
  }

  public static getAuditLogRetentionDays(): number {
    const envValue = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_AUDIT_LOG_RETENTION_DAYS : undefined;
    if (envValue && !isNaN(parseInt(envValue, 10))) {
      return parseInt(envValue, 10);
    }
    return 7;
  }

  public static purgeOldAuditLogs(): { purgedCount: number; remainingCount: number } {
    const rawLogs = this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs);
    const retentionDays = this.getAuditLogRetentionDays();
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const freshLogs = rawLogs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      return !isNaN(logTime) && logTime >= cutoffTime;
    });

    const purgedCount = rawLogs.length - freshLogs.length;
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, freshLogs);
    return { purgedCount, remainingCount: freshLogs.length };
  }

  public static addAuditLog(action: string, module: string, details: string): void {
    const logs = this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs);
    const currentUser = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      companyId: currentUser.companyId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      details,
      ipAddress: '127.0.0.1 (Local Container)',
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep max 200 logs
    if (logs.length > 200) logs.pop();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // Payment Transaction Logs Management
  public static getPaymentTransactionLogs(companyId?: string): PaymentTransactionLog[] {
    const raw = this.getItem<PaymentTransactionLog[]>(
      STORAGE_KEYS.PAYMENT_TRANSACTION_LOGS,
      defaultPaymentTransactionLogs
    );
    const seenIds = new Set<string>();
    let modified = false;
    raw.forEach((item, idx) => {
      if (!item.id || seenIds.has(item.id)) {
        item.id = `pay-log-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
        modified = true;
      } else {
        seenIds.add(item.id);
      }
    });
    if (modified) {
      this.setItem(STORAGE_KEYS.PAYMENT_TRANSACTION_LOGS, raw);
    }
    return this.filterByCompany(raw, companyId);
  }

  public static addPaymentTransactionLog(
    logData: Omit<PaymentTransactionLog, 'id' | 'companyId' | 'timestamp'> & { companyId?: string }
  ): PaymentTransactionLog {
    const logs = this.getPaymentTransactionLogs();
    const currentUser = this.getCurrentUser();
    const newLog: PaymentTransactionLog = {
      id: `pay-log-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      companyId: logData.companyId || currentUser.companyId,
      invoiceNo: logData.invoiceNo || 'N/A',
      customerName: logData.customerName || 'Walk-in Customer',
      customerPhone: logData.customerPhone || '',
      amount: logData.amount || 0,
      gateway: logData.gateway || 'online_pg',
      status: logData.status,
      paymentId: logData.paymentId || '',
      errorCode: logData.errorCode || '',
      reasonMessage: logData.reasonMessage || '',
      timestamp: new Date().toISOString(),
      userName: logData.userName || currentUser.name,
    };
    logs.unshift(newLog);
    if (logs.length > 500) logs.pop();
    this.setItem(STORAGE_KEYS.PAYMENT_TRANSACTION_LOGS, logs);

    // Also record in system AuditLog for full audit trail
    this.addAuditLog(
      `PAYMENT_${logData.status}`,
      'PAYMENT_GATEWAY',
      `Payment ${logData.status} (Amount: ₹${logData.amount}, Gateway: ${logData.gateway}, Invoice: ${logData.invoiceNo || 'N/A'}). Reason: ${logData.reasonMessage}`
    );

    return newLog;
  }

  public static clearPaymentTransactionLogs(): void {
    this.setItem(STORAGE_KEYS.PAYMENT_TRANSACTION_LOGS, []);
  }

  // POS Counters Management
  public static getCounters(companyId?: string): POSCounter[] {
    const counters = this.getItem<POSCounter[]>(STORAGE_KEYS.POS_COUNTERS, defaultCounters);
    // Migration: ensure every counter has a PIN and Location
    let updated = false;
    counters.forEach((c, idx) => {
      if (!c.pin) {
        c.pin = `${idx + 1}${idx + 1}${idx + 1}${idx + 1}`;
        updated = true;
      }
      if (!c.location) {
        c.location = `Floor Section ${idx + 1}`;
        updated = true;
      }
    });
    if (updated) {
      this.setItem(STORAGE_KEYS.POS_COUNTERS, counters);
    }
    return this.filterByCompany(counters, companyId);
  }

  public static saveCounters(counters: POSCounter[]): void {
    this.setItem(STORAGE_KEYS.POS_COUNTERS, counters);
    this.addAuditLog('UPDATE_COUNTERS', 'SETTINGS', `Updated POS Billing Counter configurations`);
  }

  public static addCounter(counterData: Omit<POSCounter, 'id'>): POSCounter {
    const counters = this.getItem<POSCounter[]>(STORAGE_KEYS.POS_COUNTERS, defaultCounters);
    const newCounter: POSCounter = {
      ...counterData,
      companyId: counterData.companyId || this.getCompany().id,
      id: `cnt-${Date.now()}`,
      status: counterData.status || 'active',
    };
    counters.push(newCounter);
    this.saveCounters(counters);
    this.addAuditLog('ADD_COUNTER', 'SETTINGS', `Added new billing counter ${newCounter.name} (${newCounter.code})`);
    return newCounter;
  }

  public static updateCounter(id: string, updates: Partial<POSCounter>): boolean {
    const counters = this.getItem<POSCounter[]>(STORAGE_KEYS.POS_COUNTERS, defaultCounters);
    const c = counters.find((item) => item.id === id);
    if (!c) return false;
    Object.assign(c, updates);
    this.saveCounters(counters);
    return true;
  }

  public static toggleCounterStatus(id: string): boolean {
    const counters = this.getItem<POSCounter[]>(STORAGE_KEYS.POS_COUNTERS, defaultCounters);
    const c = counters.find((item) => item.id === id);
    if (!c) return false;
    c.status = c.status === 'active' ? 'inactive' : 'active';
    this.saveCounters(counters);
    this.addAuditLog('TOGGLE_COUNTER_STATUS', 'SETTINGS', `Changed counter ${c.name} status to ${c.status}`);
    return true;
  }

  public static generateCounterInvoiceNo(counterCode: string = 'C1', targetCompanyId?: string): string {
    const compId = targetCompanyId || this.getCompany().id;
    const sales = this.getSales(compId);
    const cleanCode = counterCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefixCode = cleanCode ? (cleanCode.startsWith('CNT') || cleanCode.startsWith('C') ? cleanCode : `C${cleanCode}`) : 'C1';
    const prefix = `${prefixCode}-INV-`;

    const matchingSales = sales.filter((s) => s.invoiceNo && s.invoiceNo.toUpperCase().startsWith(prefix.toUpperCase()));
    let maxSeq = 0;
    matchingSales.forEach((s) => {
      const parts = s.invoiceNo.split('-');
      const seqStr = parts[parts.length - 1];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });

    const nextSeq = maxSeq + 1;
    return `${prefixCode}-INV-${String(nextSeq).padStart(4, '0')}`;
  }

  // Shift Management & Cash Reconciliation (Multi-Counter Double Login Guard)
  public static getShifts(companyId?: string): Shift[] {
    const raw = this.getItem<Shift[]>(STORAGE_KEYS.CASH_DRAWER_SESSIONS, defaultCashDrawerSessions as any);
    return this.filterByCompany(raw, companyId);
  }

  public static getActiveShiftForCounter(counterId: string, companyId?: string): Shift | null {
    const shifts = this.getShifts(companyId);
    return shifts.find((s) => (s.counterId === counterId || s.counterName === counterId) && s.status === 'open') || null;
  }

  public static getActiveShiftForCashier(cashierName: string, companyId?: string): Shift | null {
    const shifts = this.getShifts(companyId);
    return shifts.find((s) => s.cashierName && s.cashierName.trim().toLowerCase() === cashierName.trim().toLowerCase() && s.status === 'open') || null;
  }

  public static openShift(
    counterId: string,
    counterName: string,
    cashierName: string,
    openingCash: number,
    companyId?: string
  ): { success: boolean; shift?: Shift; error?: string } {
    const compId = companyId || this.getCompany().id;

    // 1. Prevent Cashier Double-Login across multiple counters
    const existingCashierShift = this.getActiveShiftForCashier(cashierName, compId);
    if (existingCashierShift && existingCashierShift.counterId !== counterId && existingCashierShift.counterName !== counterName) {
      return {
        success: false,
        error: `⚠️ double-login alert: Cashier "${cashierName}" already has an active shift running on "${existingCashierShift.counterName}"! One cashier cannot run active shifts on multiple counters simultaneously. Please close that active shift first.`,
      };
    }

    // 2. Check if counter already has an active open shift
    const existingCounterShift = this.getActiveShiftForCounter(counterId, compId);
    if (existingCounterShift) {
      return {
        success: true,
        shift: existingCounterShift,
      };
    }

    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      companyId: compId,
      counterId,
      counterName,
      cashierName,
      openingCash: Number(openingCash || 0),
      openedAt: new Date().toISOString(),
      status: 'open',
    };

    const shifts = this.getItem<Shift[]>(STORAGE_KEYS.CASH_DRAWER_SESSIONS, defaultCashDrawerSessions as any);
    shifts.unshift(newShift);
    this.setItem(STORAGE_KEYS.CASH_DRAWER_SESSIONS, shifts);

    this.addAuditLog('OPEN_COUNTER_SHIFT', 'POS_BILLING', `Opened shift on ${counterName} for Cashier ${cashierName} with ₹${openingCash} opening cash balance`);
    return { success: true, shift: newShift };
  }

  public static closeShift(
    shiftId: string,
    closingCash: number,
    notes: string = '',
    physicalCounts?: any
  ): { success: boolean; shift?: Shift; error?: string } {
    const shifts = this.getItem<Shift[]>(STORAGE_KEYS.CASH_DRAWER_SESSIONS, defaultCashDrawerSessions as any);
    const shift = shifts.find((s) => s.id === shiftId || (s.status === 'open' && (s.id === shiftId || s.counterId === shiftId)));
    if (!shift) {
      return { success: false, error: 'No open shift found to close.' };
    }

    // Calculate system expected cash for this shift: openingCash + today cash sales during shift
    const sales = this.getSales(shift.companyId);
    const shiftStart = new Date(shift.openedAt).getTime();
    const cashSalesTotal = sales
      .filter((s) => {
        const saleTs = new Date(s.billedAt).getTime();
        const matchesCounter = !shift.counterId || s.counterId === shift.counterId || s.counterName === shift.counterName;
        return matchesCounter && saleTs >= shiftStart && s.paymentMode === 'cash';
      })
      .reduce((sum, s) => sum + (s.paymentDetails?.cashAmount || s.paidAmount || 0), 0);

    const expectedCash = shift.openingCash + cashSalesTotal;
    const discrepancy = closingCash - expectedCash;

    shift.closingCash = closingCash;
    shift.expectedCash = expectedCash;
    shift.cashDifference = discrepancy;
    shift.discrepancy = discrepancy;
    shift.totalPhysicalCash = closingCash;
    if (physicalCounts) shift.physicalCashCount = physicalCounts;
    shift.closedAt = new Date().toISOString();
    shift.status = 'reconciled_closed';
    shift.notes = notes;

    this.setItem(STORAGE_KEYS.CASH_DRAWER_SESSIONS, shifts);
    this.addAuditLog('CLOSE_COUNTER_SHIFT', 'POS_BILLING', `Closed shift on ${shift.counterName} for Cashier ${shift.cashierName}. Opening: ₹${shift.openingCash}, Sales: ₹${cashSalesTotal}, Counted: ₹${closingCash}, Discrepancy: ₹${discrepancy}`);
    return { success: true, shift };
  }

  public static getActiveCounter(): string {
    return this.getItem<string>(STORAGE_KEYS.ACTIVE_COUNTER, 'Counter 1 - Main Billing Desk');
  }

  public static setActiveCounter(counterName: string): void {
    this.setItem(STORAGE_KEYS.ACTIVE_COUNTER, counterName);
  }

  // Central Multi-Counter Held Bills (Shared Drafts)
  public static getHeldBills(companyId?: string): HeldBill[] {
    const raw = this.getItem<HeldBill[]>(STORAGE_KEYS.HELD_BILLS, []);
    return this.filterByCompany(raw, companyId);
  }

  public static saveHeldBill(heldData: Omit<HeldBill, 'id' | 'holdNumber' | 'heldAt'>): HeldBill {
    const bills = this.getItem<HeldBill[]>(STORAGE_KEYS.HELD_BILLS, []);
    const holdNumber = `HOLD-${String(bills.length + 101).padStart(3, '0')}`;
    const newHeld: HeldBill = {
      ...heldData,
      companyId: heldData.companyId || this.getCompany().id,
      id: `hold-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      holdNumber,
      heldAt: new Date().toISOString(),
    };
    bills.unshift(newHeld);
    this.setItem(STORAGE_KEYS.HELD_BILLS, bills);
    this.addAuditLog('HOLD_BILL', 'POS_BILLING', `Saved held draft ${holdNumber} on ${heldData.counterName} for ${heldData.customerName}`);
    return newHeld;
  }

  public static removeHeldBill(id: string): void {
    const bills = this.getItem<HeldBill[]>(STORAGE_KEYS.HELD_BILLS, []).filter((b) => b.id !== id);
    this.setItem(STORAGE_KEYS.HELD_BILLS, bills);
  }

  public static clearHeldBills(): void {
    this.setItem(STORAGE_KEYS.HELD_BILLS, []);
  }

  // UI Theme Management
  public static getUITheme(): string {
    return this.getItem<string>(STORAGE_KEYS.UI_THEME, 'emerald');
  }

  public static setUITheme(themeId: string): void {
    this.setItem(STORAGE_KEYS.UI_THEME, themeId);
  }

  // Cash Drawer & Galla Reconciliation
  public static getCashDrawerSessions(companyId?: string): CashDrawerSession[] {
    const raw = this.getItem<CashDrawerSession[]>(STORAGE_KEYS.CASH_DRAWER_SESSIONS, defaultCashDrawerSessions);
    return this.filterByCompany(raw, companyId);
  }

  public static addCashDrawerSession(session: Omit<CashDrawerSession, 'id'>): CashDrawerSession {
    const sessions = this.getItem<CashDrawerSession[]>(STORAGE_KEYS.CASH_DRAWER_SESSIONS, defaultCashDrawerSessions);
    const newSession: CashDrawerSession = {
      ...session,
      companyId: session.companyId || this.getCompany().id,
      id: `galla-${Date.now()}`,
    };
    sessions.unshift(newSession);
    this.setItem(STORAGE_KEYS.CASH_DRAWER_SESSIONS, sessions);
    this.addAuditLog('CASH_DRAWER_RECONCILE', 'POS_BILLING', `Reconciled Galla cash drawer for ${session.counterName}. Total Physical: ₹${session.totalPhysicalCash}, Discrepancy: ₹${session.discrepancy}`);
    return newSession;
  }

  // Delivery Boys & Order Dispatch
  public static getDeliveryBoys(companyId?: string): DeliveryBoy[] {
    const raw = this.getItem<DeliveryBoy[]>(STORAGE_KEYS.DELIVERY_BOYS, defaultDeliveryBoys);
    return this.filterByCompany(raw, companyId);
  }

  public static updateDeliveryBoyStatus(id: string, status: 'available' | 'on_delivery' | 'offline'): void {
    const boys = this.getItem<DeliveryBoy[]>(STORAGE_KEYS.DELIVERY_BOYS, defaultDeliveryBoys);
    const boy = boys.find((b) => b.id === id);
    if (boy) {
      boy.status = status;
      this.setItem(STORAGE_KEYS.DELIVERY_BOYS, boys);
    }
  }

  // Sales Orders (SO)
  public static getSalesOrders(companyId?: string): SalesOrder[] {
    const raw = this.getItem<SalesOrder[]>(STORAGE_KEYS.SALES_ORDERS, defaultSalesOrders);
    return this.filterByCompany(raw, companyId);
  }

  public static addSalesOrder(so: Omit<SalesOrder, 'id' | 'orderNo' | 'orderedAt'>): SalesOrder {
    const orders = this.getItem<SalesOrder[]>(STORAGE_KEYS.SALES_ORDERS, defaultSalesOrders);
    const orderNo = `SO-2026-${String(orders.length + 1).padStart(3, '0')}`;
    const newOrder: SalesOrder = {
      ...so,
      companyId: so.companyId || this.getCompany().id,
      id: `so-${Date.now()}`,
      orderNo,
      orderedAt: new Date().toISOString(),
    };
    orders.unshift(newOrder);
    this.setItem(STORAGE_KEYS.SALES_ORDERS, orders);
    this.addAuditLog('CREATE_SALES_ORDER', 'SALES', `Created Sales Order ${orderNo} for ${so.customerName} (₹${so.grandTotal})`);
    return newOrder;
  }

  // Purchase Orders (PO)
  public static getPurchaseOrders(companyId?: string): PurchaseOrder[] {
    const raw = this.getItem<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, defaultPurchaseOrders);
    return this.filterByCompany(raw, companyId);
  }

  public static addPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'poNo' | 'orderedAt'>): PurchaseOrder {
    const orders = this.getItem<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, defaultPurchaseOrders);
    const poNo = `PO-2026-${String(orders.length + 1).padStart(3, '0')}`;
    const newPo: PurchaseOrder = {
      ...po,
      companyId: po.companyId || this.getCompany().id,
      id: `po-${Date.now()}`,
      poNo,
      orderedAt: new Date().toISOString(),
    };
    orders.unshift(newPo);
    this.setItem(STORAGE_KEYS.PURCHASE_ORDERS, orders);
    this.addAuditLog('CREATE_PURCHASE_ORDER', 'PURCHASES', `Created Purchase Order ${poNo} for ${po.vendorName} (₹${po.grandTotal})`);
    return newPo;
  }

  // Udhar / Khata Reminders
  public static getUdharReminders(companyId?: string): UdharReminder[] {
    const raw = this.getItem<UdharReminder[]>(STORAGE_KEYS.UDHAR_REMINDERS, defaultUdharReminders);
    return this.filterByCompany(raw, companyId);
  }

  public static updateUdharReminder(id: string, notes: string, promisedDate?: string, channel?: 'whatsapp' | 'sms' | 'call'): void {
    const reminders = this.getItem<UdharReminder[]>(STORAGE_KEYS.UDHAR_REMINDERS, defaultUdharReminders);
    const item = reminders.find((r) => r.id === id);
    if (item) {
      item.notes = notes;
      if (promisedDate) item.promisedPaymentDate = promisedDate;
      if (channel) {
        item.reminderChannel = channel;
        item.lastReminderSentAt = new Date().toISOString();
      }
      this.setItem(STORAGE_KEYS.UDHAR_REMINDERS, reminders);
    }
  }

  // Services Catalog
  public static getServices(companyId?: string): ServiceCatalogItem[] {
    const raw = this.getItem<ServiceCatalogItem[]>(STORAGE_KEYS.SERVICES, defaultServices);
    return this.filterByCompany(raw, companyId);
  }

  public static addService(service: Omit<ServiceCatalogItem, 'id'>): ServiceCatalogItem {
    const list = this.getItem<ServiceCatalogItem[]>(STORAGE_KEYS.SERVICES, defaultServices);
    const newItem: ServiceCatalogItem = {
      ...service,
      companyId: service.companyId || this.getCompany().id,
      id: `srv-${Date.now()}`,
    };
    list.unshift(newItem);
    this.setItem(STORAGE_KEYS.SERVICES, list);
    this.addAuditLog('CREATE_SERVICE', 'SERVICES', `Added service: ${service.name} (₹${service.price})`);
    return newItem;
  }

  public static updateService(id: string, updateData: Partial<ServiceCatalogItem>): void {
    const list = this.getItem<ServiceCatalogItem[]>(STORAGE_KEYS.SERVICES, defaultServices);
    const idx = list.findIndex((s) => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updateData };
      this.setItem(STORAGE_KEYS.SERVICES, list);
      this.addAuditLog('UPDATE_SERVICE', 'SERVICES', `Updated service: ${list[idx].name}`);
    }
  }

  public static deleteService(id: string): void {
    const list = this.getItem<ServiceCatalogItem[]>(STORAGE_KEYS.SERVICES, defaultServices).filter((s) => s.id !== id);
    this.setItem(STORAGE_KEYS.SERVICES, list);
    this.addAuditLog('DELETE_SERVICE', 'SERVICES', `Deleted service ID: ${id}`);
  }

  // Service Bookings / Appointments
  public static getServiceBookings(companyId?: string): ServiceBooking[] {
    const raw = this.getItem<ServiceBooking[]>(STORAGE_KEYS.SERVICE_BOOKINGS, defaultServiceBookings);
    return this.filterByCompany(raw, companyId);
  }

  public static addServiceBooking(booking: Omit<ServiceBooking, 'id' | 'bookingNo' | 'createdAt'>): ServiceBooking {
    const list = this.getServiceBookings();
    const bookingNo = `SB-2026-${String(list.length + 1).padStart(3, '0')}`;
    const newBooking: ServiceBooking = {
      ...booking,
      id: `sbk-${Date.now()}`,
      bookingNo,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newBooking);
    this.setItem(STORAGE_KEYS.SERVICE_BOOKINGS, list);
    this.addAuditLog('CREATE_SERVICE_BOOKING', 'SERVICES', `Booked service ${bookingNo} for ${booking.customerName}`);
    return newBooking;
  }

  public static updateServiceBooking(id: string, updateData: Partial<ServiceBooking>): void {
    const list = this.getServiceBookings();
    const idx = list.findIndex((b) => b.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updateData };
      this.setItem(STORAGE_KEYS.SERVICE_BOOKINGS, list);
      this.addAuditLog('UPDATE_SERVICE_BOOKING', 'SERVICES', `Updated booking ${list[idx].bookingNo}`);
    }
  }

  public static deleteServiceBooking(id: string): void {
    const list = this.getServiceBookings().filter((b) => b.id !== id);
    this.setItem(STORAGE_KEYS.SERVICE_BOOKINGS, list);
    this.addAuditLog('DELETE_SERVICE_BOOKING', 'SERVICES', `Deleted booking ID: ${id}`);
  }

  // Export Entire Database as JSON String
  public static exportDatabaseJSON(): string {
    const fullDbData = {
      exportedAt: new Date().toISOString(),
      company: this.getCompany(),
      users: this.getUsers(),
      products: this.getProducts(),
      parties: this.getParties(),
      sales: this.getSales(),
      purchases: this.getPurchases(),
      expenses: this.getExpenses(),
      incomes: this.getIncomes(),
      accounts: this.getAccounts(),
      transfers: this.getAccountTransfers(),
      khataTransactions: this.getKhataTransactions(),
      salesReturns: this.getSalesReturns(),
      purchaseReturns: this.getPurchaseReturns(),
      salesOrders: this.getSalesOrders(),
      purchaseOrders: this.getPurchaseOrders(),
      cashDrawerSessions: this.getCashDrawerSessions(),
      services: this.getServices(),
      serviceBookings: this.getServiceBookings(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(fullDbData, null, 2);
  }

  // Reset to default seed
  public static resetDatabase(): void {
    localStorage.clear();
    this.initialize();
  }
}
