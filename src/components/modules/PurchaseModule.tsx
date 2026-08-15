import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, Truck, ArrowDownLeft, FileText, Ban, Trash2, Edit3, Upload } from 'lucide-react';
import { Purchase, Party, Product, Company } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { saveOfflinePurchase } from '../../services/offlineDb';
import { syncWorker } from '../../services/syncWorker';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { CsvImportModal } from '../common/CsvImportModal';

interface PurchaseModuleProps {
  purchases: Purchase[];
  parties: Party[];
  products: Product[];
  company: Company;
  onRefreshData: () => void;
  onOpenAddVendor: () => void;
}

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({
  purchases = [],
  parties = [],
  products = [],
  company,
  onRefreshData,
  onOpenAddVendor,
}) => {
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Purchase Form state
  const [vendorId, setVendorId] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('10');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState('100');
  const [paidAmount, setPaidAmount] = useState('0');

  // Edit/Cancel/Delete state
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editVendorInvoiceNo, setEditVendorInvoiceNo] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('0');
  const [editPaymentMode, setEditPaymentMode] = useState<any>('bank_transfer');
  const [editNotes, setEditNotes] = useState('');

  const [cancelPurchaseTarget, setCancelPurchaseTarget] = useState<Purchase | null>(null);
  const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<Purchase | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const handleStartEditPurchase = (p: Purchase) => {
    setEditingPurchase(p);
    setEditVendorInvoiceNo(p.vendorInvoiceNo || '');
    setEditPaidAmount(String(p.paidAmount || 0));
    setEditPaymentMode(p.paymentMode || 'bank_transfer');
    setEditNotes(p.notes || '');
  };

  const handleSavePurchaseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;

    const paid = parseFloat(editPaidAmount) || 0;
    const due = Math.max(0, editingPurchase.grandTotal - paid);

    ERPDatabase.updatePurchase(editingPurchase.id, {
      vendorInvoiceNo: editVendorInvoiceNo,
      paidAmount: paid,
      dueAmount: due,
      paymentMode: editPaymentMode,
      notes: editNotes,
    });

    setEditingPurchase(null);
    onRefreshData();
  };

  const handleConfirmCancelPurchase = () => {
    if (!cancelPurchaseTarget) return;
    ERPDatabase.cancelPurchase(cancelPurchaseTarget.id, 'User Cancelled Purchase');
    setCancelPurchaseTarget(null);
    onRefreshData();
  };

  const handleConfirmDeletePurchase = () => {
    if (!deletePurchaseTarget) return;
    ERPDatabase.deletePurchase(deletePurchaseTarget.id);
    setDeletePurchaseTarget(null);
    onRefreshData();
  };

  const safePurchases = purchases || [];
  const safeParties = parties || [];
  const safeProducts = products || [];

  const vendors = safeParties.filter((p) => p.type === 'vendor');
  const filteredPurchases = safePurchases.filter(
    (p) =>
      (p.purchaseNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.vendorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.vendorInvoiceNo || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === vendorId);
    const prod = products.find((p) => p.id === selectedProductId);

    if (!vendor || !prod) {
      alert('Please select both vendor and product!');
      return;
    }

    const qty = parseFloat(purchaseQty) || 1;
    const unitPrice = parseFloat(purchaseUnitPrice) || prod.purchasePrice;
    const taxable = qty * unitPrice;
    const tax = (taxable * prod.gstRate) / 100;
    const grandTotal = taxable + tax;
    const paid = parseFloat(paidAmount) || 0;

    const purchase = ERPDatabase.addPurchase({
      companyId: company.id,
      purchaseNo: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorInvoiceNo: vendorInvoiceNo || `VINV-${Math.floor(10000 + Math.random() * 90000)}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorGstin: vendor.gstin,
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          qty,
          unitPrice,
          gstRate: prod.gstRate,
          taxableAmount: taxable,
          taxAmount: tax,
          totalAmount: grandTotal,
        },
      ],
      subtotal: taxable,
      taxTotal: tax,
      grandTotal: grandTotal,
      paidAmount: paid,
      dueAmount: Math.max(0, grandTotal - paid),
      paymentMode: 'bank_transfer',
      status: 'received',
      createdByName: 'System User',
    });

    const bill_uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pur-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    saveOfflinePurchase({
      bill_uuid,
      company_id: company.id,
      purchase_no: purchase.purchaseNo,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      vendor_gstin: vendor.gstin,
      subtotal: taxable,
      total_tax: tax,
      grand_total: grandTotal,
      paid_amount: paid,
      payment_mode: 'bank_transfer',
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          qty,
          unitCost: unitPrice,
          gstRate: prod.gstRate,
          totalAmount: grandTotal,
        },
      ],
      purchased_at: new Date().toISOString(),
    }).then(() => {
      syncWorker.notifyStatusChange();
    });

    setIsAddModalOpen(false);
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400">Purchases & Vendor Invoices</h2>
          <p className="text-xs text-slate-500">Record incoming stock inventory, manage vendor payables & purchase returns.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Import Purchases from CSV"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Entry</span>
          </button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-3 rounded-l-lg">PO #</th>
              <th className="p-3">Vendor Bill #</th>
              <th className="p-3">Vendor Name</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Grand Total</th>
              <th className="p-3 text-right">Due Balance</th>
              <th className="p-3 text-right">Status</th>
              <th className="p-3 text-center rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPurchases.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="p-3 font-bold text-slate-900 dark:text-emerald-300">{p.purchaseNo}</td>
                <td className="p-3 font-mono text-slate-500">{p.vendorInvoiceNo}</td>
                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{p.vendorName}</td>
                <td className="p-3 text-slate-500">{new Date(p.purchasedAt).toLocaleDateString()}</td>
                <td className="p-3 text-right font-black text-slate-900 dark:text-emerald-400">
                  ₹{p.grandTotal.toLocaleString()}
                </td>
                <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                  ₹{p.dueAmount.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <Badge variant={p.status === 'received' ? 'emerald' : p.status === 'cancelled' ? 'rose' : 'amber'} size="sm">
                    {p.status.toUpperCase()}
                  </Badge>
                </td>
                <td className="p-3 text-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleStartEditPurchase(p)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer"
                    title="Edit Purchase Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {p.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => setCancelPurchaseTarget(p)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                      title="Cancel Purchase Entry"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeletePurchaseTarget(p)}
                    className="p-1.5 text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg cursor-pointer"
                    title="Delete Purchase Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Purchase Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Stock Purchase Invoice"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Select Vendor *
              </label>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Vendor Bill / Invoice #
              </label>
              <input
                type="text"
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                placeholder="e.g. TL-99214"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
              Select Product *
            </label>
            <select
              required
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p) setPurchaseUnitPrice(String(p.purchasePrice));
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current Stock: {p.stockQty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Quantity *
              </label>
              <input
                type="number"
                required
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Unit Purchase Price (₹)
              </label>
              <input
                type="number"
                required
                value={purchaseUnitPrice}
                onChange={(e) => setPurchaseUnitPrice(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 font-bold bg-emerald-600 text-white rounded-xl shadow-sm"
            >
              Record Purchase & Add Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Purchase Modal */}
      {editingPurchase && (
        <Modal
          isOpen={!!editingPurchase}
          onClose={() => setEditingPurchase(null)}
          title={`Edit Purchase Order ${editingPurchase.purchaseNo}`}
          maxWidth="md"
        >
          <form onSubmit={handleSavePurchaseEdit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">
                Vendor Bill / Invoice #
              </label>
              <input
                type="text"
                value={editVendorInvoiceNo}
                onChange={(e) => setEditVendorInvoiceNo(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">
                Amount Paid to Vendor (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={editPaidAmount}
                onChange={(e) => setEditPaidAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-emerald-600 dark:text-emerald-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Grand Total: ₹{editingPurchase.grandTotal.toLocaleString()} | Due Balance will adjust automatically.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">
                Payment Mode
              </label>
              <select
                value={editPaymentMode}
                onChange={(e) => setEditPaymentMode(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="upi">UPI / QR</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="khata">Vendor Credit Account</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">
                Purchase Remarks / Notes
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPurchase(null)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer"
              >
                Save Purchase Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Purchase Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!cancelPurchaseTarget}
        onClose={() => setCancelPurchaseTarget(null)}
        onConfirm={handleConfirmCancelPurchase}
        title="Cancel Purchase Order"
        variant="warning"
        confirmLabel="Yes, Cancel Purchase"
        message={`Are you sure you want to CANCEL Purchase Order ${cancelPurchaseTarget?.purchaseNo}? Stock quantities will be deducted and vendor balance will be adjusted.`}
      />

      {/* Delete Purchase Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletePurchaseTarget}
        onClose={() => setDeletePurchaseTarget(null)}
        onConfirm={handleConfirmDeletePurchase}
        title="Delete Purchase Entry"
        variant="danger"
        confirmLabel="Yes, Delete Permanently"
        message={`Are you sure you want to PERMANENTLY DELETE Purchase Order ${deletePurchaseTarget?.purchaseNo}?`}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="purchases"
      />
    </div>
  );
};
