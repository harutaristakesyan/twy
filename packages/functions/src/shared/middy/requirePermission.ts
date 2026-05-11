import type middy from "@middy/core";
import type { Entity, PermissionAction } from "@twy/core";
import { assertPermission, loadAuthContext } from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

type AugmentedRequestContext = APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"] & {
  authUser: { userId: string };
};

export const requirePermission = (
  entity: Entity,
  action: PermissionAction,
): middy.MiddlewareObj<APIGatewayProxyEventV2WithJWTAuthorizer> => ({
  before: async (request: middy.Request<APIGatewayProxyEventV2WithJWTAuthorizer>) => {
    const rc = request.event.requestContext as AugmentedRequestContext;
    const { userId } = rc.authUser;
    const ctx = await loadAuthContext(userId);
    assertPermission(ctx, entity, action);
    (rc as AugmentedRequestContext & { authCtx: typeof ctx }).authCtx = ctx;
  },
});
