import { boolean, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { loadStatusValues } from "./load.js";
import { paymentStatusValues } from "./paymentOrder.js";

export const PERMISSION_REGISTRY = {
  branches: { actions: ["add", "view", "edit", "delete"] as const },
  settings: { actions: ["add", "view", "edit", "delete"] as const },
  brokers: { actions: ["add", "view", "edit", "delete"] as const },
  brokers_requests: { actions: ["view", "edit"] as const },
  carriers_twy: { actions: ["add", "view", "edit", "delete"] as const },
  carriers_outside: { actions: ["add", "view", "edit", "delete"] as const },
  carriers_requests: { actions: ["view", "edit"] as const },
  teams: { actions: ["add", "view", "edit", "delete"] as const },
  users: { actions: ["add", "view", "edit", "delete"] as const },
  loads: {
    actions: ["add", "view", "edit", "delete"] as const,
    transitions: loadStatusValues,
  },
  load_payment_order: {
    actions: ["add", "view", "edit", "delete"] as const,
    transitions: paymentStatusValues,
  },
  office_expense_payment_order: {
    actions: ["add", "view", "edit", "delete"] as const,
    transitions: paymentStatusValues.filter((s) => s !== "ReadyForInvoice") as readonly string[],
  },
  external_billing: { actions: ["view"] as const },
  internal_billing: { actions: ["view"] as const },
} as const;

export type PermissionEntity = keyof typeof PERMISSION_REGISTRY;
export type BaseAction = "add" | "view" | "edit" | "delete";
export type TransitionAction = `transition:${string}`;
export type PermissionAction = BaseAction | TransitionAction;

export const team = pgTable("team", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  description: text(),
  branchRestricted: boolean().notNull().default(false),
  onlyOwnData: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const teamPermissions = pgTable(
  "team_permissions",
  {
    teamId: uuid()
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    resource: text().notNull(),
    action: text().notNull(),
    allowed: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.resource, t.action] })],
);

export type TeamRow = typeof team.$inferSelect;
export type NewTeam = typeof team.$inferInsert;
export type TeamPermissionsRow = typeof teamPermissions.$inferSelect;
export type NewTeamPermissions = typeof teamPermissions.$inferInsert;
