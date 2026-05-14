import { type AnyPgColumn, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { communityLicenses } from "./communityLicense.js";
import { users } from "./users.js";

export const branch = pgTable(
  "branch",
  {
    id: uuid().primaryKey(),
    name: text().notNull().unique(),
    contact: text(),
    ownerId: uuid().references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    ciId: uuid().references((): AnyPgColumn => communityLicenses.id, { onDelete: "restrict" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("branch_ci_id_idx").on(t.ciId)],
);

export type BranchRow = typeof branch.$inferSelect;
export type NewBranch = typeof branch.$inferInsert;
