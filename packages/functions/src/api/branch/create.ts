import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type CreateBranchEvent,
  CreateBranchEventSchema,
  createBranch as createBranchRecord,
} from "@twy/core";
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
