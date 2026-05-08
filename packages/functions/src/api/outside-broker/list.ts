import { middyfy } from "@shared/index";
import type { OutsideBrokerListResponse } from "@twy/core";
import {
  assertPermission,
  type ListBrokersEvent,
  ListBrokersEventSchema,
  listBrokers as listBrokerRecords,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listBrokers = async (event: ListBrokersEvent): Promise<OutsideBrokerListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "brokers", "view");

  const { page, limit, sortField, sortOrder, query, filters } = event.queryStringParameters;

  const { brokers, total } = await listBrokerRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
    advancedFilter: filters,
  });

  return { brokers, total };
};

export const handler = middyfy<
  ListBrokersEvent,
  OutsideBrokerListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listBrokers, {
  eventSchema: ListBrokersEventSchema,
  mode: "parse",
});
