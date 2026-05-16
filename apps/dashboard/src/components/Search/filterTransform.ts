import type { Filter, FilterField } from "./types.js";
import { fieldHasValue } from "./types.js";

export type FilterValues = Record<string, unknown>;

export function valuesToFilter(
  filterValues: FilterValues,
  fields: FilterField[],
): Filter | undefined {
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
      const pair = val as [string | null, string | null];
      if (pair[0]) result[`${field.key}__from`] = pair[0];
      if (pair[1]) result[`${field.key}__to`] = pair[1];
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function splitToFilterValues(
  filter: Filter | undefined,
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
