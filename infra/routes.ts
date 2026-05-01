/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Single typed route table — replaces the duplicated route definitions in
 * apps/auth/bin/functionStack.ts and apps/functions/bin/functionStack.ts.
 *
 * `linkKeys` names the resources from infra/api.ts that this handler needs.
 * `requiresAuth: true` attaches the Cognito JWT authorizer; `false` (or
 * unset) leaves the route public (Cognito sign-in flows themselves).
 */
export type LinkKey = "cluster" | "userPool" | "userPoolClient" | "filesBucket";

export interface RouteDef {
  /** Path to the handler entry, including the exported name (default `handler`). */
  handler: string;
  /** API Gateway v2 route key, e.g. `POST /api/login`. */
  routeKey: string;
  /** Whether the JWT authorizer should gate this route. */
  requiresAuth?: boolean;
  /** Resources to make available via the SST Resource SDK + IAM. */
  linkKeys: LinkKey[];
}

/** Public Cognito flows — apps/auth/src/functions/*.ts handlers. */
export const authRoutes: RouteDef[] = [
  {
    handler: "apps/auth/src/functions/signUp.handler",
    routeKey: "POST /api/signup",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "apps/auth/src/functions/login.handler",
    routeKey: "POST /api/login",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "apps/auth/src/functions/verify.handler",
    routeKey: "POST /api/verify",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "apps/auth/src/functions/resendVerificationCode.handler",
    routeKey: "POST /api/resend-code",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "apps/auth/src/functions/forgotPassword.handler",
    routeKey: "POST /api/forgot-password",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "apps/auth/src/functions/confirmForgotPassword.handler",
    routeKey: "POST /api/create-password",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "apps/auth/src/functions/refreshToken.handler",
    routeKey: "POST /api/refresh-token",
    linkKeys: ["userPoolClient"],
  },
];

/** JWT-protected domain endpoints — handlers under apps/functions/src/functions/. */
export const appRoutes: RouteDef[] = [
  // user
  {
    handler: "apps/functions/src/functions/user/get.handler",
    routeKey: "GET /api/user",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/user/self-update.handler",
    routeKey: "PATCH /api/user",
    requiresAuth: true,
    linkKeys: ["cluster", "userPool"],
  },
  {
    handler: "apps/functions/src/functions/user/list.handler",
    routeKey: "GET /api/users",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/user/update.handler",
    routeKey: "PATCH /api/users/{userId}",
    requiresAuth: true,
    linkKeys: ["cluster", "userPool"],
  },
  {
    handler: "apps/functions/src/functions/user/delete.handler",
    routeKey: "DELETE /api/users/{userId}",
    requiresAuth: true,
    linkKeys: ["cluster", "userPool"],
  },
  // branch
  {
    handler: "apps/functions/src/functions/branch/list.handler",
    routeKey: "GET /api/branches",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/branch/create.handler",
    routeKey: "POST /api/branches",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/branch/update.handler",
    routeKey: "PUT /api/branches/{branchId}",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/branch/delete.handler",
    routeKey: "DELETE /api/branches/{branchId}",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  // file
  {
    handler: "apps/functions/src/functions/file/upload.handler",
    routeKey: "POST /api/files",
    requiresAuth: true,
    linkKeys: ["filesBucket"],
  },
  {
    handler: "apps/functions/src/functions/file/delete.handler",
    routeKey: "DELETE /api/files/{fileId}",
    requiresAuth: true,
    linkKeys: ["filesBucket"],
  },
  {
    handler: "apps/functions/src/functions/file/download.handler",
    routeKey: "GET /api/files/{fileId}",
    requiresAuth: true,
    linkKeys: ["filesBucket"],
  },
  // load
  {
    handler: "apps/functions/src/functions/load/create.handler",
    routeKey: "POST /api/loads",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/load/list.handler",
    routeKey: "GET /api/loads",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/load/update.handler",
    routeKey: "PUT /api/loads/{loadId}",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/load/changeStatus.handler",
    routeKey: "PATCH /api/loads/{loadId}/status",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
  {
    handler: "apps/functions/src/functions/load/delete.handler",
    routeKey: "DELETE /api/loads/{loadId}",
    requiresAuth: true,
    linkKeys: ["cluster"],
  },
];

export const allRoutes: RouteDef[] = [...authRoutes, ...appRoutes];
