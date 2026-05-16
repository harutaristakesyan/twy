import { middyfy } from "@shared/index";
import type { OutsideBrokerResponse } from "@twy/core";
import {
  assertPermission,
  type GetBrokerEvent,
  GetBrokerEventSchema,
  getBrokerById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getBroker = async (event: GetBrokerEvent): Promise<OutsideBrokerResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "brokers", "view");

  const { brokerId } = event.pathParameters;
  const broker = await getBrokerById(brokerId);
  if (broker === null) {
    throw new createError.NotFound("Outside broker not found");
  }

  return broker;
};

export const handler = middyfy<
  GetBrokerEvent,
  OutsideBrokerResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getBroker, { eventSchema: GetBrokerEventSchema, mode: "parse" });
