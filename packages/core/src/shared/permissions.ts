import createError from "http-errors";
import { getCachedAuthContext, putAuthContext } from "../auth-context/store.js";
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

export const hasPermission = (
  ctx: UserPermissionsContext,
  entity: string,
  action: string,
): boolean =>
  Boolean((ctx.permissions as Record<string, Record<string, boolean>>)[entity]?.[action]);

export const assertPermission = (
  ctx: UserPermissionsContext,
  entity: string,
  action: string,
): void => {
  if (!hasPermission(ctx, entity, action)) {
    const err = createError(403, "Permission denied") as unknown as NodeJS.ErrnoException & {
      permissionMissing: { entity: string; action: string };
    };
    err.permissionMissing = { entity, action };
    throw err;
  }
};

export const assertTransition = (
  ctx: UserPermissionsContext,
  entity: string,
  toStatus: string,
): void => assertPermission(ctx, entity, `transition:${toStatus}`);

export const getPermittedTransitions = <T extends string>(
  ctx: UserPermissionsContext,
  entity: string,
  allowedByStateMachine: readonly T[],
): T[] =>
  allowedByStateMachine.filter((status) => hasPermission(ctx, entity, `transition:${status}`));

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
