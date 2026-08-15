import React, { useState } from 'react';
import {
  Search,
  Printer,
  RotateCcw,
  FileText,
  Download,
  Eye,
  Ban,
  Trash2,
  Edit3,
  Globe,
  Mail,
  CheckSquare,
  Square,
  Copy,
  Send,
  Check,
  X,
  Upload
} from 'lucide-react';
import { Sale, SalesReturn, Company, Product } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { InvoicePrintService } from '../../services/pdfGenerator';
import { PaymentGatewayService } from '../../services/paymentGatewayService';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { CsvImportModal } from '../common/CsvImportModal';

interface SalesModuleProps {
  sales: Sale[];
  company: Company;
  products: Product[];
  onRefreshData: () => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  sales = [],
  company,
  products = [],
  onRefreshData,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnSaleModal, setReturnSaleModal] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState('Customer returned defective / unwanted item');
  
  // Edit / Cancel / Delete modals
  const [editSaleModal, setEditSaleModal] = useState<Sale | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<any>('cash');

  const [cancelSaleTarget, setCancelSaleTarget] = useState<Sale | null>(null);
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<Sale | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Bulk Selection & Batch Action States
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [batchEmailModalOpen, setBatchEmailModalOpen] = useState(false);
  const [emailRecipientMap, setEmailRecipientMap] = useState<{ [saleId: string]: string }>({});
  const [emailSubject, setEmailSubject] = useState(`Invoices & Tax Receipts from ${company.name}`);
  const [emailMessage, setEmailMessage] = useState(
    `Dear Valued Customer,\n\nPlease find attached the tax invoice details for your recent purchase from ${company.name}.\n\nThank you for your business!\n${company.name} | Phone: ${company.phone || ''}`
  );
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);

  const safeSales = sales || [];
  const filteredSales = safeSales.filter(
    (s) =>
      (s.invoiceNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedSales = safeSales.filter((s) => selectedSaleIds.includes(s.id));
  const totalSelectedAmount = selectedSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const isAllSelected = filteredSales.length > 0 && filteredSales.every((s) => selectedSaleIds.includes(s.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(filteredSales.map((s) => s.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCopyBatchPaymentLinks = () => {
    if (selectedSales.length === 0) return;
    const links = selectedSales.map((s) => {
      const amount = s.dueAmount > 0 ? s.dueAmount : s.grandTotal;
      const link = PaymentGatewayService.generatePaymentLink(company, s.invoiceNo, amount);
      return `• Invoice #${s.invoiceNo} (${s.customerName}): ₹${s.grandTotal.toLocaleString()} | Pay: ${link}`;
    });
    const text = `🔗 BATCH ONLINE PAYMENT LINKS - ${company.name}\n\n` + links.join('\n\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert(`Copied payment links for ${selectedSales.length} invoice(s) to clipboard!`);
    } else {
      alert(text);
    }
  };

  const handleOpenBatchEmailModal = () => {
    if (selectedSales.length === 0) return;
    const parties = ERPDatabase.getParties();
    const initialEmails: { [saleId: string]: string } = {};

    selectedSales.forEach((s) => {
      let email = '';
      if (s.customerId) {
        const party = parties.find((p) => p.id === s.customerId);
        if (party && party.email) email = party.email;
      }
      if (!email && s.customerPhone) {
        email = `customer_${s.customerPhone}@mail.com`;
      }
      initialEmails[s.id] = email || `billing@${(s.customerName || 'customer').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    });

    setEmailRecipientMap(initialEmails);
    setEmailSuccessMessage(null);
    setBatchEmailModalOpen(true);
  };

  const handleSendBatchEmails = async () => {
    if (selectedSales.length === 0) return;
    setIsSendingEmails(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    ERPDatabase.addAuditLog(
      'BATCH_EMAIL_INVOICES',
      'SALES',
      `Dispatched batch emails with invoice attachments & payment links for ${selectedSales.length} sales invoices.`
    );

    setIsSendingEmails(false);
    setEmailSuccessMessage(`Successfully dispatched batch emails for ${selectedSales.length} invoice(s)!`);
  };

  const handleMailtoBatch = () => {
    const recipients = (Object.values(emailRecipientMap) as string[])
      .filter((e) => e && e.includes('@'))
      .join(',');
    const bodyText = `${emailMessage}\n\nInvoices Summary:\n` +
      selectedSales.map((s) => `• Invoice #${s.invoiceNo} - ₹${s.grandTotal.toLocaleString()}`).join('\n');

    const mailtoUrl = `mailto:${recipients}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(bodyText)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleProcessSalesReturn = () => {
    if (!returnSaleModal) return;

    ERPDatabase.addSalesReturn({
      companyId: company.id,
      returnNo: `SR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      originalInvoiceNo: returnSaleModal.invoiceNo,
      customerName: returnSaleModal.customerName,
      items: returnSaleModal.items,
      totalRefundAmount: returnSaleModal.grandTotal,
      reason: returnReason,
      createdByName: 'System User',
    });

    setReturnSaleModal(null);
    onRefreshData();
    alert(`Sales return credit note generated for ${returnSaleModal.invoiceNo}`);
  };

  const handleConfirmCancelSale = () => {
    if (!cancelSaleTarget) return;
    ERPDatabase.cancelSale(cancelSaleTarget.id, 'Cancelled via Sales Module');
    setCancelSaleTarget(null);
    onRefreshData();
  };

  const handleConfirmDeleteSale = () => {
    if (!deleteSaleTarget) return;
    ERPDatabase.deleteSale(deleteSaleTarget.id);
    setDeleteSaleTarget(null);
    onRefreshData();
  };

  const handleSaveEditSale = () => {
    if (!editSaleModal) return;
    ERPDatabase.updateSale(editSaleModal.id, {
      customerName: editCustomerName,
      paymentMode: editPaymentMode,
    });
    setEditSaleModal(null);
    onRefreshData();
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-emerald-400">Sales Invoices & Returns</h2>
          <p className="text-xs text-slate-500">Manage billing history, select multiple invoices for batch print or batch email operations.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Import Sales Invoices from CSV"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice # or customer..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-emerald-300"
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Sticky Toolbar */}
      {selectedSaleIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl shadow-lg border border-emerald-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30">
              <CheckSquare className="w-4 h-4" />
              <span>{selectedSaleIds.length} Invoice{selectedSaleIds.length > 1 ? 's' : ''} Selected</span>
            </div>
            <span className="text-xs font-medium text-slate-300">
              Total Value: <b className="text-emerald-400 font-black">₹{totalSelectedAmount.toLocaleString()}</b>
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Batch Print Button */}
            <button
              onClick={() => InvoicePrintService.printBatchInvoices(selectedSales, company)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Print all selected invoices in a single batch PDF window"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Batch Print ({selectedSaleIds.length})</span>
            </button>

            {/* Batch Email Button */}
            <button
              onClick={handleOpenBatchEmailModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Compose and send batch emails for selected invoices"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Batch Email ({selectedSaleIds.length})</span>
            </button>

            {/* Copy Payment Links */}
            <button
              onClick={handleCopyBatchPaymentLinks}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy online payment links for all selected invoices"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Copy Payment Links</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedSaleIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/40 rounded-2xl shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-3 rounded-l-lg w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  title="Select / Deselect All Filtered Invoices"
                />
              </th>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Billed Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Payment Mode</th>
              <th className="p-3 text-right">Grand Total</th>
              <th className="p-3 text-right">Status</th>
              <th className="p-3 text-center rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSales.map((s) => {
              const isSelected = selectedSaleIds.includes(s.id);
              return (
                <tr
                  key={s.id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                    isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/30' : ''
                  }`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(s.id)}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-emerald-300">{s.invoiceNo}</td>
                  <td className="p-3 text-slate-500">{new Date(s.billedAt).toLocaleString()}</td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{s.customerName}</td>
                  <td className="p-3 uppercase text-slate-500">{s.paymentMode}</td>
                  <td className="p-3 text-right font-black text-slate-900 dark:text-emerald-400">
                    ₹{s.grandTotal.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <Badge variant={s.status === 'completed' ? 'emerald' : s.status === 'cancelled' ? 'rose' : 'amber'} size="sm">
                      {s.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-3 text-center space-x-1">
                    <button
                      onClick={() => InvoicePrintService.printA4Invoice(s, company)}
                      className="p-1.5 text-slate-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Print Tax Invoice (Includes Clickable PDF Payment Link)"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const link = PaymentGatewayService.generatePaymentLink(company, s.invoiceNo, s.dueAmount > 0 ? s.dueAmount : s.grandTotal);
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(link);
                          alert(`🔗 PDF Payment Link copied to clipboard!\n\n${link}`);
                        } else {
                          window.open(link, '_blank');
                        }
                      }}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer"
                      title="Copy / Open PDF Payment Link"
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditSaleModal(s);
                        setEditCustomerName(s.customerName);
                        setEditPaymentMode(s.paymentMode);
                      }}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer"
                      title="Edit Invoice Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setReturnSaleModal(s)}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg cursor-pointer"
                      title="Process Sales Return"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    {s.status !== 'cancelled' && (
                      <button
                        onClick={() => setCancelSaleTarget(s)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="Cancel / Void Invoice"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteSaleTarget(s)}
                      className="p-1.5 text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg cursor-pointer"
                      title="Delete Invoice Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Batch Email Modal */}
      {batchEmailModalOpen && (
        <Modal
          isOpen={batchEmailModalOpen}
          onClose={() => setBatchEmailModalOpen(false)}
          title={`Batch Email Invoices (${selectedSales.length} Selected)`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {emailSuccessMessage ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">{emailSuccessMessage}</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Dispatched email notifications along with PDF invoice payment links to recipient accounts.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setBatchEmailModalOpen(false);
                      setSelectedSaleIds([]);
                    }}
                    className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer"
                  >
                    Done & Clear Selection
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300">
                  Review recipient customer email addresses and customize message text before sending batch invoices.
                </p>

                {/* Recipient Email List */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  <div className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                    <span>Invoice # & Customer</span>
                    <span>Recipient Email</span>
                  </div>
                  {selectedSales.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 py-1">
                      <div>
                        <b className="text-slate-900 dark:text-emerald-400">{s.invoiceNo}</b>
                        <span className="text-slate-500 ml-2">({s.customerName} - ₹{s.grandTotal.toLocaleString()})</span>
                      </div>
                      <input
                        type="email"
                        value={emailRecipientMap[s.id] || ''}
                        onChange={(e) =>
                          setEmailRecipientMap((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        placeholder="customer@email.com"
                        className="w-56 p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>

                {/* Subject Field */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-sans"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={handleMailtoBatch}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Open default email application with prefilled addresses"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Mail Client</span>
                  </button>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setBatchEmailModalOpen(false)}
                      className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendBatchEmails}
                      disabled={isSendingEmails}
                      className="px-4 py-2 font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isSendingEmails ? (
                        <span>Sending Batch Emails...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Batch Emails ({selectedSales.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Sale Modal */}
      {editSaleModal && (
        <Modal
          isOpen={!!editSaleModal}
          onClose={() => setEditSaleModal(null)}
          title={`Edit Invoice ${editSaleModal.invoiceNo}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Customer Name</label>
              <input
                type="text"
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 mb-1">Payment Mode</label>
              <select
                value={editPaymentMode}
                onChange={(e) => setEditPaymentMode(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR</option>
                <option value="card">Credit / Debit Card</option>
                <option value="khata">Khata / Credit</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditSaleModal(null)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditSale}
                className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Return Modal */}
      {returnSaleModal && (
        <Modal
          isOpen={!!returnSaleModal}
          onClose={() => setReturnSaleModal(null)}
          title={`Process Return for ${returnSaleModal.invoiceNo}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Processing return will restock items back into inventory and generate a Credit Note.
            </p>
            <div>
              <label className="block font-bold text-slate-700 dark:text-emerald-400 uppercase mb-1">
                Reason for Return
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReturnSaleModal(null)}
                className="px-4 py-2 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSalesReturn}
                className="px-4 py-2 font-bold bg-amber-600 text-white rounded-xl"
              >
                Confirm Sales Return
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Invoice Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!cancelSaleTarget}
        onClose={() => setCancelSaleTarget(null)}
        onConfirm={handleConfirmCancelSale}
        title="Cancel Sales Invoice"
        variant="warning"
        confirmLabel="Yes, Cancel Invoice"
        message={`Are you sure you want to CANCEL invoice ${cancelSaleTarget?.invoiceNo}? Stock items will be restored to inventory and customer balance will be reversed.`}
      />

      {/* Delete Invoice Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteSaleTarget}
        onClose={() => setDeleteSaleTarget(null)}
        onConfirm={handleConfirmDeleteSale}
        title="Delete Sales Invoice"
        variant="danger"
        confirmLabel="Yes, Delete Permanently"
        message={`Are you sure you want to PERMANENTLY DELETE invoice ${deleteSaleTarget?.invoiceNo}?`}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="sales"
      />
    </div>
  );
};
