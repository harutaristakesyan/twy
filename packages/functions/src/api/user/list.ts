import { middyfy } from "@shared/index";
import type { UserListResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  type ListUsersEvent,
  ListUsersEventSchema,
  listUsers as listUserRecords,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listUsers = async (event: ListUsersEvent): Promise<UserListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "users", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { users: [], total: 0 };

  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  const { users, total } = await listUserRecords({
    page,
    limit,
    sortField,
    sortOrder,
    query,
    branchId: scope.branchId,
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
