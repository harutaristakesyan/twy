export const RESOURCES = [
  "branches",
  "brokers",
  "carriers_twy",
  "carriers_outside",
  "carriers_requests",
  "teams",
  "users",
  "loads",
] as const;
export const ACTIONS = ["add", "view", "edit"] as const;
export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionsMap = Record<Resource, Record<Action, boolean>>;

export interface AuthMe {
  user: { id: string; branchId: string | null; teamId: string | null };
  team: { id: string; name: string; branchRestricted: boolean; onlyOwnData: boolean } | null;
  permissions: PermissionsMap;
}

export function emptyPermissionsMap(): PermissionsMap {
  const map = {} as PermissionsMap;
  for (const resource of RESOURCES) {
    map[resource] = { add: false, view: false, edit: false };
  }
  return map;
}
