import { middyfy } from "@shared/index";
import type { InternalBillingResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  getInternalBillingByBranch,
  type InternalBillingEvent,
  InternalBillingEventSchema,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const internalBillingHandler = async (
  event: InternalBillingEvent,
): Promise<InternalBillingResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "billing", "view");
  const scope = buildScope(ctx);

  if (scope.denyAll) return { rows: [], total: 0 };

  const { page, limit, branchId, dateFrom, dateTo } = event.queryStringParameters;

  const { rows, total } = await getInternalBillingByBranch({
    page,
    limit,
    branchId: scope.branchId ?? branchId,
    dateFrom,
    dateTo,
  });

  return { rows, total };
};

export const handler = middyfy<
  InternalBillingEvent,
  InternalBillingResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(internalBillingHandler, { eventSchema: InternalBillingEventSchema, mode: "parse" });
