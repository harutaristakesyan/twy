import { middyfy } from "@shared/index";
import type { LoadListResponse } from "@twy/core";
import {
  assertPermission,
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

  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { loads, total } = await listLoadRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
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
