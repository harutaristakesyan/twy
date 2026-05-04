import { middyfy } from "@shared/index";
import type { BranchListResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  type ListBranchesEvent,
  ListBranchesEventSchema,
  listBranches as listBranchRecords,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listBranches = async (event: ListBranchesEvent): Promise<BranchListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "branches", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { branches: [], total: 0 };

  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { branches, total } = await listBranchRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
    branchId: scope.branchId,
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
