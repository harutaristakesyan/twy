import { boolean, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
