import { type ListLoadsEvent, ListLoadsEventSchema } from "@contracts/load/request";
import type { LoadListResponse } from "@contracts/load/response";
import { listLoads as listLoadRecords } from "@libs/db/operations/loadOperations";
import { middyfy } from "@twy/lambda-shared";
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
