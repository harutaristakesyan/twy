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
  assertPermission(ctx, "external_billing", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { branches: [] };

  const { query, filters } = event.queryStringParameters;
  const branches = await listExternalBillingByBranch(scope.branchId, query, filters);
  return { branches };
};

export const handler = middyfy<
  ListExternalBillingByBranchEvent,
  ExternalBillingBranchListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listExternalByBranch, { eventSchema: ListExternalBillingByBranchEventSchema, mode: "parse" });
