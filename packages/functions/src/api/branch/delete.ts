import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type DeleteBranchEvent,
  DeleteBranchEventSchema,
  deleteBranch as deleteBranchRecord,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const deleteBranch = async (event: DeleteBranchEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "branches", "delete");

  const { branchId } = event.pathParameters;

  const removed = await deleteBranchRecord(branchId);

  if (!removed) {
    throw new createError.NotFound("Branch not found");
  }

  return { message: "Branch deleted successfully" };
};

export const handler = middyfy<
  DeleteBranchEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteBranch, {
  eventSchema: DeleteBranchEventSchema,
  mode: "parse",
});
