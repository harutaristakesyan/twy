import type { MessageResponse } from "../shared/response.js";
import type { InvoiceRecord } from "./repository.js";

export type { InvoiceRecord };

export interface InvoiceListResponse {
  invoices: InvoiceRecord[];
}

export interface CreateInvoiceResponse extends MessageResponse {
  invoice: InvoiceRecord;
}
