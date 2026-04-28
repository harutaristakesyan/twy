import {
  CognitoIdentityProviderClient,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { toError } from "@twy/lambda-shared";
import { middyfy } from "@twy/lambda-shared";
import * as zod from "zod";
import errors from "http-errors";

const EventSchema = zod.object({
  body: zod.object({
    email: zod.string().min(6, "Code must be at least 3 character long"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

interface ResendCodeResponse {
  message: string;
}

const userPoolClientId = process.env.USER_POOL_CLIENT_ID!;

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const resendVerificationCodeHandler = async (
  event: EventSchema,
): Promise<ResendCodeResponse> => {
  const { email } = event.body;

  try {
    await cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: userPoolClientId,
        Username: email,
      }),
    );

    return {
      message: `Verification code resent to ${email}`,
    };
  } catch (error) {
    throw new errors.BadRequest(toError(error).message);
  }
};

export const handler = middyfy<EventSchema, ResendCodeResponse>(
  resendVerificationCodeHandler,
);
