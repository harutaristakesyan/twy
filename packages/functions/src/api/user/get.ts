import { type GetUserEvent, GetUserEventSchema } from "@contracts/user/request";
import type { UserResponse } from "@contracts/user/response";
import { middyfy } from "@shared/index";
import { getFullUserInfoById } from "@twy/db";
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
