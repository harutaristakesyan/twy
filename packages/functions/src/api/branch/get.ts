import { middyfy } from "@shared/index";
import type { Branch } from "@twy/core";
import {
  assertPermission,
  type GetBranchEvent,
  GetBranchEventSchema,
  getBranchById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getBranch = async (event: GetBranchEvent): Promise<Branch> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "branches", "view");

  const { branchId } = event.pathParameters;
  const branch = await getBranchById(branchId);
  if (branch === null) {
    throw new createError.NotFound("Branch not found");
  }

  return branch;
};

export const handler = middyfy<GetBranchEvent, Branch, APIGatewayProxyEventV2WithJWTAuthorizer>(
  getBranch,
  { eventSchema: GetBranchEventSchema, mode: "parse" },
);
