import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { listLoads as listLoadRecords } from "@libs/db/operations/loadOperations";
import { LoadListResponse } from "@contracts/load/response";
import { ListLoadsEvent, ListLoadsEventSchema } from "@contracts/load/request";

const listLoads = async (event: ListLoadsEvent): Promise<LoadListResponse> => {
  const { page, limit, sortField, sortOrder, query } =
    event.queryStringParameters;

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
