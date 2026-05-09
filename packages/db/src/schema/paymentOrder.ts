import {
  date,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { branch } from "./branch.js";
import { carrier } from "./carrier.js";
import { file } from "./file.js";
import { load } from "./load.js";
import { users } from "./users.js";

export const paymentStatusValues = [
  "Pending",
  "Approved",
  "ApprovedPaid",
  "DeclinedHold",
  "PartialPaid",
] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

export const paymentOrder = pgTable(
  "payment_order",
  {
    id: uuid().primaryKey(),
    loadId: uuid()
      .notNull()
      .references(() => load.id, { onDelete: "restrict" }),

    branchId: uuid()
      .notNull()
      .references(() => branch.id, { onDelete: "restrict" }),
    carrierId: uuid().references(() => carrier.id, { onDelete: "restrict" }),

    brokerReceivable: numeric({ precision: 10, scale: 2 }),
    carrierPayable: numeric({ precision: 10, scale: 2 }).notNull(),
    serviceFee: numeric({ precision: 10, scale: 2 }).notNull().default("30.00"),
    incomePercentage: numeric({ precision: 5, scale: 2 }),
    charges: numeric({ precision: 10, scale: 2 }),
    profit: numeric({ precision: 10, scale: 2 }),

    carrierPaidAmount: numeric({ precision: 10, scale: 2 }),
    carrierPaidDate: date(),
    brokerReceivedAmount: numeric({ precision: 10, scale: 2 }),
    brokerReceivedDate: date(),

    paymentStatus: text().$type<PaymentStatus>().notNull().default("Pending"),

    createdBy: uuid().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (t) => [unique("payment_order_load_id_unique").on(t.loadId)],
);

export type PaymentOrderRow = typeof paymentOrder.$inferSelect;
export type NewPaymentOrder = typeof paymentOrder.$inferInsert;

export const paymentOrderFiles = pgTable(
  "payment_order_files",
  {
    paymentOrderId: uuid()
      .notNull()
      .references(() => paymentOrder.id, { onDelete: "cascade" }),
    fileId: uuid()
      .notNull()
      .references(() => file.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.paymentOrderId, t.fileId] })],
);
