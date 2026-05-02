import { middyfy } from "@shared/index";
import type { PermissionsMap, TeamResponse } from "@twy/core";
import { AuthContext, getTeamWithPermissions, loadAuthContext } from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import z from "zod";

const MeEventSchema = z.object({
  requestContext: AuthContext,
});

type MeEvent = z.infer<typeof MeEventSchema>;

interface MeResponse {
  user: {
    id: string;
    branchId: string | null;
    teamId: string | null;
  };
  team: Pick<TeamResponse, "id" | "name" | "branchRestricted" | "onlyOwnData"> | null;
  permissions: PermissionsMap;
}

const getMe = async (event: MeEvent): Promise<MeResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);

  let team: MeResponse["team"] = null;
  if (ctx.teamId) {
    const teamRow = await getTeamWithPermissions(ctx.teamId);
    if (teamRow) {
      team = {
        id: teamRow.id,
        name: teamRow.name,
        branchRestricted: teamRow.branchRestricted,
        onlyOwnData: teamRow.onlyOwnData,
      };
    }
  }

  return {
    user: {
      id: userId,
      branchId: ctx.branchId,
      teamId: ctx.teamId,
    },
    team,
    permissions: ctx.permissions,
  };
};

export const handler = middyfy<MeEvent, MeResponse, APIGatewayProxyEventV2WithJWTAuthorizer>(
  getMe,
  { eventSchema: MeEventSchema, mode: "parse" },
);
