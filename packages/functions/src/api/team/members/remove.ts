import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  loadAuthContext,
  type RemoveTeamMemberEvent,
  RemoveTeamMemberEventSchema,
  removeMemberFromTeam,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const removeTeamMemberHandler = async (event: RemoveTeamMemberEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "edit");

  const { teamId, userId: memberId } = event.pathParameters;

  await removeMemberFromTeam(teamId, memberId);

  return { message: "Member removed successfully" };
};

export const handler = middyfy<
  RemoveTeamMemberEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(removeTeamMemberHandler, { eventSchema: RemoveTeamMemberEventSchema, mode: "parse" });
