import createError from "http-errors";
import type { Action, Resource } from "../team/contracts.js";
import { getEffectivePermissionsForUser, type UserPermissionsContext } from "../team/repository.js";

export const loadAuthContext = (userId: string): Promise<UserPermissionsContext> =>
  getEffectivePermissionsForUser(userId);

export const assertPermission = (
  ctx: UserPermissionsContext,
  resource: Resource,
  action: Action,
): void => {
  if (!ctx.permissions[resource]?.[action]) {
    throw new createError.Forbidden("Forbidden");
  }
};

export const assertBrokerRequestsView = (ctx: UserPermissionsContext): void =>
  assertPermission(ctx, "brokers_requests", "view");

export const assertBrokerRequestsEdit = (ctx: UserPermissionsContext): void =>
  assertPermission(ctx, "brokers_requests", "edit");

export const buildScope = (ctx: UserPermissionsContext) => ({
  branchId: ctx.branchRestricted ? (ctx.branchId ?? undefined) : undefined,
  ownerId: ctx.onlyOwnData ? ctx.userId : undefined,
  denyAll: ctx.branchRestricted && !ctx.branchId,
});

export type PermissionsScope = ReturnType<typeof buildScope>;
