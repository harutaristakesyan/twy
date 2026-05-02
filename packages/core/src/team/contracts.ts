export const RESOURCES = ["branches", "brokers", "carriers", "teams", "users", "loads"] as const;

export const ACTIONS = ["add", "view", "edit"] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionsMap = Record<Resource, Record<Action, boolean>>;

export const TWY_TEAM_ID = "00000000-0000-0000-0000-000000000001";

export function emptyPermissionsMap(): PermissionsMap {
  const map = {} as PermissionsMap;
  for (const resource of RESOURCES) {
    map[resource] = { add: false, view: false, edit: false };
  }
  return map;
}
