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
import { carrier } from "./carrier.js";
import { file } from "./file.js";
import { users } from "./users.js";

export const loadStatusValues = ["Pending", "Approved", "Delivered", "Declined", "Hold"] as const;
export type LoadStatus = (typeof loadStatusValues)[number];

export const chargeSideValues = ["broker", "carrier"] as const;
export type ChargeSide = (typeof chargeSideValues)[number];

export const load = pgTable("load", {
  id: uuid().primaryKey(),

  customer: text(),
  referenceNumber: text().notNull().unique(),
  customerRate: numeric({ precision: 10, scale: 2 }),
  contactName: text().notNull(),
  paymentMethod: text(),
  paymentTerms: text(),

  carrier: text(),
  carrierId: uuid().references(() => carrier.id, { onDelete: "restrict" }),
  carrierPaymentMethod: text(),
  carrierRate: numeric({ precision: 10, scale: 2 }).notNull(),
  chargeServiceFeeToOffice: boolean().default(false),
  isChargable: boolean().notNull().default(false),
  chargeAmount: numeric({ precision: 10, scale: 2 }),
  chargeSide: text().$type<ChargeSide>(),

  serviceFee: numeric({ precision: 10, scale: 2 }).default("30.00"),
  financialsLockedAt: timestamp(),

  loadType: text().notNull(),
  serviceType: text().notNull(),
  serviceGivenAs: text().notNull(),
  commodity: text().notNull(),
  bookedAs: text().notNull(),
  soldAs: text().notNull(),
  weight: text().notNull(),
  temperature: text(),

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
