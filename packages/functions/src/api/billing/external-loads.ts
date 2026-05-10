import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type ExternalBillingLoadListResponse,
  type ListExternalBillingLoadsEvent,
  ListExternalBillingLoadsEventSchema,
  listExternalBillingLoadsForBranch,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const listExternalLoads = async (
  event: ListExternalBillingLoadsEvent,
): Promise<ExternalBillingLoadListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payment_orders", "view");
  const scope = buildScope(ctx);

  const { branchId } = event.pathParameters;
  if (scope.branchId && scope.branchId !== branchId) throw new errors.Forbidden();
  if (scope.denyAll) return { loads: [] };

  const loads = await listExternalBillingLoadsForBranch(branchId);
  return { loads };
};

export const handler = middyfy<
  ListExternalBillingLoadsEvent,
  ExternalBillingLoadListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listExternalLoads, { eventSchema: ListExternalBillingLoadsEventSchema, mode: "parse" });
