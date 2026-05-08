import { middyfy } from "@shared/index";
import type { ExternalBillingResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  type ExternalBillingEvent,
  ExternalBillingEventSchema,
  getExternalBillingByBranch,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const externalBillingHandler = async (
  event: ExternalBillingEvent,
): Promise<ExternalBillingResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "billing", "view");
  const scope = buildScope(ctx);

  if (scope.denyAll) return { rows: [] };

  const { branchId, dateFrom, dateTo } = event.queryStringParameters;

  const rows = await getExternalBillingByBranch({
    branchId: scope.branchId ?? branchId,
    dateFrom,
    dateTo,
  });

  return { rows };
};

export const handler = middyfy<
  ExternalBillingEvent,
  ExternalBillingResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(externalBillingHandler, { eventSchema: ExternalBillingEventSchema, mode: "parse" });
