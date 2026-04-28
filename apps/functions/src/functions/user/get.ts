import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getFullUserInfoById } from "@libs/db/operations/userOperations";
import { GetUserEvent, GetUserEventSchema } from "@contracts/user/request";
import { UserResponse } from "@contracts/user/response";

const getUserInfo = async (event: GetUserEvent): Promise<UserResponse> => {
  const { userId } = event.requestContext.authUser;

  return await getFullUserInfoById(userId);
};

export const handler = middyfy<
  GetUserEvent,
  UserResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getUserInfo, {
  eventSchema: GetUserEventSchema,
  mode: "parse",
});
