import type { MessageResponse } from "../shared/response.js";
import type { PaymentRecord } from "./repository.js";

export type { PaymentRecord };

export interface PaymentListResponse {
  payments: PaymentRecord[];
}

export interface RecordPaymentResponse extends MessageResponse {
  payment: PaymentRecord;
}
