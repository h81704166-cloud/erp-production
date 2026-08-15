import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  Printer,
  QrCode,
  CreditCard,
  Banknote,
  UserPlus,
  Pause,
  Play,
  CheckCircle2,
  XCircle,
  FileText,
  Palette,
  Settings2,
  Sparkles,
  Eye,
  Truck,
  Coins,
  Layers,
  Calendar,
  Layers3,
  Lock,
  Unlock,
  KeyRound,
  Store,
  Clock,
  ArrowRightLeft,
  Globe,
  Zap,
} from 'lucide-react';
import { Product, Party, Sale, SaleItem, AdditionalCharge, Company, User, DeliveryBoy, ProductBatch, POSCounter, HeldBill, Shift } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { saveOfflineBill } from '../../services/offlineDb';
import { syncWorker } from '../../services/syncWorker';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { PrintLayoutService, PrintLayoutConfig } from '../../services/printLayoutService';
import { PaymentGatewayService } from '../../services/paymentGatewayService';
import { PrintLayoutDesignerModal } from './PrintLayoutDesignerModal';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { CashDrawerModal } from './CashDrawerModal';
import { UpiQRCode } from '../common/UpiQRCode';
import { CameraScannerModal } from '../common/CameraScannerModal';

interface POSModuleProps {
  products: Product[];
  parties: Party[];
  company: Company;
  currentUser: User;
  onRefreshData: () => void;
  onOpenAddModal: (type: 'product' | 'customer') => void;
}

interface CartItem extends SaleItem {
  stockAvailable: number;
}

export const POSModule: React.FC<POSModuleProps> = ({
  products,
  parties,
  company,
  currentUser,
  onRefreshData,
  onOpenAddModal,
}) => {
  const isCashier = currentUser?.role === 'cashier';

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
  const [chargeName, setChargeName] = useState('Delivery Charge');
  const [chargeAmount, setChargeAmount] = useState('50');
  const [chargeGstRate, setChargeGstRate] = useState('18');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Walk-in Cash Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'khata' | 'online_gateway'>('cash');
  const [gatewayTxnId, setGatewayTxnId] = useState<string>('');
  const [isProcessingGateway, setIsProcessingGateway] = useState<boolean>(false);
  const [discountOverall, setDiscountOverall] = useState<number>(0);

  const handleTriggerGatewayPayment = async () => {
    setIsProcessingGateway(true);
    await PaymentGatewayService.processPayment({
      amount: cartGrandTotal,
      company,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      invoiceNo: `POS-${Date.now().toString().slice(-6)}`,
      onSuccess: (paymentId) => {
        setIsProcessingGateway(false);
        setGatewayTxnId(paymentId);
        setPaidAmount(cartGrandTotal);
      },
      onError: (msg) => {
        setIsProcessingGateway(false);
        alert(`Payment Gateway Notice: ${msg}`);
      },
    });
  };

  // Multi-Counter & Cash Drawer State
  const [countersList, setCountersList] = useState<POSCounter[]>(() => ERPDatabase.getCounters());
  const [activeCounter, setActiveCounter] = useState<string>(() => {
    const saved = ERPDatabase.getActiveCounter();
    const counters = ERPDatabase.getCounters();
    if (counters.some((c) => c.name === saved)) {
      return saved;
    }
    return counters[0]?.name || 'Counter 1 - Main Billing Desk';
  });
  const [targetCounterForPin, setTargetCounterForPin] = useState<POSCounter | null>(null);
  const [enteredCounterPin, setEnteredCounterPin] = useState<string>('');
  const [counterPinError, setCounterPinError] = useState<string>('');

  useEffect(() => {
    const freshCounters = ERPDatabase.getCounters();
    setCountersList(freshCounters);
    const exists = freshCounters.some((c) => c.name === activeCounter);
    if (!exists && freshCounters.length > 0) {
      setActiveCounter(freshCounters[0].name);
      ERPDatabase.setActiveCounter(freshCounters[0].name);
    }
  }, []);

  // Central Shared Held Bills Pool
  const [centralHeldBills, setCentralHeldBills] = useState<HeldBill[]>(() => ERPDatabase.getHeldBills());
  const [isSharedHeldBillsModalOpen, setIsSharedHeldBillsModalOpen] = useState<boolean>(false);

  const refreshHeldBills = () => {
    setCentralHeldBills(ERPDatabase.getHeldBills());
  };

  const currentCounterObj = countersList.find((c) => c.name === activeCounter) || countersList[0];

  // Shift Management State
  const [activeShift, setActiveShift] = useState<Shift | null>(() => {
    return ERPDatabase.getActiveShiftForCounter(currentCounterObj?.id || currentCounterObj?.name || 'cnt-01');
  });
  const [isShiftOpenModalOpen, setIsShiftOpenModalOpen] = useState(false);
  const [shiftOpeningCash, setShiftOpeningCash] = useState('2000');
  const [shiftCashierName, setShiftCashierName] = useState(currentUser?.name || 'Main Cashier');
  const [shiftOpenError, setShiftOpenError] = useState('');

  useEffect(() => {
    const shift = ERPDatabase.getActiveShiftForCounter(currentCounterObj?.id || currentCounterObj?.name || 'cnt-01');
    setActiveShift(shift);
  }, [activeCounter, countersList]);

  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShiftOpenError('');
    const res = ERPDatabase.openShift(
      currentCounterObj?.id || 'cnt-01',
      currentCounterObj?.name || activeCounter,
      shiftCashierName || currentUser.name,
      parseFloat(shiftOpeningCash) || 0
    );
    if (!res.success && res.error) {
      setShiftOpenError(res.error);
    } else {
      setActiveShift(res.shift || null);
      setIsShiftOpenModalOpen(false);
      setShiftOpenError('');
    }
  };

  const handleInitiateCounterSwitch = (counter: POSCounter) => {
    if (counter.name === activeCounter) return;
    setTargetCounterForPin(counter);
    setEnteredCounterPin('');
    setCounterPinError('');
  };

  const handleVerifyCounterPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCounterForPin) return;
    const cleanPin = enteredCounterPin.trim();
    if (cleanPin === targetCounterForPin.pin) {
      setActiveCounter(targetCounterForPin.name);
      ERPDatabase.setActiveCounter(targetCounterForPin.name);
      setTargetCounterForPin(null);
      setEnteredCounterPin('');
      setCounterPinError('');
    } else {
      setCounterPinError(`❌ Invalid Security PIN! Please enter configured PIN for ${targetCounterForPin.name}`);
    }
  };

  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>(ERPDatabase.getDeliveryBoys());
  const [selectedDeliveryBoyId, setSelectedDeliveryBoyId] = useState<string>('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Hold Carts Queue
  const [heldCarts, setHeldCarts] = useState<{ id: string; name: string; items: CartItem[] }[]>([]);

  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Print Layout Designer State
  const [isPrintDesignerOpen, setIsPrintDesignerOpen] = useState(false);
  const [availablePrintLayouts, setAvailablePrintLayouts] = useState<PrintLayoutConfig[]>([]);
  const [selectedPrintLayoutId, setSelectedPrintLayoutId] = useState<string>('');

  const loadPrintLayouts = () => {
    const layouts = PrintLayoutService.getLayouts();
    setAvailablePrintLayouts(layouts);
    const def = layouts.find((l) => l.isDefault) || layouts[0];
    if (def) {
      setSelectedPrintLayoutId(def.id);
    }
  };

  useEffect(() => {
    loadPrintLayouts();
  }, []);

  const barcodeRef = useRef<HTMLInputElement>(null);

  // Categories list
  const safeProducts = products || [];
  const safeParties = parties || [];
  const categories = ['All', ...Array.from(new Set(safeProducts.map((p) => p.category || 'General')))];

  // Filtered Products
  const filteredProducts = safeProducts.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode || '').includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  // Handle Barcode Scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const found = products.find((p) => p.barcode === barcodeInput || p.sku.toLowerCase() === barcodeInput.toLowerCase());
    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      alert(`No product found with barcode/SKU: ${barcodeInput}`);
    }
  };

  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) {
      alert(`Item "${product.name}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.productId === product.id);
      if (idx > -1) {
        const existing = prev[idx];
        if (existing.qty + 1 > product.stockQty) {
          alert(`Cannot exceed available stock of ${product.stockQty}`);
          return prev;
        }
        const updated = [...prev];
        const newQty = existing.qty + 1;
        const taxable = newQty * existing.unitPrice - existing.discountAmount;
        const tax = (taxable * existing.gstRate) / 100;
        updated[idx] = {
          ...existing,
          qty: newQty,
          taxableAmount: taxable,
          cgstAmount: tax / 2,
          sgstAmount: tax / 2,
          totalAmount: taxable + tax,
        };
        return updated;
      } else {
        const taxable = product.sellingPrice;
        const tax = (taxable * product.gstRate) / 100;
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            hsnCode: product.hsnCode,
            qty: 1,
            unit: product.unit,
            unitPrice: product.sellingPrice,
            discountAmount: 0,
            gstRate: product.gstRate,
            taxableAmount: taxable,
            cgstAmount: tax / 2,
            sgstAmount: tax / 2,
            igstAmount: 0,
            totalAmount: taxable + tax,
            stockAvailable: product.stockQty,
          },
        ];
      }
    });
  };

  const updateCartItemQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stockAvailable) {
              alert(`Max stock available: ${item.stockAvailable}`);
              return item;
            }
            const taxable = newQty * item.unitPrice - item.discountAmount;
            const tax = (taxable * item.gstRate) / 100;
            return {
              ...item,
              qty: newQty,
              taxableAmount: taxable,
              cgstAmount: tax / 2,
              sgstAmount: tax / 2,
              totalAmount: taxable + tax,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleAddChargeSubmit = () => {
    const amt = parseFloat(chargeAmount) || 0;
    const gstRate = parseFloat(chargeGstRate) || 0;
    if (!chargeName.trim() || amt <= 0) {
      alert('Please enter a valid charge name and amount.');
      return;
    }

    const tax = (amt * gstRate) / 100;
    const newCharge: AdditionalCharge = {
      id: `chg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: chargeName.trim(),
      amount: amt,
      gstRate,
      taxableAmount: amt,
      cgstAmount: tax / 2,
      sgstAmount: tax / 2,
      igstAmount: 0,
      totalAmount: amt + tax,
    };

    setAdditionalCharges((prev) => [...prev, newCharge]);
    setIsAddChargeModalOpen(false);
    setChargeAmount('50');
  };

  const removeAdditionalCharge = (id: string) => {
    setAdditionalCharges((prev) => prev.filter((c) => c.id !== id));
  };

  // Cart & Additional Charges Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.taxableAmount, 0);
  const cartItemsTax = cart.reduce((acc, item) => acc + item.cgstAmount + item.sgstAmount, 0);

  const totalAddChargesAmount = additionalCharges.reduce((acc, c) => acc + c.totalAmount, 0);
  const totalAddChargesTaxable = additionalCharges.reduce((acc, c) => acc + c.taxableAmount, 0);
  const totalAddChargesTax = additionalCharges.reduce((acc, c) => acc + c.cgstAmount + c.sgstAmount, 0);

  const combinedTaxable = cartSubtotal + totalAddChargesTaxable;
  const combinedTax = cartItemsTax + totalAddChargesTax;
  const cartGrandTotal = Math.max(0, combinedTaxable + combinedTax - discountOverall);

  // Central Multi-Counter Hold Bill Functionality
  const holdCurrentCart = () => {
    if (cart.length === 0) return;
    ERPDatabase.saveHeldBill({
      counterId: currentCounterObj?.id || 'cnt-01',
      counterName: activeCounter,
      createdByName: currentUser?.name || currentCounterObj?.assignedCashierName || 'Cashier',
      customerName: customerName || 'Walk-in Cash Customer',
      customerPhone,
      customerId: selectedCustomerId,
      items: cart,
      additionalCharges,
      discountOverall,
      notes: `Bill held at ${activeCounter}`,
    });
    setCart([]);
    setAdditionalCharges([]);
    setDiscountOverall(0);
    refreshHeldBills();
  };

  const resumeCentralHeldBill = (hb: HeldBill) => {
    setCart(hb.items.map((it) => ({ ...it, stockAvailable: 9999 })));
    setAdditionalCharges(hb.additionalCharges || []);
    setDiscountOverall(hb.discountOverall || 0);
    if (hb.customerName) setCustomerName(hb.customerName);
    if (hb.customerPhone) setCustomerPhone(hb.customerPhone);
    if (hb.customerId) setSelectedCustomerId(hb.customerId);
    ERPDatabase.removeHeldBill(hb.id);
    refreshHeldBills();
    setIsSharedHeldBillsModalOpen(false);
  };

  const removeCentralHeldBill = (id: string) => {
    ERPDatabase.removeHeldBill(id);
    refreshHeldBills();
  };

  const resetBillingState = () => {
    setCart([]);
    setAdditionalCharges([]);
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setDiscountOverall(0);
    setPaidAmount(0);
    setPaymentMode('cash');
    setGatewayTxnId('');
    setBarcodeInput('');
    setSearchQuery('');
  };

  // Process Final Sale
  const handleCompleteBilling = () => {
    if (cart.length === 0) return;

    const customers = parties.filter((p) => p.type === 'customer');
    const custObj = customers.find((c) => c.id === selectedCustomerId);

    const actualPaymentMode = paymentMode === 'online_gateway' ? 'upi' : paymentMode;

    const sale = ERPDatabase.addSale({
      companyId: company.id,
      counterId: currentCounterObj?.id || 'cnt-01',
      counterName: currentCounterObj?.name || activeCounter,
      shiftId: activeShift?.id,
      customerId: custObj?.id,
      customerName: custObj ? custObj.name : customerName,
      customerPhone: custObj ? custObj.phone : customerPhone,
      customerGstin: custObj?.gstin,
      items: cart,
      additionalCharges: additionalCharges,
      totalAdditionalCharges: totalAddChargesAmount,
      subtotal: cartSubtotal,
      totalDiscount: discountOverall,
      totalTaxable: combinedTaxable,
      totalCgst: combinedTax / 2,
      totalSgst: combinedTax / 2,
      totalIgst: 0,
      totalTax: combinedTax,
      grandTotal: cartGrandTotal,
      paidAmount: paymentMode === 'khata' ? 0 : paidAmount || cartGrandTotal,
      dueAmount: paymentMode === 'khata' ? cartGrandTotal : Math.max(0, cartGrandTotal - paidAmount),
      paymentMode: actualPaymentMode,
      paymentDetails: {
        transactionId: gatewayTxnId || (actualPaymentMode === 'upi' ? `UPI-${Math.floor(1000000000 + Math.random() * 9000000000)}` : undefined),
      },
      status: 'completed',
      billedByName: currentUser.name,
    });

    setLastCompletedSale(sale);

    // Save Offline IndexedDB bill record with unique bill_uuid for background sync worker
    const bill_uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bill-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    saveOfflineBill({
      bill_uuid,
      company_id: company.id,
      invoice_no: sale.invoiceNo,
      customer_id: custObj?.id,
      customer_name: custObj ? custObj.name : customerName,
      customer_phone: custObj ? custObj.phone : customerPhone,
      customer_gstin: custObj?.gstin,
      subtotal: cartSubtotal,
      discount_amount: discountOverall,
      total_taxable: combinedTaxable,
      total_cgst: combinedTax / 2,
      total_sgst: combinedTax / 2,
      total_igst: 0,
      grand_total: cartGrandTotal,
      paid_amount: paymentMode === 'khata' ? 0 : paidAmount || cartGrandTotal,
      due_amount: paymentMode === 'khata' ? cartGrandTotal : Math.max(0, cartGrandTotal - paidAmount),
      payment_mode: actualPaymentMode,
      items: cart.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        hsnCode: i.hsnCode,
        qty: i.qty,
        unitPrice: i.unitPrice,
        gstRate: i.gstRate,
        taxableAmount: i.taxableAmount,
        totalAmount: i.totalAmount,
      })),
      billed_by_user_id: currentUser.id,
      billed_at: new Date().toISOString(),
    }).then(() => {
      syncWorker.notifyStatusChange();
    });

    resetBillingState();
    setIsCheckoutModalOpen(false);
    onRefreshData();
  };

  useEffect(() => {
    setPaidAmount(cartGrandTotal);
  }, [cartGrandTotal]);

  // Handle global trigger_save_billing event (Ctrl+S)
  useEffect(() => {
    const handleSaveTrigger = () => {
      if (cart.length === 0) {
        alert('Cart is empty. Please add items to save a billing transaction.');
        return;
      }
      handleCompleteBilling();
    };

    window.addEventListener('trigger_save_billing', handleSaveTrigger);
    return () => window.removeEventListener('trigger_save_billing', handleSaveTrigger);
  }, [cart, selectedCustomerId, customerName, customerPhone, paymentMode, paidAmount, discountOverall, company, currentUser]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-7rem)] w-full max-w-full min-w-0">
      {/* Left 7 Cols: Product Catalog & Touch Billing */}
      <div className="lg:col-span-7 flex flex-col space-y-4 h-full">
        {/* Top Controls: Barcode Scanner, Multi-Counter & Search */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs space-y-3">
          {/* Active POS Counter & Cash Galla Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-slate-700 dark:text-slate-300">Billing Counter:</span>
              <select
                value={activeCounter}
                onChange={(e) => {
                  const targetName = e.target.value;
                  const cntObj = countersList.find((c) => c.name === targetName);
                  if (cntObj) {
                    handleInitiateCounterSwitch(cntObj);
                  }
                }}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-extrabold px-2.5 py-1 rounded-lg focus:outline-none cursor-pointer"
              >
                {countersList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name === activeCounter ? '🟢 Active: ' : '🔒 Switch (PIN required): '}{c.name} ({c.code})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 font-bold hidden md:inline">
                📍 {currentCounterObj?.location}
              </span>
              {isCashier && (
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-extrabold text-[10px] rounded-md border border-cyan-500/30 flex items-center gap-1 shrink-0 ml-1">
                  <Lock className="w-3 h-3" />
                  <span>Cashier Mode</span>
                </span>
              )}
            </div>

            <button
              onClick={() => setIsCashDrawerOpen(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all text-[11px]"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Shift Galla Closing & Reconciliation</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsCameraScannerOpen(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Open Camera to Scan Barcodes / QR Codes"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera Scan</span>
            </button>
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
              <Barcode className="w-5 h-5 absolute left-3 top-2.5 text-slate-400 dark:text-emerald-400" />
              <input
                ref={barcodeRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode / Enter SKU (Press Enter)..."
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500"
              />
            </form>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter catalog by product name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-emerald-300"
              />
            </div>
            {!isCashier ? (
              <button
                onClick={() => onOpenAddModal('product')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Product</span>
              </button>
            ) : (
              <div
                className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 shrink-0"
                title="Product master creation is restricted for Cashiers"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Catalog Locked</span>
              </div>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stockQty <= 0;
            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`p-3.5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between ${
                  isOutOfStock
                    ? 'opacity-50 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                    : 'border-slate-200/80 dark:border-emerald-900/40 hover:border-emerald-500 cursor-pointer hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.category}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">{p.sku}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-emerald-300 line-clamp-2">{p.name}</h4>
                </div>

                <div className="mt-3 flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock: {p.stockQty} {p.unit}</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ₹{p.sellingPrice.toLocaleString()}
                    </span>
                  </div>
                  <button
                    disabled={isOutOfStock}
                    className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold hover:bg-emerald-600 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 5 Cols: Active POS Cart & Billing Tender */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl p-4 flex flex-col justify-between shadow-xs h-full">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-emerald-400">Active POS Bill Cart</h3>
              <p className="text-[11px] text-slate-400">{cart.length} unique line items</p>
            </div>
            <div className="flex items-center gap-2">
              {!isCashier && (
                <button
                  onClick={() => setIsPrintDesignerOpen(true)}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-emerald-100 cursor-pointer"
                  title="Design & Select Print Layouts"
                >
                  <Palette className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Print Themes</span>
                </button>
              )}
              <button
                onClick={() => setIsSharedHeldBillsModalOpen(true)}
                className="px-2.5 py-1 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-black rounded-lg flex items-center gap-1 hover:bg-amber-200 transition-all cursor-pointer relative"
                title="View & Resume Bills Held Across All 5 Counters"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Shared Held Bills ({centralHeldBills.length})</span>
                {centralHeldBills.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
              <button
                onClick={holdCurrentCart}
                disabled={cart.length === 0}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50"
                title="Hold current cart on central multi-counter queue"
              >
                <Pause className="w-3 h-3" /> Hold Bill
              </button>
            </div>
          </div>

          {/* Customer Selector */}
          <div className="py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const cust = parties.find((p) => p.id === e.target.value);
                if (cust) {
                  setCustomerName(cust.name);
                  setCustomerPhone(cust.phone);
                } else {
                  setCustomerName('Walk-in Cash Customer');
                  setCustomerPhone('');
                }
              }}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300 py-1.5 px-2"
            >
              <option value="">Walk-in Cash Customer</option>
              {parties
                .filter((p) => p.type === 'customer')
                .map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name} ({cust.phone})
                  </option>
                ))}
            </select>
            <button
              onClick={() => onOpenAddModal('customer')}
              className="p-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl hover:bg-emerald-100"
              title="Add New Customer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-2 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <Barcode className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-semibold">Cart is empty. Scan barcode or click items to add.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-emerald-300 line-clamp-1">{item.productName}</p>
                    <p className="text-[10px] text-slate-400">
                      ₹{item.unitPrice} x {item.qty} | GST {item.gstRate}%
                    </p>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => updateCartItemQty(item.productId, -1)}
                      className="p-0.5 hover:text-emerald-500"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateCartItemQty(item.productId, 1)}
                      className="p-0.5 hover:text-emerald-500"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right w-20">
                    <p className="font-black text-slate-900 dark:text-emerald-400">₹{item.totalAmount.toFixed(0)}</p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Additional Charges Quick Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-emerald-300">
                Service Charges (डिलीवरी/लेबर/पैकिंग):
              </span>
              <button
                onClick={() => {
                  setChargeName('Delivery Charge');
                  setChargeAmount('50');
                  setChargeGstRate('18');
                  setIsAddChargeModalOpen(true);
                }}
                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-1 hover:bg-blue-100"
              >
                <Plus className="w-3 h-3" /> Add Service Charge
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => {
                  const tax = (50 * 18) / 100;
                  setAdditionalCharges((prev) => [
                    ...prev,
                    {
                      id: `chg-${Date.now()}`,
                      name: 'Delivery Charge',
                      amount: 50,
                      gstRate: 18,
                      taxableAmount: 50,
                      cgstAmount: tax / 2,
                      sgstAmount: tax / 2,
                      igstAmount: 0,
                      totalAmount: 50 + tax,
                    },
                  ]);
                }}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                🚚 +Delivery (₹50+18% GST)
              </button>
              <button
                onClick={() => {
                  const tax = (100 * 18) / 100;
                  setAdditionalCharges((prev) => [
                    ...prev,
                    {
                      id: `chg-${Date.now()}`,
                      name: 'Labour Charge',
                      amount: 100,
                      gstRate: 18,
                      taxableAmount: 100,
                      cgstAmount: tax / 2,
                      sgstAmount: tax / 2,
                      igstAmount: 0,
                      totalAmount: 100 + tax,
                    },
                  ]);
                }}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                🔧 +Labour (₹100+18% GST)
              </button>
              <button
                onClick={() => {
                  const tax = (30 * 12) / 100;
                  setAdditionalCharges((prev) => [
                    ...prev,
                    {
                      id: `chg-${Date.now()}`,
                      name: 'Packing Charge',
                      amount: 30,
                      gstRate: 12,
                      taxableAmount: 30,
                      cgstAmount: tax / 2,
                      sgstAmount: tax / 2,
                      igstAmount: 0,
                      totalAmount: 30 + tax,
                    },
                  ]);
                }}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                📦 +Packing (₹30+12% GST)
              </button>
            </div>

            {/* List of Applied Additional Charges */}
            {additionalCharges.length > 0 && (
              <div className="space-y-1 bg-blue-50/50 dark:bg-slate-800/80 p-2 rounded-xl border border-blue-100 dark:border-slate-700">
                {additionalCharges.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                    <span className="font-semibold">
                      {ch.name} {ch.gstRate > 0 ? `(${ch.gstRate}% GST)` : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">₹{ch.totalAmount.toFixed(2)}</span>
                      <button
                        onClick={() => removeAdditionalCharge(ch.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Remove Charge"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary & Tender Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal:</span>
                <span className="font-bold">₹{cartSubtotal.toFixed(2)}</span>
              </div>
              {additionalCharges.length > 0 && (
                <div className="flex justify-between text-blue-700 dark:text-blue-400 font-semibold">
                  <span>Additional Charges:</span>
                  <span>+₹{totalAddChargesAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Total GST Tax (CGST + SGST):</span>
                <span className="font-bold">₹{combinedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 items-center">
                <span className="flex items-center gap-1">
                  <span>Overall Discount:</span>
                  {isCashier && (
                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5" title="Discount override locked for Cashiers">
                      <Lock className="w-2.5 h-2.5" /> (Locked)
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  disabled={isCashier}
                  value={discountOverall}
                  onChange={(e) => setDiscountOverall(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  title={isCashier ? 'Discount override requires Manager / Owner access' : 'Enter overall discount amount'}
                  className={`w-20 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-right font-bold text-xs ${
                    isCashier ? 'opacity-60 cursor-not-allowed bg-slate-200/50 dark:bg-slate-900' : ''
                  }`}
                />
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-emerald-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Grand Total:</span>
                <span>₹{cartGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutModalOpen(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>COLLECT PAYMENT (₹{cartGrandTotal.toFixed(0)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal with Dynamic Payment Tender */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Complete POS Payment Tender"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500">Total Bill Amount</p>
              <p className="text-2xl font-black text-slate-900 dark:text-emerald-400">₹{cartGrandTotal.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Customer</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{customerName}</p>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-2">
              Select Payment Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'upi', label: 'UPI / QR', icon: QrCode },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'online_gateway', label: 'Online Gateway', icon: Globe },
                { id: 'khata', label: 'Khata Due', icon: FileText },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSel = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setPaymentMode(mode.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                      isSel
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Specific Previews */}
          {paymentMode === 'online_gateway' && (
            <div className="py-2 space-y-3 p-4 bg-indigo-50/80 dark:bg-indigo-950/70 border-2 border-indigo-500 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase">
                      {company.paymentGatewayProvider === 'phonepe_pg'
                        ? 'PhonePe Business Payment Gateway'
                        : company.paymentGatewayProvider === 'paytm_pg'
                        ? 'Paytm Business PG & Soundbox'
                        : company.paymentGatewayProvider === 'cashfree'
                        ? 'Cashfree Merchant Gateway'
                        : company.paymentGatewayProvider === 'razorpay'
                        ? 'Razorpay Merchant Payment Gateway'
                        : 'Online Payment Gateway'}
                    </h4>
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-300">
                      Collect payment via Credit/Debit Card, NetBanking, UPI, or Wallet
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-mono font-bold text-[10px] rounded-lg">
                  {company.merchantGatewayId || company.razorpayKeyId || 'ONLINE PG ACTIVE'}
                </span>
              </div>

              {gatewayTxnId ? (
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">PAYMENT CAPTURED SUCCESSFULLY</p>
                      <p className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        Txn ID: {gatewayTxnId}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGatewayTxnId('')}
                    className="px-2 py-1 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded text-[10px] font-bold"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerGatewayPayment}
                  disabled={isProcessingGateway}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 disabled:opacity-50 font-black text-xs text-white rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>
                    {isProcessingGateway
                      ? 'LAUNCHING ONLINE GATEWAY...'
                      : `PAY ₹${cartGrandTotal.toFixed(2)} VIA ONLINE GATEWAY`}
                  </span>
                </button>
              )}
            </div>
          )}

          {paymentMode === 'upi' && (
            <div className="py-2 space-y-2">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase text-[11px]">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Gateway Alternative Available</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    If QR scan fails, launch online payment gateway checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerGatewayPayment}
                  disabled={isProcessingGateway}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] rounded-lg shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Online PG</span>
                </button>
              </div>
              <UpiQRCode
                upiId={company.upiId}
                payeeName={company.upiPayeeName}
                amount={cartGrandTotal}
                companyName={company.name}
                customerPhone={customerPhone}
                note={company.paymentQrNote}
              />
            </div>
          )}

          {/* Delivery Boy Local Order Dispatch Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-500" />
              <span>Assign Local Delivery Boy / Order Dispatch (Optional)</span>
            </label>
            <select
              value={selectedDeliveryBoyId}
              onChange={(e) => setSelectedDeliveryBoyId(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
            >
              <option value="">-- Direct Counter Handover (No Delivery Boy) --</option>
              {deliveryBoys.map((db) => (
                <option key={db.id} value={db.id}>
                  🛵 {db.name} ({db.phone}) - {db.vehicleNo} [{db.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteBilling}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md"
            >
              CONFIRM & GENERATE INVOICE
            </button>
          </div>
        </div>
      </Modal>

      {/* Print Success Modal */}
      {lastCompletedSale && (
        <Modal
          isOpen={!!lastCompletedSale}
          onClose={() => setLastCompletedSale(null)}
          title="Invoice Generated Successfully!"
          maxWidth="4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Actions & Theme Selection */}
            <div className="md:col-span-5 space-y-4">
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-xl font-black text-slate-900 dark:text-emerald-300">
                  {lastCompletedSale.invoiceNo}
                </p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Grand Total: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">₹{lastCompletedSale.grandTotal.toFixed(2)}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Billed To: {lastCompletedSale.customerName}
                </p>
              </div>

              {/* Print Theme Selector */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-emerald-500" />
                    Select Print Layout Theme
                  </span>
                  {!isCashier && (
                    <button
                      onClick={() => setIsPrintDesignerOpen(true)}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Settings2 className="w-3 h-3" /> Designer
                    </button>
                  )}
                </div>

                <select
                  value={selectedPrintLayoutId}
                  onChange={(e) => setSelectedPrintLayoutId(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
                >
                  {availablePrintLayouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.isDefault ? '⭐ [POS Default] ' : ''}{layout.name} ({layout.paperSize} - {layout.colorTheme.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    const selLayout = availablePrintLayouts.find((l) => l.id === selectedPrintLayoutId);
                    InvoicePrintService.printCustomLayout(lastCompletedSale, company, selLayout);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>PRINT BILL (SELECTED THEME)</span>
                </button>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => InvoicePrintService.printThermalReceipt(lastCompletedSale, company)}
                    className="p-2.5 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-800"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    <span>Thermal 80mm</span>
                  </button>
                  <button
                    onClick={() => InvoicePrintService.printA4Invoice(lastCompletedSale, company)}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Standard A4 Invoice</span>
                  </button>
                </div>

                <button
                  onClick={() => setLastCompletedSale(null)}
                  className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Close & Start Next Bill
                </button>
              </div>
            </div>

            {/* Right Column: Large High-Resolution Live Bill Preview */}
            <div className="md:col-span-7 bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-between shadow-xl min-h-[420px]">
              <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-400" /> High-Resolution Bill Print Preview
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Crisp Vector Rendering</span>
              </div>
              <div className="w-full h-[380px] bg-slate-950 p-2 my-2 rounded-xl overflow-auto custom-scrollbar flex justify-center items-start border border-slate-800 shadow-inner">
                <iframe
                  title="Bill High-Res Preview"
                  srcDoc={InvoicePrintService.generatePrintHTML(
                    lastCompletedSale,
                    company,
                    availablePrintLayouts.find((l) => l.id === selectedPrintLayoutId) || PrintLayoutService.getDefaultLayout()
                  )}
                  className="bg-white rounded border border-slate-700 transition-all duration-300"
                  style={{
                    width: '100%',
                    minHeight: '480px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  }}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Custom Service Charge Modal */}
      <Modal
        isOpen={isAddChargeModalOpen}
        onClose={() => setIsAddChargeModalOpen(false)}
        title="Add Additional Service Charge (अतिरिक्त सेवा शुल्क)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Add additional fees like Delivery, Labour, Packing, Technician Visit, or Fitting Charges with applicable GST rate.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
              Service Charge Type / Name
            </label>
            <input
              type="text"
              value={chargeName}
              onChange={(e) => setChargeName(e.target.value)}
              placeholder="e.g. Delivery Charge, Labour Fee, Packing Charge"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                Charge Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                GST Tax Rate (%)
              </label>
              <select
                value={chargeGstRate}
                onChange={(e) => setChargeGstRate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              >
                <option value="0">Exempt / 0% GST</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Standard Services)</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Base Amount:</span>
              <span className="font-bold">₹{(parseFloat(chargeAmount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>GST Tax ({chargeGstRate}%):</span>
              <span className="font-bold">
                +₹{(((parseFloat(chargeAmount) || 0) * (parseFloat(chargeGstRate) || 0)) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 dark:text-emerald-300 font-extrabold pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Total Charge to Bill:</span>
              <span>
                ₹
                {(
                  (parseFloat(chargeAmount) || 0) +
                  ((parseFloat(chargeAmount) || 0) * (parseFloat(chargeGstRate) || 0)) / 100
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAddChargeModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAddChargeSubmit}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Add to Invoice
            </button>
          </div>
        </div>
      </Modal>

      {/* Cash Drawer Galla Closing Modal */}
      <CashDrawerModal
        isOpen={isCashDrawerOpen}
        onClose={() => setIsCashDrawerOpen(false)}
        currentCounterName={activeCounter}
        cashierName={currentUser.name}
      />

      {/* Print Layout Designer Modal */}
      <PrintLayoutDesignerModal
        isOpen={isPrintDesignerOpen}
        onClose={() => {
          setIsPrintDesignerOpen(false);
          loadPrintLayouts();
        }}
        company={company}
        onLayoutSaved={loadPrintLayouts}
      />

      {/* Camera Barcode & QR Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        products={products}
        mode="pos"
        onScanProduct={(prod) => addToCart(prod)}
      />

      {/* Counter Security PIN Unlock Modal */}
      {targetCounterForPin && (
        <Modal
          isOpen={true}
          onClose={() => setTargetCounterForPin(null)}
          title={`Unlock Counter Security PIN - ${targetCounterForPin.name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleVerifyCounterPin} className="space-y-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-800 dark:text-emerald-300">
                <span>Target Counter:</span>
                <span>{targetCounterForPin.name} ({targetCounterForPin.code})</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Location:</span>
                <span>📍 {targetCounterForPin.location || 'Main Floor'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Assigned Cashier:</span>
                <span>👤 {targetCounterForPin.assignedCashierName}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                <span>Enter Counter PIN (काउंटर सुरक्षा पिन दर्ज करें)</span>
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                required
                value={enteredCounterPin}
                onChange={(e) => {
                  setEnteredCounterPin(e.target.value);
                  setCounterPinError('');
                }}
                placeholder="4-digit PIN (e.g. 1111)"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-center text-lg font-black tracking-widest text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
              />
              {counterPinError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1.5">{counterPinError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetCounterForPin(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock & Switch Counter</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Central Multi-Counter Shared Held Bills Modal */}
      {isSharedHeldBillsModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsSharedHeldBillsModalOpen(false)}
          title="Central Multi-Counter Shared Held Bills (होल्ड किए गए बिल की सूची)"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Bills held on any of the 5 counters appear here in real time. Pick up any bill to load into your active counter cart.
            </p>

            {centralHeldBills.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Held Bills Currently</h4>
                <p className="text-[11px] text-slate-400">Hold a bill on any counter and it will instantly show up here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                {centralHeldBills.map((hb) => {
                  const billTotal =
                    (hb.items || []).reduce((acc, item) => acc + (item.totalAmount || 0), 0) +
                    (hb.additionalCharges || []).reduce((acc, c) => acc + (c.totalAmount || 0), 0) -
                    (hb.discountOverall || 0);

                  return (
                    <div
                      key={hb.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800">
                            {hb.holdNumber}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-emerald-300">
                            {hb.counterName}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          👤 {hb.customerName} {hb.customerPhone ? `(${hb.customerPhone})` : ''}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>📦 {hb.items.length} items</span>
                          <span>🕒 {new Date(hb.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>👤 By: {hb.createdByName}</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 block font-semibold">HELD AMOUNT</span>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            ₹{billTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isCashier && (
                            <button
                              onClick={() => removeCentralHeldBill(hb.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => resumeCentralHeldBill(hb)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Resume Bill (बिल उठाएं)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
