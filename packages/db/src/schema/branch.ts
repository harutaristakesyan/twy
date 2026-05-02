import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const branch = pgTable("branch", {
  id: uuid().primaryKey(),
  name: text().notNull().unique(),
  contact: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type BranchRow = typeof branch.$inferSelect;
export type NewBranch = typeof branch.$inferInsert;
