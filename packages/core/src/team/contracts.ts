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

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionsMap = Record<Resource, Record<Action, boolean>>;

export type { PermissionEntity as Entity } from "@twy/db";

export const TWY_TEAM_ID = "00000000-0000-8000-8000-000000000001";

export function emptyPermissionsMap(): PermissionsMap {
  const map = {} as PermissionsMap;
  for (const resource of RESOURCES) {
    map[resource] = { add: false, view: false, edit: false, delete: false };
  }
  return map;
}
