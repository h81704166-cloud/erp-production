import React, { useState } from 'react';
import { Modal } from './Modal';
import { ERPDatabase } from '../../services/db';
import { Product, Party, Account } from '../../types/erp';

interface OnTheFlyAddModalProps {
  isOpen: boolean;
  type: 'product' | 'customer' | 'vendor' | 'account';
  onClose: () => void;
  onAdded: (newItem: any) => void;
}

export const OnTheFlyAddModal: React.FC<OnTheFlyAddModalProps> = ({
  isOpen,
  type,
  onClose,
  onAdded,
}) => {
  // Product state
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [prodBarcode, setProdBarcode] = useState(`890${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  const [prodHsn, setProdHsn] = useState('8471');
  const [prodCategory, setProdCategory] = useState('General');
  const [prodPurchasePrice, setProdPurchasePrice] = useState('100');
  const [prodSellingPrice, setProdSellingPrice] = useState('150');
  const [prodGstRate, setProdGstRate] = useState('18');
  const [prodStock, setProdStock] = useState('50');
  const [prodGodownRoom, setProdGodownRoom] = useState('Room 1 (मुख्य दुकान/गोदाम)');
  const [prodRackShelf, setProdRackShelf] = useState('Rack A1 (अल्मारी A1)');
  const [prodBinBox, setProdBinBox] = useState('Box #1');

  // Party state
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyCreditLimit, setPartyCreditLimit] = useState('50000');

  // Account state
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'cash' | 'bank'>('bank');
  const [accBankName, setAccBankName] = useState('HDFC Bank');
  const [accNumber, setAccNumber] = useState('');
  const [accBalance, setAccBalance] = useState('10000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const company = ERPDatabase.getCompany();

    if (type === 'product') {
      if (!prodName) return;
      const initialStock = parseFloat(prodStock) || 0;
      const room = prodGodownRoom.trim() || 'Room 1 (Main Store)';
      const rack = prodRackShelf.trim() || 'Rack 1';
      const box = prodBinBox.trim();
      const compiledLocation = `${room} | ${rack}${box ? ' | ' + box : ''}`;

      const created = ERPDatabase.addProduct({
        companyId: company.id,
        name: prodName,
        sku: prodSku,
        barcode: prodBarcode,
        hsnCode: prodHsn,
        category: prodCategory,
        unit: 'Pcs',
        purchasePrice: parseFloat(prodPurchasePrice) || 0,
        sellingPrice: parseFloat(prodSellingPrice) || 0,
        minSellingPrice: parseFloat(prodSellingPrice) || 0,
        gstRate: parseFloat(prodGstRate) || 18,
        stockQty: initialStock,
        minStockAlert: 5,
        godownRoom: room,
        rackShelf: rack,
        binBox: box,
        location: compiledLocation,
        storageLocations: [
          {
            id: `slot-${Date.now()}`,
            godownRoom: room,
            rackShelf: rack,
            binBox: box,
            qty: initialStock,
          }
        ],
        status: 'active',
      });
      onAdded(created);
    } else if (type === 'customer' || type === 'vendor') {
      if (!partyName || !partyPhone) return;
      const created = ERPDatabase.addParty({
        companyId: company.id,
        type: type,
        name: partyName,
        phone: partyPhone,
        gstin: partyGstin,
        address: partyAddress || 'Local Area',
        city: company.city,
        state: company.state,
        creditLimit: parseFloat(partyCreditLimit) || 0,
        openingBalance: 0,
        status: 'active',
      });
      onAdded(created);
    } else if (type === 'account') {
      if (!accName) return;
      const created = ERPDatabase.addAccount({
        companyId: company.id,
        accountName: accName,
        accountType: accType,
        bankName: accType === 'bank' ? accBankName : undefined,
        accountNumber: accType === 'bank' ? accNumber : undefined,
        currentBalance: parseFloat(accBalance) || 0,
        isDefault: false,
        status: 'active',
      });
      onAdded(created);
    }

    onClose();
  };

  const title =
    type === 'product'
      ? 'Quick Add New Product'
      : type === 'customer'
      ? 'Quick Add New Customer'
      : type === 'vendor'
      ? 'Quick Add New Vendor'
      : 'Quick Add Cash/Bank Account';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {type === 'product' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Wireless Mouse"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  SKU Code
                </label>
                <input
                  type="text"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  HSN Code
                </label>
                <input
                  type="text"
                  value={prodHsn}
                  onChange={(e) => setProdHsn(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  Purchase Price (₹)
                </label>
                <input
                  type="number"
                  value={prodPurchasePrice}
                  onChange={(e) => setProdPurchasePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  value={prodSellingPrice}
                  onChange={(e) => setProdSellingPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  GST Rate (%)
                </label>
                <select
                  value={prodGstRate}
                  onChange={(e) => setProdGstRate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Initial Stock Qty
              </label>
              <input
                type="number"
                value={prodStock}
                onChange={(e) => setProdStock(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300 font-bold"
              />
            </div>

            {/* Item Storage Location & Room Finder Section */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 dark:text-emerald-300 uppercase">
                  📦 Item Storage Location in Shop/Godown (सामान कहाँ रखा है):
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Room / Godown (कमरा/गोदाम)
                  </label>
                  <input
                    type="text"
                    value={prodGodownRoom}
                    onChange={(e) => setProdGodownRoom(e.target.value)}
                    placeholder="e.g. Room 1 (मुख्य दुकान)"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Rack / Shelf (रैक/अलमारी)
                  </label>
                  <input
                    type="text"
                    value={prodRackShelf}
                    onChange={(e) => setProdRackShelf(e.target.value)}
                    placeholder="e.g. Rack A3 / Shelf 2"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Box / Bin No (डिब्बा नंबर)
                  </label>
                  <input
                    type="text"
                    value={prodBinBox}
                    onChange={(e) => setProdBinBox(e.target.value)}
                    placeholder="e.g. Box #12"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-emerald-300"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {(type === 'customer' || type === 'vendor') && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                {type === 'customer' ? 'Customer Name *' : 'Vendor / Supplier Name *'}
              </label>
              <input
                type="text"
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. Acme Retailers"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={partyGstin}
                  onChange={(e) => setPartyGstin(e.target.value)}
                  placeholder="27AABCU9603R1ZM"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Address
              </label>
              <input
                type="text"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                placeholder="Street name, shop number"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
              />
            </div>
          </>
        )}

        {type === 'account' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                placeholder="e.g. SBI Current Account"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  Type
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                >
                  <option value="bank">Bank Account</option>
                  <option value="cash">Cash Register</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-emerald-300"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
          >
            Save & Add
          </button>
        </div>
      </form>
    </Modal>
  );
};
