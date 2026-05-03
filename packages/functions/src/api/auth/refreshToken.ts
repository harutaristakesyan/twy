import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy } from "@shared/index";
import { Resource } from "sst";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({
    refreshToken: zod.string().min(6, "Code must be at least 3 character long"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

interface RefreshTokenResponse {
  accessToken: string;
  idToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

const cognitoClient = new CognitoIdentityProviderClient({});

const refreshTokenHandler = async (event: EventSchema): Promise<RefreshTokenResponse> => {
  const userPoolClientId = Resource.UserPoolClient.id;
  const { refreshToken } = event.body;

  // 1. Try Cognito native flow
  const result = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: userPoolClientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }),
  );

  return {
    accessToken: result.AuthenticationResult?.AccessToken || "",
    idToken: result.AuthenticationResult?.IdToken,
    expiresIn: result.AuthenticationResult?.ExpiresIn,
    tokenType: result.AuthenticationResult?.TokenType,
  };
};

export const handler = middyfy<EventSchema, RefreshTokenResponse>(refreshTokenHandler, {
  skipAuth: true,
});
