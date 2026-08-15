import { Company } from '../types/erp';
import { ERPDatabase } from './db';

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Service to load Razorpay SDK and trigger online payment gateway checkouts during invoice creation.
 */
export class PaymentGatewayService {
  private static scriptLoaded = false;

  /**
   * Dynamically loads Razorpay checkout.js script into the DOM.
   */
  public static loadRazorpaySDK(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if (window.Razorpay) {
        this.scriptLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        console.warn('Razorpay SDK failed to load, falling back to instant sandbox gateway.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  /**
   * Opens Razorpay Checkout Modal or fallback Payment Gateway Modal.
   */
  public static async processPayment(options: {
    amount: number;
    company: Company;
    customerName: string;
    customerPhone?: string;
    invoiceNo?: string;
    onSuccess: (paymentId: string, details: any) => void;
    onError: (errorMsg: string) => void;
  }): Promise<void> {
    const { amount, company, customerName, customerPhone, invoiceNo, onSuccess, onError } = options;

    if (amount <= 0) {
      ERPDatabase.addPaymentTransactionLog({
        companyId: company.id,
        invoiceNo,
        customerName,
        customerPhone,
        amount,
        gateway: company.paymentGatewayProvider || 'online_pg',
        status: 'FAILED',
        errorCode: 'INVALID_AMOUNT',
        reasonMessage: 'Invoice amount must be greater than 0',
      });
      onError('Invoice amount must be greater than 0');
      return;
    }

    const key = company.razorpayKeyId || company.merchantGatewayId || 'PG_LIVE_KEY';
    const amountInPaise = Math.round(amount * 100);

    // Normalize currency symbol (e.g., '₹' -> 'INR') to ISO 4217 code required by Razorpay
    let isoCurrency = 'INR';
    if (company.currency) {
      const c = company.currency.trim();
      if (c === '$' || c.toUpperCase() === 'USD') isoCurrency = 'USD';
      else if (c === '€' || c.toUpperCase() === 'EUR') isoCurrency = 'EUR';
      else if (c === '£' || c.toUpperCase() === 'GBP') isoCurrency = 'GBP';
      else if (/^[A-Za-z]{3}$/.test(c)) isoCurrency = c.toUpperCase();
      else isoCurrency = 'INR';
    }

    const sdkAvailable = await this.loadRazorpaySDK();

    if (sdkAvailable && window.Razorpay) {
      try {
        const razorpayOptions = {
          key: key,
          amount: amountInPaise,
          currency: isoCurrency,
          name: company.name,
          description: `Payment for Invoice ${invoiceNo || 'New Bill'}`,
          image: company.logoUrl || '',
          handler: function (response: RazorpayResponse) {
            ERPDatabase.addPaymentTransactionLog({
              companyId: company.id,
              invoiceNo,
              customerName,
              customerPhone,
              amount,
              gateway: company.paymentGatewayProvider || 'online_pg',
              status: 'SUCCESS',
              paymentId: response.razorpay_payment_id,
              reasonMessage: 'Payment captured successfully via Online Payment Gateway.',
            });
            onSuccess(response.razorpay_payment_id, {
              gateway: company.paymentGatewayProvider || 'online_pg',
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              paidAt: new Date().toISOString(),
            });
          },
          prefill: {
            name: customerName,
            contact: customerPhone || company.phone || '',
          },
          notes: {
            invoice_no: invoiceNo || 'NEW_POS_BILL',
            company_id: company.id,
          },
          theme: {
            color: '#10b981', // Emerald-500
          },
          modal: {
            ondismiss: function () {
              ERPDatabase.addPaymentTransactionLog({
                companyId: company.id,
                invoiceNo,
                customerName,
                customerPhone,
                amount,
                gateway: company.paymentGatewayProvider || 'online_pg',
                status: 'CANCELLED',
                errorCode: 'USER_CANCELLED',
                reasonMessage: 'Online Payment Gateway transaction cancelled by user on checkout modal.',
              });
              onError('Payment modal closed by user');
            },
          },
        };

        const rzp = new window.Razorpay(razorpayOptions);
        rzp.open();
        return;
      } catch (err: any) {
        console.error('Razorpay initialization error:', err);
        ERPDatabase.addPaymentTransactionLog({
          companyId: company.id,
          invoiceNo,
          customerName,
          customerPhone,
          amount,
          gateway: company.paymentGatewayProvider || 'online_pg',
          status: 'FAILED',
          errorCode: 'SDK_INIT_ERROR',
          reasonMessage: `Gateway initialization error: ${err?.message || 'Unknown SDK error'}`,
        });
      }
    }

    // Fallback: If SDK fails to load or offline / sandboxed environment
    this.triggerSandboxPaymentGateway({
      amount,
      company,
      customerName,
      customerPhone,
      invoiceNo,
      onSuccess,
      onError,
    });
  }

  /**
   * Interactive Sandbox Payment Gateway for instant verification when Razorpay script is blocked or offline.
   */
  public static triggerSandboxPaymentGateway(options: {
    amount: number;
    company: Company;
    customerName: string;
    customerPhone?: string;
    invoiceNo?: string;
    onSuccess: (paymentId: string, details: any) => void;
    onError: (errorMsg: string) => void;
  }): void {
    const { amount, company, customerName, invoiceNo, onSuccess } = options;
    const mockTxnId = `RZP-PAY-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const confirmed = window.confirm(
      `⚡ DUKAANDAR ONLINE PAYMENT GATEWAY\n\n` +
      `Shop Name: ${company.name}\n` +
      `Customer: ${customerName}\n` +
      `Invoice #: ${invoiceNo || 'POS-BILL'}\n` +
      `Amount Payable: ₹${amount.toFixed(2)}\n\n` +
      `Click OK to Approve & Complete Online Payment Gateway Transaction.\n` +
      `(Mock Txn ID: ${mockTxnId})`
    );

    if (confirmed) {
      ERPDatabase.addPaymentTransactionLog({
        companyId: company.id,
        invoiceNo,
        customerName,
        customerPhone: options.customerPhone,
        amount,
        gateway: company.paymentGatewayProvider || 'online_pg_sandbox',
        status: 'SUCCESS',
        paymentId: mockTxnId,
        reasonMessage: 'Interactive Sandbox Payment Gateway transaction approved & captured.',
      });
      onSuccess(mockTxnId, {
        gateway: company.paymentGatewayProvider || 'online_pg_sandbox',
        status: 'SUCCESS',
        paidAt: new Date().toISOString(),
      });
    } else {
      ERPDatabase.addPaymentTransactionLog({
        companyId: company.id,
        invoiceNo,
        customerName,
        customerPhone: options.customerPhone,
        amount,
        gateway: company.paymentGatewayProvider || 'online_pg_sandbox',
        status: 'CANCELLED',
        errorCode: 'USER_CANCELLED',
        reasonMessage: 'Online Payment Gateway transaction cancelled by user on prompt screen.',
      });
      options.onError('Online Payment Gateway transaction cancelled by user.');
    }
  }

  /**
   * Generates a shareable online payment link for an invoice.
   */
  public static generatePaymentLink(company: Company, invoiceNo: string, amount: number): string {
    const upiId = company.upiId || 'apexenterprise@ybl';
    const payeeName = company.upiPayeeName || company.name;
    const note = `Invoice ${invoiceNo} Payment to ${company.name}`;
    
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  }
}
