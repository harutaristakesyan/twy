import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  loadAuthContext,
  type UpdateTeamEvent,
  UpdateTeamEventSchema,
  updateTeam as updateTeamRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const updateTeam = async (event: UpdateTeamEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "edit");

  const { teamId } = event.pathParameters;
  const { name, description, branchRestricted, onlyOwnData, permissions } = event.body;
  await updateTeamRecord(teamId, { name, description, branchRestricted, onlyOwnData, permissions });

  return { message: "Team updated successfully" };
};

export const handler = middyfy<
  UpdateTeamEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateTeam, { eventSchema: UpdateTeamEventSchema, mode: "parse" });
