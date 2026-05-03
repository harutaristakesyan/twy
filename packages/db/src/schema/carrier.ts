import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const carrierKindValues = ["twy", "outside"] as const;
export type CarrierKind = (typeof carrierKindValues)[number];

export const carrierStatusValues = ["approved", "denied"] as const;
export type CarrierStatus = (typeof carrierStatusValues)[number];

export const insuranceStatusValues = ["valid", "expired", "pending"] as const;
export type InsuranceStatus = (typeof insuranceStatusValues)[number];

export const carrier = pgTable("carrier", {
  id: uuid().primaryKey(),
  kind: text().$type<CarrierKind>().notNull(),
  carrierName: text().notNull(),
  mcDotNumber: text().notNull().unique(),
  equipmentType: text(),
  insuranceStatus: text().$type<InsuranceStatus>().notNull().default("pending"),
  insuranceExpiry: timestamp({ withTimezone: true }),
  phone: text(),
  email: text(),
  notes: text(),
  status: text().$type<CarrierStatus>().notNull().default("approved"),
  createdBy: uuid().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type CarrierRow = typeof carrier.$inferSelect;
export type NewCarrier = typeof carrier.$inferInsert;
