import { middyfy } from "@shared/index";
import type { UserResponse } from "@twy/core";
import {
  assertPermission,
  type GetUserEvent,
  GetUserEventSchema,
  getFullUserInfoById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const getUser = async (event: GetUserEvent): Promise<UserResponse> => {
  const { userId: callerId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(callerId);
  assertPermission(ctx, "users", "view");

  const { userId } = event.pathParameters;
  return await getFullUserInfoById(userId);
};

export const handler = middyfy<GetUserEvent, UserResponse, APIGatewayProxyEventV2WithJWTAuthorizer>(
  getUser,
  {
    eventSchema: GetUserEventSchema,
    mode: "parse",
  },
);
