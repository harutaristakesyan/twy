import z from "zod";
import { AuthContext } from "../shared/auth.js";

export const ListExternalBillingByBranchEventSchema = z.object({
  requestContext: AuthContext,
});

export type ListExternalBillingByBranchEvent = z.infer<
  typeof ListExternalBillingByBranchEventSchema
>;

export const ListExternalBillingLoadsEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    branchId: z.uuid("Value must be a valid UUID"),
  }),
});

export type ListExternalBillingLoadsEvent = z.infer<typeof ListExternalBillingLoadsEventSchema>;

export const ListInternalBillingByBranchEventSchema = z.object({
  requestContext: AuthContext,
});

export type ListInternalBillingByBranchEvent = z.infer<
  typeof ListInternalBillingByBranchEventSchema
>;

export const ListInternalBillingLoadsEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    branchId: z.uuid("Value must be a valid UUID"),
  }),
});

export type ListInternalBillingLoadsEvent = z.infer<typeof ListInternalBillingLoadsEventSchema>;
