// KEEP IN SYNC WITH packages/core/src/file/constants.ts
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_BATCH_DELETE = 50;
/** Default cap; office-expense uses this and it matches MAX_FILE_IDS_PER_OFFICE_EXPENSE_CREATE. */
export const MAX_FILES_DEFAULT = 20;

export const ACCEPTED_MIME_GROUPS = {
  documents: ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"],
  spreadsheets: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"],
} as const;

export type DocumentCategory =
  | "rate_confirmation"
  | "pod"
  | "carrier_invoice"
  | "broker_invoice"
  | "other";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  rate_confirmation: "Rate Confirmation",
  pod: "Proof of Delivery",
  carrier_invoice: "Carrier Invoice",
  broker_invoice: "Broker Invoice",
  other: "Other",
};
