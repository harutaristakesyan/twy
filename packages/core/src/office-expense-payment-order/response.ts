import type { Currency, OfficeExpensePaymentStatus, OfficeExpenseService } from "@twy/db";

export interface OfficeExpenseFile {
  fileId: string;
  fileName: string;
}

export interface OfficeExpensePaymentOrderResponse {
  id: string;
  serviceName: OfficeExpenseService;
  paymentPurpose: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: Currency;
  paymentStatus: OfficeExpensePaymentStatus;
  paymentMadeOn: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  files: OfficeExpenseFile[];
}

export interface OfficeExpensePaymentOrderListResponse {
  orders: OfficeExpensePaymentOrderResponse[];
  total: number;
}
