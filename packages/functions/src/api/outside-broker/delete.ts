import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type DeleteBrokerEvent,
  DeleteBrokerEventSchema,
  deleteBroker as deleteBrokerRecord,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const deleteBroker = async (event: DeleteBrokerEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "brokers", "edit");

  const { brokerId } = event.pathParameters;

  const removed = await deleteBrokerRecord(brokerId);

  if (!removed) {
    throw new createError.NotFound("Outside broker not found");
  }

  return { message: "Outside broker deleted successfully" };
};

export const handler = middyfy<
  DeleteBrokerEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteBroker, {
  eventSchema: DeleteBrokerEventSchema,
  mode: "parse",
});
