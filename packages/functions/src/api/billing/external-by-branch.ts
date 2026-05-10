import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type ExternalBillingBranchListResponse,
  type ListExternalBillingByBranchEvent,
  ListExternalBillingByBranchEventSchema,
  listExternalBillingByBranch,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listExternalByBranch = async (
  event: ListExternalBillingByBranchEvent,
): Promise<ExternalBillingBranchListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payment_orders", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { branches: [] };

  const branches = await listExternalBillingByBranch(scope.branchId);
  return { branches };
};

export const handler = middyfy<
  ListExternalBillingByBranchEvent,
  ExternalBillingBranchListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listExternalByBranch, { eventSchema: ListExternalBillingByBranchEventSchema, mode: "parse" });
