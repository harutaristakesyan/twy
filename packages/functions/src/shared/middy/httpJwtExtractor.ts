import type middy from "@middy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";
import { z } from "zod";

export const httpJwtExtractor =
  (): middy.MiddlewareObj<APIGatewayProxyEventV2WithJWTAuthorizer> => {
    return {
      before: (request: middy.Request<APIGatewayProxyEventV2WithJWTAuthorizer>) => {
        const authorizer = request.event.requestContext?.authorizer;
        if (!authorizer) {
          throw new errors.Unauthorized("missing JWT authorizer");
        }

        const claims = authorizer.jwt?.claims;
        if (!claims) {
          throw new errors.Unauthorized("missing JWT claims");
        }

        const parsed = z.uuid().safeParse(claims.app_user_id);
        if (!parsed.success) {
          throw new errors.Unauthorized("missing or invalid app_user_id claim");
        }

        request.event.requestContext = {
          ...request.event.requestContext,
          authUser: { userId: parsed.data },
        } as APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"];
      },
    };
  };
