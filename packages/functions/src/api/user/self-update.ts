import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type SelfUpdateUserEvent,
  SelfUpdateUserEventSchema,
  updateSelfUser as updateSelfUserRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { Resource } from "sst";

const userPoolId = Resource.UserPool.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const updateSelfUser = async (event: SelfUpdateUserEvent): Promise<MessageResponse> => {
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
