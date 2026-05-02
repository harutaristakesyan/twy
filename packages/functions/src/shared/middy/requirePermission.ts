import type middy from "@middy/core";
import type { Action, Resource } from "@twy/core";
import { assertPermission, loadAuthContext } from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export const requirePermission = (
  resource: Resource,
  action: Action,
): middy.MiddlewareObj<APIGatewayProxyEventV2WithJWTAuthorizer> => ({
  before: async (request) => {
    const { userId } = (
      request.event.requestContext as APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"] & {
        authUser: { userId: string };
      }
    ).authUser;

    const ctx = await loadAuthContext(userId);
    assertPermission(ctx, resource, action);

    request.event.requestContext = {
      ...request.event.requestContext,
      authContext: ctx,
    } as APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"];
  },
});
