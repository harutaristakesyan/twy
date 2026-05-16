import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { file } from "./file.js";
import { users } from "./users.js";

export const officeExpenseServiceValues = [
  "Salaries",
  "Utilities",
  "FuelCards",
  "Internet",
  "SoftwareSubscriptions",
  "Taxes",
  "Insurance",
  "Bonuses",
  "EquipmentPurchases",
] as const;
export type OfficeExpenseService = (typeof officeExpenseServiceValues)[number];

export const officeExpensePaymentStatusValues = [
  "Pending",
  "Approved",
  "Paid",
  "PartialPaid",
  "Hold",
  "Declined",
] as const;
export type OfficeExpensePaymentStatus = (typeof officeExpensePaymentStatusValues)[number];

export const currencyValues = ["USD", "EUR", "AMD"] as const;
export type Currency = (typeof currencyValues)[number];

export const officeExpensePaymentOrder = pgTable(
  "office_expense_payment_order",
  {
    id: uuid().primaryKey().defaultRandom(),
    serviceName: text().$type<OfficeExpenseService>().notNull(),
    paymentPurpose: text().notNull(),
    periodStart: date().notNull(),
    periodEnd: date().notNull(),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    currency: varchar({ length: 3 }).notNull().default("USD"),
    paymentStatus: text().$type<OfficeExpensePaymentStatus>().notNull().default("Pending"),
    paymentMadeOn: date(),
    createdBy: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (t) => [
    check("amount_positive", sql`${t.amount} > 0`),
    check("period_valid", sql`${t.periodEnd} >= ${t.periodStart}`),
  ],
);

export type OfficeExpensePaymentOrderRow = typeof officeExpensePaymentOrder.$inferSelect;
export type NewOfficeExpensePaymentOrder = typeof officeExpensePaymentOrder.$inferInsert;

export const officeExpensePaymentOrderFiles = pgTable(
  "office_expense_payment_order_files",
  {
    officeExpensePaymentOrderId: uuid().notNull(),
    fileId: uuid().notNull(),
  },
  (t) => [
    primaryKey({ name: "oepo_files_pk", columns: [t.officeExpensePaymentOrderId, t.fileId] }),
    foreignKey({
      name: "oepo_files_order_fk",
      columns: [t.officeExpensePaymentOrderId],
      foreignColumns: [officeExpensePaymentOrder.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "oepo_files_file_fk",
      columns: [t.fileId],
      foreignColumns: [file.id],
    }).onDelete("restrict"),
  ],
);
