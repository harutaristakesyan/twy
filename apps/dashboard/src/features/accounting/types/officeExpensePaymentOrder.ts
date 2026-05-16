export type OfficeExpenseService =
  | "Salaries"
  | "Utilities"
  | "FuelCards"
  | "Internet"
  | "SoftwareSubscriptions"
  | "Taxes"
  | "Insurance"
  | "Bonuses"
  | "EquipmentPurchases";

export type OfficeExpensePaymentStatus =
  | "Pending"
  | "Approved"
  | "Paid"
  | "PartialPaid"
  | "Hold"
  | "Declined";

export type Currency = "USD" | "EUR" | "AMD";

export interface OfficeExpenseFile {
  fileId: string;
  fileName: string;
}

export interface OfficeExpensePaymentOrder {
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

export interface PaginatedOfficeExpenseResponse {
  orders: OfficeExpensePaymentOrder[];
  total: number;
}

export interface CreateOfficeExpenseDto {
  serviceName: OfficeExpenseService;
  paymentPurpose: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: Currency;
  fileIds?: string[];
}

export interface UpdateOfficeExpenseDto {
  serviceName?: OfficeExpenseService;
  paymentPurpose?: string;
  periodStart?: string;
  periodEnd?: string;
  amount?: number;
  currency?: Currency;
  paymentStatus?: OfficeExpensePaymentStatus;
  paymentMadeOn?: string | null;
}

export const SERVICE_LABELS: Record<OfficeExpenseService, string> = {
  Salaries: "Salaries",
  Utilities: "Utilities",
  FuelCards: "Fuel Cards",
  Internet: "Internet",
  SoftwareSubscriptions: "Software Subscriptions",
  Taxes: "Taxes",
  Insurance: "Insurance",
  Bonuses: "Bonuses",
  EquipmentPurchases: "Equipment Purchases",
};

export const OFFICE_EXPENSE_SERVICE_OPTIONS = (
  Object.entries(SERVICE_LABELS) as [OfficeExpenseService, string][]
).map(([value, label]) => ({ value, label }));

export const OFFICE_EXPENSE_STATUS_LABELS: Record<OfficeExpensePaymentStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Paid: "Paid",
  PartialPaid: "Partial Paid",
  Hold: "Hold",
  Declined: "Declined",
};

export const OFFICE_EXPENSE_STATUS_OPTIONS = (
  Object.entries(OFFICE_EXPENSE_STATUS_LABELS) as [OfficeExpensePaymentStatus, string][]
).map(([value, label]) => ({ value, label }));

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "AMD", label: "AMD" },
];
