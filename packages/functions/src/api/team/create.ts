import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type CreateTeamEvent,
  CreateTeamEventSchema,
  createTeam as createTeamRecord,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const createTeam = async (event: CreateTeamEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "add");

  const { name, description, branchRestricted, onlyOwnData, permissions } = event.body;
  await createTeamRecord({ name, description, branchRestricted, onlyOwnData, permissions });

  return { message: "Team created successfully" };
};

export const handler = middyfy<
  CreateTeamEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createTeam, { eventSchema: CreateTeamEventSchema, mode: "parse" });
