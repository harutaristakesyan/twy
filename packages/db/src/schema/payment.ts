import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { invoice } from "./invoice.js";
import { users } from "./users.js";

export const paymentStatusValues = ["pending", "completed", "failed"] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

export const payment = pgTable("payment", {
  id: uuid().primaryKey().defaultRandom(),
  invoiceId: uuid()
    .notNull()
    .references(() => invoice.id, { onDelete: "restrict" }),
  amount: numeric({ precision: 10, scale: 2 }).notNull(),
  paidAt: timestamp().notNull().defaultNow(),
  method: text(),
  reference: text(),
  status: text().$type<PaymentStatus>().notNull().default("completed"),
  recordedBy: uuid().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp().notNull().defaultNow(),
});

export type PaymentRow = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;
