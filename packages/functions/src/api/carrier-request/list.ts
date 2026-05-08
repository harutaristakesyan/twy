import { middyfy } from "@shared/index";
import type { CarrierRequestListResponse } from "@twy/core";
import {
  assertPermission,
  type ListCarrierRequestsEvent,
  ListCarrierRequestsEventSchema,
  listCarrierRequests,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listCarrierRequestsHandler = async (
  event: ListCarrierRequestsEvent,
): Promise<CarrierRequestListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers_requests", "view");

  const { page, limit, sortField, sortOrder, status, query, filters } = event.queryStringParameters;

  const { requests, total } = await listCarrierRequests({
    page,
    limit,
    sortField,
    sortOrder,
    status,
    query,
    advancedFilter: filters,
  });

  return { requests, total };
};

export const handler = middyfy<
  ListCarrierRequestsEvent,
  CarrierRequestListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listCarrierRequestsHandler, {
  eventSchema: ListCarrierRequestsEventSchema,
  mode: "parse",
});
