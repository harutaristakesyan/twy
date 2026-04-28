import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, requireEnv, toError } from "@twy/lambda-shared";
import errors from "http-errors";
import * as zod from "zod";

interface ForgotPasswordResponse {
  message: string;
}

const EventSchema = zod.object({
  body: zod.object({
    email: zod.string().min(6, "Code must be at least 3 character long"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

const userPoolClientId = requireEnv("USER_POOL_CLIENT_ID");

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const forgotPasswordHandler = async (event: EventSchema): Promise<ForgotPasswordResponse> => {
  const { email } = event.body;

  try {
    await cognitoClient.send(
      new ForgotPasswordCommand({
        ClientId: userPoolClientId,
        Username: email,
      }),
    );

    return { message: "Verification code sent to email" };
  } catch (error) {
    throw new errors.BadRequest(toError(error).message);
  }
};

export const handler = middyfy<EventSchema, ForgotPasswordResponse>(forgotPasswordHandler);
