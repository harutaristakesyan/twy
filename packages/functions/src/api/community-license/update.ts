import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  loadAuthContext,
  type UpdateCommunityLicenseEvent,
  UpdateCommunityLicenseEventSchema,
  updateCommunityLicense,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const handler_ = async (event: UpdateCommunityLicenseEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "settings", "edit");

  const { ciId } = event.pathParameters;
  const { ciNumber, validFrom, validTo } = event.body;

  const updated = await updateCommunityLicense(ciId, { ciNumber, validFrom, validTo });

  if (!updated) {
    throw new createError.NotFound("Community license not found");
  }

  return { message: "Community license updated successfully" };
};

export const handler = middyfy<
  UpdateCommunityLicenseEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(handler_, {
  eventSchema: UpdateCommunityLicenseEventSchema,
  mode: "parse",
});
