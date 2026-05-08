import { middyfy } from "@shared/index";
import type { TwyAccountingResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  getTwyAccountingRows,
  loadAuthContext,
  type TwyAccountingEvent,
  TwyAccountingEventSchema,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const twyAccountingHandler = async (event: TwyAccountingEvent): Promise<TwyAccountingResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "billing", "view");
  const scope = buildScope(ctx);

  if (scope.denyAll) return { rows: [], total: 0 };

  const { page, limit, branchId, dateFrom, dateTo, filters } = event.queryStringParameters;

  const { rows, total } = await getTwyAccountingRows({
    page,
    limit,
    branchId: scope.branchId ?? branchId,
    dateFrom,
    dateTo,
    advancedFilter: filters,
  });

  return { rows, total };
};

export const handler = middyfy<
  TwyAccountingEvent,
  TwyAccountingResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(twyAccountingHandler, { eventSchema: TwyAccountingEventSchema, mode: "parse" });
