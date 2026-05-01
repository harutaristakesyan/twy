import {
  CognitoIdentityProviderClient,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@twy/lambda-shared";
import errors from "http-errors";
import { Resource } from "sst";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({
    email: zod.string().min(6, "Code must be at least 3 character long"),
    password: zod.string().min(6, "Code must be at least 3 character long"),
    firstName: zod.string().min(6, "Code must be at least 3 character long"),
    lastName: zod.string().min(6, "Code must be at least 3 character long"),
  }),
});

type EventSchema = zod.infer<typeof EventSchema>;

interface SignUpResponse {
  userSub: string;
  message: string;
}

const userPoolClientId = Resource.UserPoolClient.id;

const cognitoClient = new CognitoIdentityProviderClient({});

const signUpHandler = async (event: EventSchema): Promise<SignUpResponse> => {
  const { email, password, firstName, lastName } = event.body;

  try {
    const command = new SignUpCommand({
      ClientId: userPoolClientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        ...(firstName ? [{ Name: "given_name", Value: firstName }] : []),
        ...(lastName ? [{ Name: "family_name", Value: lastName }] : []),
      ],
    });

    const result = await cognitoClient.send(command);

    if (!result.UserSub) {
      throw new Error("Cognito SignUp returned no UserSub");
    }

    return {
      userSub: result.UserSub,
      message: "Verification code sent to email",
    };
  } catch (error) {
    throw new errors.BadRequest(toError(error).message);
  }
};

export const handler = middyfy<EventSchema, SignUpResponse>(signUpHandler);
