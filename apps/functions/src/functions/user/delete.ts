import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { MessageResponse } from "@contracts/common/response";
import { type DeleteUserEvent, DeleteUserEventSchema } from "@contracts/user/request";
import { deleteUser as deleteUserRecord } from "@libs/db/operations/userOperations";
import { middyfy } from "@twy/lambda-shared";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const userPoolId = process.env.USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

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
