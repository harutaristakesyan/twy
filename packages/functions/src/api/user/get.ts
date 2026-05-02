import { middyfy } from "@shared/index";
import type { UserResponse } from "@twy/core";
import { type GetUserEvent, GetUserEventSchema, getFullUserInfoById } from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const getUserInfo = async (event: GetUserEvent): Promise<UserResponse> => {
  const { userId } = event.requestContext.authUser;

  return await getFullUserInfoById(userId);
};

export const handler = middyfy<GetUserEvent, UserResponse, APIGatewayProxyEventV2WithJWTAuthorizer>(
  getUserInfo,
  {
    eventSchema: GetUserEventSchema,
    mode: "parse",
  },
);
