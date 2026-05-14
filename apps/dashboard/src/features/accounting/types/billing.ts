import type { PaymentStatus } from "./paymentOrder";

export interface BillingInvoice {
  fileId: string;
  fileName: string;
}

// External Billing

export interface ExternalBillingBranch {
  branchId: string;
  branchName: string;
  loadCount: number;
  totalBrokerReceivable: number;
  totalBrokerReceived: number;
  totalCarrierPayable: number;
  totalCarrierPaid: number;
  owedToBranch: number;
}

export interface ExternalBillingLoad {
  loadId: string;
  referenceNumber: string;
  carrierName: string | null;
  brokerReceivable: number | null;
  brokerReceivedAmount: number | null;
  brokerReceivedDate: string | null;
  carrierPayable: number;
  carrierPaidAmount: number | null;
  carrierPaidDate: string | null;
  paymentStatus: PaymentStatus;
  createdByUserId: string | null;
  createdByUserName: string | null;
}

// Internal Billing

export interface InternalBillingBranch {
  branchId: string;
  branchName: string;
  loadCount: number;
  totalServiceFee: number;
  totalCharges: number;
  avgIncomePercentage: number | null;
  totalProfit: number;
}

export interface InternalBillingLoad {
  loadId: string;
  referenceNumber: string;
  carrierName: string | null;
  serviceFee: number;
  incomePercentage: number | null;
  charges: number | null;
  profit: number | null;
  paymentStatus: PaymentStatus;
  invoices: BillingInvoice[];
}
