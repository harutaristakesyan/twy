import { type ListUsersEvent, ListUsersEventSchema } from "@contracts/user/request";
import type { UserListResponse } from "@contracts/user/response";
import { listUsers as listUserRecords } from "@twy/db";
import { middyfy } from "@twy/lambda-shared";
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
