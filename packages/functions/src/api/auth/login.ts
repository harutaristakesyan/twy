import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@shared/index";
import errors from "http-errors";
import { Resource } from "sst";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({
    email: zod.string().min(6, "Code must be at least 3 character long"),
    password: zod.string().min(8, "Code must be at least 8 character long"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

const userPoolClientId = Resource.UserPoolClient.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const loginHandler = async (event: EventSchema): Promise<LoginResponse> => {
  const { email, password } = event.body;

  try {
    const result = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: userPoolClientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
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
  } catch (error) {
    throw new errors.BadRequest(toError(error).message);
  }
};

export const handler = middyfy(loginHandler);
