import React, { useState } from 'react';
import { ERPDatabase } from '../../services/db';
import { Product, Party, Purchase, PurchaseOrder, PurchaseReturn, PurchaseItem } from '../../types/erp';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  ShoppingBag,
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

interface PurchaseOrdersModuleProps {
  products: Product[];
  parties: Party[];
  onRefreshData: () => void;
}

export const PurchaseOrdersModule: React.FC<PurchaseOrdersModuleProps> = ({
  products = [],
  parties = [],
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'po' | 'returns'>('po');
  const [isAddPOOpen, setIsAddPOOpen] = useState(false);
  const [isAddReturnOpen, setIsAddReturnOpen] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

  // New PO State
  const [selectedVendor, setSelectedVendor] = useState('');
  const [customVendorName, setCustomVendorName] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; qty: number; costPrice: number }[]>([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [poErrorMessage, setPoErrorMessage] = useState('');

  // New Purchase Return State
  const [selectedPurchaseNo, setSelectedPurchaseNo] = useState('');
  const [returnReason, setReturnReason] = useState('Damaged batch / Wrong item supplied');
  const [returnItems, setReturnItems] = useState<{ productId: string; qty: number; price: number }[]>([]);

  const purchaseOrders = ERPDatabase.getPurchaseOrders();
  const purchaseReturns = ERPDatabase.getPurchaseReturns();
  const purchases = ERPDatabase.getPurchases();

  // Filter vendors safely
  const vendorParties = parties.filter(
    (p) => p.type === 'vendor' || (p.type as string) === 'supplier' || (p.type as string) === 'both'
  );
  const availableVendors = vendorParties.length > 0 ? vendorParties : parties;

  // Add Item to PO
  const handleAddPOItem = () => {
    if (!selectedProdId) return;
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    setPoItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === selectedProdId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].qty += 1;
        return updated;
      }
      return [...prev, { productId: selectedProdId, qty: 1, costPrice: prod.purchasePrice || 0 }];
    });
    setSelectedProdId('');
  };

  // Create PO
  const handleCreatePO = () => {
    setPoErrorMessage('');

    // Determine final vendor name
    const vendorObj = parties.find((p) => p.id === selectedVendor || p.name === selectedVendor);
    const vendorName = vendorObj ? vendorObj.name : (customVendorName || selectedVendor).trim();

    if (!vendorName) {
      setPoErrorMessage('Please select or enter a Supplier / Vendor name!');
      return;
    }

    // Auto-add product if selected in dropdown but "+ Add Item" was not clicked
    let currentItems = [...poItems];
    if (selectedProdId) {
      const prod = products.find((p) => p.id === selectedProdId);
      if (prod) {
        const existingIdx = currentItems.findIndex((i) => i.productId === selectedProdId);
        if (existingIdx > -1) {
          currentItems[existingIdx].qty += 1;
        } else {
          currentItems.push({ productId: selectedProdId, qty: 1, costPrice: prod.purchasePrice || 0 });
        }
      }
    }

    if (currentItems.length === 0) {
      setPoErrorMessage('Please select at least one product item for the Purchase Order!');
      return;
    }

    const compiledItems: PurchaseItem[] = currentItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const productName = prod ? prod.name : 'Product';
      const sku = prod ? prod.sku || '' : '';
      const gstRate = prod ? prod.gstRate || 0 : 0;
      const taxable = item.qty * item.costPrice;
      const tax = (taxable * gstRate) / 100;
      return {
        productId: item.productId,
        productName,
        sku,
        qty: item.qty,
        unitPrice: item.costPrice,
        gstRate,
        taxableAmount: taxable,
        taxAmount: tax,
        totalAmount: taxable + tax,
      };
    });

    const grandTotal = compiledItems.reduce((sum, i) => sum + i.totalAmount, 0);

    ERPDatabase.addPurchaseOrder({
      companyId: 'comp-001',
      vendorName,
      items: compiledItems,
      grandTotal,
      status: 'sent_to_vendor',
      expectedDeliveryDate: expectedDate,
      createdByName: 'Purchase Manager',
    });

    setIsAddPOOpen(false);
    setPoItems([]);
    setSelectedVendor('');
    setCustomVendorName('');
    setSelectedProdId('');
    setExpectedDate('');
    setPoErrorMessage('');
    onRefreshData();
  };

  // Convert PO to Purchase Entry
  const handleConvertToPurchase = (po: PurchaseOrder) => {
    const vendorObj = parties.find(
      (p) => p.name.toLowerCase().trim() === po.vendorName.toLowerCase().trim()
    );
    const purchaseNo = `PO-2026-${String(purchases.length + 1).padStart(4, '0')}`;
    
    const newPurchase: Omit<Purchase, 'id' | 'purchasedAt'> = {
      companyId: 'comp-001',
      purchaseNo,
      vendorInvoiceNo: `VINV-${Math.floor(Math.random() * 89999 + 10000)}`,
      vendorId: vendorObj ? vendorObj.id : 'party-003',
      vendorName: po.vendorName,
      items: po.items,
      subtotal: po.items.reduce((s, i) => s + i.taxableAmount, 0),
      taxTotal: po.items.reduce((s, i) => s + i.taxAmount, 0),
      grandTotal: po.grandTotal,
      paidAmount: po.grandTotal,
      dueAmount: 0,
      paymentMode: 'bank_transfer',
      status: 'received',
      createdByName: 'Purchase Desk',
    };

    // addPurchase automatically increases inventory stock and updates vendor record
    ERPDatabase.addPurchase(newPurchase);

    // Mark PO status as converted
    const orders = ERPDatabase.getPurchaseOrders();
    const found = orders.find((o) => o.id === po.id);
    if (found) {
      found.status = 'converted_to_purchase';
      ERPDatabase.setItem('erp_purchase_orders', orders);
    }

    alert(`Purchase Order ${po.poNo} converted to Purchase Entry & inventory stock updated!`);
    onRefreshData();
  };

  const [deletePOId, setDeletePOId] = useState<string | null>(null);

  // Delete/Cancel PO
  const handleConfirmDeletePO = () => {
    if (!deletePOId) return;
    const orders = ERPDatabase.getPurchaseOrders().filter((o) => o.id !== deletePOId);
    ERPDatabase.setItem('erp_purchase_orders', orders);
    setDeletePOId(null);
    onRefreshData();
  };

  // Handle Purchase Return (Debit Note)
  const handleCreatePurchaseReturn = () => {
    if (!selectedPurchaseNo || returnItems.length === 0) {
      alert('Please select a purchase bill and return items!');
      return;
    }

    const origPur = purchases.find((p) => p.purchaseNo === selectedPurchaseNo);
    const vendorName = origPur ? origPur.vendorName : 'Vendor';

    const compiledItems: PurchaseItem[] = returnItems.map((ri) => {
      const prod = products.find((p) => p.id === ri.productId);
      const productName = prod ? prod.name : 'Product';
      const sku = prod ? prod.sku : '';
      const gstRate = prod ? prod.gstRate : 0;
      const taxable = ri.qty * ri.price;
      const tax = (taxable * gstRate) / 100;
      return {
        productId: ri.productId,
        productName,
        sku,
        qty: ri.qty,
        unitPrice: ri.price,
        gstRate,
        taxableAmount: taxable,
        taxAmount: tax,
        totalAmount: taxable + tax,
      };
    });

    const refundTotal = compiledItems.reduce((s, i) => s + i.totalAmount, 0);

    const returns = ERPDatabase.getPurchaseReturns();
    const returnNo = `DN-2026-${String(returns.length + 1).padStart(3, '0')}`;
    const newReturn: PurchaseReturn = {
      id: `pr-${Date.now()}`,
      companyId: 'comp-001',
      returnNo,
      originalPurchaseNo: selectedPurchaseNo,
      vendorName,
      items: compiledItems,
      refundAmount: refundTotal,
      reason: returnReason,
      returnedAt: new Date().toISOString(),
      createdByName: 'Warehouse Officer',
    };

    returns.unshift(newReturn);
    ERPDatabase.setItem('erp_purchase_returns', returns);

    // Deduct stock for returned items
    compiledItems.forEach((item) => {
      ERPDatabase.adjustStock(
        item.productId,
        'subtraction',
        item.qty,
        `Purchase Return Debit Note ${returnNo} to vendor ${vendorName}`
      );
    });

    setIsAddReturnOpen(false);
    setReturnItems([]);
    setSelectedPurchaseNo('');
    onRefreshData();
  };

  const handlePrintPO = (po: PurchaseOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order - ${po.poNo}</title>
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
            <h2>PURCHASE ORDER (PO)</h2>
            <p><strong>PO Number:</strong> ${po.poNo} | <strong>Date:</strong> ${new Date(po.orderedAt).toLocaleDateString('en-IN')}</p>
            <p><strong>Supplier/Vendor:</strong> ${po.vendorName}</p>
            ${po.expectedDeliveryDate ? `<p><strong>Expected Delivery:</strong> ${po.expectedDeliveryDate}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>Qty</th>
                <th>Unit Price (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${po.items
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.productName}</td>
                  <td>${item.qty}</td>
                  <td>₹${item.unitPrice}</td>
                  <td>₹${item.totalAmount}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="total">Grand Total: ₹${po.grandTotal.toLocaleString('en-IN')}</div>
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
            onClick={() => setActiveSubTab('po')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'po'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Purchase Orders (PO)</span>
            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px]">
              {purchaseOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'returns'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Purchase Returns (Debit Notes)</span>
            <span className="px-1.5 py-0.5 bg-rose-950 text-rose-300 rounded text-[10px]">
              {purchaseReturns.length}
            </span>
          </button>
        </div>

        <div>
          {activeSubTab === 'po' ? (
            <button
              onClick={() => setIsAddPOOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order (PO)</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddReturnOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Return (Debit Note)</span>
            </button>
          )}
        </div>
      </div>

      {/* PO Tab Content */}
      {activeSubTab === 'po' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchaseOrders.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-sm text-slate-200">No Purchase Orders Created Yet</p>
              <p className="text-xs">Click "New Purchase Order (PO)" above to order stock from suppliers.</p>
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <div key={po.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{po.poNo}</span>
                  <Badge variant={po.status === 'converted_to_purchase' ? 'emerald' : 'sky'}>
                    {po.status === 'converted_to_purchase' ? 'Received & Stocked' : 'Sent to Vendor'}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">{po.vendorName}</h4>
                  {po.expectedDeliveryDate && (
                    <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-400" /> Expected: {po.expectedDeliveryDate}
                    </span>
                  )}
                </div>

                <div className="space-y-1 py-2 border-y border-slate-800/80 text-xs text-slate-300">
                  {po.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{i.qty} x {i.productName}</span>
                      <span className="font-mono">₹{i.totalAmount}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">PO Total</span>
                    <span className="text-lg font-black text-white">₹{po.grandTotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrintPO(po)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      title="Print Purchase Order"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewingPO(po)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletePOId(po.id)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded-lg cursor-pointer"
                      title="Delete PO"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {po.status !== 'converted_to_purchase' && (
                      <button
                        onClick={() => handleConvertToPurchase(po)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Purchase Returns Tab Content */}
      {activeSubTab === 'returns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchaseReturns.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 space-y-2">
              <RotateCcw className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-sm text-slate-200">No Purchase Returns Recorded</p>
              <p className="text-xs">Issue debit notes for damaged or returned supplier stock here.</p>
            </div>
          ) : (
            purchaseReturns.map((pr) => (
              <div key={pr.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-400">{pr.returnNo}</span>
                  <span className="text-xs text-slate-400">Bill: {pr.originalPurchaseNo}</span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm">{pr.vendorName}</h4>
                  <p className="text-xs text-rose-300 mt-0.5">Reason: {pr.reason}</p>
                </div>

                <div className="space-y-1 py-2 border-y border-slate-800/80 text-xs text-slate-300">
                  {pr.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>Returned: {i.qty} x {i.productName}</span>
                      <span className="font-mono">₹{i.totalAmount}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Debit Refund</span>
                    <span className="text-lg font-black text-rose-400">₹{pr.refundAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <span className="px-2 py-1 bg-rose-950 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">
                    Deducted Stock
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add PO Modal */}
      <Modal isOpen={isAddPOOpen} onClose={() => { setIsAddPOOpen(false); setPoErrorMessage(''); }} title="📦 Create Purchase Order (PO)" maxWidth="max-w-2xl">
        <div className="space-y-4 text-slate-200">
          {poErrorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{poErrorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select Supplier / Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => {
                setSelectedVendor(e.target.value);
                if (e.target.value !== 'other') {
                  setCustomVendorName('');
                }
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white"
            >
              <option value="">-- Choose Vendor / Supplier --</option>
              {availableVendors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.companyName ? `(${p.companyName})` : ''} - {p.phone}
                </option>
              ))}
              <option value="other">➕ Enter New / Custom Supplier</option>
            </select>

            {(selectedVendor === 'other' || (!selectedVendor && customVendorName)) && (
              <input
                type="text"
                value={customVendorName}
                onChange={(e) => setCustomVendorName(e.target.value)}
                placeholder="Enter Supplier / Vendor Name (e.g. Metro Wholesale Supplier)"
                className="w-full mt-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-semibold"
              />
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
                    {p.name} - Default Cost ₹{p.purchasePrice} (Stock: {p.stockQty})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddPOItem}
                disabled={!selectedProdId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer"
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Items List */}
          {poItems.length > 0 && (
            <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1 border-b border-slate-800 pb-1">
                <span>Item Name</span>
                <span className="text-right">Qty & Cost Price</span>
              </div>
              {poItems.map((item, idx) => {
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
                            setPoItems((prev) => {
                              const updated = [...prev];
                              updated[idx].qty = val;
                              return updated;
                            });
                          }}
                          className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-center text-white"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Cost: ₹</span>
                        <input
                          type="number"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setPoItems((prev) => {
                              const updated = [...prev];
                              updated[idx].costPrice = val;
                              return updated;
                            });
                          }}
                          className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-center text-emerald-400"
                        />
                      </div>

                      <span className="font-mono text-white font-bold w-16 text-right">
                        ₹{(item.qty * item.costPrice).toFixed(0)}
                      </span>

                      <button
                        onClick={() => setPoItems((prev) => prev.filter((_, i) => i !== idx))}
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

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Expected Delivery Date</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsAddPOOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePO}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Save Purchase Order
            </button>
          </div>
        </div>
      </Modal>

      {/* View PO Details Modal */}
      {viewingPO && (
        <Modal isOpen={Boolean(viewingPO)} onClose={() => setViewingPO(null)} title={`📄 ${viewingPO.poNo} Details`}>
          <div className="space-y-4 text-slate-200">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Supplier Name</p>
                <p className="font-bold text-white text-sm">{viewingPO.vendorName}</p>
              </div>
              <Badge variant={viewingPO.status === 'converted_to_purchase' ? 'emerald' : 'sky'}>
                {viewingPO.status === 'converted_to_purchase' ? 'Received' : 'Sent'}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase">Ordered Items</p>
              <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                {viewingPO.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-800/50 last:border-0">
                    <span>{item.qty} x {item.productName}</span>
                    <span className="font-mono">₹{item.totalAmount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-slate-300">Grand Total Amount</span>
              <span className="text-xl font-black text-emerald-400">₹{viewingPO.grandTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handlePrintPO(viewingPO)}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print PO
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Return Modal */}
      <Modal isOpen={isAddReturnOpen} onClose={() => setIsAddReturnOpen(false)} title="↩️ Create Purchase Return (Debit Note)" maxWidth="max-w-2xl">
        <div className="space-y-4 text-slate-200">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Original Purchase Bill Number</label>
            <select
              value={selectedPurchaseNo}
              onChange={(e) => {
                const pno = e.target.value;
                setSelectedPurchaseNo(pno);
                const found = purchases.find((p) => p.purchaseNo === pno);
                if (found) {
                  setReturnItems(found.items.map((i) => ({ productId: i.productId, qty: 1, price: i.unitPrice })));
                }
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white"
            >
              <option value="">-- Choose Purchase Bill --</option>
              {purchases.map((p) => (
                <option key={p.id} value={p.purchaseNo}>{p.purchaseNo} - {p.vendorName} (₹{p.grandTotal})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Reason for Return</label>
            <input
              type="text"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Near expiry batch received, damaged carton"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          {returnItems.length > 0 && (
            <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <h5 className="text-xs font-bold text-slate-400 uppercase">Return Items & Deduct Stock</h5>
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
            <button onClick={handleCreatePurchaseReturn} className="px-6 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer">Process Debit Note & Deduct Stock</button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Purchase Order Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletePOId}
        onClose={() => setDeletePOId(null)}
        onConfirm={handleConfirmDeletePO}
        title="Delete Purchase Order"
        message="Are you sure you want to CANCEL or DELETE this Purchase Order?"
      />
    </div>
  );
};
