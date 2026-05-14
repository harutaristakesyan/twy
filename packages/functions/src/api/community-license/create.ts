import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type CreateCommunityLicenseEvent,
  CreateCommunityLicenseEventSchema,
  createCommunityLicense,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const handler_ = async (event: CreateCommunityLicenseEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "settings", "add");

  const { ciNumber, validFrom, validTo } = event.body;

  await createCommunityLicense({ ciNumber, validFrom, validTo, createdBy: userId });

  return { message: "Community license created successfully" };
};

export const handler = middyfy<
  CreateCommunityLicenseEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(handler_, {
  eventSchema: CreateCommunityLicenseEventSchema,
  mode: "parse",
});
