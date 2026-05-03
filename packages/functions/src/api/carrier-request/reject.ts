import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  loadAuthContext,
  type RejectCarrierRequestEvent,
  RejectCarrierRequestEventSchema,
  rejectCarrierRequest,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const rejectHandler = async (event: RejectCarrierRequestEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers_requests", "edit");

  const { requestId } = event.pathParameters;
  const { rejectionReason } = event.body;

  await rejectCarrierRequest(requestId, userId, rejectionReason);

  return { message: "Carrier request rejected" };
};

export const handler = middyfy<
  RejectCarrierRequestEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(rejectHandler, {
  eventSchema: RejectCarrierRequestEventSchema,
  mode: "parse",
});
