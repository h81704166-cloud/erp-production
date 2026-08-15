import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileSpreadsheet,
  Users,
  Package,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  Wrench,
  CreditCard,
  Database,
  HelpCircle,
} from 'lucide-react';
import { Company, Product, Party, Sale, Purchase, Expense, ServiceCatalogItem, Account } from '../../types/erp';
import { ERPDatabase } from '../../services/db';

export type CsvImportType = 'products' | 'parties' | 'sales' | 'purchases' | 'expenses' | 'services' | 'accounts';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onRefreshData: () => void;
  defaultType?: CsvImportType;
}

// Helper to robustly parse CSV strings with quote support
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r\n|\n|\r/);
  const result: string[][] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const row: string[] = [];
    let insideQuote = false;
    let currentCell = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());

    if (row.some((cell) => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  company,
  onRefreshData,
  defaultType = 'products',
}) => {
  const [importType, setImportType] = useState<CsvImportType>(defaultType);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-detect column headers for different models
  const autoDetectColumns = (type: CsvImportType, hdrs: string[]) => {
    const map: Record<string, string> = {};
    hdrs.forEach((h) => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (type === 'products') {
        if (clean.includes('name') || clean.includes('title') || clean.includes('item')) map['name'] = h;
        else if (clean.includes('sku') || clean.includes('code') || clean.includes('itemcode')) map['sku'] = h;
        else if (clean.includes('barcode') || clean.includes('upc') || clean.includes('ean')) map['barcode'] = h;
        else if (clean.includes('hsn') || clean.includes('sac')) map['hsnCode'] = h;
        else if (clean.includes('category') || clean.includes('cat') || clean.includes('group')) map['category'] = h;
        else if (clean.includes('unit') || clean.includes('uom') || clean.includes('pack')) map['unit'] = h;
        else if (clean.includes('selling') || clean.includes('sale') || clean.includes('mrp') || clean.includes('rate') || clean === 'price') map['sellingPrice'] = h;
        else if (clean.includes('purchase') || clean.includes('cost') || clean.includes('buy')) map['purchasePrice'] = h;
        else if (clean.includes('stock') || clean.includes('qty') || clean.includes('quantity') || clean.includes('opening')) map['stockQty'] = h;
        else if (clean.includes('gst') || clean.includes('tax')) map['gstRate'] = h;
      } else if (type === 'parties') {
        if (clean.includes('name') || clean.includes('contact') || clean.includes('customer') || clean.includes('vendor')) map['name'] = h;
        else if (clean.includes('company') || clean.includes('firm') || clean.includes('business')) map['companyName'] = h;
        else if (clean.includes('phone') || clean.includes('mobile') || clean.includes('tel') || clean.includes('number')) map['phone'] = h;
        else if (clean.includes('email') || clean.includes('mail')) map['email'] = h;
        else if (clean.includes('gst') || clean.includes('gstin') || clean.includes('taxid')) map['gstin'] = h;
        else if (clean.includes('address') || clean.includes('street') || clean.includes('location')) map['address'] = h;
        else if (clean.includes('city') || clean.includes('town')) map['city'] = h;
        else if (clean.includes('state') || clean.includes('province')) map['state'] = h;
        else if (clean.includes('type') || clean.includes('role')) map['type'] = h;
        else if (clean.includes('balance') || clean.includes('opening') || clean.includes('due') || clean.includes('udhar')) map['openingBalance'] = h;
      } else if (type === 'sales') {
        if (clean.includes('invoice') || clean.includes('billno') || clean.includes('inv')) map['invoiceNo'] = h;
        else if (clean.includes('customer') || clean.includes('party') || clean.includes('client')) map['customerName'] = h;
        else if (clean.includes('phone') || clean.includes('mobile')) map['customerPhone'] = h;
        else if (clean.includes('date') || clean.includes('time') || clean.includes('billedat')) map['billedAt'] = h;
        else if (clean.includes('total') || clean.includes('grand') || clean.includes('amount')) map['grandTotal'] = h;
        else if (clean.includes('paid')) map['paidAmount'] = h;
        else if (clean.includes('mode') || clean.includes('payment')) map['paymentMode'] = h;
        else if (clean.includes('status')) map['status'] = h;
      } else if (type === 'purchases') {
        if (clean.includes('purchase') || clean.includes('pno') || clean.includes('order')) map['purchaseNo'] = h;
        else if (clean.includes('vendorinv') || clean.includes('billno')) map['vendorInvoiceNo'] = h;
        else if (clean.includes('vendor') || clean.includes('supplier') || clean.includes('party')) map['vendorName'] = h;
        else if (clean.includes('date') || clean.includes('purchasedat')) map['purchasedAt'] = h;
        else if (clean.includes('total') || clean.includes('grand') || clean.includes('amount')) map['grandTotal'] = h;
        else if (clean.includes('paid')) map['paidAmount'] = h;
        else if (clean.includes('mode') || clean.includes('payment')) map['paymentMode'] = h;
      } else if (type === 'expenses') {
        if (clean.includes('voucher') || clean.includes('no') || clean.includes('code')) map['voucherNo'] = h;
        else if (clean.includes('category') || clean.includes('cat') || clean.includes('type')) map['category'] = h;
        else if (clean.includes('amount') || clean.includes('val') || clean.includes('cost')) map['amount'] = h;
        else if (clean.includes('date')) map['expenseDate'] = h;
        else if (clean.includes('paidto') || clean.includes('payee') || clean.includes('vendor')) map['paidTo'] = h;
        else if (clean.includes('account') || clean.includes('bank') || clean.includes('from')) map['paidFromAccountName'] = h;
        else if (clean.includes('mode') || clean.includes('payment')) map['paymentMode'] = h;
        else if (clean.includes('desc') || clean.includes('notes') || clean.includes('detail')) map['description'] = h;
      } else if (type === 'services') {
        if (clean.includes('name') || clean.includes('service') || clean.includes('title')) map['name'] = h;
        else if (clean.includes('category') || clean.includes('cat')) map['category'] = h;
        else if (clean.includes('price') || clean.includes('charge') || clean.includes('rate')) map['price'] = h;
        else if (clean.includes('duration') || clean.includes('min') || clean.includes('time')) map['durationMins'] = h;
        else if (clean.includes('gst') || clean.includes('tax')) map['gstRate'] = h;
        else if (clean.includes('staff') || clean.includes('expert') || clean.includes('technician')) map['assignedStaff'] = h;
        else if (clean.includes('desc') || clean.includes('detail')) map['description'] = h;
      } else if (type === 'accounts') {
        if (clean.includes('name') || clean.includes('account') || clean.includes('title')) map['accountName'] = h;
        else if (clean.includes('type')) map['accountType'] = h;
        else if (clean.includes('bank')) map['bankName'] = h;
        else if (clean.includes('number') || clean.includes('accno')) map['accountNumber'] = h;
        else if (clean.includes('ifsc')) map['ifscCode'] = h;
        else if (clean.includes('balance') || clean.includes('opening')) map['openingBalance'] = h;
      }
    });
    setColumnMap(map);
  };

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processCsvContent(content);
    };
    reader.readAsText(file);
  };

  const processCsvContent = (text: string) => {
    const parsed = parseCSV(text);
    if (parsed.length === 0) return;

    const hdrs = parsed[0];
    const dataRows = parsed.slice(1);

    setHeaders(hdrs);
    setParsedRows(dataRows);
    setImportResult(null);

    autoDetectColumns(importType, hdrs);
  };

  // Sample CSV Downloads
  const downloadSampleCsv = (type: CsvImportType) => {
    let sample = '';
    let filename = '';

    if (type === 'products') {
      filename = 'Sample_Products_List.csv';
      sample = `Product Name,SKU,Barcode,HSN Code,Category,Unit,Purchase Price,Selling Price,Stock Qty,GST Rate
Parle-G Biscuit 100g,SKU-PARLE-100,8901234567891,1905,Groceries,Pcs,8.5,10,120,5
Tata Salt 1kg,SKU-SALT-1KG,8901234567892,2501,Essentials,Pcs,22,28,80,0
Fortune Sunlite Oil 1L,SKU-OIL-1L,8901234567893,1512,Edible Oils,Pcs,135,160,45,5
Logitech Wireless Mouse M185,SKU-LOGI-M185,8901234567894,8471,Electronics,Pcs,450,699,25,18
Dettol Soap 75g (Pack of 3),SKU-DETTOL-3,8901234567895,3401,Personal Care,Pack,82,110,35,18`;
    } else if (type === 'parties') {
      filename = 'Sample_Customers_Suppliers_List.csv';
      sample = `Party Name,Party Type,Company Name,Phone,Email,GSTIN,Address,City,State,Opening Balance
Sharma General Store,customer,Sharma Retail,9876543210,sharma.store@gmail.com,27AABCS1234F1Z2,Shop 14 Main Market,Mumbai,Maharashtra,12500
Gupta Electronics,customer,Gupta Enterprises,9811122233,guptaelectronics@gmail.com,27AACCG5678E1Z5,Station Road,Pune,Maharashtra,8400
Apex Distributors Pvt Ltd,vendor,Apex Wholesale,9822233344,orders@apexdistributors.com,27AADCA9988K1Z9,Industrial Area MIDC,Nagpur,Maharashtra,-45000
Verma Medical Agency,vendor,Verma Med,9833344455,verma.med@gmail.com,27AABCV7766L1Z3,Near Civil Hospital,Nashik,Maharashtra,0`;
    } else if (type === 'sales') {
      filename = 'Sample_Sales_Invoices.csv';
      sample = `Invoice No,Customer Name,Customer Phone,Billed Date,Grand Total,Paid Amount,Payment Mode,Status
INV-2026-1001,Sharma Retail,9876543210,2026-08-01,4500,4500,upi,completed
INV-2026-1002,Rajesh Kumar,9811122233,2026-08-02,1250,1250,cash,completed
INV-2026-1003,Gupta Enterprises,9822233344,2026-08-03,8900,5000,khata,partially_paid`;
    } else if (type === 'purchases') {
      filename = 'Sample_Purchase_Bills.csv';
      sample = `Purchase No,Vendor Invoice No,Vendor Name,Purchased Date,Grand Total,Paid Amount,Payment Mode
PUR-2026-501,V-INV-9901,Apex Wholesale,2026-08-01,25000,25000,bank_transfer
PUR-2026-502,V-INV-9902,Verma Medical,2026-08-02,14200,10000,cheque`;
    } else if (type === 'expenses') {
      filename = 'Sample_Expense_Vouchers.csv';
      sample = `Voucher No,Category,Amount,Expense Date,Paid To,Paid From Account,Payment Mode,Description
EXP-2026-01,Rent,25000,2026-08-01,Landlord Commercial Complex,HDFC Bank Operating A/C,bank_transfer,Monthly Shop Rent
EXP-2026-02,Electricity,3450,2026-08-02,MSEDCL Power Corp,Main Cash Register,cash,Monthly Power Bill
EXP-2026-03,Logistics & Freight,1200,2026-08-03,DTDC Courier,Petty Cash Counter,cash,Goods Dispatch Freight`;
    } else if (type === 'services') {
      filename = 'Sample_Service_Catalog.csv';
      sample = `Service Name,Category,Price,Duration Mins,GST Rate,Assigned Staff,Description
AC Pressure Jet Washing & Servicing,repair_maintenance,599,45,18,Ramesh Sharma,Full indoor outdoor deep coil cleaning
Men Hair Styling & Grooming,salon_beauty,250,30,5,Suresh Hair Stylist,Haircut and beard trim package
Dry Cleaning Suit & Blazer,laundry_cleaning,400,24,18,Laundry Team,Steam pressing and dry clean`;
    } else if (type === 'accounts') {
      filename = 'Sample_Accounts_List.csv';
      sample = `Account Name,Account Type,Bank Name,Account Number,IFSC Code,Opening Balance
ICICI Bank Current Account,bank,ICICI Bank,987654321001,ICIC0001234,85000
SBI Business Account,bank,State Bank of India,112233445566,SBIN0004567,120000
Main Cash Counter Register,cash,Cash Drawer,,15000`;
    }

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Bulk Import for all types
  const handlePerformImport = () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    setTimeout(() => {
      try {
        let count = 0;

        if (importType === 'products') {
          const nameIdx = headers.indexOf(columnMap['name'] || '');
          const skuIdx = headers.indexOf(columnMap['sku'] || '');
          const barcodeIdx = headers.indexOf(columnMap['barcode'] || '');
          const hsnIdx = headers.indexOf(columnMap['hsnCode'] || '');
          const categoryIdx = headers.indexOf(columnMap['category'] || '');
          const unitIdx = headers.indexOf(columnMap['unit'] || '');
          const sellIdx = headers.indexOf(columnMap['sellingPrice'] || '');
          const buyIdx = headers.indexOf(columnMap['purchasePrice'] || '');
          const stockIdx = headers.indexOf(columnMap['stockQty'] || '');
          const gstIdx = headers.indexOf(columnMap['gstRate'] || '');

          const list: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [];

          parsedRows.forEach((row, i) => {
            const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : `Imported Product #${i + 1}`;
            const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx] : `SKU-IMP-${Date.now()}-${i}`;
            const barcode = barcodeIdx !== -1 && row[barcodeIdx] ? row[barcodeIdx] : `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;
            const hsnCode = hsnIdx !== -1 && row[hsnIdx] ? row[hsnIdx] : '8471';
            const category = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx] : 'General';
            const unit = unitIdx !== -1 && row[unitIdx] ? (row[unitIdx] as any) : 'Pcs';

            const sellingPrice = parseFloat((sellIdx !== -1 ? row[sellIdx] : '0').replace(/[^0-9.]/g, '')) || 0;
            const purchasePrice = parseFloat((buyIdx !== -1 ? row[buyIdx] : '0').replace(/[^0-9.]/g, '')) || 0;
            const stockQty = parseFloat((stockIdx !== -1 ? row[stockIdx] : '0').replace(/[^0-9.]/g, '')) || 0;
            const gstRate = parseFloat((gstIdx !== -1 ? row[gstIdx] : '18').replace(/[^0-9.]/g, '')) || 18;

            list.push({
              companyId: company.id,
              name,
              sku,
              barcode,
              hsnCode,
              category,
              unit,
              purchasePrice,
              sellingPrice,
              minSellingPrice: sellingPrice * 0.9,
              gstRate,
              stockQty,
              minStockAlert: 5,
              location: 'Main Warehouse',
              status: 'active',
            });
          });

          count = ERPDatabase.bulkAddProducts(list);
        } else if (importType === 'parties') {
          const nameIdx = headers.indexOf(columnMap['name'] || '');
          const typeIdx = headers.indexOf(columnMap['type'] || '');
          const companyNameIdx = headers.indexOf(columnMap['companyName'] || '');
          const phoneIdx = headers.indexOf(columnMap['phone'] || '');
          const emailIdx = headers.indexOf(columnMap['email'] || '');
          const gstinIdx = headers.indexOf(columnMap['gstin'] || '');
          const addressIdx = headers.indexOf(columnMap['address'] || '');
          const cityIdx = headers.indexOf(columnMap['city'] || '');
          const stateIdx = headers.indexOf(columnMap['state'] || '');
          const balIdx = headers.indexOf(columnMap['openingBalance'] || '');

          const list: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[] = [];

          parsedRows.forEach((row, i) => {
            const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : `Imported Contact #${i + 1}`;
            const rawType = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].toLowerCase() : 'customer';
            const type: 'customer' | 'vendor' = rawType.includes('vendor') || rawType.includes('supplier') ? 'vendor' : 'customer';

            const companyName = companyNameIdx !== -1 ? row[companyNameIdx] : '';
            const phone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`;
            const email = emailIdx !== -1 ? row[emailIdx] : '';
            const gstin = gstinIdx !== -1 ? row[gstinIdx] : '';
            const address = addressIdx !== -1 ? row[addressIdx] : 'Main Market';
            const city = cityIdx !== -1 ? row[cityIdx] : 'Local City';
            const state = stateIdx !== -1 ? row[stateIdx] : 'State';
            const openingBalance = parseFloat((balIdx !== -1 ? row[balIdx] : '0').replace(/[^0-9.-]/g, '')) || 0;

            list.push({
              companyId: company.id,
              type,
              name,
              companyName,
              phone,
              email,
              gstin,
              address,
              city,
              state,
              creditLimit: 100000,
              openingBalance,
              status: 'active',
            });
          });

          count = ERPDatabase.bulkAddParties(list);
        } else if (importType === 'sales') {
          const invIdx = headers.indexOf(columnMap['invoiceNo'] || '');
          const custIdx = headers.indexOf(columnMap['customerName'] || '');
          const phoneIdx = headers.indexOf(columnMap['customerPhone'] || '');
          const dateIdx = headers.indexOf(columnMap['billedAt'] || '');
          const totalIdx = headers.indexOf(columnMap['grandTotal'] || '');
          const paidIdx = headers.indexOf(columnMap['paidAmount'] || '');
          const modeIdx = headers.indexOf(columnMap['paymentMode'] || '');

          const list: any[] = [];
          parsedRows.forEach((row, i) => {
            const invoiceNo = invIdx !== -1 && row[invIdx] ? row[invIdx] : `INV-2026-${1000 + i}`;
            const customerName = custIdx !== -1 && row[custIdx] ? row[custIdx] : 'General Customer';
            const customerPhone = phoneIdx !== -1 ? row[phoneIdx] : '';
            const grandTotal = parseFloat((totalIdx !== -1 ? row[totalIdx] : '0').replace(/[^0-9.]/g, '')) || 0;
            const paidAmount = paidIdx !== -1 ? parseFloat(row[paidIdx].replace(/[^0-9.]/g, '')) || 0 : grandTotal;
            const paymentMode = modeIdx !== -1 ? row[modeIdx].toLowerCase() : 'cash';
            const billedAt = dateIdx !== -1 && row[dateIdx] ? new Date(row[dateIdx]).toISOString() : new Date().toISOString();

            list.push({
              companyId: company.id,
              invoiceNo,
              customerName,
              customerPhone,
              grandTotal,
              paidAmount,
              dueAmount: Math.max(0, grandTotal - paidAmount),
              paymentMode: paymentMode.includes('upi') ? 'upi' : paymentMode.includes('khata') ? 'khata' : 'cash',
              billedAt,
            });
          });

          count = ERPDatabase.bulkAddSales(list);
        } else if (importType === 'purchases') {
          const purIdx = headers.indexOf(columnMap['purchaseNo'] || '');
          const vinvIdx = headers.indexOf(columnMap['vendorInvoiceNo'] || '');
          const vendIdx = headers.indexOf(columnMap['vendorName'] || '');
          const dateIdx = headers.indexOf(columnMap['purchasedAt'] || '');
          const totalIdx = headers.indexOf(columnMap['grandTotal'] || '');
          const paidIdx = headers.indexOf(columnMap['paidAmount'] || '');

          const list: any[] = [];
          parsedRows.forEach((row, i) => {
            const purchaseNo = purIdx !== -1 && row[purIdx] ? row[purIdx] : `PUR-2026-${500 + i}`;
            const vendorInvoiceNo = vinvIdx !== -1 && row[vinvIdx] ? row[vinvIdx] : `V-INV-${100 + i}`;
            const vendorName = vendIdx !== -1 && row[vendIdx] ? row[vendIdx] : 'General Supplier';
            const grandTotal = parseFloat((totalIdx !== -1 ? row[totalIdx] : '0').replace(/[^0-9.]/g, '')) || 0;
            const paidAmount = paidIdx !== -1 ? parseFloat(row[paidIdx].replace(/[^0-9.]/g, '')) || 0 : grandTotal;
            const purchasedAt = dateIdx !== -1 && row[dateIdx] ? new Date(row[dateIdx]).toISOString() : new Date().toISOString();

            list.push({
              companyId: company.id,
              purchaseNo,
              vendorInvoiceNo,
              vendorName,
              grandTotal,
              paidAmount,
              dueAmount: Math.max(0, grandTotal - paidAmount),
              purchasedAt,
            });
          });

          count = ERPDatabase.bulkAddPurchases(list);
        } else if (importType === 'expenses') {
          const vchIdx = headers.indexOf(columnMap['voucherNo'] || '');
          const catIdx = headers.indexOf(columnMap['category'] || '');
          const amtIdx = headers.indexOf(columnMap['amount'] || '');
          const dateIdx = headers.indexOf(columnMap['expenseDate'] || '');
          const paidToIdx = headers.indexOf(columnMap['paidTo'] || '');
          const descIdx = headers.indexOf(columnMap['description'] || '');

          const list: any[] = [];
          parsedRows.forEach((row, i) => {
            const voucherNo = vchIdx !== -1 && row[vchIdx] ? row[vchIdx] : `EXP-2026-${i + 1}`;
            const category = catIdx !== -1 && row[catIdx] ? row[catIdx] : 'Miscellaneous';
            const amount = parseFloat((amtIdx !== -1 ? row[amtIdx] : '0').replace(/[^0-9.]/g, '')) || 0;
            const expenseDate = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0];
            const paidTo = paidToIdx !== -1 ? row[paidToIdx] : 'Service Provider';
            const description = descIdx !== -1 ? row[descIdx] : 'Imported expense entry';

            list.push({
              companyId: company.id,
              voucherNo,
              category,
              amount,
              expenseDate,
              paidTo,
              description,
            });
          });

          count = ERPDatabase.bulkAddExpenses(list);
        } else if (importType === 'services') {
          const nameIdx = headers.indexOf(columnMap['name'] || '');
          const catIdx = headers.indexOf(columnMap['category'] || '');
          const priceIdx = headers.indexOf(columnMap['price'] || '');
          const durIdx = headers.indexOf(columnMap['durationMins'] || '');
          const staffIdx = headers.indexOf(columnMap['assignedStaff'] || '');

          const list: any[] = [];
          parsedRows.forEach((row, i) => {
            const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : `Service Offering #${i + 1}`;
            const category = catIdx !== -1 && row[catIdx] ? row[catIdx] : 'general';
            const price = parseFloat((priceIdx !== -1 ? row[priceIdx] : '0').replace(/[^0-9.]/g, '')) || 0;
            const durationMins = parseInt((durIdx !== -1 ? row[durIdx] : '30').replace(/[^0-9]/g, '')) || 30;
            const assignedStaff = staffIdx !== -1 ? row[staffIdx] : 'General Staff';

            list.push({
              companyId: company.id,
              name,
              category,
              price,
              durationMins,
              assignedStaff,
            });
          });

          count = ERPDatabase.bulkAddServices(list);
        } else if (importType === 'accounts') {
          const nameIdx = headers.indexOf(columnMap['accountName'] || '');
          const typeIdx = headers.indexOf(columnMap['accountType'] || '');
          const bankIdx = headers.indexOf(columnMap['bankName'] || '');
          const numIdx = headers.indexOf(columnMap['accountNumber'] || '');
          const ifscIdx = headers.indexOf(columnMap['ifscCode'] || '');
          const balIdx = headers.indexOf(columnMap['openingBalance'] || '');

          const list: any[] = [];
          parsedRows.forEach((row, i) => {
            const accountName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : `Bank Account #${i + 1}`;
            const accountType = typeIdx !== -1 && row[typeIdx].toLowerCase().includes('cash') ? 'cash' : 'bank';
            const bankName = bankIdx !== -1 ? row[bankIdx] : 'Bank';
            const accountNumber = numIdx !== -1 ? row[numIdx] : '';
            const ifscCode = ifscIdx !== -1 ? row[ifscIdx] : '';
            const openingBalance = parseFloat((balIdx !== -1 ? row[balIdx] : '0').replace(/[^0-9.-]/g, '')) || 0;

            list.push({
              companyId: company.id,
              accountName,
              accountType,
              bankName,
              accountNumber,
              ifscCode,
              openingBalance,
              currentBalance: openingBalance,
            });
          });

          count = ERPDatabase.bulkAddAccounts(list);
        }

        setImportResult({ success: true, count });
        setIsImporting(false);
        onRefreshData();
      } catch (err) {
        console.error('Error importing CSV:', err);
        setIsImporting(false);
        alert('An error occurred during CSV parsing. Please check file formatting.');
      }
    }, 500);
  };

  const modelTabs: { type: CsvImportType; label: string; icon: React.ReactNode }[] = [
    { type: 'products', label: 'Products & Inventory', icon: <Package className="w-4 h-4" /> },
    { type: 'parties', label: 'Customers & Suppliers', icon: <Users className="w-4 h-4" /> },
    { type: 'sales', label: 'Sales Invoices', icon: <ShoppingCart className="w-4 h-4" /> },
    { type: 'purchases', label: 'Purchase Bills', icon: <ShoppingBag className="w-4 h-4" /> },
    { type: 'expenses', label: 'Expenses & Vouchers', icon: <Receipt className="w-4 h-4" /> },
    { type: 'services', label: 'Service Catalog', icon: <Wrench className="w-4 h-4" /> },
    { type: 'accounts', label: 'Bank & Cash Accounts', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Universal CSV Bulk Import Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Import Products, Customers, Sales, Purchases, Expenses, Services & Accounts from CSV/Excel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Import Type Selector Tabs Bar */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 min-w-max">
            {modelTabs.map((tab) => (
              <button
                key={tab.type}
                onClick={() => {
                  setImportType(tab.type);
                  setParsedRows([]);
                  setHeaders([]);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  importType === tab.type
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Download Sample Template Button */}
          <div className="min-w-max">
            <button
              onClick={() => downloadSampleCsv(importType)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template CSV</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {importResult ? (
            /* Success State Banner */
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-3xl text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                  Successfully Imported {importResult.count} Records into {modelTabs.find((t) => t.type === importType)?.label}!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium max-w-md mx-auto mt-1">
                  All imported rows have been formatted and saved to your business ERP database.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setParsedRows([]);
                    setHeaders([]);
                    setImportResult(null);
                  }}
                  className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all"
                >
                  Import Another CSV
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md"
                >
                  Done / Close Utility
                </button>
              </div>
            </div>
          ) : parsedRows.length === 0 ? (
            /* Upload / Drag and Drop Area */
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Upload CSV File
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Paste Raw CSV Text / Excel Data
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-3xl p-10 text-center bg-slate-50 dark:bg-slate-950/50 hover:bg-emerald-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group space-y-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Click to browse or drag and drop your {modelTabs.find((t) => t.type === importType)?.label} CSV file
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports UTF-8 .csv files exported from Excel, Tally, Vyapar, Marg, or Google Sheets
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={8}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste comma-separated CSV rows here with column headers in the first line..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => processCsvContent(rawText)}
                    disabled={!rawText.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    Parse & Preview Text
                  </button>
                </div>
              )}

              {/* Instructions Box */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <HelpCircle className="w-4 h-4 text-emerald-500" />
                  <span>Tips for smooth CSV upload:</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                  <li>Ensure the first line of your file contains column headers.</li>
                  <li>Missing values will automatically be assigned safe default fallback values.</li>
                  <li>Amounts, prices, and phone numbers are automatically sanitized.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Parsed Data Preview & Column Mapping */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>
                    Successfully parsed {parsedRows.length} rows for {modelTabs.find((t) => t.type === importType)?.label} from {fileName || 'CSV input'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setParsedRows([]);
                    setHeaders([]);
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                >
                  Clear & Pick Different File
                </button>
              </div>

              {/* Live Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">#</th>
                      {headers.map((h, index) => (
                        <th key={index} className="p-2.5 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        {headers.map((_, colIdx) => (
                          <td key={colIdx} className="p-2.5 whitespace-nowrap">
                            {row[colIdx] || <span className="text-slate-400 italic">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[11px] text-slate-400 italic text-right">
                  + {parsedRows.length - 10} more rows ready to import
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {parsedRows.length > 0 && !importResult && (
            <button
              type="button"
              onClick={handlePerformImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Records...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>
                    Import {parsedRows.length} {modelTabs.find((t) => t.type === importType)?.label} Records Now
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

