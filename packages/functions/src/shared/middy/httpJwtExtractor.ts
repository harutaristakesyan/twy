import type middy from "@middy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export const httpJwtExtractor =
  (): middy.MiddlewareObj<APIGatewayProxyEventV2WithJWTAuthorizer> => {
    return {
      before: (request: middy.Request<APIGatewayProxyEventV2WithJWTAuthorizer>) => {
        const authorizer = request.event.requestContext?.authorizer;
        if (!authorizer) {
          console.warn("⚠️ No authorizer found in request context");
          return;
        }

        const claims = authorizer.jwt?.claims;
        if (!claims) {
          console.warn("⚠️ No JWT claims found");
          return;
        }

        if (!claims.sub) {
          console.warn('⚠️ JWT "sub" claim is missing');
          return;
        }

        const user = {
          userId: String(claims.sub),
        };

        request.event.requestContext = {
          ...request.event.requestContext,
          authUser: user,
        } as APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"];
      },
    };
  };
