import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Share2, QrCode, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react';

interface UpiQRCodeProps {
  upiId?: string;
  payeeName?: string;
  amount: number;
  invoiceNo?: string;
  companyName: string;
  note?: string;
  customerPhone?: string;
  size?: number;
}

export const UpiQRCode: React.FC<UpiQRCodeProps> = ({
  upiId,
  payeeName,
  amount,
  invoiceNo = '',
  companyName,
  note = 'Scan & Pay using any UPI app',
  customerPhone = '',
  size = 200,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeUpiId = upiId || 'apexenterprise@ybl';
  const activePayeeName = payeeName || companyName || 'Shop Keeper';
  const transactionNote = invoiceNo ? `Bill ${invoiceNo} at ${companyName}` : `Bill payment to ${companyName}`;

  // Standard NPCI UPI URI string
  const upiUrl = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(
    activePayeeName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  useEffect(() => {
    QRCode.toDataURL(upiUrl, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating UPI QR Code:', err));
  }, [upiUrl, size]);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(activeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `*Payment Request from ${companyName}*\n\n` +
      `Bill Amount: *₹${amount.toFixed(2)}*\n` +
      `Invoice No: ${invoiceNo || 'N/A'}\n` +
      `UPI ID: *${activeUpiId}*\n\n` +
      `Click link to pay directly in GPay / PhonePe / Paytm:\n${upiUrl}`;
    
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 p-4 rounded-2xl shadow-sm text-center space-y-3 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black text-slate-900 dark:text-emerald-400">Dynamic UPI QR Code</h4>
            <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{activePayeeName}</p>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> NPCI Verified
        </span>
      </div>

      {/* Amount Display */}
      <div className="py-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Amount Payable</p>
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {invoiceNo && <p className="text-[11px] font-mono text-slate-500">Ref: {invoiceNo}</p>}
      </div>

      {/* QR Code Graphic */}
      <div className="relative inline-block bg-white p-3 rounded-2xl border-2 border-emerald-500 shadow-md">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="UPI Payment QR Code" className="w-44 h-44 mx-auto rounded-lg" />
        ) : (
          <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
            Generating QR Code...
          </div>
        )}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded-md border border-slate-200 text-[10px] font-black text-slate-900 shadow-xs flex items-center gap-1">
          <Smartphone className="w-3 h-3 text-emerald-600" />
          <span>UPI</span>
        </div>
      </div>

      {/* UPI ID Info with Copy */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl flex items-center justify-between gap-2 text-xs">
        <div className="text-left overflow-hidden">
          <span className="text-[10px] text-slate-400 block font-bold uppercase">Payee VPA / UPI ID</span>
          <span className="font-mono font-bold text-slate-800 dark:text-emerald-300 truncate block">
            {activeUpiId}
          </span>
        </div>
        <button
          onClick={handleCopyUpiId}
          className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 text-[10px] font-bold flex items-center gap-1 shrink-0"
          title="Copy UPI ID"
        >
          {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedUpi ? 'Copied' : 'Copy ID'}</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <button
          onClick={handleCopyLink}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5 text-slate-500" />}
          <span>{copiedLink ? 'Link Copied' : 'Copy Pay Link'}</span>
        </button>

        <button
          onClick={handleShareWhatsApp}
          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Send WhatsApp</span>
        </button>
      </div>

      {/* Supported Payment Logos / Note */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{note}</p>
        <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-400 mt-1">
          <span className="text-indigo-600 dark:text-indigo-400">PhonePe</span> •
          <span className="text-blue-500">GPay</span> •
          <span className="text-cyan-600 dark:text-cyan-400">Paytm</span> •
          <span className="text-amber-600 dark:text-amber-400">BHIM</span>
        </div>
      </div>
    </div>
  );
};
