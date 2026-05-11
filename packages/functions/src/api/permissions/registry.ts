import { middyfy } from "@shared/index";
import { assertPermission, expandRegistry, loadAuthContext, type RegistryEntry } from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

type RegistryResponse = { entities: RegistryEntry[] };

type RegistryEvent = APIGatewayProxyEventV2WithJWTAuthorizer & {
  requestContext: APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"] & {
    authUser: { userId: string };
  };
};

const getRegistry = async (event: RegistryEvent): Promise<RegistryResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "teams", "view");

  return { entities: expandRegistry() };
};

export const handler = middyfy<
  RegistryEvent,
  RegistryResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getRegistry);
