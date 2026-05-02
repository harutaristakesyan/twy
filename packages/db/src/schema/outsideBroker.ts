import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { branch } from "./branch.js";

export const brokerStatusValues = ["approved", "pending", "denied"] as const;
export type BrokerStatus = (typeof brokerStatusValues)[number];

export const outsideBroker = pgTable("outside_broker", {
  id: uuid().primaryKey(),
  brokerName: text().notNull(),
  mcNumber: text().notNull().unique(),
  contactName: text(),
  phone: text(),
  email: text(),
  address: text(),
  notes: text(),
  status: text().$type<BrokerStatus>().notNull().default("pending"),
  branchId: uuid().references(() => branch.id, { onDelete: "set null" }),
  creditLimitUnlimited: boolean().notNull().default(true),
  creditLimit: numeric({ precision: 10, scale: 2 }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type OutsideBrokerRow = typeof outsideBroker.$inferSelect;
export type NewOutsideBroker = typeof outsideBroker.$inferInsert;
