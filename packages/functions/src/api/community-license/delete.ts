import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type DeleteCommunityLicenseEvent,
  DeleteCommunityLicenseEventSchema,
  deleteCommunityLicense,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const handler_ = async (event: DeleteCommunityLicenseEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "settings", "delete");

  const { ciId } = event.pathParameters;

  const removed = await deleteCommunityLicense(ciId);

  if (!removed) {
    throw new createError.NotFound("Community license not found");
  }

  return { message: "Community license deleted successfully" };
};

export const handler = middyfy<
  DeleteCommunityLicenseEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(handler_, {
  eventSchema: DeleteCommunityLicenseEventSchema,
  mode: "parse",
});
