import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@shared/index";
import errors from "http-errors";
import { Resource } from "sst";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({
    email: zod.string().min(6, "Code must be at least 3 character long"),
    code: zod.string().min(6, "Code must be at least 3 character long"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

interface VerificationResponse {
  message: string;
}

const userPoolClientId = Resource.UserPoolClient.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const verificationHandler = async (event: EventSchema): Promise<VerificationResponse> => {
  const { email, code } = event.body;

  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: userPoolClientId,
        Username: email,
        ConfirmationCode: code,
      }),
    );

    return { message: "Account successfully verified" };
  } catch (error) {
    throw new errors.BadRequest(toError(error).message);
  }
};

export const handler = middyfy<EventSchema, VerificationResponse>(verificationHandler);
