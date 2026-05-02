import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const file = pgTable("file", {
  id: uuid().primaryKey(),
  fileName: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type FileRow = typeof file.$inferSelect;
export type NewFile = typeof file.$inferInsert;
