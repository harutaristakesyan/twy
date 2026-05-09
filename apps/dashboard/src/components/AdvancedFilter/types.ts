export interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface AdvancedFilter {
  matchMode: "all" | "any";
  rules: FilterRule[];
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface FieldOption {
  label: string;
  value: string;
}

export type FieldType = "text" | "enum" | "number";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
}

// ── Quick filter fields (declarative, one control per field) ──────────────────

export type QuickFilterFieldType =
  | "search"
  | "select"
  | "multiSelect"
  | "dateRange"
  | "numberRange";

export interface QuickFilterField {
  key: string;
  label: string;
  type: QuickFilterFieldType;
  options?: FieldOption[];
  placeholder?: string;
}

export const TEXT_OPERATORS = [
  { label: "contains", value: "contains" },
  { label: "equals", value: "equals" },
  { label: "starts with", value: "starts_with" },
] as const;

export const ENUM_OPERATORS = [
  { label: "is", value: "is" },
  { label: "is not", value: "is_not" },
  { label: "is one of", value: "in" },
] as const;

export const NUMBER_OPERATORS = [
  { label: "=", value: "eq" },
  { label: ">", value: "gt" },
  { label: "<", value: "lt" },
  { label: "≥", value: "gte" },
  { label: "≤", value: "lte" },
] as const;
