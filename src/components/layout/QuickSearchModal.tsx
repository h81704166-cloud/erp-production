import React, { useState, useEffect } from 'react';
import { Search, Package, Users, FileText, ArrowRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { ERPDatabase } from '../../services/db';
import { Product, Party, Sale } from '../../types/erp';
import { ActiveModule } from './Sidebar';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: ActiveModule) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (isOpen) {
      setProducts(ERPDatabase.getProducts());
      setParties(ERPDatabase.getParties());
      setSales(ERPDatabase.getSales());
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const safeProducts = products || [];
  const safeParties = parties || [];
  const safeSales = sales || [];

  const filteredProducts = safeProducts.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.barcode || '').includes(query)
  );

  const filteredParties = safeParties.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.phone || '').includes(query) ||
      (p.gstin || '').toLowerCase().includes(query.toLowerCase())
  );

  const filteredSales = safeSales.filter(
    (s) =>
      (s.invoiceNo || '').toLowerCase().includes(query.toLowerCase()) ||
      (s.customerName || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enterprise Quick Command & Search" maxWidth="xl">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400 dark:text-emerald-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type item name, SKU, customer, phone, invoice #..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {/* Quick Shortcuts */}
          {!query && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Shortcuts
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onNavigate('pos');
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-800 dark:text-emerald-300 transition-colors"
                >
                  <span>Open POS Billing Counter</span>
                  <ArrowRight className="w-4 h-4 text-emerald-500" />
                </button>
                <button
                  onClick={() => {
                    onNavigate('inventory');
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-800 dark:text-emerald-300 transition-colors"
                >
                  <span>View Product Inventory</span>
                  <ArrowRight className="w-4 h-4 text-emerald-500" />
                </button>
                <button
                  onClick={() => {
                    onNavigate('customers');
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-800 dark:text-emerald-300 transition-colors"
                >
                  <span>Customer Khata Ledgers</span>
                  <ArrowRight className="w-4 h-4 text-emerald-500" />
                </button>
                <button
                  onClick={() => {
                    onNavigate('gst');
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-800 dark:text-emerald-300 transition-colors"
                >
                  <span>GSTR-1 & 3B Tax Reports</span>
                  <ArrowRight className="w-4 h-4 text-emerald-500" />
                </button>
              </div>
            </div>
          )}

          {/* Product Results */}
          {filteredProducts.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                Products ({filteredProducts.length})
              </p>
              <div className="space-y-1">
                {filteredProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onNavigate('inventory');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-emerald-300">{p.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        SKU: {p.sku} | Barcode: {p.barcode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{p.sellingPrice.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400">Stock: {p.stockQty} {p.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Party Results */}
          {filteredParties.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Parties / Customers ({filteredParties.length})
              </p>
              <div className="space-y-1">
                {filteredParties.slice(0, 3).map((party) => (
                  <div
                    key={party.id}
                    onClick={() => {
                      onNavigate(party.type === 'customer' ? 'customers' : 'vendors');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-emerald-300">{party.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Phone: {party.phone} | {party.type.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right font-bold text-slate-700 dark:text-slate-300">
                      Balance: ₹{party.currentBalance.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Results */}
          {filteredSales.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-500" />
                Invoices ({filteredSales.length})
              </p>
              <div className="space-y-1">
                {filteredSales.slice(0, 3).map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => {
                      onNavigate('sales');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-emerald-300">{sale.invoiceNo}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{sale.customerName}</p>
                    </div>
                    <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{sale.grandTotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
