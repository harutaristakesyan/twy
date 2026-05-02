import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { MessageResponse } from "@contracts/common/response";
import { type UpdateUserEvent, UpdateUserEventSchema } from "@contracts/user/request";
import { updateUser as updateUserRecord } from "@twy/db";
import { middyfy } from "@twy/lambda-shared";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { Resource } from "sst";

const userPoolId = Resource.UserPool.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const updateUser = async (event: UpdateUserEvent): Promise<MessageResponse> => {
  const { userId } = event.pathParameters;
  const { branch, role, isActive } = event.body;

  const updated = await updateUserRecord(userId, {
    branchId: typeof branch === "undefined" ? undefined : branch,
    role: typeof role === "undefined" ? undefined : role,
    isActive,
  });

  if (!updated) {
    throw new createError.NotFound("User not found");
  }

  if (typeof isActive !== "undefined") {
    if (isActive) {
      await cognitoClient.send(
        new AdminEnableUserCommand({
          UserPoolId: userPoolId,
          Username: userId,
        }),
      );
    } else {
      await cognitoClient.send(
        new AdminDisableUserCommand({
          UserPoolId: userPoolId,
          Username: userId,
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
