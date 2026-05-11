import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { load } from "./load.js";
import { users } from "./users.js";

export const loadCommentTypeValues = [
  "charge_reason",
  "hold_reason",
  "decline_reason",
  "general",
] as const;
export type LoadCommentType = (typeof loadCommentTypeValues)[number];

export const loadComment = pgTable("load_comment", {
  id: uuid().primaryKey(),
  loadId: uuid()
    .notNull()
    .references(() => load.id, { onDelete: "cascade" }),
  userId: uuid().references(() => users.id, { onDelete: "set null" }),
  commentType: text().$type<LoadCommentType>().notNull(),
  body: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type LoadCommentRow = typeof loadComment.$inferSelect;
export type NewLoadComment = typeof loadComment.$inferInsert;
