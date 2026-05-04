export const RESOURCES = [
  "branches",
  "brokers",
  "brokers_requests",
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

/** Merge API/cached permissions into a full map so new resources never read as undefined. */
export function normalizePermissionsMap(
  input: Partial<Record<Resource, Partial<Record<Action, boolean>>>> | null | undefined,
): PermissionsMap {
  const base = emptyPermissionsMap();
  if (!input) {
    return base;
  }
  for (const r of RESOURCES) {
    const row = input[r];
    if (!row) {
      continue;
    }
    for (const a of ACTIONS) {
      if (typeof row[a] === "boolean") {
        base[r][a] = row[a];
      }
    }
  }
  return base;
}

export function canViewBrokerRequests(permissions: PermissionsMap): boolean {
  return !!permissions.brokers_requests?.view;
}

export function canEditBrokerRequests(permissions: PermissionsMap): boolean {
  return !!permissions.brokers_requests?.edit;
}
