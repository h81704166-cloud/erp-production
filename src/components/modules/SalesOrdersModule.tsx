import React, { useState } from 'react';
import { ERPDatabase } from '../../services/db';
import { Product, Party, Sale, SalesOrder, SalesReturn, SaleItem } from '../../types/erp';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  ShoppingCart,
  Plus,
  RotateCcw,
  CheckCircle,
  Clock,
  Trash2,
  Printer,
  Eye,
  XCircle,
  FileText
} from 'lucide-react';

interface SalesOrdersModuleProps {
  products: Product[];
  parties: Party[];
  onRefreshData: () => void;
}

export const SalesOrdersModule: React.FC<SalesOrdersModuleProps> = ({
  products = [],
  parties = [],
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'so' | 'returns'>('so');
  const [isAddSOOpen, setIsAddSOOpen] = useState(false);
  const [isAddReturnOpen, setIsAddReturnOpen] = useState(false);
  const [viewingSO, setViewingSO] = useState<SalesOrder | null>(null);

  // New SO State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [soItems, setSoItems] = useState<{ productId: string; qty: number; price: number }[]>([]);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [soErrorMessage, setSoErrorMessage] = useState('');

  // New Return State
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState('');
  const [returnReason, setReturnReason] = useState('Customer returned damaged / expired goods');
  const [returnItems, setReturnItems] = useState<{ productId: string; qty: number; price: number }[]>([]);

  const salesOrders = ERPDatabase.getSalesOrders();
  const salesReturns = ERPDatabase.getSalesReturns();
  const sales = ERPDatabase.getSales();

  // Filter customers safely
  const customerParties = parties.filter(
    (p) => p.type === 'customer' || (p.type as string) === 'both'
  );
  const availableCustomers = customerParties.length > 0 ? customerParties : parties;

  // Add Item to SO
  const handleAddSOItem = () => {
    if (!selectedProdId) return;
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    setSoItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === selectedProdId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].qty += 1;
        return updated;
      }
      return [...prev, { productId: selectedProdId, qty: 1, price: prod.sellingPrice || 0 }];
    });
    setSelectedProdId('');
  };

  // Create SO
  const handleCreateSO = () => {
    setSoErrorMessage('');

    // Determine final customer details
    const customerObj = parties.find((p) => p.id === selectedCustomer || p.name === selectedCustomer);
    const customerName = customerObj ? customerObj.name : (customCustomerName || selectedCustomer).trim();
    const customerPhone = customerObj ? customerObj.phone : (customCustomerPhone.trim() || 'N/A');

    if (!customerName) {
      setSoErrorMessage('Please select or enter a Customer name!');
      return;
    }

    // Auto-add product if selected in dropdown but "+ Add Item" was not clicked
    let currentItems = [...soItems];
    if (selectedProdId) {
      const prod = products.find((p) => p.id === selectedProdId);
      if (prod) {
        const existingIdx = currentItems.findIndex((i) => i.productId === selectedProdId);
        if (existingIdx > -1) {
          currentItems[existingIdx].qty += 1;
        } else {
          currentItems.push({ productId: selectedProdId, qty: 1, price: prod.sellingPrice || 0 });
        }
      }
    }

    if (currentItems.length === 0) {
      setSoErrorMessage('Please select at least one product item for the Sales Order!');
      return;
    }

    const compiledItems: SaleItem[] = currentItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const productName = prod ? prod.name : 'Product';
      const hsnCode = prod ? prod.hsnCode || '' : '';
      const sku = prod ? prod.sku || '' : '';
      const gstRate = prod ? prod.gstRate || 0 : 0;
      const taxable = item.qty * item.price;
      const tax = (taxable * gstRate) / 100;
      return {
        productId: item.productId,
        productName,
        sku,
        hsnCode,
        qty: item.qty,
        unit: prod?.unit || 'Pcs',
        unitPrice: item.price,
        discountAmount: 0,
        gstRate,
        taxableAmount: taxable,
        cgstAmount: tax / 2,
        sgstAmount: tax / 2,
        igstAmount: 0,
        totalAmount: taxable + tax,
      };
    });

    const grandTotal = compiledItems.reduce((sum, i) => sum + i.totalAmount, 0);

    ERPDatabase.addSalesOrder({
      companyId: 'comp-001',
      customerName,
      customerPhone,
      items: compiledItems,
      grandTotal,
      advancePaid,
      status: 'pending',
      deliveryAddress,
      createdByName: 'Sales Executive',
    });

    setIsAddSOOpen(false);
    setSoItems([]);
    setSelectedCustomer('');
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setSelectedProdId('');
    setAdvancePaid(0);
    setDeliveryAddress('');
    setSoErrorMessage('');
    onRefreshData();
  };

  // Convert SO to Sale Bill
  const handleConvertToSale = (so: SalesOrder) => {
    const customerObj = parties.find(
      (p) => p.phone === so.customerPhone || p.name.toLowerCase().trim() === so.customerName.toLowerCase().trim()
    );
    const invoiceNo = `INV-2026-${String(sales.length + 1).padStart(4, '0')}`;
    
    const subtotal = so.items.reduce((s, i) => s + i.taxableAmount, 0);
    const taxTotal = so.items.reduce((s, i) => s + (i.cgstAmount + i.sgstAmount + i.igstAmount), 0);
    const dueAmount = Math.max(0, so.grandTotal - (so.advancePaid || 0));

    const newSale: Omit<Sale, 'id' | 'billedAt'> = {
      companyId: 'comp-001',
      invoiceNo,
      customerId: customerObj ? customerObj.id : undefined,
      customerName: so.customerName,
      customerPhone: so.customerPhone,
      items: so.items,
      subtotal,
      totalDiscount: 0,
      totalTaxable: subtotal,
      totalCgst: taxTotal / 2,
      totalSgst: taxTotal / 2,
      totalIgst: 0,
      totalTax: taxTotal,
      grandTotal: so.grandTotal,
      paidAmount: so.advancePaid || 0,
      dueAmount,
      paymentMode: so.advancePaid > 0 ? 'upi' : 'khata',
      status: 'completed',
      billedByName: 'Sales Desk',
    };

    // addSale automatically deducts stock, updates accounts and Khata
    ERPDatabase.addSale(newSale);

    // Update SO status
    const orders = ERPDatabase.getSalesOrders();
    const found = orders.find((o) => o.id === so.id);
    if (found) {
      found.status = 'converted_to_sale';
      ERPDatabase.setItem('erp_sales_orders', orders);
    }

    alert(`Sales Order ${so.orderNo} converted to Tax Invoice #${invoiceNo}! Inventory stock updated.`);
    onRefreshData();
  };

  const [deleteSOId, setDeleteSOId] = useState<string | null>(null);

  // Delete/Cancel SO
  const handleConfirmDeleteSO = () => {
    if (!deleteSOId) return;
    const orders = ERPDatabase.getSalesOrders().filter((o) => o.id !== deleteSOId);
    ERPDatabase.setItem('erp_sales_orders', orders);
    setDeleteSOId(null);
    onRefreshData();
  };

  // Process Sales Return (Credit Note)
  const handleCreateSalesReturn = () => {
    if (!selectedInvoiceNo || returnItems.length === 0) {
      alert('Please select an invoice number and return items!');
      return;
    }

    const origSale = sales.find((s) => s.invoiceNo === selectedInvoiceNo);
    const customerName = origSale ? origSale.customerName : 'Walk-in Customer';
    const customerId = origSale ? origSale.customerId : undefined;

    const compiledItems: SaleItem[] = returnItems.map((ri) => {
      const prod = products.find((p) => p.id === ri.productId);
      const productName = prod ? prod.name : 'Product';
      const hsnCode = prod ? prod.hsnCode || '' : '';
      const sku = prod ? prod.sku || '' : '';
      const gstRate = prod ? prod.gstRate : 0;
      const taxable = ri.qty * ri.price;
      const tax = (taxable * gstRate) / 100;
      return {
        productId: ri.productId,
        productName,
        sku,
        hsnCode,
        qty: ri.qty,
        unit: prod?.unit || 'Pcs',
        unitPrice: ri.price,
        discountAmount: 0,
        gstRate,
        taxableAmount: taxable,
        cgstAmount: tax / 2,
        sgstAmount: tax / 2,
        igstAmount: 0,
        totalAmount: taxable + tax,
      };
    });

    const refundTotal = compiledItems.reduce((s, i) => s + i.totalAmount, 0);

    const returns = ERPDatabase.getSalesReturns();
    const returnNo = `CN-2026-${String(returns.length + 1).padStart(3, '0')}`;

    ERPDatabase.addSalesReturn({
      companyId: 'comp-001',
      returnNo,
      originalInvoiceNo: selectedInvoiceNo,
      customerId,
      customerName,
      items: compiledItems,
      totalRefundAmount: refundTotal,
      reason: returnReason,
      createdByName: 'POS Counter',
    });

    setIsAddReturnOpen(false);
    setReturnItems([]);
    setSelectedInvoiceNo('');
    onRefreshData();
  };

  const handlePrintSO = (so: SalesOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Order - ${so.orderNo}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; }
            .total { font-weight: bold; text-align: right; margin-top: 15px; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>SALES ORDER (SO)</h2>
            <p><strong>Order No:</strong> ${so.orderNo} | <strong>Date:</strong> ${new Date(so.orderedAt).toLocaleDateString('en-IN')}</p>
            <p><strong>Customer:</strong> ${so.customerName} (${so.customerPhone})</p>
            ${so.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${so.deliveryAddress}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>Qty</th>
                <th>Rate (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${so.items
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.productName}</td>
                  <td>${item.qty} ${item.unit || ''}</td>
                  <td>₹${item.unitPrice}</td>
                  <td>₹${item.totalAmount}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Grand Total: ₹${so.grandTotal.toLocaleString('en-IN')}</p>
            ${so.advancePaid ? `<p style="font-size: 13px; color: #059669;">Advance Received: ₹${so.advancePaid.toLocaleString('en-IN')}</p>` : ''}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('so')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'so'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Sales Orders (SO)</span>
            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px]">
              {salesOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'returns'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sales Returns (Credit Notes)</span>
            <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded text-[10px]">
              {salesReturns.length}
            </span>
          </button>
        </div>

        <div>
          {activeSubTab === 'so' ? (
            <button
              onClick={() => setIsAddSOOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Sales Order (SO)</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddReturnOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Process Credit Note Return</span>
            </button>
          )}
        </div>
      </div>

      {/* SO Tab Content */}
      {activeSubTab === 'so' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salesOrders.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 space-y-2">
              <ShoppingCart className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-sm text-slate-200">No Sales Orders Found</p>
              <p className="text-xs">Click "New Sales Order (SO)" above to book advance orders for customers.</p>
            </div>
          ) : (
            salesOrders.map((so) => (
              <div key={so.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{so.orderNo}</span>
                  <Badge variant={so.status === 'converted_to_sale' ? 'emerald' : 'amber'}>
                    {so.status === 'converted_to_sale' ? 'Converted to Bill' : 'Pending Fulfillment'}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">{so.customerName}</h4>
                  <span className="text-xs text-slate-400">{so.customerPhone}</span>
                </div>

                <div className="space-y-1 py-2 border-y border-slate-800/80 text-xs text-slate-300">
                  {so.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{i.qty} {i.unit || ''} x {i.productName}</span>
                      <span className="font-mono">₹{i.totalAmount}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Total Amount</span>
                    <span className="text-lg font-black text-white">₹{so.grandTotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrintSO(so)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      title="Print Sales Order"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewingSO(so)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteSOId(so.id)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded-lg cursor-pointer"
                      title="Delete SO"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {so.status === 'pending' && (
                      <button
                        onClick={() => handleConvertToSale(so)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Bill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sales Returns Tab Content */}
      {activeSubTab === 'returns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salesReturns.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 space-y-2">
              <RotateCcw className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-sm text-slate-200">No Sales Returns Recorded</p>
              <p className="text-xs">Process customer returns & credit notes with auto-inventory restock here.</p>
            </div>
          ) : (
            salesReturns.map((sr) => (
              <div key={sr.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">{sr.returnNo}</span>
                  <span className="text-xs text-slate-400">Invoice: {sr.originalInvoiceNo}</span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">{sr.customerName}</h4>
                  <p className="text-xs text-rose-300 mt-0.5">Reason: {sr.reason}</p>
                </div>

                <div className="space-y-1 py-2 border-y border-slate-800/80 text-xs text-slate-300">
                  {sr.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>Restocked: {i.qty} x {i.productName}</span>
                      <span className="font-mono">₹{i.totalAmount}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Refund Credit Amount</span>
                    <span className="text-lg font-black text-rose-400">₹{sr.totalRefundAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <span className="px-2 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold">
                    Restocked
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add SO Modal */}
      <Modal isOpen={isAddSOOpen} onClose={() => { setIsAddSOOpen(false); setSoErrorMessage(''); }} title="🛒 Create New Sales Order (SO)" maxWidth="max-w-2xl">
        <div className="space-y-4 text-slate-200">
          {soErrorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{soErrorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                if (e.target.value !== 'other') {
                  setCustomCustomerName('');
                  setCustomCustomerPhone('');
                }
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white"
            >
              <option value="">-- Choose Customer --</option>
              {availableCustomers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))}
              <option value="other">➕ Enter New / Custom Customer</option>
            </select>

            {(selectedCustomer === 'other' || (!selectedCustomer && customCustomerName)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  value={customCustomerName}
                  onChange={(e) => setCustomCustomerName(e.target.value)}
                  placeholder="Customer Full Name"
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-semibold"
                />
                <input
                  type="text"
                  value={customCustomerPhone}
                  onChange={(e) => setCustomCustomerPhone(e.target.value)}
                  placeholder="Customer Phone (e.g. 9876543210)"
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-semibold"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Add Product Items</label>
            <div className="flex gap-2">
              <select
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₹{p.sellingPrice}/{p.unit} (Stock: {p.stockQty})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddSOItem}
                disabled={!selectedProdId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer"
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Items List */}
          {soItems.length > 0 && (
            <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1 border-b border-slate-800 pb-1">
                <span>Item Name</span>
                <span className="text-right">Qty & Rate</span>
              </div>
              {soItems.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                return (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold text-white truncate max-w-[200px]">
                      {prod ? prod.name : 'Product'}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setSoItems((prev) => {
                              const updated = [...prev];
                              updated[idx].qty = val;
                              return updated;
                            });
                          }}
                          className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-center text-white"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Rate: ₹</span>
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setSoItems((prev) => {
                              const updated = [...prev];
                              updated[idx].price = val;
                              return updated;
                            });
                          }}
                          className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-center text-emerald-400"
                        />
                      </div>

                      <span className="font-mono text-white font-bold w-16 text-right">
                        ₹{(item.qty * item.price).toFixed(0)}
                      </span>

                      <button
                        onClick={() => setSoItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Advance Received (₹)</label>
              <input
                type="number"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Shop address or site location"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button onClick={() => setIsAddSOOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
            <button onClick={handleCreateSO} className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer">Save Sales Order</button>
          </div>
        </div>
      </Modal>

      {/* View SO Details Modal */}
      {viewingSO && (
        <Modal isOpen={Boolean(viewingSO)} onClose={() => setViewingSO(null)} title={`🛒 ${viewingSO.orderNo} Details`}>
          <div className="space-y-4 text-slate-200">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Customer</p>
                <p className="font-bold text-white text-sm">{viewingSO.customerName} ({viewingSO.customerPhone})</p>
              </div>
              <Badge variant={viewingSO.status === 'converted_to_sale' ? 'emerald' : 'amber'}>
                {viewingSO.status === 'converted_to_sale' ? 'Converted to Bill' : 'Pending'}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase">Ordered Items</p>
              <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                {viewingSO.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-800/50 last:border-0">
                    <span>{item.qty} {item.unit || ''} x {item.productName}</span>
                    <span className="font-mono">₹{item.totalAmount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="block text-xs text-slate-400">Advance Received</span>
                <span className="text-sm font-bold text-emerald-400">₹{viewingSO.advancePaid || 0}</span>
              </div>
              <div className="text-right">
                <span className="block text-xs text-slate-400">Grand Total Amount</span>
                <span className="text-xl font-black text-white">₹{viewingSO.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handlePrintSO(viewingSO)}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print SO
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Return Modal */}
      <Modal isOpen={isAddReturnOpen} onClose={() => setIsAddReturnOpen(false)} title="↩️ Create Sales Return (Credit Note)" maxWidth="max-w-2xl">
        <div className="space-y-4 text-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Original Invoice Number</label>
            <select
              value={selectedInvoiceNo}
              onChange={(e) => {
                const inv = e.target.value;
                setSelectedInvoiceNo(inv);
                const found = sales.find((s) => s.invoiceNo === inv);
                if (found) {
                  setReturnItems(found.items.map((i) => ({ productId: i.productId, qty: 1, price: i.unitPrice })));
                }
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white"
            >
              <option value="">-- Choose Invoice --</option>
              {sales.map((s) => (
                <option key={s.id} value={s.invoiceNo}>{s.invoiceNo} - {s.customerName} (₹{s.grandTotal})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Return Reason</label>
            <input
              type="text"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Expired batch, damaged goods, customer changed mind"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          {returnItems.length > 0 && (
            <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <h5 className="text-xs font-bold text-slate-400 uppercase">Return Items & Auto-Restock Quantities</h5>
              {returnItems.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                return (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                    <span>{prod?.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Return Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setReturnItems((prev) => {
                            const updated = [...prev];
                            updated[idx].qty = val;
                            return updated;
                          });
                        }}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-center"
                      />
                      <span className="font-mono">₹{item.qty * item.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button onClick={() => setIsAddReturnOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
            <button onClick={handleCreateSalesReturn} className="px-6 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer">Process Credit Note & Restock</button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Sales Order Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteSOId}
        onClose={() => setDeleteSOId(null)}
        onConfirm={handleConfirmDeleteSO}
        title="Delete Sales Order"
        message="Are you sure you want to CANCEL or DELETE this Sales Order?"
      />
    </div>
  );
};
