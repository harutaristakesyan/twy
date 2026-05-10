import type { AdvancedFilter, FilterField } from "./types.js";
import { fieldHasValue } from "./types.js";

/** Untyped bag — each key maps to the field's value in its native form:
 *  select       → string
 *  multiSelect  → string[]
 *  dateRange    → [dayjs.Dayjs | null, dayjs.Dayjs | null]  (stored in modal state)
 *               | [string | null, string | null]             (returned by splitToFilterValues)
 *  numberRange  → { min: number | null; max: number | null }
 */
export type FilterValues = Record<string, unknown>;

/** Translate the declarative filter state into the wire format (flat Record<string, string>). */
export function valuesToFilter(
  filterValues: FilterValues,
  fields: FilterField[],
): AdvancedFilter | undefined {
  const result: Record<string, string> = {};

  for (const field of fields) {
    const val = filterValues[field.key];
    if (!fieldHasValue(val, field.type)) continue;

    if (field.type === "select") {
      result[field.key] = val as string;
    } else if (field.type === "multiSelect") {
      result[field.key] = (val as string[]).join(",");
    } else if (field.type === "numberRange") {
      const v = val as { min: number | null; max: number | null };
      if (v.min != null) result[`${field.key}__gte`] = String(v.min);
      if (v.max != null) result[`${field.key}__lte`] = String(v.max);
    } else if (field.type === "dateRange") {
      // val is [dayjs | null, dayjs | null] — call .format() via duck-typing
      const pair = val as Array<{ format: (f: string) => string } | null>;
      if (pair[0]) result[`${field.key}__from`] = pair[0].format("YYYY-MM-DD");
      if (pair[1]) result[`${field.key}__to`] = pair[1].format("YYYY-MM-DD");
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/** Reverse-map a flat AdvancedFilter back into filter values.
 *  dateRange values are returned as [string | null, string | null] — the popover converts to dayjs. */
export function splitToFilterValues(
  filter: AdvancedFilter | undefined,
  fields: FilterField[],
): FilterValues {
  const result: FilterValues = {};
  if (!filter) return result;

  for (const field of fields) {
    if (field.type === "select" && filter[field.key] !== undefined) {
      result[field.key] = filter[field.key];
    } else if (field.type === "multiSelect" && filter[field.key] !== undefined) {
      result[field.key] = filter[field.key].split(",").filter(Boolean);
    } else if (field.type === "numberRange") {
      const gte = filter[`${field.key}__gte`];
      const lte = filter[`${field.key}__lte`];
      if (gte !== undefined || lte !== undefined) {
        result[field.key] = {
          min: gte !== undefined ? Number(gte) : null,
          max: lte !== undefined ? Number(lte) : null,
        };
      }
    } else if (field.type === "dateRange") {
      const from = filter[`${field.key}__from`];
      const to = filter[`${field.key}__to`];
      if (from !== undefined || to !== undefined) {
        result[field.key] = [from ?? null, to ?? null];
      }
    }
  }

  return result;
}
