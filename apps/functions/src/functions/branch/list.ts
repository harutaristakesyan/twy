import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { listBranches as listBranchRecords } from "@libs/db/operations/branchOperations";
import { BranchListResponse } from "@contracts/branch/response";
import {
  ListBranchesEvent,
  ListBranchesEventSchema,
} from "@contracts/branch/request";

const listBranches = async (
  event: ListBranchesEvent,
): Promise<BranchListResponse> => {
  const { page, limit, sortField, sortOrder, query } =
    event.queryStringParameters;

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
