import type { LoadStatus } from "@twy/db";
import { load } from "@twy/db";
import type { SQL } from "drizzle-orm";
import { and, eq, inArray } from "drizzle-orm";
import type { AdvancedFilter } from "./advanced-filter-schema.js";
import { buildDateRangeCondition } from "./advanced-filter-sql.js";

function buildLoadFilterConditions(filter: AdvancedFilter): SQL<unknown>[] {
  const conds: SQL<unknown>[] = [];

  if (filter.status) {
    const values = filter.status
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as LoadStatus[];
    if (values.length === 1) {
      conds.push(eq(load.status, values[0]));
    } else if (values.length > 1) {
      conds.push(inArray(load.status, values));
    }
  }

  const dateCond = buildDateRangeCondition(filter, "createdAt", load.createdAt);
  if (dateCond) conds.push(dateCond);

  return conds;
}

export function buildLoadAdvancedFilterClause(
  filter: AdvancedFilter | undefined,
): SQL<unknown> | undefined {
  if (!filter) return undefined;
  const conds = buildLoadFilterConditions(filter);
  if (conds.length === 0) return undefined;
  return and(...conds);
}
