import {
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { createUser } from "@twy/core";
import type { PostConfirmationTriggerHandler } from "aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation";

const cognitoClient = new CognitoIdentityProviderClient({});

const postConfirmationHandler: PostConfirmationTriggerHandler = async (event) => {
  const { userAttributes } = event.request;
  const cognitoSub = userAttributes.sub;
  const email = userAttributes.email;

  if (!cognitoSub || !email) {
    console.error("Post-confirmation event missing required attributes", { userAttributes });
    return event;
  }

  const appUserId = crypto.randomUUID();

  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      UserAttributes: [{ Name: "custom:appUserId", Value: appUserId }],
    }),
  );

  await cognitoClient.send(
    new AdminDisableUserCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
    }),
  );

  try {
    await createUser({
      id: appUserId,
      cognitoSub,
      email,
      firstName: userAttributes.given_name ?? null,
      lastName: userAttributes.family_name ?? null,
      isActive: false,
      createdBy: appUserId,
      teamId: null,
    });
  } catch (err) {
    try {
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: event.userPoolId,
          Username: event.userName,
        }),
      );
    } catch {
      console.error("Failed to delete Cognito user during rollback — manual cleanup required");
    }
    throw err;
  }

  return event;
};

export const handler = postConfirmationHandler;
