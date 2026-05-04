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

/** List broker request queue: dedicated permission or outside-broker admins (view+edit). */
export const assertBrokerRequestsView = (ctx: UserPermissionsContext): void => {
  const p = ctx.permissions;
  if (p.brokers_requests?.view || (p.brokers?.view && p.brokers?.edit)) {
    return;
  }
  throw new createError.Forbidden("Forbidden");
};

/** Approve/reject broker requests: dedicated permission or outside-broker edit. */
export const assertBrokerRequestsEdit = (ctx: UserPermissionsContext): void => {
  const p = ctx.permissions;
  if (p.brokers_requests?.edit || p.brokers?.edit) {
    return;
  }
  throw new createError.Forbidden("Forbidden");
};

export const buildScope = (ctx: UserPermissionsContext) => ({
  branchId: ctx.branchRestricted ? (ctx.branchId ?? undefined) : undefined,
  ownerId: ctx.onlyOwnData ? ctx.userId : undefined,
  denyAll: ctx.branchRestricted && !ctx.branchId,
});

export type PermissionsScope = ReturnType<typeof buildScope>;
