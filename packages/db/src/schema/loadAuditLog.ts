import { json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { load } from "./load.js";
import { users } from "./users.js";

export const loadAuditLog = pgTable("load_audit_log", {
  id: uuid().primaryKey().defaultRandom(),
  loadId: uuid()
    .notNull()
    .references(() => load.id, { onDelete: "cascade" }),
  actorId: uuid().references(() => users.id, { onDelete: "set null" }),
  event: text().notNull(),
  payload: json(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type LoadAuditLogRow = typeof loadAuditLog.$inferSelect;
export type NewLoadAuditLog = typeof loadAuditLog.$inferInsert;
