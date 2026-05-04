import { middyfy } from "@shared/index";
import type { LoadListResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  type ListLoadsEvent,
  ListLoadsEventSchema,
  listLoads as listLoadRecords,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listLoads = async (event: ListLoadsEvent): Promise<LoadListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "loads", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { loads: [], total: 0 };

  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { loads, total } = await listLoadRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
    branchId: scope.branchId,
    ownerId: scope.ownerId,
  });

  return {
    loads,
    total,
  };
};

export const handler = middyfy<
  ListLoadsEvent,
  LoadListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listLoads, {
  eventSchema: ListLoadsEventSchema,
  mode: "parse",
});
