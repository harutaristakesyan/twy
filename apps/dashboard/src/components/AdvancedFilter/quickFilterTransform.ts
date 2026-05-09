import type { AdvancedFilter, FilterRule, QuickFilterField } from "./types.js";

/** Untyped bag — each key maps to the field's value in its native form:
 *  search       → string
 *  select       → string
 *  multiSelect  → string[]
 *  dateRange    → [dayjs.Dayjs | null, dayjs.Dayjs | null]  (stored in modal state)
 *               | [string | null, string | null]             (returned by splitFilterToQuickValues)
 *  numberRange  → { min: number | null; max: number | null }
 */
export type QuickValues = Record<string, unknown>;

/** Translate the declarative quick-filter state + advanced rules into the wire format. */
export function quickValuesToFilter(
  quickValues: QuickValues,
  quickFields: QuickFilterField[],
  matchMode: "all" | "any",
  extraRules: FilterRule[],
): AdvancedFilter | undefined {
  const rules: FilterRule[] = [];
  let dateField: string | undefined;
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  for (const field of quickFields) {
    const val = quickValues[field.key];
    if (val === undefined || val === null) continue;

    if (field.type === "search") {
      const v = (val as string).trim();
      if (v)
        rules.push({ id: crypto.randomUUID(), field: field.key, operator: "contains", value: v });
    } else if (field.type === "select") {
      const v = val as string;
      if (v) rules.push({ id: crypto.randomUUID(), field: field.key, operator: "is", value: v });
    } else if (field.type === "multiSelect") {
      const v = val as string[];
      if (v.length > 0)
        rules.push({
          id: crypto.randomUUID(),
          field: field.key,
          operator: "in",
          value: v.join(","),
        });
    } else if (field.type === "dateRange") {
      // val is [dayjs | null, dayjs | null] — call .format() via duck-typing
      const pair = val as Array<{ format: (f: string) => string } | null>;
      if (pair[0] !== null || pair[1] !== null) {
        dateField = field.key;
        dateFrom = pair[0]?.format("YYYY-MM-DD");
        dateTo = pair[1]?.format("YYYY-MM-DD");
      }
    } else if (field.type === "numberRange") {
      const v = val as { min: number | null; max: number | null };
      if (v.min !== null)
        rules.push({
          id: crypto.randomUUID(),
          field: field.key,
          operator: "gte",
          value: String(v.min),
        });
      if (v.max !== null)
        rules.push({
          id: crypto.randomUUID(),
          field: field.key,
          operator: "lte",
          value: String(v.max),
        });
    }
  }

  const allRules = [...rules, ...extraRules];
  if (allRules.length === 0 && !dateField) return undefined;

  return { matchMode, rules: allRules, dateField, dateFrom, dateTo };
}

/** Reverse-map a wire-format AdvancedFilter back into quick-filter values + leftover advanced rules.
 *  dateRange values are returned as [string | null, string | null] — the modal converts to dayjs. */
export function splitFilterToQuickValues(
  filter: AdvancedFilter | undefined,
  quickFields: QuickFilterField[],
): { quickValues: QuickValues; extraRules: FilterRule[] } {
  if (!filter) return { quickValues: {}, extraRules: [] };

  const quickKeySet = new Set(quickFields.map((f) => f.key));
  const quickValues: QuickValues = {};
  const extraRules: FilterRule[] = [];

  // Date range (top-level fields, not a rule)
  if (filter.dateField && quickKeySet.has(filter.dateField)) {
    quickValues[filter.dateField] = [filter.dateFrom ?? null, filter.dateTo ?? null];
  }

  for (const rule of filter.rules) {
    const field = quickFields.find((f) => f.key === rule.field);
    if (!field) {
      extraRules.push(rule);
      continue;
    }

    if (field.type === "search" && rule.operator === "contains") {
      quickValues[rule.field] = rule.value;
    } else if (field.type === "select" && rule.operator === "is") {
      quickValues[rule.field] = rule.value;
    } else if (field.type === "multiSelect" && rule.operator === "in") {
      quickValues[rule.field] = rule.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (field.type === "numberRange") {
      const existing = (quickValues[rule.field] as
        | { min: number | null; max: number | null }
        | undefined) ?? { min: null, max: null };
      if (rule.operator === "gte")
        quickValues[rule.field] = { ...existing, min: Number(rule.value) };
      else if (rule.operator === "lte")
        quickValues[rule.field] = { ...existing, max: Number(rule.value) };
      else extraRules.push(rule);
    } else {
      extraRules.push(rule);
    }
  }

  return { quickValues, extraRules };
}
