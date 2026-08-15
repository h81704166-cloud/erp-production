import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  Volume2,
  VolumeX,
  Plus,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  ShoppingCart,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Product } from '../../types/erp';
import { Modal } from './Modal';

interface ScannedRecord {
  id: string;
  code: string;
  product?: Product;
  time: string;
  status: 'matched' | 'unmatched' | 'bulk_parsed';
  quantityAdded: number;
}

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  mode: 'pos' | 'inventory_bulk';
  onScanProduct?: (product: Product, quantity: number) => void;
  onBulkUpdateInventory?: (updates: { productId: string; newStockDelta: number }[]) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  products = [],
  mode,
  onScanProduct,
  onBulkUpdateInventory,
}) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<ScannedRecord[]>([]);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [flashFeedback, setFlashFeedback] = useState<'success' | 'error' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Bulk Inventory Staging State
  const [bulkPendingCounts, setBulkPendingCounts] = useState<{ [productId: string]: number }>({});

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastScanTimestampRef = useRef<number>(0);

  // Synthesize scan beep sound using Web Audio API
  const playBeep = (type: 'success' | 'error' = 'success') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type === 'success' ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(type === 'success' ? 880 : 300, ctx.currentTime);
      if (type === 'success') {
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio playback quiet fail
    }
  };

  // Find camera devices
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const camList = devices.map((d) => ({
            id: d.id,
            label: d.label || `Camera ${d.id.slice(0, 5)}...`,
          }));
          setCameras(camList);

          // Prefer back camera if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No camera devices detected on this device.');
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration error:', err);
        setCameraError('Unable to access camera permissions. Please allow camera access in browser settings.');
      });
  }, [isOpen]);

  // Start Scanner Stream
  const startScanner = async (cameraIdToUse?: string) => {
    setCameraError(null);
    const targetCam = cameraIdToUse || selectedCameraId;

    try {
      if (html5QrcodeRef.current) {
        await stopScanner();
      }

      const html5Qrcode = new Html5Qrcode('camera-reader-element', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      html5QrcodeRef.current = html5Qrcode;

      const cameraConfig = targetCam ? { deviceId: { exact: targetCam } } : { facingMode: 'environment' };

      await html5Qrcode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 260, height: 220 },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          handleCodeScanned(decodedText);
        },
        () => {
          // Frame match listening error (normal during scanning)
        }
      );

      setScannerActive(true);
    } catch (err: unknown) {
      console.error('Failed to start camera scanner:', err);
      setCameraError('Failed to initialize camera. Ensure camera permission is allowed.');
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setScannerActive(false);
  };

  useEffect(() => {
    if (isOpen && selectedCameraId && !scannerActive) {
      startScanner(selectedCameraId);
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  // Process Scanned Code
  const handleCodeScanned = (codeRaw: string) => {
    const code = codeRaw.trim();
    if (!code) return;

    // Debounce duplicate scans within 1.2 seconds to prevent rapid double-scanning
    const now = Date.now();
    if (lastScannedCode === code && now - lastScanTimestampRef.current < 1200) {
      return;
    }
    lastScanTimestampRef.current = now;
    setLastScannedCode(code);

    // Try parsing QR Bulk JSON format if scanned in bulk inventory mode
    if (mode === 'inventory_bulk' && (code.startsWith('{') || code.startsWith('['))) {
      try {
        const parsed = JSON.parse(code);
        const bulkItems: { barcode?: string; sku?: string; qty?: number }[] = Array.isArray(parsed)
          ? parsed
          : parsed.items || [parsed];

        let matchedCount = 0;
        const newBulkMap = { ...bulkPendingCounts };

        bulkItems.forEach((item) => {
          const match = products.find(
            (p) =>
              (item.barcode && p.barcode === item.barcode) ||
              (item.sku && p.sku?.toLowerCase() === item.sku.toLowerCase())
          );
          if (match) {
            const addQty = item.qty || 1;
            newBulkMap[match.id] = (newBulkMap[match.id] || 0) + addQty;
            matchedCount++;
          }
        });

        if (matchedCount > 0) {
          setBulkPendingCounts(newBulkMap);
          playBeep('success');
          triggerFlash('success');
          setScanHistory((prev) => [
            {
              id: Date.now().toString(),
              code: `QR Bulk (${matchedCount} items)`,
              time: new Date().toLocaleTimeString(),
              status: 'bulk_parsed',
              quantityAdded: matchedCount,
            },
            ...prev,
          ]);
          return;
        }
      } catch {
        // Not a JSON QR, fall through to regular barcode matching
      }
    }

    // Standard lookup by Barcode, SKU, or Product ID
    const matchedProduct = products.find(
      (p) =>
        p.barcode === code ||
        p.sku?.toLowerCase() === code.toLowerCase() ||
        p.id === code
    );

    const recordTime = new Date().toLocaleTimeString();

    if (matchedProduct) {
      playBeep('success');
      triggerFlash('success');

      if (mode === 'pos' && onScanProduct) {
        onScanProduct(matchedProduct, 1);
      } else if (mode === 'inventory_bulk') {
        setBulkPendingCounts((prev) => ({
          ...prev,
          [matchedProduct.id]: (prev[matchedProduct.id] || 0) + 1,
        }));
      }

      setScanHistory((prev) => [
        {
          id: Date.now().toString(),
          code,
          product: matchedProduct,
          time: recordTime,
          status: 'matched',
          quantityAdded: 1,
        },
        ...prev,
      ]);
    } else {
      playBeep('error');
      triggerFlash('error');

      setScanHistory((prev) => [
        {
          id: Date.now().toString(),
          code,
          time: recordTime,
          status: 'unmatched',
          quantityAdded: 0,
        },
        ...prev,
      ]);
    }
  };

  const triggerFlash = (type: 'success' | 'error') => {
    setFlashFeedback(type);
    setTimeout(() => {
      setFlashFeedback(null);
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleCodeScanned(manualCodeInput.trim());
    setManualCodeInput('');
  };

  const handleApplyBulkInventory = () => {
    if (!onBulkUpdateInventory) return;
    const updates = Object.entries(bulkPendingCounts).map(([productId, newStockDelta]) => ({
      productId,
      newStockDelta,
    }));

    if (updates.length === 0) return;

    onBulkUpdateInventory(updates);
    setBulkPendingCounts({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopScanner();
        onClose();
      }}
      title={
        mode === 'pos'
          ? 'Fast Camera Barcode & QR Billing Scanner'
          : 'Bulk Camera Inventory & Stock Updater'
      }
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  scannerActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  scannerActive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {scannerActive ? 'Camera Scanner Active' : 'Initializing Camera...'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Camera Select Dropdown */}
            {cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startScanner(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}

            {/* Restart Scanner */}
            <button
              onClick={() => startScanner()}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Restart Camera Stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart Camera</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}
              title={soundEnabled ? 'Mute Beep Audio' : 'Enable Beep Audio'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Camera Video & Scan Status / Bulk Staging */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Camera Viewfinder */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            <div
              className={`relative bg-slate-950 rounded-2xl overflow-hidden border-2 transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] shadow-inner ${
                flashFeedback === 'success'
                  ? 'border-emerald-500 ring-4 ring-emerald-500/30'
                  : flashFeedback === 'error'
                  ? 'border-rose-500 ring-4 ring-rose-500/30'
                  : 'border-slate-800'
              }`}
            >
              {/* HTML5 QR Code Mount Element */}
              <div id="camera-reader-element" className="w-full h-full min-h-[280px]"></div>

              {/* Laser Scan Animation Overlay */}
              {scannerActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                  <div className="w-64 h-48 border-2 border-dashed border-emerald-400/80 rounded-xl relative overflow-hidden flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_15px_#10b981]"></div>
                  </div>
                  <div className="mt-3 px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-emerald-500/30 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
                    <span>Align Barcode / QR code inside frame</span>
                  </div>
                </div>
              )}

              {/* Visual Flash Feedback Overlay */}
              {flashFeedback && (
                <div
                  className={`absolute inset-0 flex items-center justify-center backdrop-blur-xs transition-opacity ${
                    flashFeedback === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-current shadow-xl flex items-center gap-2 text-sm font-black">
                    {flashFeedback === 'success' ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        <span>SCANNED & ADDED!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-6 h-6 text-rose-400" />
                        <span>ITEM NOT FOUND</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message if Camera Access Fails */}
              {cameraError && (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                  <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                  <button
                    onClick={() => startScanner()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Retry Camera Access
                  </button>
                </div>
              )}
            </div>

            {/* Manual Barcode / SKU Keyboard Fallback Input */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  placeholder="Or enter barcode / SKU manually..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>Process</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Right Column (5 cols): Live Scan History & Bulk Queue */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            {/* Mode-Specific Status Header */}
            {mode === 'inventory_bulk' ? (
              <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Layers className="w-4 h-4" />
                    <span>Pending Bulk Stock Queue</span>
                  </div>
                  <span className="text-xs font-black text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-700">
                    {Object.values(bulkPendingCounts).reduce((a: number, b: number) => a + b, 0)} Items
                  </span>
                </div>

                {Object.keys(bulkPendingCounts).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Scan items continuously to increment stock quantities, then click "Apply Bulk Stock Update".
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {Object.entries(bulkPendingCounts).map(([prodId, qty]) => {
                      const prod = products.find((p) => p.id === prodId);
                      return (
                        <div
                          key={prodId}
                          className="flex items-center justify-between text-xs p-2 bg-slate-900/80 border border-slate-800 rounded-xl"
                        >
                          <span className="font-semibold text-slate-200 truncate max-w-[160px]">
                            {prod?.name || prodId}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">+{qty} Stock</span>
                            <button
                              onClick={() => {
                                const copy = { ...bulkPendingCounts };
                                delete copy[prodId];
                                setBulkPendingCounts(copy);
                              }}
                              className="text-rose-400 hover:text-rose-300 text-xs px-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={handleApplyBulkInventory}
                  disabled={Object.keys(bulkPendingCounts).length === 0}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Apply Bulk Stock Update</span>
                </button>
              </div>
            ) : (
              <div className="bg-indigo-950/30 border border-indigo-900/60 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-300">Fast POS Billing Mode Active</h4>
                  <p className="text-[11px] text-slate-400">
                    Items are instantaneously added directly to your POS cart on scan!
                  </p>
                </div>
              </div>
            )}

            {/* Scan History Log */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 min-h-[220px]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recent Scan History</span>
                </h4>
                {scanHistory.length > 0 && (
                  <button
                    onClick={() => setScanHistory([])}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              {scanHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Camera className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs">No barcodes scanned yet.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Point device camera at any product barcode or QR code.</p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {scanHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                        rec.status === 'matched' || rec.status === 'bulk_parsed'
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[200px]">
                        <div className="font-bold truncate">
                          {rec.product ? rec.product.name : rec.code}
                        </div>
                        <div className="text-[10px] opacity-80 flex items-center gap-2">
                          <span>Code: {rec.code}</span>
                          <span>•</span>
                          <span>{rec.time}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        {rec.status === 'matched' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-900/60 text-emerald-300 text-[10px] font-bold border border-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>+1 Added</span>
                          </span>
                        ) : rec.status === 'bulk_parsed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-900/60 text-indigo-300 text-[10px] font-bold border border-indigo-700">
                            <Layers className="w-3 h-3" />
                            <span>{rec.quantityAdded} Items</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-900/60 text-rose-300 text-[10px] font-bold border border-rose-700">
                            <AlertCircle className="w-3 h-3" />
                            <span>Unrecognized</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
