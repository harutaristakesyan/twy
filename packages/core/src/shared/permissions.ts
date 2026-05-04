import createError from "http-errors";
import { getCachedAuthContext, putAuthContext } from "../auth-context/store.js";
import type { Action, Resource } from "../team/contracts.js";
import { getEffectivePermissionsForUser, type UserPermissionsContext } from "../team/repository.js";

export const loadAuthContext = async (userId: string): Promise<UserPermissionsContext> => {
  try {
    const cached = await getCachedAuthContext(userId);
    if (cached) return cached;
  } catch {
    // DDB unavailable — fall through to Aurora
  }
  const ctx = await getEffectivePermissionsForUser(userId);
  putAuthContext(ctx).catch((err) => {
    console.warn("auth-context DDB write failed on cache miss:", err);
  });
  return ctx;
};

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
