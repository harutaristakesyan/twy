import { middyfy } from "@shared/index";
import type { CarrierListResponse } from "@twy/core";
import {
  assertPermission,
  type ListCarriersEvent,
  ListCarriersEventSchema,
  listCarriers,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listCarriersHandler = async (event: ListCarriersEvent): Promise<CarrierListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers", "view");

  const { kind, page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { carriers, total } = await listCarriers({
    kind,
    page,
    limit,
    sortField,
    sortOrder,
    query,
  });

  return { carriers, total };
};

export const handler = middyfy<
  ListCarriersEvent,
  CarrierListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listCarriersHandler, {
  eventSchema: ListCarriersEventSchema,
  mode: "parse",
});
