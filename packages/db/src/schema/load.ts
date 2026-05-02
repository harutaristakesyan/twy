import {
  boolean,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { branch } from "./branch.js";
import { file } from "./file.js";
import { users } from "./users.js";

export const loadStatusValues = ["Pending", "Approved", "Denied"] as const;
export type LoadStatus = (typeof loadStatusValues)[number];

export const load = pgTable("load", {
  id: uuid().primaryKey(),

  customer: text(),
  referenceNumber: text().notNull(),
  customerRate: numeric({ precision: 10, scale: 2 }),
  contactName: text().notNull(),

  carrier: text(),
  carrierPaymentMethod: text(),
  carrierRate: numeric({ precision: 10, scale: 2 }).notNull(),
  chargeServiceFeeToOffice: boolean().default(false),
  isChargable: boolean().notNull().default(false),
  chargeAmount: numeric({ precision: 10, scale: 2 }),

  loadType: text().notNull(),
  serviceType: text().notNull(),
  serviceGivenAs: text().notNull(),
  commodity: text().notNull(),
  bookedAs: text().notNull(),
  soldAs: text().notNull(),
  weight: text().notNull(),
  temperature: text(),

  pickupCityZipCode: text(),
  pickupPhone: text(),
  pickupCarrier: text().notNull(),
  pickupName: text().notNull(),
  pickupAddress: text().notNull(),

  dropoffCityZipCode: text(),
  dropoffPhone: text(),
  dropoffCarrier: text().notNull(),
  dropoffName: text().notNull(),
  dropoffAddress: text().notNull(),

  branchId: uuid()
    .notNull()
    .references(() => branch.id, { onDelete: "restrict" }),

  status: text().$type<LoadStatus>().notNull().default("Pending"),
  statusChangedBy: varchar({ length: 255 }),
  createdBy: uuid().references(() => users.id, { onDelete: "restrict" }),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const loadFiles = pgTable(
  "load_files",
  {
    loadId: uuid()
      .notNull()
      .references(() => load.id, { onDelete: "cascade" }),
    fileId: uuid()
      .notNull()
      .references(() => file.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.loadId, t.fileId] })],
);

export type LoadRow = typeof load.$inferSelect;
export type NewLoad = typeof load.$inferInsert;
export type LoadFilesRow = typeof loadFiles.$inferSelect;
export type NewLoadFiles = typeof loadFiles.$inferInsert;
