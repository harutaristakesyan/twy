import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const communityLicenses = pgTable("community_licenses", {
  id: uuid().primaryKey().defaultRandom(),
  ciNumber: text().notNull().unique(),
  validFrom: date().notNull(),
  validTo: date(),
  createdBy: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type CommunityLicenseRow = typeof communityLicenses.$inferSelect;
export type NewCommunityLicense = typeof communityLicenses.$inferInsert;
