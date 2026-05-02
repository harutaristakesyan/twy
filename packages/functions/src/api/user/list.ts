import { middyfy } from "@shared/index";
import type { UserListResponse } from "@twy/core";
import { type ListUsersEvent, ListUsersEventSchema, listUsers as listUserRecords } from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listUsers = async (event: ListUsersEvent): Promise<UserListResponse> => {
  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { users, total } = await listUserRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
  });

  return {
    users,
    total,
  };
};

export const handler = middyfy<
  ListUsersEvent,
  UserListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listUsers, {
  eventSchema: ListUsersEventSchema,
  mode: "parse",
});
