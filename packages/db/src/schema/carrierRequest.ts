import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { type CarrierKind, carrier, type InsuranceStatus } from "./carrier.js";
import { users } from "./users.js";

export const carrierRequestStatusValues = ["pending", "approved", "rejected"] as const;
export type CarrierRequestStatus = (typeof carrierRequestStatusValues)[number];

export const carrierRequest = pgTable("carrier_request", {
  id: uuid().primaryKey().notNull(),
  kind: text().$type<CarrierKind>().notNull(),
  carrierName: text().notNull(),
  mcDotNumber: text().notNull(),
  equipmentType: text(),
  insuranceStatus: text().$type<InsuranceStatus>().notNull().default("pending"),
  insuranceExpiry: timestamp({ withTimezone: true }),
  phone: text(),
  email: text(),
  notes: text(),
  status: text().$type<CarrierRequestStatus>().notNull().default("pending"),
  submittedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  reviewedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp({ withTimezone: true }),
  rejectionReason: text(),
  resultCarrierId: uuid().references(() => carrier.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type CarrierRequestRow = typeof carrierRequest.$inferSelect;
export type NewCarrierRequest = typeof carrierRequest.$inferInsert;
