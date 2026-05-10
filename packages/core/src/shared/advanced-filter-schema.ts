import z from "zod";

export const AdvancedFilterSchema = z.record(z.string(), z.string());
export type AdvancedFilter = z.infer<typeof AdvancedFilterSchema>;

/** Parse optional `filters` query param (JSON string). Invalid input → undefined. */
export function parseOptionalFiltersJson(raw: string | undefined): AdvancedFilter | undefined {
  if (!raw) return undefined;
  try {
    return AdvancedFilterSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/** Zod field for API `filters` query string (JSON). */
export const filtersQueryParamSchema = z.string().optional().transform(parseOptionalFiltersJson);
