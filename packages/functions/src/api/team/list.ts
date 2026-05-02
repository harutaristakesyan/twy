import { middyfy } from "@shared/index";
import type { TeamListResponse } from "@twy/core";
import {
  assertPermission,
  type ListTeamsEvent,
  ListTeamsEventSchema,
  listTeams as listTeamRecords,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listTeams = async (event: ListTeamsEvent): Promise<TeamListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "view");

  const { page, limit, sortOrder, query } = event.queryStringParameters;
  return listTeamRecords({ page, limit, sortOrder, query });
};

export const handler = middyfy<
  ListTeamsEvent,
  TeamListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listTeams, { eventSchema: ListTeamsEventSchema, mode: "parse" });
