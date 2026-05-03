import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { branch } from "./branch.js";
import { outsideBroker } from "./outsideBroker.js";
import { users } from "./users.js";

export const brokerRequestStatusValues = ["pending", "approved", "rejected"] as const;
export type BrokerRequestStatus = (typeof brokerRequestStatusValues)[number];

export const brokerRequest = pgTable("broker_request", {
  id: uuid().primaryKey().notNull(),
  brokerName: text().notNull(),
  mcNumber: text().notNull(),
  contactName: text(),
  phone: text(),
  email: text(),
  address: text(),
  notes: text(),
  branchId: uuid().references(() => branch.id, { onDelete: "set null" }),
  creditLimitUnlimited: boolean().notNull().default(true),
  creditLimit: numeric({ precision: 10, scale: 2 }),
  status: text().$type<BrokerRequestStatus>().notNull().default("pending"),
  submittedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  reviewedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp({ withTimezone: true }),
  rejectionReason: text(),
  resultBrokerId: uuid().references(() => outsideBroker.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type BrokerRequestRow = typeof brokerRequest.$inferSelect;
export type NewBrokerRequest = typeof brokerRequest.$inferInsert;
