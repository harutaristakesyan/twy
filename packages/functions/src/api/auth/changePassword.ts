import {
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@shared/index";
import errors from "http-errors";
import z from "zod";

const EventSchema = z.object({
  headers: z.object({
    authorization: z.string(),
  }),
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
  }),
});

type ChangePasswordEvent = z.infer<typeof EventSchema>;

interface ChangePasswordResponse {
  message: string;
}

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
    throw new errors.BadRequest(error.message);
  }
};

export const handler = middyfy<ChangePasswordEvent, ChangePasswordResponse>(changePasswordHandler, {
  eventSchema: EventSchema,
  mode: "parse",
});
