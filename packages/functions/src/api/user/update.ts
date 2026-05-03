import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  getFullUserInfoById,
  loadAuthContext,
  type UpdateUserEvent,
  UpdateUserEventSchema,
  updateUser as updateUserRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { Resource } from "sst";

const userPoolId = Resource.UserPool.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const updateUser = async (event: UpdateUserEvent): Promise<MessageResponse> => {
  const { userId: adminId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(adminId);
  assertPermission(ctx, "users", "edit");

  const { userId } = event.pathParameters;
  const { branch, teamId, isActive } = event.body;

  const userDetails = await getFullUserInfoById(userId);

  await updateUserRecord(userId, {
    branchId: typeof branch === "undefined" ? undefined : branch,
    teamId: typeof teamId === "undefined" ? undefined : teamId,
    isActive,
  });

  if (typeof isActive !== "undefined") {
    if (isActive) {
      await cognitoClient.send(
        new AdminEnableUserCommand({
          UserPoolId: userPoolId,
          Username: userDetails.email,
        }),
      );
    } else {
      await cognitoClient.send(
        new AdminDisableUserCommand({
          UserPoolId: userPoolId,
          Username: userDetails.email,
        }),
      );
    }
  }

  return { message: "User updated successfully" };
};

export const handler = middyfy<
  UpdateUserEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateUser, {
  eventSchema: UpdateUserEventSchema,
  mode: "parse",
});
