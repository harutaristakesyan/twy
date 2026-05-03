import { middyfy } from "@shared/index";
import type { BrokerRequestListResponse } from "@twy/core";
import {
  assertBrokerRequestsView,
  type ListBrokerRequestsEvent,
  ListBrokerRequestsEventSchema,
  listBrokerRequests,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listBrokerRequestsHandler = async (
  event: ListBrokerRequestsEvent,
): Promise<BrokerRequestListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertBrokerRequestsView(ctx);

  const { page, limit, sortField, sortOrder, status, query } = event.queryStringParameters;

  const { requests, total } = await listBrokerRequests({
    page,
    limit,
    sortField,
    sortOrder,
    status,
    query,
  });

  return { requests, total };
};

export const handler = middyfy<
  ListBrokerRequestsEvent,
  BrokerRequestListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listBrokerRequestsHandler, {
  eventSchema: ListBrokerRequestsEventSchema,
  mode: "parse",
});
