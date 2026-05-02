import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { MessageResponse } from "@contracts/common/response";
import { type DeleteUserEvent, DeleteUserEventSchema } from "@contracts/user/request";
import { middyfy } from "@shared/index";
import { deleteUser as deleteUserRecord } from "@twy/db";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { Resource } from "sst";

const userPoolId = Resource.UserPool.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const deleteUser = async (event: DeleteUserEvent): Promise<MessageResponse> => {
  const { userId } = event.pathParameters;

  const removed = await deleteUserRecord(userId);

  if (!removed) {
    throw new createError.NotFound("User not found");
  }

  // Delete user from Cognito
  await cognitoClient.send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: userId,
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
