import {
  CognitoIdentityProviderClient,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@shared/index";
import errors from "http-errors";
import { Resource } from "sst";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({
    email: zod.string().min(6, "Code must be at least 3 character long"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

interface ResendCodeResponse {
  message: string;
}

const cognitoClient = new CognitoIdentityProviderClient({});

const resendVerificationCodeHandler = async (event: EventSchema): Promise<ResendCodeResponse> => {
  const userPoolClientId = Resource.UserPoolClient.id;
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

export const handler = middyfy<EventSchema, ResendCodeResponse>(resendVerificationCodeHandler);
