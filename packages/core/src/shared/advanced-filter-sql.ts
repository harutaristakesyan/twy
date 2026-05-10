import type { Column, SQL } from "drizzle-orm";
import { between, gte, lte } from "drizzle-orm";
import type { AdvancedFilter } from "./advanced-filter-schema.js";

export function getFilterDateRange(
  filter: AdvancedFilter,
  key: string,
): { from: Date | undefined; to: Date | undefined } {
  return {
    from: filter[`${key}__from`] ? new Date(`${filter[`${key}__from`]}T00:00:00.000Z`) : undefined,
    to: filter[`${key}__to`] ? new Date(`${filter[`${key}__to`]}T23:59:59.999Z`) : undefined,
  };
}

export function buildDateRangeCondition(
  filter: AdvancedFilter,
  key: string,
  col: Column,
): SQL<unknown> | undefined {
  const { from, to } = getFilterDateRange(filter, key);
  if (from && to) return between(col, from, to);
  if (from) return gte(col, from);
  if (to) return lte(col, to);
  return undefined;
}
