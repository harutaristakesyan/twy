import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type InternalBillingBranchListResponse,
  type ListInternalBillingByBranchEvent,
  ListInternalBillingByBranchEventSchema,
  listInternalBillingByBranch,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listInternalByBranch = async (
  event: ListInternalBillingByBranchEvent,
): Promise<InternalBillingBranchListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payment_orders", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { branches: [] };

  const { query, filters } = event.queryStringParameters;
  const branches = await listInternalBillingByBranch(scope.branchId, query, filters);
  return { branches };
};

export const handler = middyfy<
  ListInternalBillingByBranchEvent,
  InternalBillingBranchListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listInternalByBranch, { eventSchema: ListInternalBillingByBranchEventSchema, mode: "parse" });
