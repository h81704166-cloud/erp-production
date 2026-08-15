/**
 * Comprehensive Enterprise ERP Type Definitions
 */

export type UserRole = 'super_admin' | 'admin' | 'owner' | 'manager' | 'accountant' | 'cashier' | 'stock_keeper';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  avatar?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  logoUrl?: string;
  currency: string;
  financialYearStart: string;

  // Dukaandar Payment Credentials Settings
  upiId?: string;
  upiPayeeName?: string;
  upiMerchantCode?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  paymentQrNote?: string;

  // Custom Payment Gateway per Shopkeeper
  paymentGatewayProvider?: 'upi_qr' | 'razorpay' | 'cashfree' | 'paytm_pg' | 'phonepe_pg';
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  merchantGatewayId?: string;
  isOnlineGatewayEnabled?: boolean;

  // Subscription & Prime Plan Settings
  subscriptionStatus?: 'active' | 'trial' | 'expired' | 'grace_period';
  subscriptionPlan?: 'free_trial' | 'starter' | 'prime' | 'enterprise';
  subscriptionExpiresAt?: string;
  ownerName?: string;
  ownerPhone?: string;
}

export interface SystemFeature {
  id: string;
  name: string;
  key: string;
  category: 'pos' | 'billing' | 'inventory' | 'gst' | 'ai' | 'system' | 'security';
  description: string;
  isEnabled: boolean;
  minPlan: 'free_trial' | 'starter' | 'prime' | 'enterprise';
  updatedAt: string;
}

export interface ActiveUserSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  companyId: string;
  companyName: string;
  activeModule: string;
  ipAddress: string;
  deviceInfo: string;
  status: 'online' | 'idle' | 'offline';
  connectedAt: string;
  lastActiveAt: string;
}

export interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ProductBatch {
  id: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  qty: number;
  mrp: number;
  sellingPrice: number;
}

export interface ProductStorageSlot {
  id: string;
  godownRoom: string; // e.g. "Room 1 (Main Shop)", "Godown A", "Warehouse B"
  rackShelf: string;  // e.g. "Rack A - Shelf 2", "Almirah 3"
  binBox?: string;    // e.g. "Box #10", "Bin C"
  qty: number;        // Quantity stored at this exact room/rack location
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  barcode: string;
  hsnCode: string;
  category: string;
  unit: 'Pcs' | 'Kg' | 'Ltr' | 'Box' | 'Meter' | 'Set' | 'Gm' | 'Ml' | 'Strip' | 'Tablet';
  secondaryUnit?: string; // e.g. Box -> Pcs or Strip -> Tablet
  conversionFactor?: number; // e.g. 1 Box = 10 Pcs
  allowFractional?: boolean; // e.g. 0.250 kg, 1.5 ltr
  purchasePrice: number;
  sellingPrice: number;
  minSellingPrice: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  stockQty: number;
  minStockAlert: number;
  location: string;
  godownRoom?: string;
  rackShelf?: string;
  binBox?: string;
  storageLocations?: ProductStorageSlot[];
  status: 'active' | 'out_of_stock' | 'discontinued';
  batchTracked?: boolean;
  batches?: ProductBatch[];
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  id: string;
  companyId: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'addition' | 'subtraction' | 'damage' | 'loss' | 'audit_reconciliation';
  qty: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: string;
}

export interface StockTransfer {
  id: string;
  companyId: string;
  transferNo: string;
  fromLocation: string;
  toLocation: string;
  items: {
    productId: string;
    productName: string;
    qty: number;
  }[];
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  notes: string;
  createdByName: string;
  transferredAt: string;
}

export type PartyType = 'customer' | 'vendor';

export interface Party {
  id: string;
  companyId: string;
  type: PartyType;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  gstin?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  creditLimit: number;
  openingBalance: number; // positive = customer owes us / we owe vendor
  currentBalance: number;
  status: 'active' | 'blocked';
  createdAt: string;
}

export interface KhataTransaction {
  id: string;
  companyId: string;
  partyId: string;
  partyName: string;
  partyType: PartyType;
  type: 'debit' | 'credit'; // debit = customer gave money / we gave vendor money; credit = customer purchase on credit / vendor sale to us
  amount: number;
  balanceAfter: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'khata_credit';
  referenceNo?: string;
  invoiceNo?: string;
  notes: string;
  createdByName: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  hsnCode: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  batchNo?: string;
  expDate?: string;
}

export interface AdditionalCharge {
  id: string;
  name: string; // e.g. "Delivery Charge", "Labour / Fitting Charge", "Packing Charge", "Doorstep Service Charge"
  amount: number; // Base amount before tax
  gstRate: number; // GST Rate % (e.g. 0, 5, 12, 18, 28)
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number; // Base amount + GST
}

export interface Sale {
  id: string;
  companyId: string;
  invoiceNo: string;
  counterId?: string;
  counterName?: string; // Multi-counter POS tag
  shiftId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  deliveryBoyId?: string;
  deliveryBoyName?: string;
  deliveryStatus?: 'pending' | 'dispatched' | 'delivered' | 'cancelled';
  items: SaleItem[];
  additionalCharges?: AdditionalCharge[];
  totalAdditionalCharges?: number;
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'split' | 'khata';
  paymentDetails?: {
    cashAmount?: number;
    upiAmount?: number;
    cardAmount?: number;
    transactionId?: string;
  };
  status: 'completed' | 'returned' | 'cancelled' | 'partially_paid';
  billedByName: string;
  billedAt: string;
}

export interface POSCounter {
  id: string;
  companyId: string;
  name: string;
  code: string;
  pin: string; // Counter login / unlock security PIN (e.g. "1111", "2222")
  location: string; // Physical location or floor details
  assignedCashierName: string;
  status: 'active' | 'inactive' | 'closed';
  isDefault?: boolean;
  counterType?: string;
}

export interface HeldBill {
  id: string;
  companyId?: string;
  holdNumber: string; // e.g. "HOLD-101"
  counterId: string;
  counterName: string;
  createdByName: string;
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  items: SaleItem[];
  additionalCharges?: AdditionalCharge[];
  discountOverall: number;
  heldAt: string;
  notes?: string;
}

export interface Shift {
  id: string;
  companyId: string;
  counterId: string;
  counterName: string;
  cashierId?: string;
  cashierName: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  systemExpectedCash?: number;
  cashDifference?: number;
  physicalCashCount?: {
    c2000: number;
    c500: number;
    c200: number;
    c100: number;
    c50: number;
    c20: number;
    c10: number;
    coins: number;
  };
  totalPhysicalCash?: number;
  discrepancy?: number;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed' | 'reconciled_closed';
  notes?: string;
}

export type CashDrawerSession = Shift;

export interface DeliveryBoy {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  vehicleNo: string;
  status: 'available' | 'on_delivery' | 'offline';
  pendingCollections: number;
}

export interface SalesOrder {
  id: string;
  companyId: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  items: SaleItem[];
  grandTotal: number;
  advancePaid: number;
  status: 'pending' | 'converted_to_sale' | 'cancelled';
  deliveryAddress?: string;
  orderedAt: string;
  createdByName: string;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  poNo: string;
  vendorName: string;
  items: PurchaseItem[];
  grandTotal: number;
  status: 'draft' | 'sent_to_vendor' | 'converted_to_purchase' | 'cancelled';
  expectedDeliveryDate?: string;
  orderedAt: string;
  createdByName: string;
}

export interface UdharReminder {
  id: string;
  companyId?: string;
  partyId: string;
  partyName: string;
  partyPhone: string;
  dueAmount: number;
  daysOverdue: number;
  lastReminderSentAt?: string;
  reminderChannel?: 'whatsapp' | 'sms' | 'call';
  promisedPaymentDate?: string;
  notes?: string;
}

export interface SalesReturn {
  id: string;
  companyId: string;
  returnNo: string;
  originalInvoiceNo: string;
  customerId?: string;
  customerName: string;
  items: SaleItem[];
  totalRefundAmount: number;
  reason: string;
  returnedAt: string;
  createdByName: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Purchase {
  id: string;
  companyId: string;
  purchaseNo: string;
  vendorInvoiceNo: string;
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  items: PurchaseItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'credit';
  status: 'received' | 'pending' | 'returned' | 'cancelled';
  notes?: string;
  purchasedAt: string;
  createdByName: string;
}

export interface PurchaseReturn {
  id: string;
  companyId: string;
  returnNo: string;
  originalPurchaseNo: string;
  vendorId?: string;
  vendorName: string;
  items: PurchaseItem[];
  refundAmount: number;
  reason: string;
  returnedAt: string;
  createdByName: string;
}

export interface Account {
  id: string;
  companyId: string;
  accountName: string;
  accountType: 'cash' | 'bank' | 'wallet';
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  branchName?: string;
  openingBalance?: number;
  currentBalance: number;
  isDefault: boolean;
  status: 'active' | 'inactive';
}

export interface ServiceCatalogItem {
  id: string;
  companyId: string;
  name: string;
  category: 'repair_maintenance' | 'salon_beauty' | 'laundry_cleaning' | 'automobile_wash' | 'professional_consulting' | 'general' | string;
  price: number;
  durationMins: number;
  gstRate: number; // e.g. 0, 5, 18
  assignedStaff?: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface ServiceBooking {
  id: string;
  companyId: string;
  bookingNo: string; // e.g. "SB-2026-001"
  customerName: string;
  customerPhone: string;
  customerId?: string;
  serviceId: string;
  serviceName: string;
  category: string;
  bookingDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:30 AM"
  assignedStaff?: string;
  serviceAddress?: string; // Optional for doorstep / site visit
  estimatedPrice: number;
  advancePaid: number;
  status: 'booked' | 'in_progress' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'advance' | 'fully_paid';
  notes?: string;
  createdAt: string;
  invoiceNo?: string;
}

export interface AccountTransfer {
  id: string;
  companyId: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  notes: string;
  transferredAt: string;
  createdByName: string;
}

export interface Expense {
  id: string;
  companyId: string;
  voucherNo: string;
  category: 'Rent' | 'Salaries' | 'Electricity' | 'Logistics & Freight' | 'Tea & Snacks' | 'Maintenance' | 'Marketing' | 'Office Supplies' | 'Miscellaneous';
  amount: number;
  paidFromAccountId: string;
  paidFromAccountName: string;
  paidTo: string;
  paymentMode: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
  receiptUrl?: string;
  notes: string;
  expenseDate: string;
  createdByName: string;
}

export interface OtherIncome {
  id: string;
  companyId: string;
  voucherNo: string;
  source: 'Interest Income' | 'Scrap Sale' | 'Commission' | 'Rent Income' | 'Rebate' | 'Other';
  amount: number;
  receivedInAccountId: string;
  receivedInAccountName: string;
  notes: string;
  incomeDate: string;
  createdByName: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface GSTReportSummary {
  period: string;
  totalOutwardTaxable: number;
  totalOutwardGst: number;
  totalInwardTaxable: number;
  totalInwardItc: number;
  netGstLiability: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface SecurityAuditResult {
  checkName: string;
  category: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  details: string;
  remediation?: string;
}

export interface PaymentTransactionLog {
  id: string;
  companyId: string;
  invoiceNo?: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  gateway: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING';
  paymentId?: string;
  errorCode?: string;
  reasonMessage: string;
  timestamp: string;
  userName?: string;
}

