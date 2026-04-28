import { type DeleteBranchEvent, DeleteBranchEventSchema } from "@contracts/branch/request";
import type { MessageResponse } from "@contracts/common/response";
import { deleteBranch as deleteBranchRecord } from "@libs/db/operations/branchOperations";
import { middyfy } from "@twy/lambda-shared";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const deleteBranch = async (event: DeleteBranchEvent): Promise<MessageResponse> => {
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
