import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { updateBranch as updateBranchRecord } from "@libs/db/operations/branchOperations";
import {
  UpdateBranchEvent,
  UpdateBranchEventSchema,
} from "@contracts/branch/request";
import { MessageResponse } from "@contracts/common/response";

const updateBranch = async (
  event: UpdateBranchEvent,
): Promise<MessageResponse> => {
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
