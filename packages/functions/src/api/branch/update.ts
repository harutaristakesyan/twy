import { type UpdateBranchEvent, UpdateBranchEventSchema } from "@contracts/branch/request";
import type { MessageResponse } from "@contracts/common/response";
import { middyfy } from "@shared/index";
import { updateBranch as updateBranchRecord } from "@twy/db";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const updateBranch = async (event: UpdateBranchEvent): Promise<MessageResponse> => {
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
