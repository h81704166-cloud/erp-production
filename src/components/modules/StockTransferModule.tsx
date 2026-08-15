import React, { useState } from 'react';
import { ArrowLeftRight, Plus, CheckCircle, Clock } from 'lucide-react';
import { StockTransfer, Product, Company } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface StockTransferModuleProps {
  transfers: StockTransfer[];
  products: Product[];
  company: Company;
  onRefreshData: () => void;
}

export const StockTransferModule: React.FC<StockTransferModuleProps> = ({
  transfers = [],
  products = [],
  company,
  onRefreshData,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromLoc, setFromLoc] = useState('Main Store');
  const [toLoc, setToLoc] = useState('Branch 2 Warehouse');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('5');
  const [notes, setNotes] = useState('');

  const safeTransfers = transfers || [];
  const safeProducts = products || [];

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = safeProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    ERPDatabase.addStockTransfer({
      companyId: company.id,
      transferNo: `STF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      fromLocation: fromLoc,
      toLocation: toLoc,
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          qty: parseFloat(qty) || 1,
        },
      ],
      status: 'completed',
      notes: notes || 'Branch stock rebalancing',
      createdByName: 'System User',
    });

    setIsModalOpen(false);
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400">Inter-Branch Stock Transfer</h2>
          <p className="text-xs text-slate-500">Transfer inventory stock between main store, secondary warehouses & retail branches.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded-xl shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-3 rounded-l-lg">Transfer #</th>
              <th className="p-3">From Location</th>
              <th className="p-3">To Location</th>
              <th className="p-3">Items Transferred</th>
              <th className="p-3 text-right">Transferred At</th>
              <th className="p-3 text-right rounded-r-lg">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transfers.map((st) => (
              <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="p-3 font-bold text-slate-900 dark:text-emerald-300">{st.transferNo}</td>
                <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{st.fromLocation}</td>
                <td className="p-3 font-medium text-emerald-600 dark:text-emerald-400">{st.toLocation}</td>
                <td className="p-3">
                  {st.items.map((i) => `${i.productName} (${i.qty} pcs)`).join(', ')}
                </td>
                <td className="p-3 text-right text-slate-500">{new Date(st.transferredAt).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <Badge variant="emerald" size="sm">COMPLETED</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Stock Transfer Order" maxWidth="md">
        <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                From Location
              </label>
              <input
                type="text"
                value={fromLoc}
                onChange={(e) => setFromLoc(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                To Location
              </label>
              <input
                type="text"
                value={toLoc}
                onChange={(e) => setToLoc(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
              Select Product
            </label>
            <select
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Available: {p.stockQty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
              Transfer Quantity
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-600">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl">
              Confirm Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
