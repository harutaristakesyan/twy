import { middyfy } from "@shared/index";
import {
  assertPermission,
  type BrokerRequestResponse,
  type GetBrokerRequestEvent,
  GetBrokerRequestEventSchema,
  getBrokerRequestById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getBrokerRequest = async (event: GetBrokerRequestEvent): Promise<BrokerRequestResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "brokers_requests", "view");

  const { requestId } = event.pathParameters;
  const request = await getBrokerRequestById(requestId);
  if (!request) {
    throw new createError.NotFound("Broker request not found");
  }
  return request;
};

export const handler = middyfy<
  GetBrokerRequestEvent,
  BrokerRequestResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getBrokerRequest, { eventSchema: GetBrokerRequestEventSchema, mode: "parse" });
