import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@shared/index";
import {
  assertPermission,
  type CreateUserEvent,
  CreateUserEventSchema,
  createUser,
  loadAuthContext,
  type MessageResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { Resource } from "sst";

const cognitoClient = new CognitoIdentityProviderClient({});

const createUserHandler = async (event: CreateUserEvent): Promise<MessageResponse> => {
  const { userId: adminId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(adminId);
  assertPermission(ctx, "users", "add");

  const { email, firstName, lastName, branch, teamId, isActive } = event.body;

  let sub: string;
  try {
    const result = await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: Resource.UserPool.id,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "given_name", Value: firstName },
          { Name: "family_name", Value: lastName },
        ],
      }),
    );
    const subAttr = result.User?.Attributes?.find((a) => a.Name === "sub")?.Value;
    if (!subAttr) throw new Error("Cognito did not return a sub attribute");
    sub = subAttr;
  } catch (err: unknown) {
    const e = toError(err);
    if (e.name === "UsernameExistsException")
      throw createError(409, "A user with this email already exists");
    throw createError(500, "Failed to create user");
  }

  try {
    await createUser({
      id: sub,
      email,
      firstName,
      lastName,
      branch: branch ?? undefined,
      teamId: teamId ?? undefined,
      isActive,
      createdBy: adminId,
    });
  } catch {
    await cognitoClient
      .send(new AdminDeleteUserCommand({ UserPoolId: Resource.UserPool.id, Username: email }))
      .catch(() => undefined);
    throw createError(500, "Failed to save user to database");
  }

  if (!isActive) {
    await cognitoClient
      .send(new AdminDisableUserCommand({ UserPoolId: Resource.UserPool.id, Username: email }))
      .catch(() => undefined);
  }

  return { message: "User created successfully" };
};

export const handler = middyfy<
  CreateUserEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createUserHandler, { eventSchema: CreateUserEventSchema, mode: "parse" });
