/**
 * Printable Receipt and Invoice Generator Service
 * Supports Custom Multicolor Themes, Thermal (80mm/58mm), A4/A5 Formats & Live Layout Previews
 */

import { Sale, Company, Party, KhataTransaction, Account } from '../types/erp';
import {
  PrintLayoutConfig,
  PRESET_COLOR_THEMES,
  PrintLayoutService
} from './printLayoutService';

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class InvoicePrintService {
  /**
   * Generates the complete HTML string for the printable invoice/receipt based on sale data and layout config
   */
  public static generatePrintHTML(sale: Sale, company: Company, layout: PrintLayoutConfig): string {
    const themeColors =
      layout.colorTheme === 'custom' && layout.customColors
        ? layout.customColors
        : (PRESET_COLOR_THEMES[layout.colorTheme] || PRESET_COLOR_THEMES.emerald).colors;

    const isThermal = layout.paperSize === 'Thermal80mm' || layout.paperSize === 'Thermal58mm';
    const isThermal58 = layout.paperSize === 'Thermal58mm';
    const isA5 = layout.paperSize === 'A5';

    // Paper width and padding
    let containerWidth = '100%';
    let padding = '25px';
    let fontSize = '13px';

    if (layout.paperSize === 'Thermal80mm') {
      containerWidth = '78mm';
      padding = '10px 6px';
      fontSize = '12px';
    } else if (layout.paperSize === 'Thermal58mm') {
      containerWidth = '54mm';
      padding = '6px 4px';
      fontSize = '11px';
    } else if (isA5) {
      padding = '18px';
      fontSize = '13px';
    }

    // Font Family selection
    let fontCSS = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    if (layout.fontFamily === 'serif') {
      fontCSS = "'Georgia', 'Times New Roman', serif";
    } else if (layout.fontFamily === 'mono') {
      fontCSS = "'Courier New', Courier, monospace";
    } else if (layout.fontFamily === 'segoe') {
      fontCSS = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    }

    // Items table HTML
    const itemsRows = (sale.items || [])
      .map((item, idx) => {
        const taxable = item.taxableAmount || (item.qty * item.unitPrice - item.discountAmount);
        const total = item.totalAmount || taxable;

        if (isThermal) {
          return `
            <tr style="border-bottom: 1px dashed ${themeColors.border};">
              <td style="padding: 4px 0; text-align: left;">
                <div style="font-weight: bold;">${escapeHtml(item.productName)}</div>
                ${layout.showGstBreakdown && item.hsnCode ? `<div style="font-size: 85%; opacity: 0.7;">HSN:${escapeHtml(item.hsnCode)}</div>` : ''}
              </td>
              <td style="padding: 4px 0; text-align: center; vertical-align: top;">${item.qty}</td>
              <td style="padding: 4px 0; text-align: right; vertical-align: top;">₹${item.unitPrice.toFixed(0)}</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; vertical-align: top;">₹${total.toFixed(0)}</td>
            </tr>
          `;
        }

        const isStriped = layout.tableStyle === 'striped' && idx % 2 === 1;
        const rowBg = isStriped ? themeColors.secondary : 'transparent';

        return `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid ${themeColors.border};">
            <td style="padding: 8px; text-align: center;">${idx + 1}</td>
            <td style="padding: 8px;">
              <div style="font-weight: bold; color: #111827;">${escapeHtml(item.productName)}</div>
              <div style="font-size: 11px; opacity: 0.75;">SKU: ${escapeHtml(item.sku)} ${item.hsnCode ? `| HSN: ${escapeHtml(item.hsnCode)}` : ''}</div>
            </td>
            <td style="padding: 8px; text-align: center;">${item.qty} ${escapeHtml(item.unit || 'Pcs')}</td>
            <td style="padding: 8px; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
            ${layout.showGstBreakdown ? `<td style="padding: 8px; text-align: right;">${item.gstRate}%</td>` : ''}
            <td style="padding: 8px; text-align: right;">₹${taxable.toFixed(2)}</td>
            <td style="padding: 8px; text-align: right; font-weight: bold; color: ${themeColors.textDark};">₹${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    // Table Header HTML
    let tableHeader = `
      <thead>
        <tr style="background-color: ${themeColors.headerBg}; color: ${themeColors.headerText};">
          <th style="padding: 8px; text-align: center; width: 35px;">#</th>
          <th style="padding: 8px; text-align: left;">Item Description</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Rate</th>
          ${layout.showGstBreakdown ? `<th style="padding: 8px; text-align: right;">GST</th>` : ''}
          <th style="padding: 8px; text-align: right;">Taxable</th>
          <th style="padding: 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
    `;

    if (isThermal) {
      tableHeader = `
        <thead>
          <tr style="border-bottom: 2px solid ${themeColors.primary}; font-weight: bold;">
            <th style="text-align: left; padding: 4px 0;">Item</th>
            <th style="text-align: center; padding: 4px 0;">Qty</th>
            <th style="text-align: right; padding: 4px 0;">Rate</th>
            <th style="text-align: right; padding: 4px 0;">Total</th>
          </tr>
        </thead>
      `;
    }

    // UPI Deep-Link String construction
    const upiVpa = company.upiId || layout.upiId || company.phone + '@upi' || 'apexenterprise@upi';
    const payAmount = (sale.dueAmount > 0 ? sale.dueAmount : sale.grandTotal || 0).toFixed(2);
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(company.upiPayeeName || company.name || 'Business')}&am=${payAmount}&tn=${encodeURIComponent(sale.invoiceNo)}&cu=INR`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

    // UPI QR Code Component HTML
    const upiQrBlockHTML = `
      <div style="border: 2px dashed ${themeColors.primary}; background: ${themeColors.secondary}; padding: 10px; border-radius: 8px; text-align: center; max-width: ${isThermal ? '100%' : '190px'}; margin: 10px ${isThermal ? 'auto' : '0'}; shadow: sm;">
        <div style="font-size: 10px; font-weight: 900; color: ${themeColors.textDark}; letter-spacing: 0.5px; text-transform: uppercase;">SCAN TO PAY VIA UPI</div>
        <div style="font-size: 9px; font-weight: bold; color: ${themeColors.primary}; margin-bottom: 4px;">GPay • PhonePe • Paytm • BHIM</div>
        <img src="${qrImageUrl}" alt="UPI QR Code" style="width: 120px; height: 120px; margin: 0 auto; display: block; border: 1px solid #E5E7EB; background: #FFF; padding: 4px; border-radius: 4px;" />
        <div style="font-size: 10px; font-weight: bold; color: ${themeColors.textDark}; margin-top: 4px;">Pay ₹${payAmount}</div>
        <div style="font-size: 8.5px; font-family: monospace; color: #4B5563; word-break: break-all; margin-bottom: 6px;">VPA: <b>${escapeHtml(upiVpa)}</b></div>
        <a href="${upiUri}" target="_blank" style="display: block; padding: 6px 8px; background: ${themeColors.primary}; color: #FFFFFF; font-size: 9.5px; font-weight: 900; text-decoration: none; border-radius: 4px; text-transform: uppercase; border: 1px solid ${themeColors.primary}; font-family: sans-serif;">
          🔗 Click PDF to Pay Online
        </a>
      </div>
    `;

    // Header Styles
    let headerHTML = '';

    if (layout.headerStyle === 'banner' && !isThermal) {
      headerHTML = `
        <div style="background-color: ${themeColors.headerBg}; color: ${themeColors.headerText}; padding: 18px 24px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">${escapeHtml(company.name)}</div>
            <div style="font-size: 11px; opacity: 0.9;">${escapeHtml(layout.tagline || company.legalName)}</div>
            <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">GSTIN: ${escapeHtml(company.gstin)} | Phone: ${escapeHtml(company.phone)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 6px; display: inline-block;">TAX INVOICE</div>
            <div style="font-size: 12px; margin-top: 6px;">#<b>${escapeHtml(sale.invoiceNo)}</b></div>
            <div style="font-size: 11px;">Date: ${new Date(sale.billedAt).toLocaleDateString()}</div>
          </div>
        </div>
      `;
    } else if (layout.headerStyle === 'modern' && !isThermal) {
      headerHTML = `
        <div style="display: flex; justify-content: space-between; border-bottom: 3px solid ${themeColors.primary}; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 22px; font-weight: 900; color: ${themeColors.textDark};">${escapeHtml(company.name)}</div>
            <div style="font-size: 12px; color: ${themeColors.primary}; font-weight: 600;">${escapeHtml(layout.tagline || 'Tax Invoice')}</div>
            <div style="font-size: 11px; color: #4B5563; margin-top: 4px;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}, ${escapeHtml(company.state)} - ${escapeHtml(company.pincode)}</div>
            <div style="font-size: 11px; color: #4B5563;"><b>GSTIN:</b> ${escapeHtml(company.gstin)} | Phone: ${escapeHtml(company.phone)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 24px; font-weight: 900; color: ${themeColors.primary};">TAX INVOICE</div>
            <div style="margin-top: 6px; font-size: 13px;"><b>Invoice No:</b> ${escapeHtml(sale.invoiceNo)}</div>
            <div style="font-size: 12px;"><b>Date:</b> ${new Date(sale.billedAt).toLocaleDateString()}</div>
            <div style="font-size: 11px; color: #6B7280;">Place of Supply: ${escapeHtml(company.state)}</div>
          </div>
        </div>
      `;
    } else if (isThermal) {
      headerHTML = `
        <div style="text-align: center; border-bottom: 2px solid ${themeColors.primary}; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="font-size: ${isThermal58 ? '13px' : '16px'}; font-weight: bold; color: ${themeColors.textDark};">${escapeHtml(company.name)}</div>
          <div style="font-size: 90%; color: #4B5563;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}</div>
          <div style="font-size: 85%; font-weight: bold;">GSTIN: ${escapeHtml(company.gstin)}</div>
          <div style="font-size: 85%;">Tel: ${escapeHtml(company.phone)}</div>
          <div style="margin-top: 4px; font-weight: bold; font-size: 110%; background: ${themeColors.secondary}; color: ${themeColors.textDark}; padding: 2px 0;">INVOICE: ${escapeHtml(sale.invoiceNo)}</div>
          <div style="font-size: 80%; margin-top: 2px;">Date: ${new Date(sale.billedAt).toLocaleString()}</div>
        </div>
      `;
    } else {
      // Classic layout
      headerHTML = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid ${themeColors.border}; padding-bottom: 15px;">
          <div style="font-size: 24px; font-weight: bold; color: ${themeColors.textDark};">${escapeHtml(company.name)}</div>
          <div style="font-size: 12px; color: #4B5563;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}, ${escapeHtml(company.state)}</div>
          <div style="font-size: 12px; font-weight: bold; color: ${themeColors.primary};">GSTIN: ${escapeHtml(company.gstin)} | Email: ${escapeHtml(company.email)}</div>
          <div style="margin-top: 10px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: ${themeColors.headerBg};">Retail Tax Invoice</div>
          <div style="font-size: 12px;">Invoice #: <b>${escapeHtml(sale.invoiceNo)}</b> | Date: <b>${new Date(sale.billedAt).toLocaleDateString()}</b></div>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${escapeHtml(sale.invoiceNo)} - ${escapeHtml(company.name)}</title>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: ${fontCSS};
            font-size: ${fontSize};
            color: #1F2937;
            background: #FFFFFF;
            margin: 0 auto;
            padding: ${padding};
            width: ${containerWidth};
            line-height: 1.4;
          }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          .box-container {
            background-color: ${themeColors.secondary};
            border: 1px solid ${themeColors.border};
            padding: 10px 14px;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .totals-box {
            width: ${isThermal ? '100%' : '320px'};
            margin-left: auto;
            background: ${themeColors.secondary};
            border: 1px solid ${themeColors.border};
            border-radius: 6px;
            overflow: hidden;
          }
          .totals-box td {
            padding: 5px 10px;
          }
          .grand-total-row {
            background-color: ${themeColors.primary};
            color: #FFFFFF;
            font-size: ${isThermal ? '12px' : '15px'};
            font-weight: bold;
          }
          .footer-note {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #6B7280;
            border-top: 1px solid ${themeColors.border};
            padding-top: 8px;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${headerHTML}

        <!-- Customer & Payment Metadata Grid -->
        ${
          !isThermal
            ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div class="box-container">
              <div style="font-size: 11px; font-weight: bold; color: ${themeColors.primary}; text-transform: uppercase;">Billed To (Customer):</div>
              <div style="font-size: 15px; font-weight: bold; color: ${themeColors.textDark}; margin-top: 2px;">${escapeHtml(sale.customerName)}</div>
              ${sale.customerGstin ? `<div style="font-size: 11px;">GSTIN: <b>${escapeHtml(sale.customerGstin)}</b></div>` : ''}
              ${sale.customerPhone ? `<div style="font-size: 11px;">Phone: ${escapeHtml(sale.customerPhone)}</div>` : ''}
            </div>
            <div class="box-container">
              <div style="font-size: 11px; font-weight: bold; color: ${themeColors.primary}; text-transform: uppercase;">Payment Details:</div>
              <div style="font-size: 13px;">Payment Mode: <b style="text-transform: uppercase; color: ${themeColors.textDark};">${escapeHtml(sale.paymentMode)}</b></div>
              <div style="font-size: 12px;">Status: <b style="color: ${themeColors.primary};">${escapeHtml((sale.status || 'COMPLETED').toUpperCase())}</b></div>
              ${sale.billedByName ? `<div style="font-size: 11px; color: #6B7280;">Cashier: ${escapeHtml(sale.billedByName)}</div>` : ''}
            </div>
          </div>
        `
            : `
          <div style="margin-bottom: 6px; font-size: 90%;">
            <div><b>Customer:</b> ${escapeHtml(sale.customerName)}</div>
            ${sale.customerPhone ? `<div><b>Phone:</b> ${escapeHtml(sale.customerPhone)}</div>` : ''}
            <div><b>Pay Mode:</b> ${escapeHtml((sale.paymentMode || '').toUpperCase())}</div>
          </div>
        `
        }

        <!-- Line Items Table -->
        <table>
          ${tableHeader}
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Totals & Terms & UPI QR -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px; flex-wrap: wrap;">
          <!-- Left Side: Terms & UPI QR Code -->
          <div style="flex: 1; min-width: 180px;">
            ${layout.showUpiQrCode ? upiQrBlockHTML : ''}

            ${
              layout.showTerms && layout.termsText
                ? `
              <div style="font-size: 11px; color: #4B5563; line-height: 1.3; margin-top: 8px;">
                <div style="font-weight: bold; color: ${themeColors.textDark}; font-size: 10px;">Terms & Conditions:</div>
                <div style="white-space: pre-line; font-size: 10px;">${escapeHtml(layout.termsText)}</div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Right Side: Totals Summary -->
          <table class="totals-box">
            <tr>
              <td>Subtotal (Items):</td>
              <td style="text-align: right; font-weight: bold;">₹${(sale.subtotal || 0).toFixed(2)}</td>
            </tr>
            ${
              sale.totalDiscount > 0
                ? `<tr><td>Discount:</td><td style="text-align: right; color: #DC2626;">-₹${(sale.totalDiscount || 0).toFixed(2)}</td></tr>`
                : ''
            }
            ${
              sale.additionalCharges && sale.additionalCharges.length > 0
                ? sale.additionalCharges
                    .map(
                      (ch) => `
              <tr style="color: #1E3A8A; font-size: 92%;">
                <td>${escapeHtml(ch.name)}${ch.gstRate > 0 ? ` (${ch.gstRate}% GST)` : ''}:</td>
                <td style="text-align: right; font-weight: bold;">+₹${(ch.totalAmount || ch.amount || 0).toFixed(2)}</td>
              </tr>
            `
                    )
                    .join('')
                : ''
            }
            ${
              layout.showGstBreakdown
                ? `
              <tr><td>Taxable Amount:</td><td style="text-align: right;">₹${(sale.totalTaxable || sale.subtotal || 0).toFixed(2)}</td></tr>
              <tr><td>CGST Tax:</td><td style="text-align: right;">₹${(sale.totalCgst || sale.totalTax / 2 || 0).toFixed(2)}</td></tr>
              <tr><td>SGST Tax:</td><td style="text-align: right;">₹${(sale.totalSgst || sale.totalTax / 2 || 0).toFixed(2)}</td></tr>
            `
                : `<tr><td>GST Tax:</td><td style="text-align: right;">₹${(sale.totalTax || 0).toFixed(2)}</td></tr>`
            }
            <tr class="grand-total-row">
              <td>Grand Total:</td>
              <td style="text-align: right; font-weight: 900;">₹${(sale.grandTotal || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Amount Paid:</td>
              <td style="text-align: right; font-weight: bold; color: ${themeColors.primary};">₹${(sale.paidAmount || 0).toFixed(2)}</td>
            </tr>
            ${
              sale.dueAmount > 0
                ? `<tr style="color: #DC2626; font-weight: bold;"><td>Due Balance:</td><td style="text-align: right;">₹${(sale.dueAmount || 0).toFixed(2)}</td></tr>`
                : ''
            }
          </table>
        </div>

        <!-- Bank Account & UPI Details Block -->
        ${
          !isThermal && (company.bankAccountNo || company.upiId)
            ? `
          <div style="margin-top: 15px; padding: 10px; background: #F8FAFC; border: 1px dashed ${themeColors.primary}; border-radius: 6px; font-size: 10.5px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-weight: bold; color: ${themeColors.primary}; text-transform: uppercase;">Dukaandar Bank & UPI Payment Details:</div>
              <a href="${upiUri}" target="_blank" style="display: inline-block; padding: 4px 10px; background: ${themeColors.primary}; color: #FFFFFF; font-size: 9.5px; font-weight: 900; text-decoration: none; border-radius: 4px; text-transform: uppercase; font-family: sans-serif;">
                💳 Click PDF Payment Link
              </a>
            </div>
            <div style="display: flex; gap: 18px; flex-wrap: wrap;">
              ${company.upiId ? `<div><b>UPI VPA:</b> ${escapeHtml(company.upiId)} (${escapeHtml(company.upiPayeeName || company.name)})</div>` : ''}
              ${company.bankName ? `<div><b>Bank:</b> ${escapeHtml(company.bankName)}</div>` : ''}
              ${company.bankAccountNo ? `<div><b>A/c No:</b> ${escapeHtml(company.bankAccountNo)}</div>` : ''}
              ${company.bankIfsc ? `<div><b>IFSC:</b> ${escapeHtml(company.bankIfsc)}</div>` : ''}
            </div>
          </div>
        `
            : ''
        }

        <!-- Signatures -->
        ${
          layout.showSignature && !isThermal
            ? `
          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px;">
            <div>
              <br/><br/>
              __________________________________<br/>
              Customer Signature
            </div>
            <div style="text-align: right;">
              For <b>${escapeHtml(company.name)}</b>
              <br/><br/>
              __________________________________<br/>
              Authorized Signatory
            </div>
          </div>
        `
            : ''
        }

        <!-- Footer Note -->
        <div class="footer-note">
          ${escapeHtml(layout.footerNote || 'Thank you for your business!')}
          <br/>
          <span style="font-size: 9px; opacity: 0.7;">Powered by Enterprise ERP Blueprint</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Helper function to execute print action via new window or fallback hidden iframe
   */
  private static executePrint(html: string): void {
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=950');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        return;
      }
    } catch (e) {
      console.warn('Pop-up window print blocked, triggering fallback print frame...', e);
    }

    // Fallback for sandboxed iframe environments where popups are restricted
    if (typeof document !== 'undefined') {
      let printFrame = document.getElementById('erp-print-fallback-frame') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'erp-print-fallback-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0px';
        printFrame.style.height = '0px';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }
      const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        }, 300);
      }
    }
  }

  /**
   * Opens print window with custom layout config
   */
  public static printCustomLayout(sale: Sale, company: Company, layoutConfig?: PrintLayoutConfig): void {
    const layout = layoutConfig || PrintLayoutService.getDefaultLayout();
    const html = this.generatePrintHTML(sale, company, layout);
    this.executePrint(html);
  }

  public static printThermalReceipt(sale: Sale, company: Company, customConfig?: PrintLayoutConfig): void {
    const defaultThermal = PrintLayoutService.getLayouts().find((l) => l.paperSize === 'Thermal80mm') || {
      ...PrintLayoutService.getDefaultLayout(),
      paperSize: 'Thermal80mm',
    };
    this.printCustomLayout(sale, company, customConfig || (defaultThermal as any));
  }

  public static printA4Invoice(sale: Sale, company: Company, customConfig?: PrintLayoutConfig): void {
    const defaultA4 = PrintLayoutService.getLayouts().find((l) => l.paperSize === 'A4') || PrintLayoutService.getDefaultLayout();
    this.printCustomLayout(sale, company, customConfig || defaultA4);
  }

  /**
   * Generates combined batch HTML for printing multiple invoices in a single printable document
   */
  public static generateBatchPrintHTML(sales: Sale[], company: Company, layout: PrintLayoutConfig): string {
    const fontCSS =
      layout.fontFamily === 'serif'
        ? "'Georgia', 'Times New Roman', serif"
        : layout.fontFamily === 'mono'
        ? "'Courier New', Courier, monospace"
        : "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    const pagesHtml = sales
      .map((sale, index) => {
        const isLast = index === sales.length - 1;
        const singleHtml = this.generatePrintHTML(sale, company, layout);
        const bodyMatch = singleHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        let bodyContent = bodyMatch ? bodyMatch[1] : singleHtml;
        // Strip auto-print scripts from individual pages so window.print runs once at the end
        bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');

        return `
          <div class="batch-invoice-page" style="${!isLast ? 'page-break-after: always; break-after: page;' : ''} padding-bottom: 20px;">
            ${bodyContent}
          </div>
        `;
      })
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Batch Invoices (${sales.length} Invoices) - ${escapeHtml(company.name)}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; background: #fff; }
            .batch-invoice-page { page-break-after: always; break-after: page; }
            .no-print { display: none !important; }
          }
          body { font-family: ${fontCSS}; background: #f8fafc; color: #1e293b; padding: 10px; }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Prints multiple selected sales invoices in a single batch print operation
   */
  public static printBatchInvoices(sales: Sale[], company: Company, customConfig?: PrintLayoutConfig): void {
    if (!sales || sales.length === 0) return;
    const layout = customConfig || PrintLayoutService.getLayouts().find((l) => l.paperSize === 'A4') || PrintLayoutService.getDefaultLayout();
    const html = this.generateBatchPrintHTML(sales, company, layout);
    this.executePrint(html);
  }

  /**
   * Prints a full A4 Account Ledger / Khata Statement for a party or vendor
   */
  public static printPartyLedger(party: Party, transactions: any[], company: Company): void {
    let totalCredit = 0;
    let totalDebit = 0;

    const rowsHtml = transactions
      .map((t, index) => {
        const dateVal = t.dateStr || t.date || t.createdAt || new Date().toISOString();
        const dateStr = new Date(dateVal).toLocaleDateString('en-IN');
        const timeStr = new Date(dateVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const voucherType = t.voucherType || (t.type === 'debit' ? 'RECEIPT (GOT)' : 'PAYMENT (GAVE)');
        const voucherNo = t.voucherNo || t.invoiceNo || `#${index + 1}`;
        const notes = t.notes || t.description || 'Khata Transaction';
        const mode = (t.mode || t.paymentMode || 'CASH').toUpperCase();

        const debitAmt = t.debit !== undefined ? t.debit : (t.type === 'debit' ? t.amount : 0);
        const creditAmt = t.credit !== undefined ? t.credit : (t.type === 'credit' ? t.amount : 0);

        totalDebit += debitAmt;
        totalCredit += creditAmt;

        const hasRunningBal = t.runningBalance !== undefined;

        return `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
          <td style="padding: 8px 6px; text-align: center; font-weight: bold; color: #64748B;">${index + 1}</td>
          <td style="padding: 8px 6px; font-family: monospace; font-weight: bold; color: #1E293B;">
            ${dateStr} <span style="font-size: 9px; color: #94A3B8; display: block;">${timeStr}</span>
          </td>
          <td style="padding: 8px 6px;">
            <span style="font-weight: 900; font-size: 9.5px; padding: 2px 6px; background: #F1F5F9; border-radius: 4px; border: 1px solid #CBD5E1; text-transform: uppercase; color: #0369A1;">
              ${escapeHtml(voucherType)}
            </span>
            <span style="font-family: monospace; font-weight: bold; font-size: 10px; color: #475569; margin-left: 4px;">
              ${escapeHtml(voucherNo)}
            </span>
          </td>
          <td style="padding: 8px 6px; font-weight: bold; color: #0F172A;">
            ${escapeHtml(notes)}
          </td>
          <td style="padding: 8px 6px; font-weight: 800; text-transform: uppercase; font-size: 10px; color: #475569;">${escapeHtml(mode)}</td>
          <td style="padding: 8px 6px; text-align: right; color: ${debitAmt > 0 ? '#16A34A' : '#94A3B8'}; font-weight: 900; font-family: monospace;">
            ${debitAmt > 0 ? '₹' + debitAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
          </td>
          <td style="padding: 8px 6px; text-align: right; color: ${creditAmt > 0 ? '#DC2626' : '#94A3B8'}; font-weight: 900; font-family: monospace;">
            ${creditAmt > 0 ? '₹' + creditAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
          </td>
          ${
            hasRunningBal
              ? `<td style="padding: 8px 6px; text-align: right; font-weight: 900; font-family: monospace; color: #0F172A;">
                  ₹${Math.abs(t.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  <span style="font-size: 9px; color: ${t.runningBalance > 0 ? '#DC2626' : '#16A34A'};">
                    ${t.runningBalance > 0 ? ' (Dr)' : ' (Cr)'}
                  </span>
                </td>`
              : ''
          }
        </tr>
      `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger Statement - ${escapeHtml(party.name)}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #0F172A; background: #FFF; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
          .company-name { font-size: 22px; font-weight: 900; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; }
          .party-card { background: #F8FAFC; border: 2px solid #CBD5E1; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #064E3B; color: #FDE047; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 10px 6px; text-align: left; letter-spacing: 0.5px; }
          .summary { background: #ECFDF5; border: 2px solid #10B981; border-radius: 12px; padding: 12px; display: flex; justify-content: space-around; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${escapeHtml(company.name)}</div>
            <div style="font-size: 11px; color: #334155; margin-top: 3px; font-weight: 500;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}</div>
            <div style="font-size: 11px; color: #334155; font-weight: 600;">Phone: ${escapeHtml(company.phone)} | GSTIN: ${escapeHtml(company.gstin || 'N/A')}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 900; color: #D97706; text-transform: uppercase;">PARTY STATEMENT OF ACCOUNT</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 3px; font-weight: bold;">Date Generated: ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div class="party-card">
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">PARTY / ACCOUNT DETAILS</div>
            <div style="font-size: 16px; font-weight: 900; color: #0F172A; margin-top: 2px;">${escapeHtml(party.name)} ${party.companyName ? `(${escapeHtml(party.companyName)})` : ''}</div>
            <div style="font-size: 11px; color: #1E293B; margin-top: 2px;">Phone: <b>${escapeHtml(party.phone)}</b> ${party.gstin ? `| GSTIN: <b>${escapeHtml(party.gstin)}</b>` : ''}</div>
          </div>
          <div style="text-align: right; border-left: 2px solid #CBD5E1; padding-left: 20px;">
            <div style="font-size: 9px; font-weight: 900; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">CURRENT LEDGER BALANCE</div>
            <div style="font-size: 22px; font-weight: 900; color: ${party.currentBalance > 0 ? '#E11D48' : '#059669'}; margin-top: 2px;">
              ₹${party.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style="font-size: 10px; font-weight: 900; color: ${party.currentBalance > 0 ? '#E11D48' : '#059669'};">
              ${party.currentBalance > 0 ? '(OUTSTANDING DUE)' : '(SETTLED / ADVANCE)'}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 95px;">Date & Time</th>
              <th style="width: 140px;">Voucher & Ref</th>
              <th>Particulars / Description</th>
              <th style="width: 75px;">Mode</th>
              <th style="width: 110px; text-align: right;">Debit (Gave ₹)</th>
              <th style="width: 110px; text-align: right;">Credit (Got ₹)</th>
              <th style="width: 120px; text-align: right;">Running Bal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align:center; padding: 25px; color: #64748B; font-weight: bold;">No ledger transactions recorded yet.</td></tr>`}
          </tbody>
        </table>

        <div class="summary">
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #064E3B; text-transform: uppercase;">TOTAL DEBITS</div>
            <div style="font-size: 16px; font-weight: 900; color: #16A34A;">₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #064E3B; text-transform: uppercase;">TOTAL CREDITS</div>
            <div style="font-size: 16px; font-weight: 900; color: #DC2626;">₹${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #064E3B; text-transform: uppercase;">CLOSING KHATA BALANCE</div>
            <div style="font-size: 16px; font-weight: 900; color: #0F172A;">₹${party.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px;">
          <div>
            <div style="font-weight: bold;">Computer Generated Khata Statement</div>
            <div style="color: #64748B;">Generated on ${new Date().toLocaleString()}</div>
          </div>
          <div style="text-align: center; border-top: 2px solid #64748B; width: 220px; padding-top: 5px; font-weight: 900; color: #0F172A;">
            Authorized Stamp & Signature
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    this.executePrint(html);
  }

  /**
   * Prints a full A4 Account Passbook / Bank & Cash Ledger Statement
   */
  public static printAccountLedger(
    account: Account,
    transactions: { date: string; voucherNo?: string; description: string; mode: string; type: 'credit' | 'debit'; amount: number; runningBalance?: number }[],
    company: Company
  ): void {
    let totalCredit = 0;
    let totalDebit = 0;
    transactions.forEach((t) => {
      if (t.type === 'credit') totalCredit += t.amount;
      if (t.type === 'debit') totalDebit += t.amount;
    });

    const rowsHtml = transactions
      .map((t, index) => {
        return `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
          <td style="padding: 8px 10px; font-weight: bold; color: #475569;">${index + 1}</td>
          <td style="padding: 8px 10px; font-family: monospace; font-weight: 600;">${new Date(t.date).toLocaleDateString()} ${new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td style="padding: 8px 10px; font-family: monospace; font-weight: bold; color: #0284C7; font-size: 10px;">${escapeHtml(t.voucherNo || '-')}</td>
          <td style="padding: 8px 10px; font-weight: bold; color: #0F172A;">
            ${escapeHtml(t.description || 'Account Transaction')}
          </td>
          <td style="padding: 8px 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; color: #475569;">${escapeHtml(t.mode)}</td>
          <td style="padding: 8px 10px; text-align: right; color: #16A34A; font-weight: 800;">${t.type === 'credit' ? '₹' + t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="padding: 8px 10px; text-align: right; color: #DC2626; font-weight: 800;">${t.type === 'debit' ? '₹' + t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 900; color: #0F172A;">${t.runningBalance !== undefined ? '₹' + t.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Account Passbook - ${escapeHtml(account.accountName)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 30px; color: #0F172A; background: #FFF; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .company-name { font-size: 22px; font-weight: 900; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; }
          .account-card { background: #F8FAFC; border: 2px solid #CBD5E1; border-radius: 12px; padding: 16px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #064E3B; color: #FDE047; font-size: 11px; font-weight: 900; text-transform: uppercase; padding: 10px 8px; text-align: left; letter-spacing: 0.5px; }
          .summary { background: #ECFDF5; border: 2px solid #10B981; border-radius: 12px; padding: 16px; display: flex; justify-content: space-around; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${escapeHtml(company.name)}</div>
            <div style="font-size: 12px; color: #334155; margin-top: 4px; font-weight: 500;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}</div>
            <div style="font-size: 12px; color: #334155; font-weight: 600;">Phone: ${escapeHtml(company.phone)} | GSTIN: ${escapeHtml(company.gstin || 'N/A')}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 900; color: #D97706; text-transform: uppercase;">ACCOUNT PASSBOOK STATEMENT</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px; font-weight: bold;">Date Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="account-card">
          <div>
            <div style="font-size: 10px; font-weight: 900; color: #059669; text-transform: uppercase;">ACCOUNT DETAILS</div>
            <div style="font-size: 18px; font-weight: 900; color: #0F172A; margin-top: 2px;">${escapeHtml(account.accountName)}</div>
            <div style="font-size: 12px; color: #1E293B; margin-top: 4px;">Type: <b>${escapeHtml(account.accountType.toUpperCase())}</b> ${account.accountNumber ? `| A/C No: <b>${escapeHtml(account.accountNumber)}</b>` : ''}</div>
          </div>
          <div style="text-align: right; border-left: 2px solid #CBD5E1; padding-left: 20px;">
            <div style="font-size: 10px; font-weight: 900; color: #059669; text-transform: uppercase;">CURRENT BOOK BALANCE</div>
            <div style="font-size: 24px; font-weight: 900; color: #059669; margin-top: 2px;">
              ₹${account.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="width: 120px;">Date & Time</th>
              <th style="width: 110px;">Voucher / Ref</th>
              <th>Particulars / Description</th>
              <th style="width: 70px;">Mode</th>
              <th style="width: 110px; text-align: right;">Deposit (+ ₹)</th>
              <th style="width: 110px; text-align: right;">Payout (- ₹)</th>
              <th style="width: 120px; text-align: right;">Running Bal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align:center; padding: 25px; color: #64748B; font-weight: bold;">No passbook transactions recorded yet.</td></tr>`}
          </tbody>
        </table>

        <div class="summary">
          <div>
            <div style="font-size: 10px; font-weight: 900; color: #064E3B; text-transform: uppercase;">TOTAL DEPOSITS (CREDIT)</div>
            <div style="font-size: 18px; font-weight: 900; color: #16A34A;">₹${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 900; color: #064E3B; text-transform: uppercase;">TOTAL PAYOUTS (DEBIT)</div>
            <div style="font-size: 18px; font-weight: 900; color: #DC2626;">₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 900; color: #064E3B; text-transform: uppercase;">NET BOOK BALANCE</div>
            <div style="font-size: 18px; font-weight: 900; color: #0F172A;">₹${account.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px;">
          <div>
            <div style="font-weight: bold;">Computer Generated Account Passbook</div>
            <div style="color: #64748B; font-size: 10px;">Generated on ${new Date().toLocaleString()}</div>
          </div>
          <div style="text-align: center; border-top: 2px solid #64748B; width: 220px; padding-top: 6px; font-weight: 900; color: #0F172A;">
            Authorized Stamp & Signature
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    this.executePrint(html);
  }

  /**
   * Prints the Master General Ledger statement in standard Cr/Dr accounting format
   */
  public static printMasterLedger(
    transactions: {
      date: string;
      voucherNo: string;
      voucherType: string;
      particulars: string;
      mode: string;
      debit: number;
      credit: number;
      balance: number;
      balanceType: 'Dr' | 'Cr';
    }[],
    company: Company,
    filterName: string = 'Master General Ledger (All Transactions)'
  ): void {
    let totalDebit = 0;
    let totalCredit = 0;

    const rowsHtml = transactions
      .map((t, idx) => {
        totalDebit += t.debit;
        totalCredit += t.credit;

        const dateStr = new Date(t.date).toLocaleDateString('en-IN');
        const timeStr = new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
          <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
            <td style="padding: 8px 6px; text-align: center; color: #64748B;">${idx + 1}</td>
            <td style="padding: 8px 6px; font-weight: bold; color: #1E293B;">
              ${dateStr} <span style="font-size: 9px; color: #94A3B8; display: block;">${timeStr}</span>
            </td>
            <td style="padding: 8px 6px;">
              <span style="font-weight: 800; font-size: 10px; padding: 2px 6px; background: #F1F5F9; border-radius: 4px; border: 1px solid #CBD5E1; text-transform: uppercase;">
                ${escapeHtml(t.voucherType)}
              </span>
            </td>
            <td style="padding: 8px 6px; font-family: monospace; font-weight: bold; color: #0284C7;">
              ${escapeHtml(t.voucherNo)}
            </td>
            <td style="padding: 8px 6px; font-weight: bold; color: #0F172A;">
              ${escapeHtml(t.particulars)}
            </td>
            <td style="padding: 8px 6px; text-transform: uppercase; font-size: 10px; color: #475569;">
              ${escapeHtml(t.mode)}
            </td>
            <td style="padding: 8px 6px; text-align: right; font-weight: 900; color: ${t.debit > 0 ? '#16A34A' : '#94A3B8'}; font-family: monospace;">
              ${t.debit > 0 ? '₹' + t.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
            </td>
            <td style="padding: 8px 6px; text-align: right; font-weight: 900; color: ${t.credit > 0 ? '#2563EB' : '#94A3B8'}; font-family: monospace;">
              ${t.credit > 0 ? '₹' + t.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
            </td>
            <td style="padding: 8px 6px; text-align: right; font-weight: 900; font-family: monospace; color: #0F172A;">
              ₹${Math.abs(t.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span style="font-size: 9px; padding: 1px 4px; background: ${t.balanceType === 'Dr' ? '#DCFCE7' : '#DBEAFE'}; color: ${t.balanceType === 'Dr' ? '#166534' : '#1E40AF'}; border-radius: 3px; margin-left: 2px;">
                ${t.balanceType}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>General Ledger (Dr/Cr) - ${escapeHtml(company.name)}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #0F172A; background: #FFF; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #064E3B; padding-bottom: 12px; margin-bottom: 15px; }
          .company-name { font-size: 22px; font-weight: 900; color: #064E3B; letter-spacing: -0.5px; }
          .title { font-size: 16px; font-weight: 900; color: #D97706; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #064E3B; color: #FDE047; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 10px 6px; text-align: left; letter-spacing: 0.5px; }
          .summary-bar { background: #F8FAFC; border: 2px solid #CBD5E1; border-radius: 10px; padding: 12px; display: flex; justify-content: space-around; text-align: center; margin-bottom: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${escapeHtml(company.name)}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 3px;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}</div>
            <div style="font-size: 11px; color: #475569; font-weight: bold;">Phone: ${escapeHtml(company.phone)} | GSTIN: ${escapeHtml(company.gstin || 'N/A')}</div>
          </div>
          <div style="text-align: right;">
            <div class="title">GENERAL MASTER LEDGER STATEMENT</div>
            <div style="font-size: 11px; font-weight: bold; color: #0369A1; margin-top: 3px;">${escapeHtml(filterName)}</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Generated on: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="summary-bar">
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #059669; text-transform: uppercase;">TOTAL DEBIT (Dr)</div>
            <div style="font-size: 16px; font-weight: 900; color: #16A34A; font-family: monospace;">₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #2563EB; text-transform: uppercase;">TOTAL CREDIT (Cr)</div>
            <div style="font-size: 16px; font-weight: 900; color: #2563EB; font-family: monospace;">₹${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #0F172A; text-transform: uppercase;">NET LEDGER BALANCE</div>
            <div style="font-size: 16px; font-weight: 900; color: #0F172A; font-family: monospace;">
              ₹${Math.abs(totalDebit - totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span style="font-size: 10px; color: ${totalDebit >= totalCredit ? '#166534' : '#1E40AF'};">${totalDebit >= totalCredit ? 'Dr' : 'Cr'}</span>
            </div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase;">TOTAL VOUCHERS</div>
            <div style="font-size: 16px; font-weight: 900; color: #0F172A;">${transactions.length} Entries</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 90px;">Date & Time</th>
              <th style="width: 100px;">Voucher Type</th>
              <th style="width: 110px;">Voucher No.</th>
              <th>Particulars / Transaction Account</th>
              <th style="width: 80px;">Mode</th>
              <th style="width: 110px; text-align: right;">Debit (Dr ₹)</th>
              <th style="width: 110px; text-align: right;">Credit (Cr ₹)</th>
              <th style="width: 120px; text-align: right;">Running Bal (Dr/Cr)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="9" style="text-align:center; padding: 25px; color: #64748B; font-weight: bold;">No ledger transactions found for the selected period.</td></tr>`}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px;">
          <div>
            <div style="font-weight: bold;">Computer Generated Audit Master Ledger</div>
            <div style="color: #64748B;">Generated on ${new Date().toLocaleString()}</div>
          </div>
          <div style="text-align: center; border-top: 2px solid #475569; width: 200px; padding-top: 5px; font-weight: 900;">
            Authorized Accountant / Director
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    this.executePrint(html);
  }

  /**
   * Print Official Bank Statement Report
   */
  public static printBankStatement(bankData: any[], company: Company, filterName: string = 'All Transactions'): void {
    const totalDeposit = bankData.reduce((acc, row) => acc + (row.Inflow_Deposit_Cr || 0), 0);
    const totalWithdrawal = bankData.reduce((acc, row) => acc + (row.Outflow_Withdrawal_Dr || 0), 0);
    const netBankBalance = bankData[0]?.Bank_Running_Balance || 0;

    const rowsHtml = bankData
      .map((row, idx) => `
        <tr style="border-bottom: 1px solid #E2E8F0; ${idx % 2 === 1 ? 'background-color: #F8FAFC;' : ''}">
          <td style="padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold;">${escapeHtml(row.Date)}</td>
          <td style="padding: 8px; font-family: monospace;">${escapeHtml(row.Voucher_No)}</td>
          <td style="padding: 8px;">
            <div style="font-weight: bold; color: #0F172A;">${escapeHtml(row.Particulars)}</div>
            <div style="font-size: 10px; color: #64748B;">Bank: ${escapeHtml(row.Bank_Name)} | Ref: ${escapeHtml(row.Notes || 'N/A')}</div>
          </td>
          <td style="padding: 8px; text-align: center;"><span style="background: #E0F2FE; color: #0369A1; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${escapeHtml(row.Payment_Mode)}</span></td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: #059669;">${row.Inflow_Deposit_Cr > 0 ? `₹${row.Inflow_Deposit_Cr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: #DC2626;">${row.Outflow_Withdrawal_Dr > 0 ? `₹${row.Outflow_Withdrawal_Dr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; font-family: monospace; color: #0284C7;">₹${(row.Bank_Running_Balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bank Statement - ${escapeHtml(company.name)}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #0F172A; background: #FFF; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0284C7; padding-bottom: 12px; margin-bottom: 15px; }
          .company-name { font-size: 22px; font-weight: 900; color: #0369A1; }
          .title { font-size: 16px; font-weight: 900; color: #0369A1; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background: #0369A1; color: #FFFFFF; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 8px; text-align: left; }
          .summary-bar { background: #F0F9FF; border: 2px solid #BAE6FD; border-radius: 10px; padding: 12px; display: flex; justify-content: space-around; text-align: center; margin-bottom: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${escapeHtml(company.name)}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 3px;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}</div>
            <div style="font-size: 11px; color: #475569; font-weight: bold;">A/C Holder: ${escapeHtml(company.bankAccountHolder || company.name)} | Bank: ${escapeHtml(company.bankName || 'N/A')}</div>
            <div style="font-size: 11px; color: #475569; font-family: monospace;">A/C No: ${escapeHtml(company.bankAccountNo || 'N/A')} | IFSC: ${escapeHtml(company.bankIfsc || 'N/A')}</div>
          </div>
          <div style="text-align: right;">
            <div class="title">OFFICIAL BANK STATEMENT</div>
            <div style="font-size: 11px; font-weight: bold; color: #0284C7; margin-top: 3px;">Filter: ${escapeHtml(filterName)}</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Generated on: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="summary-bar">
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #059669; text-transform: uppercase;">TOTAL DEPOSITS (Cr)</div>
            <div style="font-size: 16px; font-weight: 900; color: #059669; font-family: monospace;">₹${totalDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #DC2626; text-transform: uppercase;">TOTAL WITHDRAWALS (Dr)</div>
            <div style="font-size: 16px; font-weight: 900; color: #DC2626; font-family: monospace;">₹${totalWithdrawal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #0284C7; text-transform: uppercase;">CLOSING BANK BALANCE</div>
            <div style="font-size: 16px; font-weight: 900; color: #0284C7; font-family: monospace;">₹${netBankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase;">TOTAL TRANSACTIONS</div>
            <div style="font-size: 16px; font-weight: 900; color: #0F172A;">${bankData.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 80px;">Date</th>
              <th style="width: 100px;">Voucher No.</th>
              <th>Particulars & Account Details</th>
              <th style="width: 80px; text-align: center;">Mode</th>
              <th style="width: 110px; text-align: right;">Deposit (Cr ₹)</th>
              <th style="width: 110px; text-align: right;">Withdrawal (Dr ₹)</th>
              <th style="width: 120px; text-align: right;">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align:center; padding: 25px; color: #64748B;">No bank transactions found.</td></tr>`}
          </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px;">
          <div>Computer Generated Bank Statement | Verified by ${escapeHtml(company.name)}</div>
          <div style="border-top: 2px solid #0284C7; width: 180px; text-align: center; padding-top: 4px; font-weight: bold;">Authorized Signatory</div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    this.executePrint(html);
  }

  /**
   * Print Official Cash Statement / Cashbook Report
   */
  public static printCashStatement(cashData: any[], company: Company, filterName: string = 'All Transactions'): void {
    const totalInflow = cashData.reduce((acc, row) => acc + (row.Inflow_Receipt_Cr || 0), 0);
    const totalOutflow = cashData.reduce((acc, row) => acc + (row.Outflow_Payment_Dr || 0), 0);
    const netCashBalance = cashData[0]?.Cash_Running_Balance || 0;

    const rowsHtml = cashData
      .map((row, idx) => `
        <tr style="border-bottom: 1px solid #E2E8F0; ${idx % 2 === 1 ? 'background-color: #F8FAFC;' : ''}">
          <td style="padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold;">${escapeHtml(row.Date)}</td>
          <td style="padding: 8px; font-family: monospace;">${escapeHtml(row.Voucher_No)}</td>
          <td style="padding: 8px;">
            <div style="font-weight: bold; color: #0F172A;">${escapeHtml(row.Particulars)}</div>
            <div style="font-size: 10px; color: #64748B;">Category: ${escapeHtml(row.Category)} | By: ${escapeHtml(row.Recorded_By || 'Cashier')}</div>
          </td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: #059669;">${row.Inflow_Receipt_Cr > 0 ? `₹${row.Inflow_Receipt_Cr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: #DC2626;">${row.Outflow_Payment_Dr > 0 ? `₹${row.Outflow_Payment_Dr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; font-family: monospace; color: #059669;">₹${(row.Cash_Running_Balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cash Statement (Nagad Bahi) - ${escapeHtml(company.name)}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #0F172A; background: #FFF; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 15px; }
          .company-name { font-size: 22px; font-weight: 900; color: #047857; }
          .title { font-size: 16px; font-weight: 900; color: #047857; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background: #047857; color: #FFFFFF; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 8px; text-align: left; }
          .summary-bar { background: #ECFDF5; border: 2px solid #A7F3D0; border-radius: 10px; padding: 12px; display: flex; justify-content: space-around; text-align: center; margin-bottom: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${escapeHtml(company.name)}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 3px;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}</div>
            <div style="font-size: 11px; color: #475569; font-weight: bold;">Store Cash Register / Cash Galla Statement</div>
          </div>
          <div style="text-align: right;">
            <div class="title">OFFICIAL CASHBOOK STATEMENT (नगद बही)</div>
            <div style="font-size: 11px; font-weight: bold; color: #047857; margin-top: 3px;">Filter: ${escapeHtml(filterName)}</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Generated on: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="summary-bar">
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #059669; text-transform: uppercase;">TOTAL CASH INFLOW (Cr)</div>
            <div style="font-size: 16px; font-weight: 900; color: #059669; font-family: monospace;">₹${totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #DC2626; text-transform: uppercase;">TOTAL CASH OUTFLOW (Dr)</div>
            <div style="font-size: 16px; font-weight: 900; color: #DC2626; font-family: monospace;">₹${totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #047857; text-transform: uppercase;">CLOSING CASH IN GALLA</div>
            <div style="font-size: 16px; font-weight: 900; color: #047857; font-family: monospace;">₹${netCashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase;">TOTAL VOUCHERS</div>
            <div style="font-size: 16px; font-weight: 900; color: #0F172A;">${cashData.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 80px;">Date</th>
              <th style="width: 100px;">Voucher No.</th>
              <th>Particulars & Category</th>
              <th style="width: 110px; text-align: right;">Cash Inflow (Cr ₹)</th>
              <th style="width: 110px; text-align: right;">Cash Outflow (Dr ₹)</th>
              <th style="width: 120px; text-align: right;">Running Cash Bal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7" style="text-align:center; padding: 25px; color: #64748B;">No cash transactions found.</td></tr>`}
          </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px;">
          <div>Computer Generated Cash Statement | Verified by ${escapeHtml(company.name)}</div>
          <div style="border-top: 2px solid #047857; width: 180px; text-align: center; padding-top: 4px; font-weight: bold;">Authorized Cashier / Owner</div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    this.executePrint(html);
  }

  /**
   * Print Official Financial Statements (P&L & Balance Sheet)
   */
  public static printFinancialStatements(pnlData: any, balanceSheetData: any, company: Company): void {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Statements - ${escapeHtml(company.name)}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #0F172A; background: #FFF; font-size: 11px; }
          .header { text-align: center; border-bottom: 3px double #0F172A; padding-bottom: 10px; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px; }
          .title { font-size: 14px; font-weight: 900; color: #047857; text-transform: uppercase; margin-top: 4px; }
          .section-title { font-size: 12px; font-weight: 900; background: #0F172A; color: #FFF; padding: 6px 10px; margin-top: 15px; border-radius: 4px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 15px; }
          td, th { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; }
          .font-bold { font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: 900; background: #F1F5F9; border-top: 2px solid #0F172A; border-bottom: 2px solid #0F172A; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${escapeHtml(company.name)}</div>
          <div style="font-size: 11px; color: #475569;">${escapeHtml(company.address)}, ${escapeHtml(company.city)}, ${escapeHtml(company.state)}</div>
          <div style="font-size: 11px; font-weight: bold;">GSTIN: ${escapeHtml(company.gstin || 'UNREGISTERED')} | PAN: ${escapeHtml(company.pan || 'N/A')}</div>
          <div class="title">ANNUAL FINANCIAL STATEMENTS & BALANCE SHEET</div>
          <div style="font-size: 10px; color: #64748B;">For Financial Period Ending ${new Date().toLocaleDateString('en-IN')}</div>
        </div>

        <div class="section-title">1. STATEMENT OF PROFIT & LOSS</div>
        <table>
          <tbody>
            <tr>
              <td className="font-bold">Gross Sales Revenue</td>
              <td class="text-right font-bold" style="color: #059669;">₹${pnlData.grossSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Less: Cost of Goods Sold (COGS)</td>
              <td class="text-right">-₹${pnlData.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="total-row">
              <td>GROSS PROFIT</td>
              <td class="text-right" style="color: #047857;">₹${pnlData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Less: Total Operating Expenses</td>
              <td class="text-right" style="color: #DC2626;">-₹${pnlData.totalOperatingExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="total-row" style="background: #ECFDF5; font-size: 13px;">
              <td>NET OPERATING PROFIT</td>
              <td class="text-right" style="color: #047857;">₹${pnlData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. BALANCE SHEET STATEMENT</div>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1;">
            <div style="font-weight: 900; border-bottom: 2px solid #047857; padding-bottom: 4px; color: #047857;">ASSETS</div>
            <table>
              <tbody>
                <tr>
                  <td>Inventory Stock Valuation</td>
                  <td class="text-right font-bold">₹${balanceSheetData.stockValuation.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>Sundry Debtors (Customer Receivables)</td>
                  <td class="text-right font-bold">₹${balanceSheetData.customerDebtors.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>Cash & Bank Balances</td>
                  <td class="text-right font-bold">₹${balanceSheetData.cashAndBank.toLocaleString('en-IN')}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL ASSETS</td>
                  <td class="text-right" style="color: #047857;">₹${balanceSheetData.totalCurrentAssets.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="flex: 1;">
            <div style="font-weight: 900; border-bottom: 2px solid #DC2626; padding-bottom: 4px; color: #DC2626;">LIABILITIES & EQUITY</div>
            <table>
              <tbody>
                <tr>
                  <td>Sundry Creditors (Vendor Payables)</td>
                  <td class="text-right font-bold">₹${balanceSheetData.vendorPayables.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>Owner Capital & Retained Equity</td>
                  <td class="text-right font-bold">₹${balanceSheetData.netOwnerEquity.toLocaleString('en-IN')}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL LIABILITIES & EQUITY</td>
                  <td class="text-right" style="color: #0F172A;">₹${(balanceSheetData.vendorPayables + balanceSheetData.netOwnerEquity).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div>Computer Generated Audit Financial Statement</div>
            <div style="color: #64748B;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
          <div style="border-top: 2px solid #0F172A; width: 200px; text-align: center; padding-top: 4px; font-weight: bold;">
            Chartered Accountant / Managing Director
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    this.executePrint(html);
  }
}


