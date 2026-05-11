import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { team } from "./team.js";
import { users } from "./users.js";

export const permissionAudit = pgTable("permission_audit", {
  id: uuid().primaryKey().defaultRandom(),
  teamId: uuid()
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  resource: text().notNull(),
  action: text().notNull(),
  previousAllowed: boolean(),
  newAllowed: boolean().notNull(),
  changedByUserId: uuid()
    .notNull()
    .references(() => users.id),
  changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type PermissionAuditRow = typeof permissionAudit.$inferSelect;
export type NewPermissionAudit = typeof permissionAudit.$inferInsert;
