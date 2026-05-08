import type { Column, SQL } from "drizzle-orm";
import { and, between, gte, lte, or } from "drizzle-orm";

import type { AdvancedFilter, AdvancedFilterRule } from "./advanced-filter-schema.js";

/** Combine rule predicates + optional date range (same semantics as load list — date shares matchMode bucket). */
export function buildAdvancedFilterSql(
  filter: AdvancedFilter,
  buildRuleCondition: (rule: AdvancedFilterRule) => SQL<unknown> | undefined,
  getDateColumn: (dateFieldKey: string) => Column | undefined,
): SQL<unknown> | undefined {
  const conditions: SQL<unknown>[] = [];

  for (const rule of filter.rules) {
    const cond = buildRuleCondition(rule);
    if (cond !== undefined) conditions.push(cond);
  }

  if (filter.dateField && (filter.dateFrom ?? filter.dateTo)) {
    const col = filter.dateField ? getDateColumn(filter.dateField) : undefined;
    if (col !== undefined) {
      if (filter.dateFrom && filter.dateTo) {
        conditions.push(
          between(
            col,
            new Date(`${filter.dateFrom}T00:00:00.000Z`),
            new Date(`${filter.dateTo}T23:59:59.999Z`),
          ),
        );
      } else if (filter.dateFrom) {
        conditions.push(gte(col, new Date(`${filter.dateFrom}T00:00:00.000Z`)));
      } else if (filter.dateTo) {
        conditions.push(lte(col, new Date(`${filter.dateTo}T23:59:59.999Z`)));
      }
    }
  }

  if (conditions.length === 0) return undefined;
  return filter.matchMode === "all" ? and(...conditions) : or(...conditions);
}
