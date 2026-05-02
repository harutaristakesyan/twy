import { middyfy } from "@shared/index";
import type { OutsideBrokerListResponse } from "@twy/core";
import {
  type ListBrokersEvent,
  ListBrokersEventSchema,
  listBrokers as listBrokerRecords,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listBrokers = async (event: ListBrokersEvent): Promise<OutsideBrokerListResponse> => {
  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { brokers, total } = await listBrokerRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
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
