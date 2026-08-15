import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Camera,
  AlertTriangle,
  Edit3,
  Sliders,
  Printer,
  Trash2,
  FileSpreadsheet,
  MapPin,
  Building2,
  Boxes,
  Layers,
  Save,
  Eye,
  Check,
} from 'lucide-react';
import { Product, StockAdjustment, Company, ProductStorageSlot } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CsvImportModal } from '../common/CsvImportModal';
import { CameraScannerModal } from '../common/CameraScannerModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface InventoryModuleProps {
  products: Product[];
  company: Company;
  onRefreshData: () => void;
  onOpenAddModal: () => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products = [],
  company,
  onRefreshData,
  onOpenAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('ALL');
  const [inventoryViewMode, setInventoryViewMode] = useState<'all_items' | 'room_map'>('all_items');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Storage Location Modal State
  const [locationProduct, setLocationProduct] = useState<Product | null>(null);
  const [locationSlots, setLocationSlots] = useState<ProductStorageSlot[]>([]);

  // Modals
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<'addition' | 'subtraction' | 'damage' | 'loss'>('damage');
  const [adjQty, setAdjQty] = useState('1');
  const [adjReason, setAdjReason] = useState('');

  const [deleteTargetProduct, setDeleteTargetProduct] = useState<Product | null>(null);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editHsnCode, setEditHsnCode] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editGodownRoom, setEditGodownRoom] = useState('');
  const [editRackShelf, setEditRackShelf] = useState('');
  const [editBinBox, setEditBinBox] = useState('');
  const [editUnit, setEditUnit] = useState('Pcs');
  const [editPurchasePrice, setEditPurchasePrice] = useState('0');
  const [editSellingPrice, setEditSellingPrice] = useState('0');
  const [editStockQty, setEditStockQty] = useState('0');
  const [editMinStockAlert, setEditMinStockAlert] = useState('5');
  const [editGstRate, setEditGstRate] = useState('18');

  const handleStartEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditName(prod.name || '');
    setEditSku(prod.sku || '');
    setEditBarcode(prod.barcode || '');
    setEditCategory(prod.category || 'General');
    setEditHsnCode(prod.hsnCode || '8471');
    setEditGodownRoom(prod.godownRoom || 'Room 1 (Main Store)');
    setEditRackShelf(prod.rackShelf || 'Rack A1');
    setEditBinBox(prod.binBox || '');
    setEditLocation(prod.location || 'Room 1 | Rack A1');
    setEditUnit(prod.unit || 'Pcs');
    setEditPurchasePrice(String(prod.purchasePrice || 0));
    setEditSellingPrice(String(prod.sellingPrice || 0));
    setEditStockQty(String(prod.stockQty || 0));
    setEditMinStockAlert(String(prod.minStockAlert || 5));
    setEditGstRate(String(prod.gstRate || 18));
  };

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const room = editGodownRoom.trim() || 'Room 1 (Main Store)';
    const rack = editRackShelf.trim() || 'Rack 1';
    const box = editBinBox.trim();
    const compiledLoc = `${room} | ${rack}${box ? ' | ' + box : ''}`;

    ERPDatabase.updateProduct(editingProduct.id, {
      name: editName,
      sku: editSku,
      barcode: editBarcode,
      category: editCategory,
      hsnCode: editHsnCode,
      godownRoom: room,
      rackShelf: rack,
      binBox: box,
      location: compiledLoc,
      unit: editUnit as any,
      purchasePrice: parseFloat(editPurchasePrice) || 0,
      sellingPrice: parseFloat(editSellingPrice) || 0,
      stockQty: parseFloat(editStockQty) || 0,
      minStockAlert: parseFloat(editMinStockAlert) || 0,
      gstRate: parseFloat(editGstRate) || 0,
    });

    setEditingProduct(null);
    onRefreshData();
  };

  // Location breakdown modal handlers
  const handleOpenLocationModal = (prod: Product) => {
    setLocationProduct(prod);
    if (prod.storageLocations && prod.storageLocations.length > 0) {
      setLocationSlots([...prod.storageLocations]);
    } else {
      setLocationSlots([
        {
          id: `slot-${Date.now()}`,
          godownRoom: prod.godownRoom || 'Room 1 (Main Shop)',
          rackShelf: prod.rackShelf || 'Rack A1',
          binBox: prod.binBox || '',
          qty: prod.stockQty || 0,
        },
      ]);
    }
  };

  const handleAddLocationSlot = () => {
    setLocationSlots([
      ...locationSlots,
      {
        id: `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        godownRoom: 'Room 2 (Backyard Godown)',
        rackShelf: 'Rack B1',
        binBox: 'Box #1',
        qty: 0,
      },
    ]);
  };

  const handleUpdateLocationSlot = (index: number, field: keyof ProductStorageSlot, val: any) => {
    const updated = [...locationSlots];
    updated[index] = { ...updated[index], [field]: val };
    setLocationSlots(updated);
  };

  const handleRemoveLocationSlot = (index: number) => {
    if (locationSlots.length <= 1) return;
    setLocationSlots(locationSlots.filter((_, i) => i !== index));
  };

  const handleSaveLocationSlots = () => {
    if (!locationProduct) return;
    const totalSlotQty = locationSlots.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
    const mainSlot = locationSlots[0] || { godownRoom: 'Room 1', rackShelf: 'Rack 1', binBox: '' };
    const compiledLocation = locationSlots
      .map((s) => `${s.godownRoom} [${s.rackShelf}${s.binBox ? ' - ' + s.binBox : ''}]: ${s.qty} Pcs`)
      .join(' ; ');

    ERPDatabase.updateProduct(locationProduct.id, {
      godownRoom: mainSlot.godownRoom,
      rackShelf: mainSlot.rackShelf,
      binBox: mainSlot.binBox,
      location: compiledLocation || `${mainSlot.godownRoom} | ${mainSlot.rackShelf}`,
      storageLocations: locationSlots,
      stockQty: totalSlotQty,
    });

    setLocationProduct(null);
    onRefreshData();
  };

  const handleConfirmDeleteProduct = () => {
    if (!deleteTargetProduct) return;
    ERPDatabase.deleteProduct(deleteTargetProduct.id);
    setDeleteTargetProduct(null);
    onRefreshData();
  };

  const handleBulkUpdateInventory = (updates: { productId: string; newStockDelta: number }[]) => {
    updates.forEach((u) => {
      const prod = products.find((p) => p.id === u.productId);
      if (!prod) return;
      ERPDatabase.addStockAdjustment({
        companyId: company.id,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        type: u.newStockDelta >= 0 ? 'addition' : 'subtraction',
        qty: Math.abs(u.newStockDelta),
        reason: 'Bulk Camera Barcode/QR Audit Count',
        adjustedBy: 'System User',
      });
    });
    onRefreshData();
  };

  const safeProducts = products || [];

  // Extract all unique room/godown names across products
  const uniqueRooms = Array.from(
    new Set(
      safeProducts.flatMap((p) => {
        if (p.storageLocations && p.storageLocations.length > 0) {
          return p.storageLocations.map((s) => s.godownRoom.trim());
        }
        return [p.godownRoom?.trim() || p.location?.split('|')[0]?.trim() || 'Room 1 (Main Store)'];
      })
    )
  ).filter(Boolean);

  const filteredProducts = safeProducts.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.godownRoom || '').toLowerCase().includes(q) ||
      (p.rackShelf || '').toLowerCase().includes(q) ||
      (p.binBox || '').toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q);

    const matchesLow = filterLowStockOnly ? (p.stockQty || 0) <= (p.minStockAlert || 0) : true;

    let matchesRoom = true;
    if (selectedRoomFilter !== 'ALL') {
      if (p.storageLocations && p.storageLocations.length > 0) {
        matchesRoom = p.storageLocations.some((s) => s.godownRoom === selectedRoomFilter);
      } else {
        const roomName = p.godownRoom || p.location?.split('|')[0]?.trim() || 'Room 1 (Main Store)';
        matchesRoom = roomName === selectedRoomFilter;
      }
    }

    return matchesSearch && matchesLow && matchesRoom;
  });

  // Group products by room for the Room Map view
  const roomGroupedProducts: Record<string, Product[]> = uniqueRooms.reduce((acc, roomName) => {
    const itemsInRoom = safeProducts.filter((p) => {
      if (p.storageLocations && p.storageLocations.length > 0) {
        return p.storageLocations.some((s) => s.godownRoom.trim() === roomName);
      }
      const r = p.godownRoom?.trim() || p.location?.split('|')[0]?.trim() || 'Room 1 (Main Store)';
      return r === roomName;
    });

    if (itemsInRoom.length > 0) {
      acc[roomName] = itemsInRoom;
    }
    return acc;
  }, {} as Record<string, Product[]>);

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    ERPDatabase.addStockAdjustment({
      companyId: company.id,
      productId: adjustModalProduct.id,
      productName: adjustModalProduct.name,
      sku: adjustModalProduct.sku,
      type: adjType,
      qty: parseFloat(adjQty) || 1,
      reason: adjReason || 'Audit count adjustment',
      adjustedBy: 'System User',
    });

    setAdjustModalProduct(null);
    onRefreshData();
  };

  const printBarcodeLabel = (product: Product) => {
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode ${product.sku}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 20px; }
          .label { border: 2px border-slate-900; padding: 15px; display: inline-block; border-radius: 8px; }
          .title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
          .price { font-size: 18px; font-weight: black; color: #059669; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="title">${product.name}</div>
          <div style="font-size: 11px; color: #666;">SKU: ${product.sku} | HSN: ${product.hsnCode}</div>
          <div style="margin: 10px 0;">
            <svg id="barcode"></svg>
          </div>
          <div class="price">M.R.P: ₹${product.sellingPrice}</div>
          <div style="font-size: 10px; margin-top: 4px;">${company.name}</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Inventory & Storage Location Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Track exact Item Storage Locations (Room/Godown, Rack, Shelf & Box No.) & Stock quantities.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setInventoryViewMode('all_items')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                inventoryViewMode === 'all_items'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>All Items Table</span>
            </button>
            <button
              onClick={() => setInventoryViewMode('room_map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                inventoryViewMode === 'room_map'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Room & Godown Map (कमरा स्थिति)</span>
            </button>
          </div>

          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterLowStockOnly
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Low Stock Alerts</span>
          </button>

          <button
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Scan Barcodes or QR codes with Camera for Bulk Inventory Update"
          >
            <Camera className="w-4 h-4" />
            <span>Camera Bulk Scan</span>
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 font-bold text-xs text-indigo-700 dark:text-indigo-300 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Import Products List via CSV File"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {inventoryViewMode === 'all_items' ? (
        /* Table View */
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-4">
          {/* Search & Room Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, room, rack or box no..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-emerald-300"
              />
            </div>

            {/* Room Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Filter by Room:</span>
              </span>
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              >
                <option value="ALL">🏢 All Rooms & Godowns (सभी कमरे)</option>
                {uniqueRooms.map((r) => (
                  <option key={r} value={r}>
                    🏢 {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-lg">Product Name</th>
                  <th className="p-3">SKU / Barcode</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <MapPin className="w-3 h-3" />
                      <span>Item Location (कमरा, रैक & डिब्बा)</span>
                    </span>
                  </th>
                  <th className="p-3 text-right">Buy Price</th>
                  <th className="p-3 text-right">Sell Price</th>
                  <th className="p-3 text-right">Stock Qty</th>
                  <th className="p-3 text-center rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No items found matching search query or room filter.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.stockQty <= p.minStockAlert;
                    const roomName = p.godownRoom || p.location?.split('|')[0]?.trim() || 'Room 1 (Main Store)';
                    const rackInfo = p.rackShelf || p.location?.split('|')[1]?.trim() || 'Rack A1';
                    const boxInfo = p.binBox || p.location?.split('|')[2]?.trim() || '';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-emerald-300">{p.name}</p>
                          <p className="text-[10px] text-slate-400">HSN: {p.hsnCode}</p>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {p.sku}
                          <br />
                          <span className="text-[10px] text-slate-400">{p.barcode}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-500">{p.category}</td>

                        {/* Room & Storage Location Badge Column */}
                        <td className="p-3">
                          <button
                            onClick={() => handleOpenLocationModal(p)}
                            className="text-left group flex flex-col gap-0.5 p-1.5 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl cursor-pointer transition-all"
                            title="Click to view or edit exact room/rack/box stock location"
                          >
                            <div className="flex items-center gap-1 font-extrabold text-emerald-800 dark:text-emerald-300 text-[11px]">
                              <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{roomName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                              <span className="font-bold">🗄️ {rackInfo}</span>
                              {boxInfo && (
                                <span className="bg-emerald-200/60 dark:bg-emerald-900 px-1 py-0.2 rounded font-mono font-bold text-emerald-900 dark:text-emerald-200">
                                  📦 {boxInfo}
                                </span>
                              )}
                            </div>
                          </button>
                        </td>

                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">₹{p.purchasePrice}</td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-emerald-400">₹{p.sellingPrice}</td>
                        <td className="p-3 text-right font-black">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              isLow
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'text-slate-900 dark:text-emerald-300'
                            }`}
                          >
                            {p.stockQty} {p.unit}
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-1">
                          <button
                            onClick={() => handleOpenLocationModal(p)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg cursor-pointer"
                            title="Item Storage Room Finder & Map"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartEditProduct(p)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer"
                            title="Edit Item Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAdjustModalProduct(p)}
                            className="p-1.5 text-slate-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="Adjust Stock Qty"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => printBarcodeLabel(p)}
                            className="p-1.5 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950 rounded-lg cursor-pointer"
                            title="Print Barcode Label"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetProduct(p)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                            title="Delete Product Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Room & Godown Visual Map View */
        <div className="space-y-6">
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm text-emerald-300">
                  Shop Room & Godown Storage Visual Map (कमरा एवं अलमारी मैप)
                </h3>
                <p className="text-xs text-slate-400">
                  Quickly locate which items are stored in each room, rack, shelf or box so shopkeeper can easily find items!
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find item in rooms..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-emerald-900 rounded-xl text-xs text-emerald-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(roomGroupedProducts).length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                No storage rooms configured or no items matched search filter.
              </div>
            ) : (
              (Object.entries(roomGroupedProducts) as [string, Product[]][]).map(([roomName, roomItems]) => {
                const totalRoomQty = roomItems.reduce((acc, curr) => acc + (curr.stockQty || 0), 0);

                return (
                  <div
                    key={roomName}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-emerald-900/60 rounded-2xl shadow-xs space-y-4"
                  >
                    {/* Room Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold">
                          🏢
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-slate-900 dark:text-emerald-300">{roomName}</h4>
                          <span className="text-[11px] font-bold text-slate-400">
                            {roomItems.length} Products Stored
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800">
                          Total Stock: {totalRoomQty} Pcs
                        </span>
                      </div>
                    </div>

                    {/* Room Items Grid */}
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {roomItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-all"
                        >
                          <div className="space-y-1">
                            <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>SKU: {item.sku}</span>
                              <span>•</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                🗄️ {item.rackShelf || 'Rack A1'}
                              </span>
                              {item.binBox && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">
                                    📦 {item.binBox}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-xs text-slate-900 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                              {item.stockQty} {item.unit}
                            </span>
                            <button
                              onClick={() => handleOpenLocationModal(item)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                              title="Locate or Edit Room Slot"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Item Storage Location Breakdown Modal */}
      {locationProduct && (
        <Modal
          isOpen={!!locationProduct}
          onClose={() => setLocationProduct(null)}
          title={`📍 Item Storage Location & Room Finder: ${locationProduct.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-sm">{locationProduct.name}</p>
                <p className="text-[11px] text-emerald-400">
                  SKU: {locationProduct.sku} | Barcode: {locationProduct.barcode}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Catalog Stock</span>
                <span className="text-base font-black text-white">{locationProduct.stockQty} {locationProduct.unit}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Update room name, rack shelf, or box number for this item. You can also distribute stock across multiple rooms if stored in different godowns!
            </p>

            <div className="space-y-3">
              {locationSlots.map((slot, index) => (
                <div
                  key={slot.id || index}
                  className="p-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      Storage Slot #{index + 1}
                    </span>
                    {locationSlots.length > 1 && (
                      <button
                        onClick={() => handleRemoveLocationSlot(index)}
                        className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                      >
                        Remove Slot
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5 uppercase">
                        Room / Godown (कमरा)
                      </label>
                      <input
                        type="text"
                        value={slot.godownRoom}
                        onChange={(e) => handleUpdateLocationSlot(index, 'godownRoom', e.target.value)}
                        placeholder="e.g. Room 1 (Main Store)"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5 uppercase">
                        Rack / Shelf (रैक)
                      </label>
                      <input
                        type="text"
                        value={slot.rackShelf}
                        onChange={(e) => handleUpdateLocationSlot(index, 'rackShelf', e.target.value)}
                        placeholder="e.g. Rack A1 / Shelf 2"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5 uppercase">
                        Box / Bin No (डिब्बा)
                      </label>
                      <input
                        type="text"
                        value={slot.binBox || ''}
                        onChange={(e) => handleUpdateLocationSlot(index, 'binBox', e.target.value)}
                        placeholder="e.g. Box #12"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5 uppercase">
                        Qty in this Room
                      </label>
                      <input
                        type="number"
                        value={slot.qty}
                        onChange={(e) => handleUpdateLocationSlot(index, 'qty', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddLocationSlot}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Storage Room / Godown Slot (दूसरे कमरे में रखें)</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setLocationProduct(null)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocationSlots}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Location Data</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalProduct && (
        <Modal
          isOpen={!!adjustModalProduct}
          onClose={() => setAdjustModalProduct(null)}
          title={`Stock Adjustment for ${adjustModalProduct.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleStockAdjustment} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Adjustment Type
              </label>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <option value="addition">Stock Addition (+)</option>
                <option value="subtraction">Stock Subtraction (-)</option>
                <option value="damage">Damaged Item (-)</option>
                <option value="loss">Loss / Theft (-)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Quantity *
              </label>
              <input
                type="number"
                required
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Reason / Audit Remarks
              </label>
              <input
                type="text"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="e.g. Broken packaging during transport"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustModalProduct(null)}
                className="px-4 py-2 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="products"
      />

      {/* Bulk Camera Barcode & QR Code Inventory Scanner */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        products={products}
        mode="inventory_bulk"
        onBulkUpdateInventory={handleBulkUpdateInventory}
      />

      {/* Edit Product Details Modal */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title={`Edit Product: ${editingProduct.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveProductEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">SKU / Item Code *</label>
                <input
                  type="text"
                  required
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Barcode / EAN</label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={editHsnCode}
                  onChange={(e) => setEditHsnCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Unit</label>
                <select
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="Pcs">Pcs (Pieces)</option>
                  <option value="Box">Box</option>
                  <option value="Kg">Kg (Kilograms)</option>
                  <option value="Ltr">Ltr (Liters)</option>
                  <option value="Mtr">Mtr (Meters)</option>
                  <option value="Set">Set</option>
                  <option value="Pack">Pack</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Purchase Buy Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editPurchasePrice}
                  onChange={(e) => setEditPurchasePrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Current Stock Qty *</label>
                <input
                  type="number"
                  required
                  value={editStockQty}
                  onChange={(e) => setEditStockQty(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">GST Tax Rate (%)</label>
                <select
                  value={editGstRate}
                  onChange={(e) => setEditGstRate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>

              {/* Storage Location Input Fields */}
              <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <span className="text-xs font-black text-slate-800 dark:text-emerald-300 uppercase block">
                  📦 Item Storage Location (कमरा, अलमारी & डिब्बा):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Room / Godown</label>
                    <input
                      type="text"
                      value={editGodownRoom}
                      onChange={(e) => setEditGodownRoom(e.target.value)}
                      placeholder="e.g. Room 1 (मुख्य दुकान)"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Rack / Shelf</label>
                    <input
                      type="text"
                      value={editRackShelf}
                      onChange={(e) => setEditRackShelf(e.target.value)}
                      placeholder="e.g. Rack A1"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Box / Bin No</label>
                    <input
                      type="text"
                      value={editBinBox}
                      onChange={(e) => setEditBinBox(e.target.value)}
                      placeholder="e.g. Box #12"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Product Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetProduct}
        onClose={() => setDeleteTargetProduct(null)}
        onConfirm={handleConfirmDeleteProduct}
        title="Delete Product Item"
        message={`Are you sure you want to PERMANENTLY DELETE product "${deleteTargetProduct?.name}"?`}
      />
    </div>
  );
};
