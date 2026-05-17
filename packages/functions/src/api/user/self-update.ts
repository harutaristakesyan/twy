import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  getUserEmail,
  type SelfUpdateUserEvent,
  SelfUpdateUserEventSchema,
  updateSelfUser as updateSelfUserRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { Resource } from "sst";

const userPoolId = Resource.UserPool.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const updateSelfUser = async (event: SelfUpdateUserEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const { firstName, lastName, phone, profilePictureFileId } = event.body;

  const cognitoAttributes = [];

  if (typeof firstName !== "undefined" && firstName !== null) {
    cognitoAttributes.push({ Name: "given_name", Value: firstName });
  }

  if (typeof lastName !== "undefined" && lastName !== null) {
    cognitoAttributes.push({ Name: "family_name", Value: lastName });
  }

  const dbUpdate = updateSelfUserRecord(userId, {
    firstName,
    lastName,
    phone,
    profilePictureFileId,
  });

  if (cognitoAttributes.length > 0) {
    const [email] = await Promise.all([getUserEmail(userId), dbUpdate]);
    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: cognitoAttributes,
      }),
    );
  } else {
    await dbUpdate;
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
