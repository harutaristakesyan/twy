import { type ListBranchesEvent, ListBranchesEventSchema } from "@contracts/branch/request";
import type { BranchListResponse } from "@contracts/branch/response";
import { middyfy } from "@shared/index";
import { listBranches as listBranchRecords } from "@twy/db";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listBranches = async (event: ListBranchesEvent): Promise<BranchListResponse> => {
  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { branches, total } = await listBranchRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
  });

  return {
    branches,
    total,
  };
};

export const handler = middyfy<
  ListBranchesEvent,
  BranchListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listBranches, {
  eventSchema: ListBranchesEventSchema,
  mode: "parse",
});
