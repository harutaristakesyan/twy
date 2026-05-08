import z from "zod";

export const AdvancedFilterRuleSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});

export const AdvancedFilterSchema = z.object({
  matchMode: z.enum(["all", "any"]).default("all"),
  rules: z.array(AdvancedFilterRuleSchema).default([]),
  dateField: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type AdvancedFilterRule = z.infer<typeof AdvancedFilterRuleSchema>;
export type AdvancedFilter = z.infer<typeof AdvancedFilterSchema>;

/** Parse optional `filters` query param (JSON string). Invalid input → undefined. */
export function parseOptionalFiltersJson(raw: string | undefined): AdvancedFilter | undefined {
  if (raw === undefined || raw === "") return undefined;
  try {
    return AdvancedFilterSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/** Zod field for API `filters` query string (JSON). */
export const filtersQueryParamSchema = z.string().optional().transform(parseOptionalFiltersJson);
