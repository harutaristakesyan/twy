import { middyfy } from "@shared/index";
import type { TeamMemberListResponse } from "@twy/core";
import {
  assertPermission,
  type ListUnassignedUsersEvent,
  ListUnassignedUsersEventSchema,
  listUnassignedUsers,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listUnassignedUsersHandler = async (
  event: ListUnassignedUsersEvent,
): Promise<TeamMemberListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "edit");

  const { page, limit, query } = event.queryStringParameters;

  return listUnassignedUsers({ page, limit, query });
};

export const handler = middyfy<
  ListUnassignedUsersEvent,
  TeamMemberListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listUnassignedUsersHandler, { eventSchema: ListUnassignedUsersEventSchema, mode: "parse" });
