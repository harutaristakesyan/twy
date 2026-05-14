import { middyfy } from "@shared/index";
import type { CommunityLicenseListResponse } from "@twy/core";
import {
  assertPermission,
  type ListCommunityLicensesEvent,
  ListCommunityLicensesEventSchema,
  listCommunityLicenses,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const handler_ = async (
  event: ListCommunityLicensesEvent,
): Promise<CommunityLicenseListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "settings", "view");

  const { page, limit, sortField, sortOrder, query } = event.queryStringParameters;

  return listCommunityLicenses({ page, limit, sortField, sortOrder, query });
};

export const handler = middyfy<
  ListCommunityLicensesEvent,
  CommunityLicenseListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(handler_, {
  eventSchema: ListCommunityLicensesEventSchema,
  mode: "parse",
});
