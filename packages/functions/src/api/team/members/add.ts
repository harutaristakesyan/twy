import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type AddTeamMemberEvent,
  AddTeamMemberEventSchema,
  addMemberToTeam,
  assertPermission,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const addTeamMemberHandler = async (event: AddTeamMemberEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "edit");

  const { teamId } = event.pathParameters;
  const { userId: memberId } = event.body;

  await addMemberToTeam(teamId, memberId);

  return { message: "Member added successfully" };
};

export const handler = middyfy<
  AddTeamMemberEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(addTeamMemberHandler, { eventSchema: AddTeamMemberEventSchema, mode: "parse" });
