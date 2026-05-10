import z from "zod";
import { filtersQueryParamSchema } from "../shared/advanced-filter-schema.js";
import { AuthContext } from "../shared/auth.js";

const billingQSParams = z.object({
  query: z.string().optional(),
  filters: filtersQueryParamSchema,
});

export const ListExternalBillingByBranchEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: billingQSParams,
});

export type ListExternalBillingByBranchEvent = z.infer<
  typeof ListExternalBillingByBranchEventSchema
>;

export const ListExternalBillingLoadsEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    branchId: z.uuid("Value must be a valid UUID"),
  }),
  queryStringParameters: billingQSParams,
});

export type ListExternalBillingLoadsEvent = z.infer<typeof ListExternalBillingLoadsEventSchema>;

export const ListInternalBillingByBranchEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: billingQSParams,
});

export type ListInternalBillingByBranchEvent = z.infer<
  typeof ListInternalBillingByBranchEventSchema
>;

export const ListInternalBillingLoadsEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    branchId: z.uuid("Value must be a valid UUID"),
  }),
  queryStringParameters: billingQSParams,
});

export type ListInternalBillingLoadsEvent = z.infer<typeof ListInternalBillingLoadsEventSchema>;
