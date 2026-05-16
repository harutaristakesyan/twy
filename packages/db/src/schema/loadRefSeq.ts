import { bigint, integer, pgTable } from "drizzle-orm/pg-core";

export const loadRefSeq = pgTable("load_ref_seq", {
  year: integer().primaryKey(),
  lastValue: bigint({ mode: "number" }).notNull(),
});

export type LoadRefSeqRow = typeof loadRefSeq.$inferSelect;
export type NewLoadRefSeq = typeof loadRefSeq.$inferInsert;
