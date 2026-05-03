import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertBrokerRequestsEdit,
  loadAuthContext,
  type RejectBrokerRequestEvent,
  RejectBrokerRequestEventSchema,
  rejectBrokerRequest,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const rejectHandler = async (event: RejectBrokerRequestEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertBrokerRequestsEdit(ctx);

  const { requestId } = event.pathParameters;
  const { rejectionReason } = event.body;

  await rejectBrokerRequest(requestId, userId, rejectionReason);

  return { message: "Broker request rejected" };
};

export const handler = middyfy<
  RejectBrokerRequestEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(rejectHandler, {
  eventSchema: RejectBrokerRequestEventSchema,
  mode: "parse",
});
