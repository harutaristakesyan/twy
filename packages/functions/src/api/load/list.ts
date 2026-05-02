import { middyfy } from "@shared/index";
import type { LoadListResponse } from "@twy/core";
import { type ListLoadsEvent, ListLoadsEventSchema, listLoads as listLoadRecords } from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listLoads = async (event: ListLoadsEvent): Promise<LoadListResponse> => {
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
