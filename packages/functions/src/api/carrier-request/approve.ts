import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type ApproveCarrierRequestEvent,
  ApproveCarrierRequestEventSchema,
  approveCarrierRequest,
  assertPermission,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const approveHandler = async (event: ApproveCarrierRequestEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers_requests", "edit");

  const { requestId } = event.pathParameters;
  await approveCarrierRequest(requestId, userId);

  return { message: "Carrier request approved; carrier is now active" };
};

export const handler = middyfy<
  ApproveCarrierRequestEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(approveHandler, {
  eventSchema: ApproveCarrierRequestEventSchema,
  mode: "parse",
});
