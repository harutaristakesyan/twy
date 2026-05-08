export type InvoiceType = "carrier" | "broker";
export type InvoiceStatus = "draft" | "sent" | "received" | "paid" | "overdue" | "void";
export type PaymentStatus = "pending" | "completed" | "failed";
export type DocumentCategory =
  | "rate_confirmation"
  | "pod"
  | "carrier_invoice"
  | "broker_invoice"
  | "other";

export interface InvoiceRecord {
  id: string;
  loadId: string;
  type: InvoiceType;
  amount: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  paymentTermDays: number;
  status: InvoiceStatus;
  fileId: string | null;
  lastReminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  method: string | null;
  reference: string | null;
  status: PaymentStatus;
  createdAt: string;
}

export interface BillingInvoiceSummary {
  id: string;
  type: InvoiceType;
  loadId: string;
  amount: number;
  dueAt: string;
  status: InvoiceStatus;
}

export interface TwyAccountingRow {
  loadId: string;
  referenceNumber: string;
  branchId: string;
  carrier: string | null;
  customerRate: number | null;
  carrierRate: number;
  serviceFee: number | null;
  incomePercentage: number | null;
  charges: number | null;
  profit: number | null;
  status: string;
  carrierInvoice: BillingInvoiceSummary | null;
  brokerInvoice: BillingInvoiceSummary | null;
}

export interface ExternalBillingRow {
  branchId: string;
  branchName: string;
  totalReceivable: number;
  totalPayable: number;
  balance: number;
}

export interface InternalBillingRow {
  loadId: string;
  referenceNumber: string;
  branchId: string;
  branchName: string;
  serviceFee: number | null;
  incomePercentage: number | null;
  charges: number | null;
  profit: number | null;
}
