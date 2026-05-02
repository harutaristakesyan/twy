import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  loadAuthContext,
  type UpdateBrokerEvent,
  UpdateBrokerEventSchema,
  updateBroker as updateBrokerRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const updateBroker = async (event: UpdateBrokerEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "brokers", "edit");

  const { brokerId } = event.pathParameters;
  const {
    brokerName,
    mcNumber,
    contactName,
    phone,
    email,
    address,
    notes,
    status,
    branchId,
    creditLimitUnlimited,
    creditLimit,
  } = event.body;

  const result = await updateBrokerRecord(brokerId, {
    brokerName,
    mcNumber,
    contactName,
    phone,
    email,
    address,
    notes,
    status,
    branchId,
    creditLimitUnlimited,
    creditLimit,
  });

  if (result === null) {
    throw new createError.NotFound("Outside broker not found");
  }

  return { message: "Outside broker updated successfully" };
};

export const handler = middyfy<
  UpdateBrokerEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateBroker, {
  eventSchema: UpdateBrokerEventSchema,
  mode: "parse",
});
