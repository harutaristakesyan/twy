import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type DeleteUserEvent,
  DeleteUserEventSchema,
  deleteUser as deleteUserRecord,
  getFullUserInfoById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { Resource } from "sst";

const userPoolId = Resource.UserPool.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const deleteUser = async (event: DeleteUserEvent): Promise<MessageResponse> => {
  const { userId: adminId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(adminId);
  assertPermission(ctx, "users", "edit");

  const { userId } = event.pathParameters;

  const userDetails = await getFullUserInfoById(userId);

  await deleteUserRecord(userId);

  await cognitoClient.send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: userDetails.email,
    }),
  );

  return { message: "User deleted successfully" };
};

export const handler = middyfy<
  DeleteUserEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteUser, {
  eventSchema: DeleteUserEventSchema,
  mode: "parse",
});
