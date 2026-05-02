import {
  AdminDisableUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { createUser } from "@twy/core";
import type { PostConfirmationTriggerHandler } from "aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation";

const cognitoClient = new CognitoIdentityProviderClient({});

const postConfirmationHandler: PostConfirmationTriggerHandler = async (event) => {
  try {
    const { userAttributes } = event.request;
    const id = userAttributes.sub;
    const email = userAttributes.email;
    if (!id || !email) {
      console.error("Post-confirmation event missing required attributes", { userAttributes });
      return event;
    }

    await cognitoClient.send(
      new AdminDisableUserCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
      }),
    );

    await createUser({
      id,
      email,
      firstName: userAttributes.given_name ?? null,
      lastName: userAttributes.family_name ?? null,
      isActive: false,
    });

    return event;
  } catch (error) {
    console.error("Error creating or updating user:", error);
    return event;
  }
};

export const handler = postConfirmationHandler;
