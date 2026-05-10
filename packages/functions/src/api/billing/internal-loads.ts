import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type InternalBillingLoadListResponse,
  type ListInternalBillingLoadsEvent,
  ListInternalBillingLoadsEventSchema,
  listInternalBillingLoadsForBranch,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const listInternalLoads = async (
  event: ListInternalBillingLoadsEvent,
): Promise<InternalBillingLoadListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payment_orders", "view");
  const scope = buildScope(ctx);

  const { branchId } = event.pathParameters;
  if (scope.branchId && scope.branchId !== branchId) throw new errors.Forbidden();
  if (scope.denyAll) return { loads: [] };

  const loads = await listInternalBillingLoadsForBranch(branchId);
  return { loads };
};

export const handler = middyfy<
  ListInternalBillingLoadsEvent,
  InternalBillingLoadListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listInternalLoads, { eventSchema: ListInternalBillingLoadsEventSchema, mode: "parse" });
