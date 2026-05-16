export type PaymentStatus =
  | "Pending"
  | "Approved"
  | "Paid"
  | "PartialPaid"
  | "Hold"
  | "Declined"
  | "ReadyForInvoice";

export interface PaymentOrderInvoice {
  fileId: string;
  fileName: string;
}

export interface PaymentOrder {
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

export interface PaginatedPaymentOrdersResponse {
  paymentOrders: PaymentOrder[];
  total: number;
}

export interface UpdatePaymentOrderDto {
  paymentStatus?: PaymentStatus;
  carrierPaidAmount?: number | null;
  carrierPaidDate?: string | null;
  brokerReceivedAmount?: number | null;
  brokerReceivedDate?: string | null;
}
