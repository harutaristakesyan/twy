import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type ApproveBrokerRequestEvent,
  ApproveBrokerRequestEventSchema,
  approveBrokerRequest,
  assertBrokerRequestsEdit,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const approveHandler = async (event: ApproveBrokerRequestEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertBrokerRequestsEdit(ctx);

  const { requestId } = event.pathParameters;
  await approveBrokerRequest(requestId, userId);

  return { message: "Broker request approved; outside broker is now active" };
};

export const handler = middyfy<
  ApproveBrokerRequestEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(approveHandler, {
  eventSchema: ApproveBrokerRequestEventSchema,
  mode: "parse",
});
