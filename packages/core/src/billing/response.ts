import type { ExternalBillingRow, InternalBillingRow, TwyAccountingRow } from "./repository.js";

export type { ExternalBillingRow, InternalBillingRow, TwyAccountingRow };

export interface TwyAccountingResponse {
  rows: TwyAccountingRow[];
  total: number;
}

export interface ExternalBillingResponse {
  rows: ExternalBillingRow[];
}

export interface InternalBillingResponse {
  rows: InternalBillingRow[];
  total: number;
}
