import type { PaymentStatus } from "@twy/db";

export interface PaymentOrderInvoice {
  fileId: string;
  fileName: string;
}

export interface PaymentOrderResponse {
  id: string;
  loadId: string;
  referenceNumber: string;
  branchId: string;
  branchName: string;
  carrierId: string | null;
  carrierName: string | null;
  brokerReceivable: number | null;
  carrierPayable: number;
  serviceFee: number;
  incomePercentage: number | null;
  charges: number | null;
  chargeSide: "broker" | "carrier" | null;
  profit: number | null;
  carrierPaidAmount: number | null;
  carrierPaidDate: string | null;
  brokerReceivedAmount: number | null;
  brokerReceivedDate: string | null;
  invoices: PaymentOrderInvoice[];
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrderListResponse {
  paymentOrders: PaymentOrderResponse[];
  total: number;
}
