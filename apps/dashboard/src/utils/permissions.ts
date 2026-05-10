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
  "payment_orders",
  "external_billing",
  "internal_billing",
] as const;
export const ACTIONS = ["add", "view", "edit"] as const;
export const RESOURCE_ACTIONS: Record<Resource, readonly Action[]> = {
  branches: ["add", "view", "edit"],
  brokers: ["add", "view", "edit"],
  brokers_requests: ["view", "edit"],
  carriers_twy: ["add", "view", "edit"],
  carriers_outside: ["add", "view", "edit"],
  carriers_requests: ["view", "edit"],
  teams: ["add", "view", "edit"],
  users: ["add", "view", "edit"],
  loads: ["add", "view", "edit"],
  payment_orders: ["view", "edit"],
  external_billing: ["view"],
  internal_billing: ["view"],
};
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
