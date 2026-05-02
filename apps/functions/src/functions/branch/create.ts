import { type CreateBranchEvent, CreateBranchEventSchema } from "@contracts/branch/request";
import type { MessageResponse } from "@contracts/common/response";
import { createBranch as createBranchRecord } from "@twy/db";
import { middyfy } from "@twy/lambda-shared";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const createBranch = async (event: CreateBranchEvent): Promise<MessageResponse> => {
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
