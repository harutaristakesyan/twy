import type { PaymentStatus } from "@twy/db";
import type { PaymentOrderInvoice } from "../payment-order/response.js";

// External Billing — excludes service fee / charges / income %

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

export interface ExternalBillingBranchListResponse {
  branches: ExternalBillingBranch[];
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
}

export interface ExternalBillingLoadListResponse {
  loads: ExternalBillingLoad[];
}

// Internal Billing — TWY income lens

export interface InternalBillingBranch {
  branchId: string;
  branchName: string;
  loadCount: number;
  totalServiceFee: number;
  totalCharges: number;
  avgIncomePercentage: number | null;
  totalProfit: number;
}

export interface InternalBillingBranchListResponse {
  branches: InternalBillingBranch[];
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
  invoices: PaymentOrderInvoice[];
}

export interface InternalBillingLoadListResponse {
  loads: InternalBillingLoad[];
}
