import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { updateSelfUser as updateSelfUserRecord } from "@libs/db/operations/userOperations";
import { MessageResponse } from "@contracts/common/response";
import {
  SelfUpdateUserEvent,
  SelfUpdateUserEventSchema,
} from "@contracts/user/request";
import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const userPoolId = process.env.USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const updateSelfUser = async (
  event: SelfUpdateUserEvent,
): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const { firstName, lastName } = event.body;

  const updated = await updateSelfUserRecord(userId, { firstName, lastName });

  if (!updated) {
    throw new createError.NotFound("User not found");
  }

  // Update user attributes in Cognito
  const userAttributes = [];

  if (typeof firstName !== "undefined" && firstName !== null) {
    userAttributes.push({
      Name: "given_name",
      Value: firstName,
    });
  }

  if (typeof lastName !== "undefined" && lastName !== null) {
    userAttributes.push({
      Name: "family_name",
      Value: lastName,
    });
  }

  if (userAttributes.length > 0) {
    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: userId,
        UserAttributes: userAttributes,
      }),
    );
  }

  return { message: "User updated successfully" };
};

export const handler = middyfy<
  SelfUpdateUserEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateSelfUser, {
  eventSchema: SelfUpdateUserEventSchema,
  mode: "parse",
});
