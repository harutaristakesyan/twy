/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Single typed route table consumed by infra/api.ts.
 *
 * `linkKeys` names the resources from infra/api.ts that this handler needs.
 * `requiresAuth: true` attaches the Cognito JWT authorizer; `false` (or
 * unset) leaves the route public (Cognito sign-in flows themselves).
 */
export type LinkKey = "cluster" | "userPool" | "userPoolClient" | "filesBucket" | "authContext";

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

/** Public Cognito flows — packages/functions/src/api/auth/*.ts handlers. */
export const authRoutes: RouteDef[] = [
  {
    handler: "packages/functions/src/api/auth/signUp.handler",
    routeKey: "POST /api/signup",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "packages/functions/src/api/auth/login.handler",
    routeKey: "POST /api/login",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "packages/functions/src/api/auth/verify.handler",
    routeKey: "POST /api/verify",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "packages/functions/src/api/auth/resendVerificationCode.handler",
    routeKey: "POST /api/resend-code",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "packages/functions/src/api/auth/forgotPassword.handler",
    routeKey: "POST /api/forgot-password",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "packages/functions/src/api/auth/confirmForgotPassword.handler",
    routeKey: "POST /api/create-password",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "packages/functions/src/api/auth/refreshToken.handler",
    routeKey: "POST /api/refresh-token",
    linkKeys: ["userPoolClient"],
  },
  {
    handler: "packages/functions/src/api/auth/respondToChallenge.handler",
    routeKey: "POST /api/respond-to-challenge",
    linkKeys: ["userPoolClient"],
  },
];

/** JWT-protected domain endpoints — handlers under packages/functions/src/api/. */
export const appRoutes: RouteDef[] = [
  // user
  {
    handler: "packages/functions/src/api/user/self-update.handler",
    routeKey: "PATCH /api/user",
    requiresAuth: true,
    linkKeys: ["cluster", "userPool", "authContext"],
  },
  {
    handler: "packages/functions/src/api/user/list.handler",
    routeKey: "GET /api/users",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/user/create.handler",
    routeKey: "POST /api/users",
    requiresAuth: true,
    linkKeys: ["cluster", "userPool", "authContext"],
  },
  {
    handler: "packages/functions/src/api/user/update.handler",
    routeKey: "PATCH /api/users/{userId}",
    requiresAuth: true,
    linkKeys: ["cluster", "userPool", "authContext"],
  },
  {
    handler: "packages/functions/src/api/user/delete.handler",
    routeKey: "DELETE /api/users/{userId}",
    requiresAuth: true,
    linkKeys: ["cluster", "userPool", "authContext"],
  },
  // branch
  {
    handler: "packages/functions/src/api/branch/list.handler",
    routeKey: "GET /api/branches",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/branch/create.handler",
    routeKey: "POST /api/branches",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/branch/update.handler",
    routeKey: "PUT /api/branches/{branchId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/branch/delete.handler",
    routeKey: "DELETE /api/branches/{branchId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // file
  {
    handler: "packages/functions/src/api/file/upload.handler",
    routeKey: "POST /api/files",
    requiresAuth: true,
    linkKeys: ["cluster", "filesBucket"],
  },
  {
    handler: "packages/functions/src/api/file/delete.handler",
    routeKey: "DELETE /api/files/{fileId}",
    requiresAuth: true,
    linkKeys: ["cluster", "filesBucket"],
  },
  {
    handler: "packages/functions/src/api/file/download.handler",
    routeKey: "GET /api/files/{fileId}",
    requiresAuth: true,
    linkKeys: ["filesBucket"],
  },
  // load
  {
    handler: "packages/functions/src/api/load/create.handler",
    routeKey: "POST /api/loads",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/load/list.handler",
    routeKey: "GET /api/loads",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/load/update.handler",
    routeKey: "PUT /api/loads/{loadId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/load/changeStatus.handler",
    routeKey: "PATCH /api/loads/{loadId}/status",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/load/delete.handler",
    routeKey: "DELETE /api/loads/{loadId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/load/listComments.handler",
    routeKey: "GET /api/loads/{loadId}/comments",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/load/addComment.handler",
    routeKey: "POST /api/loads/{loadId}/comments",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // auth/me — permissions snapshot for the current user
  {
    handler: "packages/functions/src/api/auth/me.handler",
    routeKey: "GET /api/auth/me",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // auth/change-password — authenticated user changes own password
  {
    handler: "packages/functions/src/api/auth/changePassword.handler",
    routeKey: "POST /api/auth/change-password",
    requiresAuth: true,
    linkKeys: [],
  },
  // team
  {
    handler: "packages/functions/src/api/team/list.handler",
    routeKey: "GET /api/teams",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/team/create.handler",
    routeKey: "POST /api/teams",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/team/update.handler",
    routeKey: "PUT /api/teams/{teamId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/team/delete.handler",
    routeKey: "DELETE /api/teams/{teamId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/team/unassigned-users.handler",
    routeKey: "GET /api/teams/unassigned-users",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/team/members/list.handler",
    routeKey: "GET /api/teams/{teamId}/members",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/team/members/add.handler",
    routeKey: "POST /api/teams/{teamId}/members",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/team/members/remove.handler",
    routeKey: "DELETE /api/teams/{teamId}/members/{userId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // outside-broker
  {
    handler: "packages/functions/src/api/outside-broker/list.handler",
    routeKey: "GET /api/outside-brokers",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/broker-request/list.handler",
    routeKey: "GET /api/broker-requests",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/broker-request/create.handler",
    routeKey: "POST /api/broker-requests",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/broker-request/approve.handler",
    routeKey: "POST /api/broker-requests/{requestId}/approve",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/broker-request/reject.handler",
    routeKey: "POST /api/broker-requests/{requestId}/reject",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/outside-broker/update.handler",
    routeKey: "PUT /api/outside-brokers/{brokerId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/outside-broker/delete.handler",
    routeKey: "DELETE /api/outside-brokers/{brokerId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // carrier
  {
    handler: "packages/functions/src/api/carrier/list.handler",
    routeKey: "GET /api/carriers",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/carrier/get.handler",
    routeKey: "GET /api/carriers/{carrierId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/carrier/create.handler",
    routeKey: "POST /api/carriers",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/carrier/update.handler",
    routeKey: "PUT /api/carriers/{carrierId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/carrier/delete.handler",
    routeKey: "DELETE /api/carriers/{carrierId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // carrier requests (approval queue)
  {
    handler: "packages/functions/src/api/carrier-request/list.handler",
    routeKey: "GET /api/carrier-requests",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/carrier-request/create.handler",
    routeKey: "POST /api/carrier-requests",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/carrier-request/approve.handler",
    routeKey: "POST /api/carrier-requests/{requestId}/approve",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/carrier-request/reject.handler",
    routeKey: "POST /api/carrier-requests/{requestId}/reject",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // payment orders
  {
    handler: "packages/functions/src/api/payment-order/list.handler",
    routeKey: "GET /api/payment-orders",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/payment-order/create.handler",
    routeKey: "POST /api/payment-orders",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/payment-order/update.handler",
    routeKey: "PATCH /api/payment-orders/{paymentOrderId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/payment-order/add-file.handler",
    routeKey: "POST /api/payment-orders/{paymentOrderId}/files",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/payment-order/remove-file.handler",
    routeKey: "DELETE /api/payment-orders/{paymentOrderId}/files/{fileId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // office expense payment orders
  {
    handler: "packages/functions/src/api/office-expense-payment-order/create.handler",
    routeKey: "POST /api/office-expense-payment-orders",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/office-expense-payment-order/list.handler",
    routeKey: "GET /api/office-expense-payment-orders",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/office-expense-payment-order/get.handler",
    routeKey: "GET /api/office-expense-payment-orders/{id}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/office-expense-payment-order/update.handler",
    routeKey: "PATCH /api/office-expense-payment-orders/{id}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/office-expense-payment-order/add-file.handler",
    routeKey: "POST /api/office-expense-payment-orders/{id}/files",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/office-expense-payment-order/remove-file.handler",
    routeKey: "DELETE /api/office-expense-payment-orders/{id}/files/{fileId}",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  // billing
  {
    handler: "packages/functions/src/api/billing/external-by-branch.handler",
    routeKey: "GET /api/billing/external/branches",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/billing/external-loads.handler",
    routeKey: "GET /api/billing/external/branches/{branchId}/loads",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/billing/internal-by-branch.handler",
    routeKey: "GET /api/billing/internal/branches",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
  {
    handler: "packages/functions/src/api/billing/internal-loads.handler",
    routeKey: "GET /api/billing/internal/branches/{branchId}/loads",
    requiresAuth: true,
    linkKeys: ["cluster", "authContext"],
  },
];

export const allRoutes: RouteDef[] = [...authRoutes, ...appRoutes];
