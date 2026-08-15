import { ERPDatabase } from './db';
import { GoogleSheetsService } from './googleSheetsService';

export interface AutoBackupConfig {
  enabled: boolean;
  intervalHours: number; // 1, 6, 12, 24
  autoSaveOnTransaction: boolean;
  backupCategories: {
    payment: boolean;
    ledger: boolean;
    accounts: boolean;
    tax: boolean;
    allSheets: boolean;
  };
  lastBackupAt: string | null;
  syncToLocalDisk: boolean;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  companyName: string;
  companyId: string;
  triggerReason: string; // 'scheduled' | 'manual' | 'auto_transaction'
  counts: {
    paymentRecords: number;
    ledgerEntries: number;
    accountBalances: number;
    cashBookEntries?: number;
    bankBookEntries?: number;
    taxTransactions: number;
    salesInvoices: number;
    purchaseBills: number;
    products: number;
    parties: number;
  };
  snapshotJson: string;
}

const CONFIG_KEY = 'erp_auto_backup_config';
const SNAPSHOTS_KEY = 'erp_auto_backup_snapshots';

export class BackupService {
  public static getConfig(): AutoBackupConfig {
    try {
      const data = localStorage.getItem(CONFIG_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse auto-backup config:', e);
    }
    return {
      enabled: true,
      intervalHours: 6,
      autoSaveOnTransaction: true,
      backupCategories: {
        payment: true,
        ledger: true,
        accounts: true,
        tax: true,
        allSheets: true,
      },
      lastBackupAt: new Date().toISOString(),
      syncToLocalDisk: true,
    };
  }

  public static saveConfig(config: AutoBackupConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  public static getSnapshots(): BackupSnapshot[] {
    try {
      const data = localStorage.getItem(SNAPSHOTS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse backup snapshots:', e);
    }
    return [];
  }

  public static saveSnapshots(snapshots: BackupSnapshot[]): void {
    // Keep max 15 latest snapshots to save memory
    const trimmed = snapshots.slice(-15);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed));
  }

  // Convert array of objects to CSV string
  public static convertToCSV(data: Record<string, any>[]): string {
    if (!data || !data.length) return '';
    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];
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

  private static triggerDownload(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 1. PAYMENT RECORDS BACKUP (भुगतान रिकॉर्ड बैकअप)
  public static getPaymentRecordsData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const khataTxns = ERPDatabase.getKhataTransactions().filter((k) => k.companyId === comp || !k.companyId);
    const sales = ERPDatabase.getSales().filter((s) => s.companyId === comp || !s.companyId);
    const purchases = ERPDatabase.getPurchases().filter((p) => p.companyId === comp || !p.companyId);
    const expenses = ERPDatabase.getExpenses().filter((e) => e.companyId === comp || !e.companyId);
    const cashDrawer = ERPDatabase.getCashDrawerSessions().filter((c) => c.companyId === comp || !c.companyId);

    const paymentRecords: any[] = [];

    // Customer / Party Khata Payments & Receipts
    khataTxns.forEach((k) => {
      paymentRecords.push({
        Voucher_Type: k.type === 'debit' ? 'CUSTOMER RECEIPT (आवक)' : 'VENDOR PAYMENT (जावक)',
        Voucher_No: `REC-${k.id.slice(-6).toUpperCase()}`,
        Date: new Date(k.createdAt).toLocaleDateString('en-IN'),
        Party_Customer_Vendor: k.partyName,
        Flow_Direction: k.type === 'debit' ? 'INFLOW (+)' : 'OUTFLOW (-)',
        Amount: k.amount,
        Payment_Mode: (k.paymentMode || 'CASH').toUpperCase(),
        Account_Used: (k as any).accountName || 'Cash Register',
        Notes_Reference: k.notes || 'Khata Balance Payment',
        Recorded_By: k.createdByName || 'Cashier',
        Raw_Timestamp: new Date(k.createdAt).getTime(),
      });
    });

    // Sale Invoice Payments
    sales.forEach((s) => {
      paymentRecords.push({
        Voucher_Type: 'SALE INVOICE RECEIPT',
        Voucher_No: s.invoiceNo,
        Date: new Date(s.billedAt).toLocaleDateString('en-IN'),
        Party_Customer_Vendor: s.customerName || 'Walk-in Customer',
        Flow_Direction: 'INFLOW (+)',
        Amount: s.paidAmount,
        Payment_Mode: s.paymentMode.toUpperCase(),
        Account_Used: 'Main Cash/UPI Register',
        Notes_Reference: `Billed Invoice #${s.invoiceNo} (Total: ₹${s.grandTotal}, Due: ₹${s.dueAmount})`,
        Recorded_By: s.billedByName,
        Raw_Timestamp: new Date(s.billedAt).getTime(),
      });
    });

    // Purchase Invoice Payments
    purchases.forEach((p) => {
      paymentRecords.push({
        Voucher_Type: 'PURCHASE VENDOR PAYMENT',
        Voucher_No: p.purchaseNo || p.vendorInvoiceNo,
        Date: new Date(p.purchasedAt).toLocaleDateString('en-IN'),
        Party_Customer_Vendor: p.vendorName,
        Flow_Direction: 'OUTFLOW (-)',
        Amount: p.paidAmount,
        Payment_Mode: p.paymentMode.toUpperCase(),
        Account_Used: 'Bank Operating A/C',
        Notes_Reference: `Vendor Purchase #${p.purchaseNo} (Total: ₹${p.grandTotal}, Due: ₹${p.dueAmount})`,
        Recorded_By: p.createdByName,
        Raw_Timestamp: new Date(p.purchasedAt).getTime(),
      });
    });

    // Expense Payments
    expenses.forEach((e) => {
      paymentRecords.push({
        Voucher_Type: 'OPERATING EXPENSE PAYMENT',
        Voucher_No: e.voucherNo,
        Date: new Date(e.expenseDate).toLocaleDateString('en-IN'),
        Party_Customer_Vendor: e.paidTo || e.category,
        Flow_Direction: 'OUTFLOW (-)',
        Amount: e.amount,
        Payment_Mode: e.paymentMode.toUpperCase(),
        Account_Used: e.paidFromAccountName,
        Notes_Reference: `Category: ${e.category} | ${e.notes || ''}`,
        Recorded_By: e.createdByName,
        Raw_Timestamp: new Date(e.expenseDate).getTime(),
      });
    });

    // Cash Drawer Sessions
    cashDrawer.forEach((cd) => {
      paymentRecords.push({
        Voucher_Type: 'CASH DRAWER GALLA SESSION',
        Voucher_No: `GALLA-${cd.id.slice(-6).toUpperCase()}`,
        Date: new Date(cd.openedAt).toLocaleDateString('en-IN'),
        Party_Customer_Vendor: `${cd.counterName} (${cd.cashierName})`,
        Flow_Direction: 'SESSION TOTAL',
        Amount: cd.totalPhysicalCash || cd.systemExpectedCash,
        Payment_Mode: 'PHYSICAL CASH',
        Account_Used: cd.counterName,
        Notes_Reference: `Opening Cash: ₹${cd.openingCash}, Discrepancy: ₹${cd.discrepancy || 0}, Status: ${cd.status}`,
        Recorded_By: cd.cashierName,
        Raw_Timestamp: new Date(cd.openedAt).getTime(),
      });
    });

    // Sort chronologically descending (newest first)
    paymentRecords.sort((a, b) => b.Raw_Timestamp - a.Raw_Timestamp);

    return paymentRecords.map(({ Raw_Timestamp, ...rest }) => rest);
  }

  // 2. LEDGER ENTRIES BACKUP (लेजर खाताबही बैकअप)
  public static getLedgerEntriesData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const rawData = GoogleSheetsService.getCompanyData(comp);
    return rawData.masterLedger;
  }

  // 3. ACCOUNTS & BANK BALANCE BACKUP (खाता एवं बैंक बैकअप)
  public static getAccountBalancesData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const accounts = ERPDatabase.getAccounts().filter((a) => a.companyId === comp || !a.companyId);
    const company = ERPDatabase.getCompany();

    const formattedAccounts = accounts.map((acc) => ({
      Account_ID: acc.id,
      Account_Name: acc.accountName,
      Account_Type: acc.accountType.toUpperCase(),
      Bank_Name: acc.bankName || (acc.accountType === 'cash' ? 'Cash Register' : company.bankName || 'HDFC Bank'),
      Account_Number: acc.accountNumber || (acc.accountType === 'cash' ? 'N/A (Cash)' : company.bankAccountNo || 'N/A'),
      IFSC_Code: acc.ifscCode || (acc.accountType === 'cash' ? 'N/A' : company.bankIfsc || 'N/A'),
      Opening_Balance: acc.openingBalance,
      Current_Available_Balance: acc.currentBalance,
      Is_Default_Account: acc.isDefault ? 'YES' : 'NO',
      Status: acc.status.toUpperCase(),
      Company_Name: company.name,
      Last_Verified_At: new Date().toLocaleDateString('en-IN'),
    }));

    return formattedAccounts;
  }

  // 4. TAX & GST COMPLIANCE BACKUP (टैक्स एवं जीएसटी बैकअप)
  public static getTaxBackupData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const sales = ERPDatabase.getSales().filter((s) => s.companyId === comp || !s.companyId);
    const purchases = ERPDatabase.getPurchases().filter((p) => p.companyId === comp || !p.companyId);

    const taxRecords: any[] = [];

    // Output GST on Sales (B2B & B2C)
    sales.forEach((s) => {
      s.items.forEach((item, idx) => {
        taxRecords.push({
          Tax_Type: 'OUTPUT GST (विक्री कर)',
          Voucher_No: s.invoiceNo,
          Date: new Date(s.billedAt).toLocaleDateString('en-IN'),
          Party_Name: s.customerName || 'B2C Retail Walk-in',
          GSTIN: s.customerGstin || 'URP (Unregistered)',
          Product_Name: item.productName,
          HSN_SAC_Code: item.hsnCode || 'N/A',
          Qty: item.qty,
          Taxable_Value: item.taxableAmount,
          GST_Rate_Percent: `${item.gstRate}%`,
          CGST_Amount: item.cgstAmount,
          SGST_Amount: item.sgstAmount,
          IGST_Amount: item.igstAmount,
          Total_Tax_Amount: item.cgstAmount + item.sgstAmount + item.igstAmount,
          Grand_Total: item.totalAmount,
          Supply_Type: s.customerGstin ? 'B2B Invoice' : 'B2C Retail',
        });
      });
    });

    // Input Tax Credit (ITC) on Purchases
    purchases.forEach((p) => {
      p.items.forEach((item) => {
        const cgst = item.gstRate ? (item.taxAmount || 0) / 2 : 0;
        const sgst = cgst;
        taxRecords.push({
          Tax_Type: 'INPUT TAX CREDIT (क्रय आई.टी.सी)',
          Voucher_No: p.purchaseNo || p.vendorInvoiceNo,
          Date: new Date(p.purchasedAt).toLocaleDateString('en-IN'),
          Party_Name: p.vendorName,
          GSTIN: p.vendorGstin || 'URP Vendor',
          Product_Name: item.productName,
          HSN_SAC_Code: 'N/A',
          Qty: item.qty,
          Taxable_Value: item.taxableAmount,
          GST_Rate_Percent: `${item.gstRate}%`,
          CGST_Amount: cgst,
          SGST_Amount: sgst,
          IGST_Amount: 0,
          Total_Tax_Amount: item.taxAmount || 0,
          Grand_Total: item.totalAmount,
          Supply_Type: 'Inward Supply (ITC Claim)',
        });
      });
    });

    return taxRecords;
  }

  // 5. PURCHASE RETURNS / DEBIT NOTES BACKUP (परचेज रिटर्न बैकअप)
  public static getPurchaseReturnsData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const list = ERPDatabase.getPurchaseReturns().filter((p) => p.companyId === comp || !p.companyId);

    const records: any[] = [];
    list.forEach((pr) => {
      pr.items.forEach((item) => {
        records.push({
          Voucher_Type: 'PURCHASE RETURN (DEBIT NOTE)',
          Return_No: pr.returnNo,
          Original_Purchase_No: pr.originalPurchaseNo,
          Date: new Date(pr.returnedAt).toLocaleDateString('en-IN'),
          Vendor_Name: pr.vendorName,
          Product_Name: item.productName,
          Qty_Returned: item.qty,
          Unit_Price: item.unitPrice,
          GST_Rate: `${item.gstRate}%`,
          Refund_Amount: item.totalAmount,
          Return_Reason: pr.reason || 'Defective / Damaged',
          Created_By: pr.createdByName || 'Admin',
        });
      });
    });
    return records;
  }

  // 6. SALES RETURNS / CREDIT NOTES BACKUP (सेल्स रिटर्न बैकअप)
  public static getSalesReturnsData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const list = ERPDatabase.getSalesReturns().filter((s) => s.companyId === comp || !s.companyId);

    const records: any[] = [];
    list.forEach((sr) => {
      sr.items.forEach((item) => {
        records.push({
          Voucher_Type: 'SALES RETURN (CREDIT NOTE)',
          Return_No: sr.returnNo,
          Original_Invoice_No: sr.originalInvoiceNo,
          Date: new Date(sr.returnedAt).toLocaleDateString('en-IN'),
          Customer_Name: sr.customerName,
          Product_Name: item.productName,
          Qty_Returned: item.qty,
          Unit_Price: item.unitPrice,
          GST_Rate: `${item.gstRate}%`,
          Refund_Amount: item.totalAmount,
          Return_Reason: sr.reason || 'Customer Return',
          Refund_Mode: ((sr as any).refundMode || 'CREDIT NOTE').toUpperCase(),
        });
      });
    });
    return records;
  }

  // 7. PURCHASE ORDERS BACKUP (परचेज ऑर्डर बैकअप)
  public static getPurchaseOrdersData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const list = ERPDatabase.getPurchaseOrders().filter((po) => po.companyId === comp || !po.companyId);

    const records: any[] = [];
    list.forEach((po) => {
      po.items.forEach((item) => {
        records.push({
          Document_Type: 'PURCHASE ORDER (PO)',
          PO_Number: po.poNo,
          Order_Date: new Date(po.orderedAt).toLocaleDateString('en-IN'),
          Expected_Delivery_Date: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : 'N/A',
          Vendor_Name: po.vendorName,
          Product_Name: item.productName,
          Order_Qty: item.qty,
          Estimated_Unit_Cost: (item as any).unitCost || item.unitPrice,
          Total_Amount: item.totalAmount,
          Order_Status: po.status.toUpperCase(),
          Approved_By: po.createdByName || 'Admin',
        });
      });
    });
    return records;
  }

  // 8. SALES ORDERS & ESTIMATES BACKUP (सेल्स ऑर्डर बैकअप)
  public static getSalesOrdersData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const list = ERPDatabase.getSalesOrders().filter((so) => so.companyId === comp || !so.companyId);

    const records: any[] = [];
    list.forEach((so) => {
      so.items.forEach((item) => {
        records.push({
          Document_Type: 'SALES ORDER / ESTIMATE (SO)',
          Order_Number: so.orderNo,
          Order_Date: new Date(so.orderedAt).toLocaleDateString('en-IN'),
          Customer_Name: so.customerName,
          Customer_Phone: so.customerPhone || 'N/A',
          Product_Name: item.productName,
          Qty_Ordered: item.qty,
          Unit_Price: item.unitPrice,
          Total_Amount: item.totalAmount,
          Advance_Paid: so.advancePaid || 0,
          Order_Status: so.status.toUpperCase(),
          Salesperson: so.createdByName || 'Sales Desk',
        });
      });
    });
    return records;
  }

  // 9. CASH BOOK BACKUP (कैश बुक / नगद बही)
  public static getCashBookData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const sales = ERPDatabase.getSales().filter((s) => s.companyId === comp || !s.companyId);
    const purchases = ERPDatabase.getPurchases().filter((p) => p.companyId === comp || !p.companyId);
    const expenses = ERPDatabase.getExpenses().filter((e) => e.companyId === comp || !e.companyId);
    const incomes = ERPDatabase.getIncomes().filter((i) => i.companyId === comp || !i.companyId);
    const khataTxns = ERPDatabase.getKhataTransactions().filter((k) => k.companyId === comp || !k.companyId);
    const transfers = ERPDatabase.getAccountTransfers().filter((t) => t.companyId === comp || !t.companyId);
    const salesReturns = ERPDatabase.getSalesReturns().filter((sr) => sr.companyId === comp || !sr.companyId);
    const purchaseReturns = ERPDatabase.getPurchaseReturns().filter((pr) => pr.companyId === comp || !pr.companyId);
    const accounts = ERPDatabase.getAccounts().filter((a) => a.companyId === comp || !a.companyId);
    const cashAccount = accounts.find((a) => a.accountType === 'cash') || accounts[0];

    const rawCashTxns: any[] = [];

    // 1. Cash Sales
    sales.forEach((s) => {
      if (s.paidAmount > 0 && s.paymentMode === 'cash') {
        rawCashTxns.push({
          Date: new Date(s.billedAt).toLocaleDateString('en-IN'),
          Voucher_No: s.invoiceNo,
          Particulars: `Cash Sale Receipt - ${s.customerName || 'Retail Customer'}`,
          Category: 'CASH SALE',
          Inflow_Receipt_Cr: s.paidAmount,
          Outflow_Payment_Dr: 0,
          Recorded_By: s.billedByName || 'Cashier',
          Notes: `Invoice #${s.invoiceNo}`,
          Raw_Timestamp: new Date(s.billedAt).getTime(),
        });
      }
    });

    // 2. Cash Purchases
    purchases.forEach((p) => {
      if (p.paidAmount > 0 && p.paymentMode === 'cash') {
        rawCashTxns.push({
          Date: new Date(p.purchasedAt).toLocaleDateString('en-IN'),
          Voucher_No: p.purchaseNo || p.vendorInvoiceNo,
          Particulars: `Cash Purchase Outflow - ${p.vendorName}`,
          Category: 'CASH PURCHASE',
          Inflow_Receipt_Cr: 0,
          Outflow_Payment_Dr: p.paidAmount,
          Recorded_By: p.createdByName || 'Manager',
          Notes: `Vendor Bill #${p.vendorInvoiceNo || p.purchaseNo}`,
          Raw_Timestamp: new Date(p.purchasedAt).getTime(),
        });
      }
    });

    // 3. Cash Expenses
    expenses.forEach((e) => {
      if (e.paymentMode === 'cash' || e.paidFromAccountName?.toLowerCase().includes('cash')) {
        rawCashTxns.push({
          Date: new Date(e.expenseDate).toLocaleDateString('en-IN'),
          Voucher_No: e.voucherNo,
          Particulars: `Cash Expense - ${e.category} (${e.paidTo || 'Office Expense'})`,
          Category: 'OPERATING EXPENSE',
          Inflow_Receipt_Cr: 0,
          Outflow_Payment_Dr: e.amount,
          Recorded_By: e.createdByName || 'Cashier',
          Notes: e.notes || e.category,
          Raw_Timestamp: new Date(e.expenseDate).getTime(),
        });
      }
    });

    // 4. Cash Incomes
    incomes.forEach((inc) => {
      rawCashTxns.push({
        Date: new Date(inc.incomeDate).toLocaleDateString('en-IN'),
        Voucher_No: inc.voucherNo,
        Particulars: `Cash Other Income - ${inc.source}`,
        Category: 'OTHER INCOME',
        Inflow_Receipt_Cr: inc.amount,
        Outflow_Payment_Dr: 0,
        Recorded_By: inc.createdByName || 'Admin',
        Notes: inc.notes || '',
        Raw_Timestamp: new Date(inc.incomeDate).getTime(),
      });
    });

    // 5. Khata Transactions in Cash
    khataTxns.forEach((k) => {
      if (k.paymentMode === 'cash') {
        const isReceipt = k.type === 'debit';
        rawCashTxns.push({
          Date: new Date(k.createdAt).toLocaleDateString('en-IN'),
          Voucher_No: k.referenceNo || `KHATA-${k.id.slice(-6).toUpperCase()}`,
          Particulars: isReceipt ? `Cash Udhar Collection - ${k.partyName}` : `Cash Supplier Payment - ${k.partyName}`,
          Category: isReceipt ? 'KHATA RECEIPT' : 'KHATA PAYMENT',
          Inflow_Receipt_Cr: isReceipt ? k.amount : 0,
          Outflow_Payment_Dr: isReceipt ? 0 : k.amount,
          Recorded_By: k.createdByName || 'Cashier',
          Notes: k.notes || 'Settlement',
          Raw_Timestamp: new Date(k.createdAt).getTime(),
        });
      }
    });

    // 6. Cash Sales Returns & Purchase Returns
    salesReturns.forEach((sr) => {
      rawCashTxns.push({
        Date: new Date(sr.returnedAt).toLocaleDateString('en-IN'),
        Voucher_No: sr.returnNo,
        Particulars: `Cash Refund to Customer - ${sr.customerName}`,
        Category: 'SALES RETURN REFUND',
        Inflow_Receipt_Cr: 0,
        Outflow_Payment_Dr: sr.totalRefundAmount,
        Recorded_By: sr.createdByName || 'Cashier',
        Notes: sr.reason || 'Sales Return',
        Raw_Timestamp: new Date(sr.returnedAt).getTime(),
      });
    });

    purchaseReturns.forEach((pr) => {
      rawCashTxns.push({
        Date: new Date(pr.returnedAt).toLocaleDateString('en-IN'),
        Voucher_No: pr.returnNo,
        Particulars: `Cash Refund Received from Supplier - ${pr.vendorName}`,
        Category: 'PURCHASE RETURN REFUND',
        Inflow_Receipt_Cr: pr.refundAmount,
        Outflow_Payment_Dr: 0,
        Recorded_By: pr.createdByName || 'Manager',
        Notes: pr.reason || 'Purchase Return',
        Raw_Timestamp: new Date(pr.returnedAt).getTime(),
      });
    });

    // 7. Inter-account transfers
    transfers.forEach((t) => {
      const isFromCash = t.fromAccountName?.toLowerCase().includes('cash');
      const isToCash = t.toAccountName?.toLowerCase().includes('cash');
      if (isFromCash) {
        rawCashTxns.push({
          Date: new Date(t.transferredAt).toLocaleDateString('en-IN'),
          Voucher_No: `TRX-${t.id.slice(-6).toUpperCase()}`,
          Particulars: `Cash Deposited to Bank -> ${t.toAccountName}`,
          Category: 'BANK DEPOSIT',
          Inflow_Receipt_Cr: 0,
          Outflow_Payment_Dr: t.amount,
          Recorded_By: t.createdByName || 'Admin',
          Notes: t.notes || 'Transfer to Bank',
          Raw_Timestamp: new Date(t.transferredAt).getTime(),
        });
      }
      if (isToCash) {
        rawCashTxns.push({
          Date: new Date(t.transferredAt).toLocaleDateString('en-IN'),
          Voucher_No: `TRX-${t.id.slice(-6).toUpperCase()}`,
          Particulars: `Cash Withdrawn from Bank <- ${t.fromAccountName}`,
          Category: 'CASH WITHDRAWAL',
          Inflow_Receipt_Cr: t.amount,
          Outflow_Payment_Dr: 0,
          Recorded_By: t.createdByName || 'Admin',
          Notes: t.notes || 'Withdrawal from Bank',
          Raw_Timestamp: new Date(t.transferredAt).getTime(),
        });
      }
    });

    // Sort chronologically ascending to compute running balance
    rawCashTxns.sort((a, b) => a.Raw_Timestamp - b.Raw_Timestamp);

    let runningCash = cashAccount?.openingBalance || 0;
    const listWithBalance = rawCashTxns.map((tx) => {
      runningCash += tx.Inflow_Receipt_Cr - tx.Outflow_Payment_Dr;
      return {
        ...tx,
        Cash_Running_Balance: runningCash,
      };
    });

    listWithBalance.reverse();

    return listWithBalance.map(({ Raw_Timestamp, ...rest }) => rest);
  }

  // 10. BANK BOOK BACKUP (बैंक बुक / बैंक बही)
  public static getBankBookData(companyId?: string) {
    const comp = companyId || ERPDatabase.getCompany().id;
    const sales = ERPDatabase.getSales().filter((s) => s.companyId === comp || !s.companyId);
    const purchases = ERPDatabase.getPurchases().filter((p) => p.companyId === comp || !p.companyId);
    const expenses = ERPDatabase.getExpenses().filter((e) => e.companyId === comp || !e.companyId);
    const incomes = ERPDatabase.getIncomes().filter((i) => i.companyId === comp || !i.companyId);
    const khataTxns = ERPDatabase.getKhataTransactions().filter((k) => k.companyId === comp || !k.companyId);
    const transfers = ERPDatabase.getAccountTransfers().filter((t) => t.companyId === comp || !t.companyId);
    const company = ERPDatabase.getCompany();
    const accounts = ERPDatabase.getAccounts().filter((a) => a.companyId === comp || !a.companyId);
    const bankAccount = accounts.find((a) => a.accountType === 'bank') || accounts[0];

    const rawBankTxns: any[] = [];

    // 1. Digital/Bank Sales (UPI, Card, Bank Transfer)
    sales.forEach((s) => {
      if (s.paidAmount > 0 && s.paymentMode !== 'cash' && s.paymentMode !== 'khata') {
        rawBankTxns.push({
          Date: new Date(s.billedAt).toLocaleDateString('en-IN'),
          Voucher_No: s.invoiceNo,
          Bank_Name: company.bankName || 'Operating Bank A/C',
          Particulars: `Online/Bank Sale Receipt - ${s.customerName || 'Customer'}`,
          Payment_Mode: s.paymentMode.toUpperCase(),
          Inflow_Deposit_Cr: s.paidAmount,
          Outflow_Withdrawal_Dr: 0,
          Recorded_By: s.billedByName || 'Cashier',
          Notes: `Invoice #${s.invoiceNo} (${s.paymentMode.toUpperCase()})`,
          Raw_Timestamp: new Date(s.billedAt).getTime(),
        });
      }
    });

    // 2. Bank Purchases
    purchases.forEach((p) => {
      if (p.paidAmount > 0 && p.paymentMode !== 'cash') {
        rawBankTxns.push({
          Date: new Date(p.purchasedAt).toLocaleDateString('en-IN'),
          Voucher_No: p.purchaseNo || p.vendorInvoiceNo,
          Bank_Name: company.bankName || 'Operating Bank A/C',
          Particulars: `Vendor Bank Payment - ${p.vendorName}`,
          Payment_Mode: p.paymentMode.toUpperCase(),
          Inflow_Deposit_Cr: 0,
          Outflow_Withdrawal_Dr: p.paidAmount,
          Recorded_By: p.createdByName || 'Manager',
          Notes: `Vendor Bill #${p.vendorInvoiceNo || p.purchaseNo}`,
          Raw_Timestamp: new Date(p.purchasedAt).getTime(),
        });
      }
    });

    // 3. Bank Expenses
    expenses.forEach((e) => {
      if (e.paymentMode !== 'cash') {
        rawBankTxns.push({
          Date: new Date(e.expenseDate).toLocaleDateString('en-IN'),
          Voucher_No: e.voucherNo,
          Bank_Name: e.paidFromAccountName || company.bankName || 'Main Bank',
          Particulars: `Bank Expense Outflow - ${e.category} (${e.paidTo || ''})`,
          Payment_Mode: e.paymentMode.toUpperCase(),
          Inflow_Deposit_Cr: 0,
          Outflow_Withdrawal_Dr: e.amount,
          Recorded_By: e.createdByName || 'Admin',
          Notes: e.notes || e.category,
          Raw_Timestamp: new Date(e.expenseDate).getTime(),
        });
      }
    });

    // 4. Bank Incomes
    incomes.forEach((inc) => {
      rawBankTxns.push({
        Date: new Date(inc.incomeDate).toLocaleDateString('en-IN'),
        Voucher_No: inc.voucherNo,
        Bank_Name: inc.receivedInAccountName || company.bankName || 'Main Bank',
        Particulars: `Bank Other Income Receipt - ${inc.source}`,
        Payment_Mode: 'BANK TRANSFER',
        Inflow_Deposit_Cr: inc.amount,
        Outflow_Withdrawal_Dr: 0,
        Recorded_By: inc.createdByName || 'Admin',
        Notes: inc.notes || '',
        Raw_Timestamp: new Date(inc.incomeDate).getTime(),
      });
    });

    // 5. Khata Transactions via Bank/UPI/Cheque
    khataTxns.forEach((k) => {
      if (k.paymentMode !== 'cash' && k.paymentMode !== 'khata_credit') {
        const isReceipt = k.type === 'debit';
        rawBankTxns.push({
          Date: new Date(k.createdAt).toLocaleDateString('en-IN'),
          Voucher_No: k.referenceNo || `KHATA-${k.id.slice(-6).toUpperCase()}`,
          Bank_Name: company.bankName || 'Operating Bank A/C',
          Particulars: isReceipt ? `Bank/UPI Khata Collection - ${k.partyName}` : `Bank/UPI Supplier Payment - ${k.partyName}`,
          Payment_Mode: (k.paymentMode || 'BANK').toUpperCase(),
          Inflow_Deposit_Cr: isReceipt ? k.amount : 0,
          Outflow_Withdrawal_Dr: isReceipt ? 0 : k.amount,
          Recorded_By: k.createdByName || 'Cashier',
          Notes: k.notes || 'Bank Settlement',
          Raw_Timestamp: new Date(k.createdAt).getTime(),
        });
      }
    });

    // 6. Inter-account transfers involving Bank
    transfers.forEach((t) => {
      const isFromBank = t.fromAccountName?.toLowerCase().includes('bank');
      const isToBank = t.toAccountName?.toLowerCase().includes('bank');
      if (isToBank) {
        rawBankTxns.push({
          Date: new Date(t.transferredAt).toLocaleDateString('en-IN'),
          Voucher_No: `TRX-${t.id.slice(-6).toUpperCase()}`,
          Bank_Name: t.toAccountName,
          Particulars: `Cash Deposit Inflow <- ${t.fromAccountName}`,
          Payment_Mode: 'CONTRA DEPOSIT',
          Inflow_Deposit_Cr: t.amount,
          Outflow_Withdrawal_Dr: 0,
          Recorded_By: t.createdByName || 'Admin',
          Notes: t.notes || 'Cash Deposit',
          Raw_Timestamp: new Date(t.transferredAt).getTime(),
        });
      }
      if (isFromBank) {
        rawBankTxns.push({
          Date: new Date(t.transferredAt).toLocaleDateString('en-IN'),
          Voucher_No: `TRX-${t.id.slice(-6).toUpperCase()}`,
          Bank_Name: t.fromAccountName,
          Particulars: `Bank Cash Withdrawal -> ${t.toAccountName}`,
          Payment_Mode: 'CONTRA WITHDRAWAL',
          Inflow_Deposit_Cr: 0,
          Outflow_Withdrawal_Dr: t.amount,
          Recorded_By: t.createdByName || 'Admin',
          Notes: t.notes || 'Cash Withdrawal',
          Raw_Timestamp: new Date(t.transferredAt).getTime(),
        });
      }
    });

    // Sort chronologically ascending to calculate running bank balance
    rawBankTxns.sort((a, b) => a.Raw_Timestamp - b.Raw_Timestamp);

    let runningBank = bankAccount?.openingBalance || 0;
    const listWithBalance = rawBankTxns.map((tx) => {
      runningBank += tx.Inflow_Deposit_Cr - tx.Outflow_Withdrawal_Dr;
      return {
        ...tx,
        Bank_Running_Balance: runningBank,
      };
    });

    listWithBalance.reverse();

    return listWithBalance.map(({ Raw_Timestamp, ...rest }) => rest);
  }

  // DOWNLOAD INDIVIDUAL DEDICATED BACKUP CSV
  public static downloadDedicatedBackupCSV(
    category: 'payment' | 'ledger' | 'accounts' | 'cashBook' | 'bankBook' | 'tax' | 'purchaseReturns' | 'salesReturns' | 'purchaseOrders' | 'salesOrders' | 'all'
  ) {
    const comp = ERPDatabase.getCompany();
    const dateStr = new Date().toISOString().split('T')[0];
    const safeCompName = comp.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (category === 'payment') {
      const data = this.getPaymentRecordsData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`PAYMENT_RECORDS_BACKUP_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'ledger') {
      const data = this.getLedgerEntriesData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`MASTER_LEDGER_BACKUP_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'accounts') {
      const data = this.getAccountBalancesData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`ACCOUNTS_BANK_STORE_BACKUP_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'cashBook') {
      const data = this.getCashBookData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`CASH_BOOK_NAGAD_BAHI_BACKUP_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'bankBook') {
      const data = this.getBankBookData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`BANK_BOOK_STATEMENT_BACKUP_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'tax') {
      const data = this.getTaxBackupData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`GST_TAX_REPORTS_BACKUP_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'purchaseReturns') {
      const data = this.getPurchaseReturnsData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`PURCHASE_RETURNS_DEBIT_NOTES_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'salesReturns') {
      const data = this.getSalesReturnsData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`SALES_RETURNS_CREDIT_NOTES_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'purchaseOrders') {
      const data = this.getPurchaseOrdersData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`PURCHASE_ORDERS_PO_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'salesOrders') {
      const data = this.getSalesOrdersData(comp.id);
      const csv = this.convertToCSV(data);
      this.triggerDownload(`SALES_ORDERS_SO_${safeCompName}_${dateStr}.csv`, csv);
    } else if (category === 'all') {
      // Download all dedicated CSV files sequentially
      this.downloadDedicatedBackupCSV('payment');
      setTimeout(() => this.downloadDedicatedBackupCSV('ledger'), 150);
      setTimeout(() => this.downloadDedicatedBackupCSV('accounts'), 300);
      setTimeout(() => this.downloadDedicatedBackupCSV('cashBook'), 450);
      setTimeout(() => this.downloadDedicatedBackupCSV('bankBook'), 600);
      setTimeout(() => this.downloadDedicatedBackupCSV('tax'), 750);
      setTimeout(() => this.downloadDedicatedBackupCSV('purchaseReturns'), 900);
      setTimeout(() => this.downloadDedicatedBackupCSV('salesReturns'), 1050);
      setTimeout(() => this.downloadDedicatedBackupCSV('purchaseOrders'), 1200);
      setTimeout(() => this.downloadDedicatedBackupCSV('salesOrders'), 1350);
    }
  }

  // TRIGGER AUTOMATED SNAPSHOT AUTO-BACKUP
  public static triggerAutoBackup(triggerReason: 'scheduled' | 'manual' | 'auto_transaction' = 'manual'): BackupSnapshot {
    const company = ERPDatabase.getCompany();
    const paymentRecords = this.getPaymentRecordsData(company.id);
    const ledgerEntries = this.getLedgerEntriesData(company.id);
    const accountBalances = this.getAccountBalancesData(company.id);
    const cashBookEntries = this.getCashBookData(company.id);
    const bankBookEntries = this.getBankBookData(company.id);
    const taxTransactions = this.getTaxBackupData(company.id);
    const salesInvoices = ERPDatabase.getSales();
    const purchaseBills = ERPDatabase.getPurchases();
    const products = ERPDatabase.getProducts();
    const parties = ERPDatabase.getParties();

    const fullSnapshotData = {
      company,
      users: ERPDatabase.getUsers(),
      paymentRecords,
      ledgerEntries,
      accountBalances,
      cashBookEntries,
      bankBookEntries,
      taxTransactions,
      salesInvoices,
      purchaseBills,
      products,
      parties,
      expenses: ERPDatabase.getExpenses(),
      cashDrawerSessions: ERPDatabase.getCashDrawerSessions(),
      serviceBookings: ERPDatabase.getServiceBookings(),
      auditLogs: ERPDatabase.getAuditLogs(),
    };

    const newSnapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      companyName: company.name,
      companyId: company.id,
      triggerReason,
      counts: {
        paymentRecords: paymentRecords.length,
        ledgerEntries: ledgerEntries.length,
        accountBalances: accountBalances.length,
        cashBookEntries: cashBookEntries.length,
        bankBookEntries: bankBookEntries.length,
        taxTransactions: taxTransactions.length,
        salesInvoices: salesInvoices.length,
        purchaseBills: purchaseBills.length,
        products: products.length,
        parties: parties.length,
      },
      snapshotJson: JSON.stringify(fullSnapshotData),
    };

    const snapshots = this.getSnapshots();
    snapshots.unshift(newSnapshot);
    this.saveSnapshots(snapshots);

    // Update config last backup time
    const config = this.getConfig();
    config.lastBackupAt = newSnapshot.timestamp;
    this.saveConfig(config);

    ERPDatabase.addAuditLog(
      'AUTO_BACKUP_SNAPSHOT_CREATED',
      'BACKUP_ENGINE',
      `Auto-backup snapshot taken successfully (${triggerReason.toUpperCase()}). Payment records: ${paymentRecords.length}, Cash Book: ${cashBookEntries.length}, Bank Book: ${bankBookEntries.length}`
    );

    return newSnapshot;
  }

  // RESTORE FROM SNAPSHOT
  public static restoreFromSnapshot(snapshotId: string): boolean {
    const snapshots = this.getSnapshots();
    const snap = snapshots.find((s) => s.id === snapshotId);
    if (!snap) return false;

    try {
      const data = JSON.parse(snap.snapshotJson);
      if (data.company) ERPDatabase.setItem('erp_company', data.company);
      if (data.users) ERPDatabase.setItem('erp_users', data.users);
      if (data.products) ERPDatabase.setItem('erp_products', data.products);
      if (data.parties) ERPDatabase.setItem('erp_parties', data.parties);
      if (data.salesInvoices) ERPDatabase.setItem('erp_sales', data.salesInvoices);
      if (data.purchaseBills) ERPDatabase.setItem('erp_purchases', data.purchaseBills);
      if (data.expenses) ERPDatabase.setItem('erp_expenses', data.expenses);
      if (data.cashDrawerSessions) ERPDatabase.setItem('erp_cash_drawer_sessions', data.cashDrawerSessions);
      if (data.serviceBookings) ERPDatabase.setItem('erp_service_bookings', data.serviceBookings);
      if (data.auditLogs) ERPDatabase.setItem('erp_audit_logs', data.auditLogs);
      if (data.paymentRecords) ERPDatabase.setItem('erp_payment_txn_logs', data.paymentRecords);
      if (data.khataTxns) ERPDatabase.setItem('erp_khata_txns', data.khataTxns);
      if (data.accountBalances) ERPDatabase.setItem('erp_accounts', data.accountBalances);

      ERPDatabase.addAuditLog(
        'RESTORE_DATABASE_SNAPSHOT',
        'BACKUP_ENGINE',
        `Database successfully restored to snapshot ID ${snapshotId} created at ${new Date(snap.timestamp).toLocaleString()}`
      );
      return true;
    } catch (e) {
      console.error('Error restoring snapshot:', e);
      return false;
    }
  }
}
