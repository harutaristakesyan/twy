export type Filter = Record<string, string>;

export interface FieldOption {
  label: string;
  value: string;
}

export type FilterFieldType = "select" | "multiSelect" | "dateRange" | "numberRange";

export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: FieldOption[];
  placeholder?: string;
}

export function fieldHasValue(val: unknown, type: FilterFieldType): boolean {
  if (val === undefined || val === null) return false;
  if (type === "multiSelect") return (val as string[]).length > 0;
  if (type === "dateRange") {
    const v = val as Array<unknown>;
    return v[0] !== null || v[1] !== null;
  }
  if (type === "numberRange") {
    const v = val as { min: unknown; max: unknown };
    return v.min !== null || v.max !== null;
  }
  return (val as string).length > 0;
}
