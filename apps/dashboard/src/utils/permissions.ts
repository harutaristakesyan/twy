export const RESOURCES = [
  "branches",
  "settings",
  "brokers",
  "brokers_requests",
  "carriers_twy",
  "carriers_outside",
  "carriers_requests",
  "teams",
  "users",
  "loads",
  "load_payment_order",
  "office_expense_payment_order",
  "external_billing",
  "internal_billing",
] as const;
export const ACTIONS = ["add", "view", "edit", "delete"] as const;
export const RESOURCE_ACTIONS: Record<Resource, readonly Action[]> = {
  branches: ["add", "view", "edit", "delete"],
  settings: ["add", "view", "edit", "delete"],
  brokers: ["add", "view", "edit", "delete"],
  brokers_requests: ["view", "edit"],
  carriers_twy: ["add", "view", "edit", "delete"],
  carriers_outside: ["add", "view", "edit", "delete"],
  carriers_requests: ["view", "edit"],
  teams: ["add", "view", "edit", "delete"],
  users: ["add", "view", "edit", "delete"],
  loads: ["add", "view", "edit", "delete"],
  load_payment_order: ["add", "view", "edit", "delete"],
  office_expense_payment_order: ["add", "view", "edit", "delete"],
  external_billing: ["view"],
  internal_billing: ["view"],
};
export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionsMap = Record<Resource, Record<Action, boolean>>;

export interface AuthMe {
  user: {
    id: string;
    branchId: string | null;
    teamId: string | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    branch: { id: string; name: string | null } | null;
    profilePictureFileId: string | null;
  };
  team: { id: string; name: string; branchRestricted: boolean; onlyOwnData: boolean } | null;
  permissions: PermissionsMap;
}

export function emptyPermissionsMap(): PermissionsMap {
  const map = {} as PermissionsMap;
  for (const resource of RESOURCES) {
    map[resource] = { add: false, view: false, edit: false, delete: false };
  }
  return map;
}

/** Merge API/cached permissions into a full map so new resources never read as undefined. */
export function normalizePermissionsMap(
  input: Partial<Record<Resource, Partial<Record<string, boolean>>>> | null | undefined,
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
    // Copy through transition:* keys not in the static ACTIONS list
    for (const [key, val] of Object.entries(row)) {
      if (key.startsWith("transition:") && typeof val === "boolean") {
        (base[r] as Record<string, boolean>)[key] = val;
      }
    }
  }
  return base;
}
