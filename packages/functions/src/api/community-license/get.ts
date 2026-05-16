import { middyfy } from "@shared/index";
import type { CommunityLicense } from "@twy/core";
import {
  assertPermission,
  type GetCommunityLicenseEvent,
  GetCommunityLicenseEventSchema,
  getCommunityLicenseById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getCommunityLicense = async (event: GetCommunityLicenseEvent): Promise<CommunityLicense> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "settings", "view");

  const { ciId } = event.pathParameters;
  const ci = await getCommunityLicenseById(ciId);
  if (ci === null) {
    throw new createError.NotFound("Community license not found");
  }

  return ci;
};

export const handler = middyfy<
  GetCommunityLicenseEvent,
  CommunityLicense,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getCommunityLicense, { eventSchema: GetCommunityLicenseEventSchema, mode: "parse" });
