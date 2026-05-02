import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type DeleteTeamEvent,
  DeleteTeamEventSchema,
  deleteTeam as deleteTeamRecord,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const deleteTeam = async (event: DeleteTeamEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "edit");

  const { teamId } = event.pathParameters;
  await deleteTeamRecord(teamId);

  return { message: "Team deleted successfully" };
};

export const handler = middyfy<
  DeleteTeamEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteTeam, { eventSchema: DeleteTeamEventSchema, mode: "parse" });
