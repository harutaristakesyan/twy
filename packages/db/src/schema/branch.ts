import { type AnyPgColumn, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const branch = pgTable("branch", {
  id: uuid().primaryKey(),
  name: text().notNull().unique(),
  contact: text(),
  ownerId: uuid().references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type BranchRow = typeof branch.$inferSelect;
export type NewBranch = typeof branch.$inferInsert;
