import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type CreateBranchEvent,
  CreateBranchEventSchema,
  createBranch as createBranchRecord,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const createBranch = async (event: CreateBranchEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "branches", "add");

  const { name, owner, contact, ciId } = event.body;

  await createBranchRecord({
    name,
    ownerId: owner,
    contact: contact,
    ciId,
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
