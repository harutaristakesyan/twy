import { middyfy } from "@shared/index";
import type { TeamResponse } from "@twy/core";
import {
  assertPermission,
  type GetTeamEvent,
  GetTeamEventSchema,
  getTeamWithPermissions,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getTeam = async (event: GetTeamEvent): Promise<TeamResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "view");

  const { teamId } = event.pathParameters;
  const team = await getTeamWithPermissions(teamId);
  if (team === null) {
    throw new createError.NotFound("Team not found");
  }

  return team;
};

export const handler = middyfy<GetTeamEvent, TeamResponse, APIGatewayProxyEventV2WithJWTAuthorizer>(
  getTeam,
  { eventSchema: GetTeamEventSchema, mode: "parse" },
);
