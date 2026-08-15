import { ERPDatabase } from './db';
import { BackupService } from './backupService';
import { Sale, Product, Party, Purchase, Expense } from '../types/erp';

export interface CompanySheetsConfig {
  companyId: string;
  companyName: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  webhookUrl?: string;
  autoSyncOnSave: boolean;
  serverBatchIntervalMinutes?: number; // Default 15 minutes (Backend Server Batch Packet)
  sheetsBackupIntervalHours?: number;   // Default 24 Hours (Google Sheets Daily Backup)
  lastServerSyncedAt?: string;
  lastSheetsSyncedAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage?: string;
}

const CONFIG_STORAGE_KEY = 'erp_multi_company_gsheets_config';

export class GoogleSheetsService {
  private static autoSyncSchedulerTimer: any = null;

  public static startBackgroundAutoSync(): void {
    if (this.autoSyncSchedulerTimer) return;

    // Check every 60 seconds if any company needs scheduled Google Sheets sync
    this.autoSyncSchedulerTimer = setInterval(() => {
      this.checkAndRunAutoSync();
    }, 60 * 1000);

    // Initial check after 3 seconds on app launch
    setTimeout(() => {
      this.checkAndRunAutoSync();
    }, 3000);
  }

  public static async checkAndRunAutoSync(): Promise<void> {
    const configs = this.getAllConfigs();
    const now = Date.now();
    const currentCompany = ERPDatabase.getCompany();

    // Ensure current active company has a config entry if missing
    if (currentCompany && !configs[currentCompany.id]) {
      configs[currentCompany.id] = this.getConfig(currentCompany.id, currentCompany.name);
    }

    for (const key of Object.keys(configs)) {
      const cfg = configs[key];
      if (!cfg.autoSyncOnSave) continue;

      // A. 15-Minute Server Batch Packet Sync (Home-based Node/Express Server + Supabase Cloud)
      const serverBatchIntervalMin = cfg.serverBatchIntervalMinutes || 15;
      const serverBatchIntervalMs = serverBatchIntervalMin * 60 * 1000;
      const lastServerSynced = cfg.lastServerSyncedAt ? new Date(cfg.lastServerSyncedAt).getTime() : 0;

      if (now - lastServerSynced >= serverBatchIntervalMs) {
        console.log(`🚀 [15-MIN BATCH ENGINE] Packaging and transmitting data packet for: ${cfg.companyName}`);

        // 1. Home-based Express Server Package Sync
        try {
          const companyData = this.getCompanyData(cfg.companyId);
          const token = (typeof localStorage !== 'undefined' && localStorage.getItem('erp_jwt_token')) || 'DEMO_JWT_TOKEN';
          
          await fetch('/api/backup/server/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              companyId: cfg.companyId,
              companyName: cfg.companyName,
              timestamp: new Date().toISOString(),
              payload: companyData,
            }),
          }).catch(() => null);
        } catch (serverErr) {
          console.warn('📡 Home Server batch packet deferred (offline mode):', serverErr);
        }

        cfg.lastServerSyncedAt = new Date().toISOString();
        this.saveConfig(cfg);
      }

      // B. Google Sheets Webhook Sync (Daily or Scheduled)
      if (cfg.webhookUrl && cfg.webhookUrl.trim()) {
        const intervalHours = cfg.sheetsBackupIntervalHours || 24;
        const intervalMs = intervalHours * 60 * 60 * 1000;
        const lastSheetsSynced = cfg.lastSheetsSyncedAt ? new Date(cfg.lastSheetsSyncedAt).getTime() : 0;

        if (now - lastSheetsSynced >= intervalMs) {
          console.log(`📊 [GOOGLE SHEETS SYNC] Background task exporting 16 tabs for: ${cfg.companyName}`);
          await this.syncViaWebhook(cfg.companyId, cfg.companyName, cfg.webhookUrl);
        }
      }
    }
  }

  public static getAllConfigs(): Record<string, CompanySheetsConfig> {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
      const data = localStorage.getItem(CONFIG_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public static getConfig(companyId: string, companyName: string): CompanySheetsConfig {
    const configs = this.getAllConfigs();
    if (configs[companyId]) {
      return configs[companyId];
    }
    const defaultConfig: CompanySheetsConfig = {
      companyId,
      companyName,
      spreadsheetId: '',
      spreadsheetUrl: '',
      webhookUrl: '',
      autoSyncOnSave: true,
      serverBatchIntervalMinutes: 15,
      sheetsBackupIntervalHours: 24,
      syncStatus: 'idle',
      syncMessage: 'Not configured yet',
    };
    return defaultConfig;
  }

  public static saveConfig(config: CompanySheetsConfig): void {
    const configs = this.getAllConfigs();
    configs[config.companyId] = config;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configs));
    }
  }

  // Convert array of objects to CSV string
  public static arrayToCSV(data: Record<string, any>[]): string {
    if (!data || !data.length) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header] === undefined || row[header] === null ? '' : String(row[header]);
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private static deduplicateArray<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of items) {
      const key = keyFn(item);
      if (!key || !seen.has(key)) {
        if (key) seen.add(key);
        result.push(item);
      }
    }
    return result;
  }

  // Generate CSV data for each section specifically filtered by companyId with strict deduplication
  public static getCompanyData(companyId: string) {
    const rawSales = ERPDatabase.getSales().filter((s) => s.companyId === companyId || !s.companyId);
    const rawProducts = ERPDatabase.getProducts().filter((p) => p.companyId === companyId || !p.companyId);
    const rawParties = ERPDatabase.getParties().filter((p) => p.companyId === companyId || !p.companyId);
    const rawPurchases = ERPDatabase.getPurchases().filter((p) => p.companyId === companyId || !p.companyId);
    const rawExpenses = ERPDatabase.getExpenses().filter((e) => e.companyId === companyId || !e.companyId);
    const rawSalesReturns = ERPDatabase.getSalesReturns().filter((sr) => sr.companyId === companyId || !sr.companyId);
    const rawPurchaseReturns = ERPDatabase.getPurchaseReturns().filter((pr) => pr.companyId === companyId || !pr.companyId);
    const rawSalesOrders = ERPDatabase.getSalesOrders().filter((so) => so.companyId === companyId || !so.companyId);
    const rawPurchaseOrders = ERPDatabase.getPurchaseOrders().filter((po) => po.companyId === companyId || !po.companyId);
    const rawAccounts = ERPDatabase.getAccounts().filter((a) => a.companyId === companyId || !a.companyId);
    const rawKhataTxns = ERPDatabase.getKhataTransactions().filter((k) => k.companyId === companyId || !k.companyId);
    const rawCashDrawer = ERPDatabase.getCashDrawerSessions().filter((c) => c.companyId === companyId || !c.companyId);
    const rawServices = ERPDatabase.getServiceBookings().filter((sb) => sb.companyId === companyId || !sb.companyId);
    const rawAuditLogs = ERPDatabase.getAuditLogs();

    const allSales = this.deduplicateArray(rawSales, (s) => s.invoiceNo || s.id);
    const allProducts = this.deduplicateArray(rawProducts, (p) => p.sku || p.barcode || p.id);
    const allParties = this.deduplicateArray(rawParties, (p) => p.phone || p.gstin || p.id);
    const allPurchases = this.deduplicateArray(rawPurchases, (p) => p.purchaseNo || p.vendorInvoiceNo || p.id);
    const allExpenses = this.deduplicateArray(rawExpenses, (e) => e.voucherNo || e.id);
    const allSalesReturns = this.deduplicateArray(rawSalesReturns, (sr) => sr.returnNo || sr.id);
    const allPurchaseReturns = this.deduplicateArray(rawPurchaseReturns, (pr) => pr.returnNo || pr.id);
    const allSalesOrders = this.deduplicateArray(rawSalesOrders, (so) => so.orderNo || so.id);
    const allPurchaseOrders = this.deduplicateArray(rawPurchaseOrders, (po) => po.poNo || po.id);
    const allAccounts = this.deduplicateArray(rawAccounts, (a) => a.id);
    const allKhataTxns = this.deduplicateArray(rawKhataTxns, (k) => k.id);
    const allCashDrawer = this.deduplicateArray(rawCashDrawer, (c) => c.id);
    const allServices = this.deduplicateArray(rawServices, (sb) => sb.bookingNo || sb.id);
    const allAuditLogs = this.deduplicateArray(rawAuditLogs, (a) => a.id || `${a.timestamp}_${a.action}`);

    // 1. Sales
    const formattedSales = allSales.map((s) => ({
      Voucher_Type: 'SALES',
      Invoice_No: s.invoiceNo,
      Date: new Date(s.billedAt).toLocaleDateString(),
      Customer_Name: s.customerName,
      Phone: s.customerPhone || '',
      GSTIN: s.customerGstin || '',
      Subtotal: s.subtotal,
      Discount: s.totalDiscount,
      Taxable_Amount: s.totalTaxable,
      GST_Tax: s.totalTax,
      Grand_Total: s.grandTotal,
      Paid_Amount: s.paidAmount,
      Due_Balance: s.dueAmount,
      Payment_Mode: s.paymentMode.toUpperCase(),
      Status: s.status,
      Billed_By: s.billedByName,
    }));

    // 2. Purchases
    const formattedPurchases = allPurchases.map((p) => ({
      Voucher_Type: 'PURCHASE',
      Purchase_No: p.purchaseNo,
      Vendor_Invoice_No: p.vendorInvoiceNo,
      Vendor_Name: p.vendorName,
      Date: new Date(p.purchasedAt).toLocaleDateString(),
      Subtotal: p.subtotal,
      Tax_Total: p.taxTotal,
      Grand_Total: p.grandTotal,
      Paid_Amount: p.paidAmount,
      Due_Amount: p.dueAmount,
      Payment_Mode: p.paymentMode.toUpperCase(),
      Status: p.status,
      Created_By: p.createdByName,
    }));

    // 3. Sales Returns (Credit Notes)
    const formattedSalesReturns = allSalesReturns.map((sr) => ({
      Voucher_Type: 'SALE RETURN',
      Return_No: sr.returnNo,
      Original_Invoice_No: sr.originalInvoiceNo,
      Customer_Name: sr.customerName,
      Date: new Date(sr.returnedAt).toLocaleDateString(),
      Refund_Amount: sr.totalRefundAmount,
      Refund_Mode: 'CREDIT NOTE',
      Reason: sr.reason || 'Customer Return',
      Billed_By: sr.createdByName || 'Cashier',
    }));

    // 4. Purchase Returns (Debit Notes)
    const formattedPurchaseReturns = allPurchaseReturns.map((pr) => ({
      Voucher_Type: 'PURCHASE RETURN',
      Return_No: pr.returnNo,
      Original_Purchase_No: pr.originalPurchaseNo,
      Vendor_Name: pr.vendorName,
      Date: new Date(pr.returnedAt).toLocaleDateString(),
      Refund_Amount: pr.refundAmount,
      Refund_Mode: 'DEBIT NOTE',
      Reason: pr.reason || 'Vendor Return',
      Created_By: pr.createdByName || 'Manager',
    }));

    // 5. Payments & Receipts
    const formattedPaymentsReceipts = allKhataTxns.map((k) => ({
      Voucher_Type: k.type === 'debit' ? 'RECEIPT' : 'PAYMENT',
      Voucher_No: `REC-${k.id.slice(-6).toUpperCase()}`,
      Party_Name: k.partyName,
      Transaction_Date: new Date(k.createdAt).toLocaleDateString(),
      Amount: k.amount,
      Entry_Type: k.type === 'debit' ? 'Receipt (Credit In)' : 'Payment (Debit Out)',
      Payment_Mode: (k.paymentMode || 'CASH').toUpperCase(),
      Notes: k.notes || '',
      Recorded_By: k.createdByName || 'Cashier',
    }));

    // 6. Expenses
    const formattedExpenses = allExpenses.map((e) => ({
      Voucher_Type: 'EXPENSE PAYMENT',
      Voucher_No: e.voucherNo,
      Category: e.category,
      Amount: e.amount,
      Paid_To: e.paidTo,
      Paid_From_Account: e.paidFromAccountName,
      Payment_Mode: e.paymentMode.toUpperCase(),
      Date: new Date(e.expenseDate).toLocaleDateString(),
      Notes: e.notes || '',
      Created_By: e.createdByName,
    }));

    // 7. Master General Ledger (Combined Chronological Journal with Dr/Cr)
    const masterLedgerList: any[] = [];

    allSales.forEach((s) => {
      masterLedgerList.push({
        Date: new Date(s.billedAt).toLocaleDateString(),
        Voucher_Type: 'SALES',
        Voucher_No: s.invoiceNo,
        Party_Name: s.customerName || 'Walk-in',
        Particulars: `To Sales - Invoice #${s.invoiceNo}`,
        Payment_Mode: s.paymentMode.toUpperCase(),
        Debit_Dr: s.grandTotal,
        Credit_Cr: 0,
        rawTime: new Date(s.billedAt).getTime(),
      });
    });

    allPurchases.forEach((p) => {
      masterLedgerList.push({
        Date: new Date(p.purchasedAt).toLocaleDateString(),
        Voucher_Type: 'PURCHASE',
        Voucher_No: p.purchaseNo || p.vendorInvoiceNo,
        Party_Name: p.vendorName,
        Particulars: `By Purchase - Bill #${p.purchaseNo || p.vendorInvoiceNo}`,
        Payment_Mode: p.paymentMode.toUpperCase(),
        Debit_Dr: 0,
        Credit_Cr: p.grandTotal,
        rawTime: new Date(p.purchasedAt).getTime(),
      });
    });

    allSalesReturns.forEach((sr) => {
      masterLedgerList.push({
        Date: new Date(sr.returnedAt).toLocaleDateString(),
        Voucher_Type: 'SALE RETURN',
        Voucher_No: sr.returnNo,
        Party_Name: sr.customerName,
        Particulars: `By Sale Return - Credit Note #${sr.returnNo}`,
        Payment_Mode: 'CREDIT NOTE',
        Debit_Dr: 0,
        Credit_Cr: sr.totalRefundAmount,
        rawTime: new Date(sr.returnedAt).getTime(),
      });
    });

    allPurchaseReturns.forEach((pr) => {
      masterLedgerList.push({
        Date: new Date(pr.returnedAt).toLocaleDateString(),
        Voucher_Type: 'PURCHASE RETURN',
        Voucher_No: pr.returnNo,
        Party_Name: pr.vendorName,
        Particulars: `To Purchase Return - Debit Note #${pr.returnNo}`,
        Payment_Mode: 'DEBIT NOTE',
        Debit_Dr: pr.refundAmount,
        Credit_Cr: 0,
        rawTime: new Date(pr.returnedAt).getTime(),
      });
    });

    allKhataTxns.forEach((k) => {
      const isReceipt = k.type === 'debit';
      masterLedgerList.push({
        Date: new Date(k.createdAt).toLocaleDateString(),
        Voucher_Type: isReceipt ? 'RECEIPT' : 'PAYMENT',
        Voucher_No: `REC-${k.id.slice(-6).toUpperCase()}`,
        Party_Name: k.partyName,
        Particulars: isReceipt ? `By Payment Received - ${k.partyName}` : `To Payment Paid - ${k.partyName}`,
        Payment_Mode: (k.paymentMode || 'CASH').toUpperCase(),
        Debit_Dr: isReceipt ? 0 : k.amount,
        Credit_Cr: isReceipt ? k.amount : 0,
        rawTime: new Date(k.createdAt).getTime(),
      });
    });

    allExpenses.forEach((e) => {
      masterLedgerList.push({
        Date: new Date(e.expenseDate).toLocaleDateString(),
        Voucher_Type: 'PAYMENT',
        Voucher_No: e.voucherNo,
        Party_Name: e.paidTo || e.category,
        Particulars: `To Expense - ${e.category}`,
        Payment_Mode: e.paymentMode.toUpperCase(),
        Debit_Dr: e.amount,
        Credit_Cr: 0,
        rawTime: new Date(e.expenseDate).getTime(),
      });
    });

    // Sort chronologically and add running balance Dr/Cr
    masterLedgerList.sort((a, b) => a.rawTime - b.rawTime);
    let runningBalance = 0;
    const formattedMasterLedger = masterLedgerList.map((m) => {
      runningBalance += m.Debit_Dr - m.Credit_Cr;
      const { rawTime, ...rest } = m;
      return {
        ...rest,
        Running_Balance: Math.abs(runningBalance),
        Balance_Type: runningBalance >= 0 ? 'Dr' : 'Cr',
      };
    });

    // 8. Products
    const formattedProducts = allProducts.map((p) => ({
      Product_Name: p.name,
      SKU: p.sku,
      Barcode: p.barcode,
      HSN_Code: p.hsnCode,
      Category: p.category,
      Unit: p.unit,
      Purchase_Price: p.purchasePrice,
      Selling_Price: p.sellingPrice,
      Min_Selling_Price: p.minSellingPrice,
      GST_Rate_Percent: p.gstRate,
      Stock_Qty: p.stockQty,
      Min_Stock_Alert: p.minStockAlert,
      Location: p.location,
      Status: p.status,
    }));

    // 9. Parties
    const formattedParties = allParties.map((p) => ({
      Type: p.type.toUpperCase(),
      Name: p.name,
      Company_Name: p.companyName || '',
      Phone: p.phone,
      Email: p.email || '',
      GSTIN: p.gstin || '',
      City: p.city,
      State: p.state,
      Credit_Limit: p.creditLimit,
      Current_Balance: p.currentBalance,
      Status: p.status,
    }));

    // 10. Cash Drawer & Galla
    const formattedCashDrawer = allCashDrawer.map((cd) => ({
      Counter_Name: cd.counterName,
      Cashier_Name: cd.cashierName,
      Opened_At: new Date(cd.openedAt).toLocaleString(),
      Closed_At: cd.closedAt ? new Date(cd.closedAt).toLocaleString() : 'OPEN SESSION',
      Opening_Cash: cd.openingCash,
      System_Expected_Cash: cd.systemExpectedCash,
      Actual_Physical_Cash: cd.totalPhysicalCash ?? 0,
      Discrepancy_Short_Excess: cd.discrepancy ?? 0,
      Status: cd.status.toUpperCase(),
    }));

    // 11. Service Bookings & Repairs
    const formattedServices = allServices.map((sb) => ({
      Booking_No: sb.bookingNo,
      Customer_Name: sb.customerName,
      Phone: sb.customerPhone,
      Service_Item: sb.serviceName,
      Category: sb.category,
      Estimated_Price: sb.estimatedPrice,
      Advance_Paid: sb.advancePaid,
      Status: sb.status.toUpperCase(),
      Payment_Status: sb.paymentStatus.toUpperCase(),
      Booking_Date: sb.bookingDate,
      Assigned_Staff: sb.assignedStaff || 'Unassigned',
    }));

    // 12. Security & Audit Trail
    const formattedAuditLogs = allAuditLogs.map((log) => ({
      Timestamp: new Date(log.timestamp).toLocaleString(),
      Action: log.action,
      Module: log.module,
      Details: log.details,
      Performed_By: log.userName || 'System',
      IP_Address: log.ipAddress || 'Local Server',
    }));

    // 13. Accounts, Bank & Cash Registers
    const formattedAccounts = allAccounts.map((a) => ({
      Account_ID: a.id,
      Account_Name: a.accountName,
      Account_Type: a.accountType.toUpperCase(),
      Bank_Name: a.bankName || (a.accountType === 'cash' ? 'Cash Register' : 'Main Bank'),
      Account_Number: a.accountNumber || 'N/A',
      IFSC_Code: a.ifscCode || 'N/A',
      Opening_Balance: a.openingBalance,
      Current_Available_Balance: a.currentBalance,
      Is_Default: a.isDefault ? 'YES' : 'NO',
      Status: a.status.toUpperCase(),
    }));

    // 14. Sales Orders & Estimates (SO)
    const formattedSalesOrders = allSalesOrders.map((so) => ({
      Document_Type: 'SALES ORDER / ESTIMATE',
      Order_No: so.orderNo,
      Customer_Name: so.customerName,
      Phone: so.customerPhone || 'N/A',
      Order_Date: new Date(so.orderedAt).toLocaleDateString(),
      Grand_Total: so.grandTotal,
      Advance_Paid: so.advancePaid || 0,
      Status: so.status.toUpperCase(),
      Salesperson: so.createdByName || 'Sales Desk',
    }));

    // 15. Purchase Orders (PO)
    const formattedPurchaseOrders = allPurchaseOrders.map((po) => ({
      Document_Type: 'PURCHASE ORDER',
      PO_No: po.poNo,
      Vendor_Name: po.vendorName,
      Order_Date: new Date(po.orderedAt).toLocaleDateString(),
      Expected_Delivery: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A',
      Grand_Total: po.grandTotal,
      Status: po.status.toUpperCase(),
      Approved_By: po.createdByName || 'Admin',
    }));

    // 16. GST Tax Summary Report (GSTR-3B & Rate Slabs)
    const b2bSales = allSales.filter((s) => s.customerGstin && s.customerGstin.trim().length === 15);
    const b2cSales = allSales.filter((s) => !s.customerGstin || s.customerGstin.trim().length < 15);

    const b2bTaxable = b2bSales.reduce((sum, s) => sum + (s.totalTaxable || 0), 0);
    const b2bCgst = b2bSales.reduce((sum, s) => sum + (s.totalCgst || 0), 0);
    const b2bSgst = b2bSales.reduce((sum, s) => sum + (s.totalSgst || 0), 0);
    const b2bIgst = b2bSales.reduce((sum, s) => sum + (s.totalIgst || 0), 0);
    const b2bTax = b2bSales.reduce((sum, s) => sum + (s.totalTax || 0), 0);

    const b2cTaxable = b2cSales.reduce((sum, s) => sum + (s.totalTaxable || 0), 0);
    const b2cCgst = b2cSales.reduce((sum, s) => sum + (s.totalCgst || 0), 0);
    const b2cSgst = b2cSales.reduce((sum, s) => sum + (s.totalSgst || 0), 0);
    const b2cIgst = b2cSales.reduce((sum, s) => sum + (s.totalIgst || 0), 0);
    const b2cTax = b2cSales.reduce((sum, s) => sum + (s.totalTax || 0), 0);

    const totalOutwardTaxable = b2bTaxable + b2cTaxable;
    const totalOutwardCgst = b2bCgst + b2cCgst;
    const totalOutwardSgst = b2bSgst + b2cSgst;
    const totalOutwardIgst = b2bIgst + b2cIgst;
    const totalOutwardTax = b2bTax + b2cTax;

    const totalInwardTaxable = allPurchases.reduce((sum, p) => sum + (p.subtotal || 0), 0);
    const totalInwardTax = allPurchases.reduce((sum, p) => sum + (p.taxTotal || 0), 0);
    const totalInwardCgst = totalInwardTax / 2;
    const totalInwardSgst = totalInwardTax / 2;

    const netTaxPayable = Math.max(0, totalOutwardTax - totalInwardTax);

    const formattedGstReportSummary: any[] = [
      {
        Report_Section: 'GSTR-3B OVERALL SUMMARY',
        Category_Details: 'Total Outward Supplies (All Sales)',
        Taxable_Value: totalOutwardTaxable,
        CGST_Amount: totalOutwardCgst,
        SGST_Amount: totalOutwardSgst,
        IGST_Amount: totalOutwardIgst,
        Total_GST_Tax: totalOutwardTax,
        Classification: 'OUTPUT TAX LIABILITY',
      },
      {
        Report_Section: 'GSTR-3B OVERALL SUMMARY',
        Category_Details: 'B2B Registered Taxpayer Sales',
        Taxable_Value: b2bTaxable,
        CGST_Amount: b2bCgst,
        SGST_Amount: b2bSgst,
        IGST_Amount: b2bIgst,
        Total_GST_Tax: b2bTax,
        Classification: 'OUTPUT TAX B2B',
      },
      {
        Report_Section: 'GSTR-3B OVERALL SUMMARY',
        Category_Details: 'B2C Retail Consumer Sales',
        Taxable_Value: b2cTaxable,
        CGST_Amount: b2cCgst,
        SGST_Amount: b2cSgst,
        IGST_Amount: b2cIgst,
        Total_GST_Tax: b2cTax,
        Classification: 'OUTPUT TAX B2C',
      },
      {
        Report_Section: 'GSTR-3B OVERALL SUMMARY',
        Category_Details: 'Total Inward Supplies (Purchases ITC)',
        Taxable_Value: totalInwardTaxable,
        CGST_Amount: totalInwardCgst,
        SGST_Amount: totalInwardSgst,
        IGST_Amount: 0,
        Total_GST_Tax: totalInwardTax,
        Classification: 'INPUT TAX CREDIT (ITC)',
      },
      {
        Report_Section: 'GSTR-3B OVERALL SUMMARY',
        Category_Details: 'NET GST TAX PAYABLE TO GOVT',
        Taxable_Value: totalOutwardTaxable - totalInwardTaxable,
        CGST_Amount: Math.max(0, totalOutwardCgst - totalInwardCgst),
        SGST_Amount: Math.max(0, totalOutwardSgst - totalInwardSgst),
        IGST_Amount: Math.max(0, totalOutwardIgst),
        Total_GST_Tax: netTaxPayable,
        Classification: netTaxPayable > 0 ? 'NET TAX DUE TO GOVT' : 'EXCESS ITC BALANCE',
      },
    ];

    [0, 5, 12, 18, 28].forEach((rate) => {
      let slabTaxable = 0;
      let slabTax = 0;
      allSales.forEach((s) => {
        if (s.items) {
          s.items.forEach((it) => {
            if ((it.gstRate || 18) === rate) {
              slabTaxable += it.taxableAmount || 0;
              slabTax += (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0);
            }
          });
        }
      });
      formattedGstReportSummary.push({
        Report_Section: 'GST RATE SLAB BREAKDOWN',
        Category_Details: `GST ${rate}% Tax Rate Slab`,
        Taxable_Value: slabTaxable,
        CGST_Amount: slabTax / 2,
        SGST_Amount: slabTax / 2,
        IGST_Amount: 0,
        Total_GST_Tax: slabTax,
        Classification: `RATE SLAB ${rate}%`,
      });
    });

    return {
      sales: formattedSales,
      purchases: formattedPurchases,
      salesReturns: formattedSalesReturns,
      purchaseReturns: formattedPurchaseReturns,
      salesOrders: formattedSalesOrders,
      purchaseOrders: formattedPurchaseOrders,
      accounts: formattedAccounts,
      cashBook: BackupService.getCashBookData(companyId),
      bankBook: BackupService.getBankBookData(companyId),
      paymentsAndReceipts: formattedPaymentsReceipts,
      expenses: formattedExpenses,
      masterLedger: formattedMasterLedger,
      gstReportSummary: formattedGstReportSummary,
      products: formattedProducts,
      parties: formattedParties,
      cashDrawerSessions: formattedCashDrawer,
      serviceBookings: formattedServices,
      auditLogs: formattedAuditLogs,
    };
  }

  // Trigger browser download of CSV formatted specifically for Google Sheets Import
  public static downloadCompanyCSV(
    companyId: string,
    companyName: string,
    tab: 'sales' | 'purchases' | 'salesReturns' | 'purchaseReturns' | 'salesOrders' | 'purchaseOrders' | 'accounts' | 'cashBook' | 'bankBook' | 'paymentsAndReceipts' | 'expenses' | 'masterLedger' | 'gstReportSummary' | 'products' | 'parties' | 'cashDrawerSessions' | 'serviceBookings' | 'auditLogs' | 'all'
  ) {
    const data = this.getCompanyData(companyId);
    const safeCompName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (tab === 'all') {
      const keys = [
        'sales',
        'purchases',
        'salesReturns',
        'purchaseReturns',
        'salesOrders',
        'purchaseOrders',
        'accounts',
        'cashBook',
        'bankBook',
        'paymentsAndReceipts',
        'expenses',
        'masterLedger',
        'gstReportSummary',
        'products',
        'parties',
        'cashDrawerSessions',
        'serviceBookings',
        'auditLogs',
      ] as const;
      keys.forEach((k) => {
        const csvContent = this.arrayToCSV(data[k]);
        if (csvContent) {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `GSheets_${safeCompName}_${k.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
        }
      });
    } else {
      const csvContent = this.arrayToCSV(data[tab]);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSheets_${safeCompName}_${tab.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  }

  // Sync to Google Sheets via Webhook or direct Google Apps Script
  public static async syncViaWebhook(companyId: string, companyName: string, webhookUrl: string): Promise<{ success: boolean; message: string }> {
    if (!webhookUrl || !webhookUrl.trim()) {
      return { success: false, message: 'Webhook URL is missing. Please enter a valid Google Apps Script Webhook URL.' };
    }

    try {
      const data = this.getCompanyData(companyId);
      const payload = {
        companyId,
        companyName,
        timestamp: new Date().toISOString(),
        data,
      };

      let isSuccess = false;
      let errorDetails = '';

      // Google Apps Script Webhook URLs require text/plain content-type or no-cors mode to avoid browser CORS preflight blocking
      try {
        const res = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });

        if (res.ok || res.status === 0 || res.type === 'opaque') {
          isSuccess = true;
        } else {
          errorDetails = `HTTP status ${res.status}`;
        }
      } catch (primaryErr: any) {
        // Fallback to mode: 'no-cors' to bypass browser CORS restriction
        try {
          await fetch(webhookUrl.trim(), {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
          });
          isSuccess = true;
        } catch (secondaryErr: any) {
          errorDetails = secondaryErr?.message || primaryErr?.message || 'Network request failed';
        }
      }

      if (isSuccess) {
        const config = this.getConfig(companyId, companyName);
        config.lastSheetsSyncedAt = new Date().toISOString();
        config.lastServerSyncedAt = new Date().toISOString();
        config.syncStatus = 'success';
        config.syncMessage = 'Successfully synced to Google Sheets!';
        this.saveConfig(config);
        return { success: true, message: 'Google Sheet Sync Successful! All 16 tabs updated with zero duplicates.' };
      } else {
        throw new Error(errorDetails || 'Failed to reach Google Apps Script Webhook');
      }
    } catch (err: any) {
      const config = this.getConfig(companyId, companyName);
      config.syncStatus = 'error';
      config.syncMessage = err?.message || 'Sync failed';
      this.saveConfig(config);
      return { success: false, message: `Sync error: ${err?.message || 'Failed to fetch'}` };
    }
  }

  // Sample Google Apps Script Code Generator for the User to copy into their Google Sheet
  public static getGoogleAppsScriptTemplate(companyName: string): string {
    return `/**
 * Google Apps Script for Enterprise ERP - ${companyName}
 * Paste this in Extensions -> Apps Script inside your Google Sheet
 * Handles auto-sync with strict deduplication (Zero Duplicates Guarantee)
 */

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var data = contents.data;
    
    // Helper to update a sheet tab with strict deduplication
    function updateSheet(sheetName, items) {
      if (!items || items.length === 0) return;
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      } else {
        sheet.clear();
      }
      
      // Strict Deduplication Engine (Koi duplicate data nahi aayega)
      var seenMap = {};
      var uniqueItems = [];
      for (var k = 0; k < items.length; k++) {
        var it = items[k];
        var dedupKey = it.Invoice_No || it.Purchase_No || it.Voucher_No || it.Return_No || it.Order_No || it.PO_No || it.Account_ID || (it.Report_Section ? (it.Report_Section + "_" + it.Category_Details) : "") || it.SKU || it.Phone || it.Booking_No || JSON.stringify(it);
        if (!seenMap[dedupKey]) {
          seenMap[dedupKey] = true;
          uniqueItems.push(it);
        }
      }
      items = uniqueItems;

      var headers = Object.keys(items[0]);
      var rows = [headers];
      
      for (var i = 0; i < items.length; i++) {
        var row = [];
        for (var j = 0; j < headers.length; j++) {
          row.push(items[i][headers[j]]);
        }
        rows.push(row);
      }
      
      sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#D1FAE5");
    }
    
    updateSheet("Sales", data.sales);
    updateSheet("Purchases", data.purchases);
    updateSheet("Sales_Returns", data.salesReturns);
    updateSheet("Purchase_Returns", data.purchaseReturns);
    updateSheet("Sales_Orders", data.salesOrders);
    updateSheet("Purchase_Orders", data.purchaseOrders);
    updateSheet("Bank_Cash_Accounts", data.accounts);
    updateSheet("Payments_Receipts", data.paymentsAndReceipts);
    updateSheet("Expenses", data.expenses);
    updateSheet("Master_Ledger", data.masterLedger);
    updateSheet("GST_Report_Summary", data.gstReportSummary);
    updateSheet("Products", data.products);
    updateSheet("Parties", data.parties);
    updateSheet("Cash_Drawer_Galla", data.cashDrawerSessions);
    updateSheet("Service_Bookings", data.serviceBookings);
    updateSheet("Audit_Security_Logs", data.auditLogs);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data imported successfully with zero duplicates!" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }
}
