import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy } from "@twy/lambda-shared";
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

const userPoolClientId = process.env.USER_POOL_CLIENT_ID!;
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const refreshTokenHandler = async (
  event: EventSchema,
): Promise<RefreshTokenResponse> => {
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

export const handler = middyfy<EventSchema, RefreshTokenResponse>(
  refreshTokenHandler,
);
