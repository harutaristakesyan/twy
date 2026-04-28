import { type GetUserEvent, GetUserEventSchema } from "@contracts/user/request";
import type { UserResponse } from "@contracts/user/response";
import { getFullUserInfoById } from "@libs/db/operations/userOperations";
import { middyfy } from "@twy/lambda-shared";
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
