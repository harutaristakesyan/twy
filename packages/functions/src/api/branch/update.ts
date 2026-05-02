import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  loadAuthContext,
  type UpdateBranchEvent,
  UpdateBranchEventSchema,
  updateBranch as updateBranchRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const updateBranch = async (event: UpdateBranchEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "branches", "edit");

  const { branchId } = event.pathParameters;
  const { name, owner, contact } = event.body;

  await updateBranchRecord(branchId, {
    name,
    ownerId: typeof owner === "undefined" ? undefined : owner,
    contact: typeof contact === "undefined" ? undefined : contact,
  });

  return { message: "Branch updated successfully" };
};

export const handler = middyfy<
  UpdateBranchEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateBranch, {
  eventSchema: UpdateBranchEventSchema,
  mode: "parse",
});
