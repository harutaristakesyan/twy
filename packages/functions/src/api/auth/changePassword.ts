import {
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { ChangePasswordEvent } from "@contracts/auth/request";
import { ChangePasswordEventSchema } from "@contracts/auth/request";
import type { ChangePasswordResponse } from "@contracts/auth/response";
import { middyfy, toError } from "@shared/index";
import errors from "http-errors";

const cognitoClient = new CognitoIdentityProviderClient({});

const changePasswordHandler = async (
  event: ChangePasswordEvent,
): Promise<ChangePasswordResponse> => {
  const accessToken = event.headers.authorization.replace(/^Bearer\s+/i, "");
  const { currentPassword, newPassword } = event.body;

  try {
    await cognitoClient.send(
      new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      }),
    );

    return { message: "Password changed successfully" };
  } catch (err) {
    const error = toError(err);
    if (error.name === "NotAuthorizedException") {
      throw new errors.Unauthorized("Current password is incorrect");
    }
    if (error.name === "InvalidPasswordException") {
      throw new errors.BadRequest("New password does not meet requirements");
    }
    if (error.name === "LimitExceededException") {
      throw new errors.TooManyRequests("Too many attempts, please try again later");
    }
    throw new errors.InternalServerError("Failed to change password");
  }
};

export const handler = middyfy<ChangePasswordEvent, ChangePasswordResponse>(changePasswordHandler, {
  eventSchema: ChangePasswordEventSchema,
  mode: "parse",
});
