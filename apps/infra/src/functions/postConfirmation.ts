import * as console from "node:console";
import {
  AdminDisableUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { createUser } from "@libs/db/operations/userOperations";
import type { PostConfirmationTriggerHandler } from "aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const postConfirmationHandler: PostConfirmationTriggerHandler = async (event) => {
  try {
    const { userAttributes } = event.request;
    const { sub: id, email, given_name: firstName, family_name: lastName } = userAttributes;

    await cognitoClient.send(
      new AdminDisableUserCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
      }),
    );

    await createUser({
      id,
      email,
      firstName,
      lastName,
      isActive: false,
    });

    return event;
  } catch (error) {
    console.error("Error creating or updating user:", error);
    return event;
  }
};

export const handler = postConfirmationHandler;
