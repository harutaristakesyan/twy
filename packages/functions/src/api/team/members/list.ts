import { middyfy } from "@shared/index";
import type { TeamMemberListResponse } from "@twy/core";
import {
  assertPermission,
  type ListTeamMembersEvent,
  ListTeamMembersEventSchema,
  listTeamMembers,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listTeamMembersHandler = async (
  event: ListTeamMembersEvent,
): Promise<TeamMemberListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "view");

  const { teamId } = event.pathParameters;
  const { page, limit, query } = event.queryStringParameters;

  return listTeamMembers({ teamId, page, limit, query });
};

export const handler = middyfy<
  ListTeamMembersEvent,
  TeamMemberListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listTeamMembersHandler, { eventSchema: ListTeamMembersEventSchema, mode: "parse" });
