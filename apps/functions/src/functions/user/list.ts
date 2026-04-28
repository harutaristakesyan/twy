import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { listUsers as listUserRecords } from "@libs/db/operations/userOperations";
import { ListUsersEvent, ListUsersEventSchema } from "@contracts/user/request";
import { UserListResponse } from "@contracts/user/response";

const listUsers = async (event: ListUsersEvent): Promise<UserListResponse> => {
  const { page, limit, sortField, sortOrder, query } =
    event.queryStringParameters;

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
