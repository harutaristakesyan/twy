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

export const buildScope = (
  ctx: UserPermissionsContext,
): { branchId?: string; ownerId?: string } => ({
  branchId: ctx.branchRestricted && ctx.branchId ? ctx.branchId : undefined,
  ownerId: ctx.onlyOwnData ? ctx.userId : undefined,
});

export type PermissionsScope = ReturnType<typeof buildScope>;
