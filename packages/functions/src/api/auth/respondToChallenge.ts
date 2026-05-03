import {
  CognitoIdentityProviderClient,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@shared/index";
import errors from "http-errors";
import { Resource } from "sst";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({
    challengeName: zod.literal("NEW_PASSWORD_REQUIRED"),
    session: zod.string(),
    email: zod.string().email(),
    newPassword: zod.string().min(8, "Password must be at least 8 characters"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

interface TokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

const cognitoClient = new CognitoIdentityProviderClient({});

const respondToChallengeHandler = async (event: EventSchema): Promise<TokenResponse> => {
  const { session, email, newPassword } = event.body;

  try {
    const result = await cognitoClient.send(
      new RespondToAuthChallengeCommand({
        ClientId: Resource.UserPoolClient.id,
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: session,
        ChallengeResponses: {
          USERNAME: email,
          NEW_PASSWORD: newPassword,
        },
      }),
    );

    const auth = result.AuthenticationResult;

    if (!auth?.AccessToken || !auth.IdToken || !auth.RefreshToken) {
      throw new Error("Invalid authentication result");
    }

    return {
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
    };
  } catch (err) {
    const e = toError(err);
    if (e.name === "NotAuthorizedException") {
      throw new errors.Unauthorized("Session expired, please log in again");
    }
    if (e.name === "InvalidPasswordException") {
      throw new errors.BadRequest(e.message);
    }
    throw new errors.BadRequest(e.message);
  }
};

export const handler = middyfy<EventSchema, TokenResponse>(respondToChallengeHandler, {
  eventSchema: EventSchema,
  mode: "parse",
  skipAuth: true,
});
