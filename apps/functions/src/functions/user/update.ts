import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { updateUser as updateUserRecord } from "@libs/db/operations/userOperations";
import { MessageResponse } from "@contracts/common/response";
import {
  UpdateUserEvent,
  UpdateUserEventSchema,
} from "@contracts/user/request";
import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const userPoolId = process.env.USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

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
