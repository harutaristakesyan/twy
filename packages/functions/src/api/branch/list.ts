import { middyfy } from "@shared/index";
import type { BranchListResponse } from "@twy/core";
import {
  type ListBranchesEvent,
  ListBranchesEventSchema,
  listBranches as listBranchRecords,
} from "@twy/core";
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
