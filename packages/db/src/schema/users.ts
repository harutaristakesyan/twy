import { type AnyPgColumn, boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { branch } from "./branch.js";
import { team } from "./team.js";

export const users = pgTable("users", {
  id: uuid().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  firstName: varchar({ length: 100 }),
  lastName: varchar({ length: 100 }),
  isActive: boolean().notNull().default(true),
  branch: uuid().references(() => branch.id, { onDelete: "set null" }),
  teamId: uuid().references(() => team.id, { onDelete: "set null" }),
  createdBy: uuid()
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
