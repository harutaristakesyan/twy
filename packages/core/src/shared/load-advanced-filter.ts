import type { LoadStatus } from "@twy/db";
import { load } from "@twy/db";
import type { SQL } from "drizzle-orm";
import { eq, gt, gte, ilike, lt, lte, ne } from "drizzle-orm";
import type { AdvancedFilter, AdvancedFilterRule } from "./advanced-filter-schema.js";
import { buildAdvancedFilterSql } from "./advanced-filter-sql.js";

export function buildLoadRuleCondition(rule: AdvancedFilterRule): SQL<unknown> | undefined {
  const { field, operator, value } = rule;
  if (!field || !operator || value === "") return undefined;

  switch (field) {
    case "referenceNumber":
      if (operator === "contains") return ilike(load.referenceNumber, `%${value}%`);
      if (operator === "equals") return eq(load.referenceNumber, value);
      if (operator === "starts_with") return ilike(load.referenceNumber, `${value}%`);
      return undefined;
    case "customer":
      if (operator === "contains") return ilike(load.customer, `%${value}%`);
      if (operator === "equals") return eq(load.customer, value);
      if (operator === "starts_with") return ilike(load.customer, `${value}%`);
      return undefined;
    case "contactName":
      if (operator === "contains") return ilike(load.contactName, `%${value}%`);
      if (operator === "equals") return eq(load.contactName, value);
      if (operator === "starts_with") return ilike(load.contactName, `${value}%`);
      return undefined;
    case "carrier":
      if (operator === "contains") return ilike(load.carrier, `%${value}%`);
      if (operator === "equals") return eq(load.carrier, value);
      if (operator === "starts_with") return ilike(load.carrier, `${value}%`);
      return undefined;
    case "paymentMethod":
      if (operator === "contains") return ilike(load.paymentMethod, `%${value}%`);
      if (operator === "equals") return eq(load.paymentMethod, value);
      if (operator === "starts_with") return ilike(load.paymentMethod, `${value}%`);
      return undefined;
    case "paymentTerms":
      if (operator === "contains") return ilike(load.paymentTerms, `%${value}%`);
      if (operator === "equals") return eq(load.paymentTerms, value);
      if (operator === "starts_with") return ilike(load.paymentTerms, `${value}%`);
      return undefined;
    case "loadType":
      if (operator === "contains") return ilike(load.loadType, `%${value}%`);
      if (operator === "equals") return eq(load.loadType, value);
      if (operator === "starts_with") return ilike(load.loadType, `${value}%`);
      return undefined;
    case "serviceType":
      if (operator === "contains") return ilike(load.serviceType, `%${value}%`);
      if (operator === "equals") return eq(load.serviceType, value);
      if (operator === "starts_with") return ilike(load.serviceType, `${value}%`);
      return undefined;
    case "commodity":
      if (operator === "contains") return ilike(load.commodity, `%${value}%`);
      if (operator === "equals") return eq(load.commodity, value);
      if (operator === "starts_with") return ilike(load.commodity, `${value}%`);
      return undefined;
    case "status":
      if (operator === "is") return eq(load.status, value as LoadStatus);
      if (operator === "is_not") return ne(load.status, value as LoadStatus);
      return undefined;
    case "carrierRate":
      if (operator === "eq") return eq(load.carrierRate, value);
      if (operator === "gt") return gt(load.carrierRate, value);
      if (operator === "lt") return lt(load.carrierRate, value);
      if (operator === "gte") return gte(load.carrierRate, value);
      if (operator === "lte") return lte(load.carrierRate, value);
      return undefined;
    case "customerRate":
      if (operator === "eq") return eq(load.customerRate, value);
      if (operator === "gt") return gt(load.customerRate, value);
      if (operator === "lt") return lt(load.customerRate, value);
      if (operator === "gte") return gte(load.customerRate, value);
      if (operator === "lte") return lte(load.customerRate, value);
      return undefined;
    default:
      return undefined;
  }
}

export function loadAdvancedDateColumn(dateFieldKey: string) {
  if (dateFieldKey === "updatedAt") return load.updatedAt;
  if (dateFieldKey === "createdAt") return load.createdAt;
  return undefined;
}

export function buildLoadAdvancedFilterClause(
  filter: AdvancedFilter | undefined,
): SQL<unknown> | undefined {
  if (!filter) return undefined;
  return buildAdvancedFilterSql(filter, buildLoadRuleCondition, loadAdvancedDateColumn);
}
