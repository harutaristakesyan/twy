import { integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { file } from "./file.js";
import { load } from "./load.js";
import { users } from "./users.js";

export const invoiceTypeValues = ["carrier", "broker"] as const;
export type InvoiceType = (typeof invoiceTypeValues)[number];

export const invoiceStatusValues = [
  "draft",
  "sent",
  "received",
  "paid",
  "overdue",
  "void",
] as const;
export type InvoiceStatus = (typeof invoiceStatusValues)[number];

export const invoice = pgTable(
  "invoice",
  {
    id: uuid().primaryKey().defaultRandom(),
    loadId: uuid()
      .notNull()
      .references(() => load.id, { onDelete: "restrict" }),
    type: text().$type<InvoiceType>().notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    currency: text().notNull().default("EUR"),
    issuedAt: timestamp().notNull().defaultNow(),
    dueAt: timestamp().notNull(),
    paymentTermDays: integer().notNull(),
    status: text().$type<InvoiceStatus>().notNull().default("draft"),
    fileId: uuid().references(() => file.id, { onDelete: "set null" }),
    lastReminderSentAt: timestamp(),
    createdBy: uuid().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.loadId, t.type)],
);

export type InvoiceRow = typeof invoice.$inferSelect;
export type NewInvoice = typeof invoice.$inferInsert;
