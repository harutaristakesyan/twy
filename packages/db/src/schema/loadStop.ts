import { integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { load } from "./load.js";

export const loadStopKindValues = ["pickup", "dropoff"] as const;
export type LoadStopKind = (typeof loadStopKindValues)[number];

export const loadStop = pgTable(
  "load_stop",
  {
    id: uuid().primaryKey().defaultRandom(),
    loadId: uuid()
      .notNull()
      .references(() => load.id, { onDelete: "cascade" }),
    kind: text().$type<LoadStopKind>().notNull(),
    sortOrder: integer().notNull(),
    cityZipCode: text(),
    phone: text(),
    address: text().notNull(),
  },
  (t) => [unique("load_stop_load_id_kind_sort_order_uq").on(t.loadId, t.kind, t.sortOrder)],
);

export type LoadStopRow = typeof loadStop.$inferSelect;
export type NewLoadStop = typeof loadStop.$inferInsert;
