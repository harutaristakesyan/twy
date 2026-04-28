import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { createBranch as createBranchRecord } from "@libs/db/operations/branchOperations";
import {
  CreateBranchEvent,
  CreateBranchEventSchema,
} from "@contracts/branch/request";
import { MessageResponse } from "@contracts/common/response";

const createBranch = async (
  event: CreateBranchEvent,
): Promise<MessageResponse> => {
  const { name, owner, contact } = event.body;

  await createBranchRecord({
    name,
    ownerId: owner,
    contact: contact,
  });

  return { message: "Branch created successfully" };
};

export const handler = middyfy<
  CreateBranchEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createBranch, {
  eventSchema: CreateBranchEventSchema,
  mode: "parse",
});
