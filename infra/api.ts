/// <reference path="../.sst/platform/config.d.ts" />

import type { StageConfig } from "./domain";
import { allRoutes, type LinkKey } from "./routes";

interface CreateApiArgs {
  cfg: StageConfig;
  auth: {
    userPool: sst.aws.CognitoUserPool;
    userPoolClient: ReturnType<sst.aws.CognitoUserPool["addClient"]>;
  };
  db: { cluster: sst.aws.Aurora };
  filesBucket: sst.aws.Bucket;
}

/**
 * ApiGatewayV2 + JWT (Cognito) authorizer + auto-wired routes.
 *
 * Replaces:
 *   - apps/infra/bin/stacks/gateway-stack.ts (HttpApi + JWT authorizer + SSM
 *     publishing of /${envName}/lambda/http-api-id and
 *     /${envName}/cognito/jwt-authorizer-id).
 *   - apps/auth/bin/{cdk,functionStack}.ts and
 *     apps/functions/bin/{cdk,functionStack}.ts (the duplicated
 *     HttpLambdaRouter + LambdaRouteDefinition + per-route NodejsFunction
 *     instantiation + manual IAM policy attachments).
 *
 * The single typed table at infra/routes.ts drives every Function and
 * api.route() call.
 */
export function createApi(args: CreateApiArgs) {
  const { cfg, auth, db, filesBucket } = args;

  const allowedOrigins = cfg.hasCustomDomain
    ? [
        `https://${cfg.primaryDomain}`,
        ...cfg.aliases.map((d) => `https://${d}`),
        "http://localhost:3000",
      ]
    : ["http://localhost:3000"];

  const api = new sst.aws.ApiGatewayV2("Api", {
    cors: {
      allowOrigins: allowedOrigins,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "Accept"],
      allowCredentials: false,
      maxAge: "1 hour",
    },
  });

  const jwt = api.addAuthorizer({
    name: "Cognito",
    jwt: {
      issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().region}.amazonaws.com/${auth.userPool.id}`,
      audiences: [auth.userPoolClient.id],
    },
  });

  const linkRegistry: Record<
    LinkKey,
    | sst.aws.Aurora
    | sst.aws.CognitoUserPool
    | sst.aws.Bucket
    | ReturnType<sst.aws.CognitoUserPool["addClient"]>
  > = {
    cluster: db.cluster,
    userPool: auth.userPool,
    userPoolClient: auth.userPoolClient,
    filesBucket,
  };

  for (const route of allRoutes) {
    const links = route.linkKeys.map((k) => linkRegistry[k]);
    api.route(
      route.routeKey,
      {
        handler: route.handler,
        link: links,
        architecture: "arm64",
        runtime: "nodejs24.x",
        memory: "256 MB",
        timeout: "15 seconds",
        logging: { retention: "3 days" },
      },
      {
        auth: route.requiresAuth ? { jwt: { authorizer: jwt.id } } : undefined,
      },
    );
  }

  return { api, jwtAuthorizer: jwt };
}
