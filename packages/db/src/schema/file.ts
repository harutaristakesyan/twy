import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const documentCategoryValues = [
  "rate_confirmation",
  "pod",
  "carrier_invoice",
  "broker_invoice",
  "other",
] as const;
export type DocumentCategory = (typeof documentCategoryValues)[number];

export const file = pgTable("file", {
  id: uuid().primaryKey(),
  fileName: varchar({ length: 255 }).notNull(),
  documentCategory: text().$type<DocumentCategory>(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type FileRow = typeof file.$inferSelect;
export type NewFile = typeof file.$inferInsert;
