import { randomUUID } from "node:crypto";
import type { CarrierKind, CarrierStatus, InsuranceStatus } from "@twy/db";
import { carrier, db, type OrderDirection } from "@twy/db";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import createError from "http-errors";

export interface CarrierRecord {
  id: string;
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType: string | null;
  insuranceStatus: InsuranceStatus;
  insuranceExpiry: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: CarrierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListCarriersInput {
  kind: CarrierKind;
  page: number;
  limit: number;
  sortField: "carrierName" | "mcDotNumber" | "status" | "insuranceStatus" | "createdAt";
  sortOrder: OrderDirection;
  query?: string;
}

export interface NewCarrierInput {
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType?: string | null;
  insuranceStatus?: string;
  insuranceExpiry?: Date | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  status?: string;
  createdBy: string;
}

export interface UpdateCarrierInput {
  carrierName?: string;
  mcDotNumber?: string;
  equipmentType?: string | null;
  insuranceStatus?: string | null;
  insuranceExpiry?: Date | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  status?: string;
}

const sortColumn = (field: ListCarriersInput["sortField"]) => {
  switch (field) {
    case "carrierName":
      return carrier.carrierName;
    case "mcDotNumber":
      return carrier.mcDotNumber;
    case "status":
      return carrier.status;
    case "insuranceStatus":
      return carrier.insuranceStatus;
    default:
      return carrier.createdAt;
  }
};

const mapRow = (row: {
  id: string;
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType: string | null;
  insuranceStatus: InsuranceStatus;
  insuranceExpiry: Date | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: CarrierStatus;
  createdAt: Date;
  updatedAt: Date;
}): CarrierRecord => ({
  id: row.id,
  kind: row.kind,
  carrierName: row.carrierName,
  mcDotNumber: row.mcDotNumber,
  equipmentType: row.equipmentType,
  insuranceStatus: row.insuranceStatus,
  insuranceExpiry: row.insuranceExpiry?.toISOString() ?? null,
  phone: row.phone,
  email: row.email,
  notes: row.notes,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listCarriers = async (input: ListCarriersInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderCol = sortColumn(input.sortField);
  const offset = input.page * input.limit;

  const searchClause = input.query
    ? or(
        ilike(carrier.carrierName, `%${input.query}%`),
        ilike(carrier.mcDotNumber, `%${input.query}%`),
      )
    : undefined;

  const whereClause = and(eq(carrier.kind, input.kind), searchClause);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: carrier.id,
        kind: carrier.kind,
        carrierName: carrier.carrierName,
        mcDotNumber: carrier.mcDotNumber,
        equipmentType: carrier.equipmentType,
        insuranceStatus: carrier.insuranceStatus,
        insuranceExpiry: carrier.insuranceExpiry,
        phone: carrier.phone,
        email: carrier.email,
        notes: carrier.notes,
        status: carrier.status,
        createdAt: carrier.createdAt,
        updatedAt: carrier.updatedAt,
      })
      .from(carrier)
      .where(whereClause)
      .orderBy(direction(orderCol))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(carrier).where(whereClause),
  ]);

  return {
    carriers: rows.map(mapRow),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const getCarrierById = async (carrierId: string): Promise<CarrierRecord | null> => {
  const [row] = await db
    .select({
      id: carrier.id,
      kind: carrier.kind,
      carrierName: carrier.carrierName,
      mcDotNumber: carrier.mcDotNumber,
      equipmentType: carrier.equipmentType,
      insuranceStatus: carrier.insuranceStatus,
      insuranceExpiry: carrier.insuranceExpiry,
      phone: carrier.phone,
      email: carrier.email,
      notes: carrier.notes,
      status: carrier.status,
      createdAt: carrier.createdAt,
      updatedAt: carrier.updatedAt,
    })
    .from(carrier)
    .where(eq(carrier.id, carrierId));

  return row ? mapRow(row) : null;
};

export const createCarrier = async (input: NewCarrierInput): Promise<string> => {
  const id = randomUUID();
  await db.insert(carrier).values({
    id,
    kind: input.kind,
    carrierName: input.carrierName,
    mcDotNumber: input.mcDotNumber,
    equipmentType: input.equipmentType ?? null,
    insuranceStatus: (input.insuranceStatus ?? "pending") as InsuranceStatus,
    insuranceExpiry: input.insuranceExpiry ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    status: (input.status ?? "approved") as CarrierStatus,
    createdBy: input.createdBy,
  });
  return id;
};

export const updateCarrier = async (
  carrierId: string,
  input: UpdateCarrierInput,
): Promise<boolean | null> => {
  const [existing] = await db
    .select({ id: carrier.id })
    .from(carrier)
    .where(eq(carrier.id, carrierId));

  if (!existing) {
    return null;
  }

  const payload: Partial<typeof carrier.$inferInsert> = {};

  if (typeof input.carrierName !== "undefined") payload.carrierName = input.carrierName;
  if (typeof input.mcDotNumber !== "undefined") payload.mcDotNumber = input.mcDotNumber;
  if (typeof input.status !== "undefined") payload.status = input.status as CarrierStatus;
  if (Object.hasOwn(input, "equipmentType")) payload.equipmentType = input.equipmentType ?? null;
  if (Object.hasOwn(input, "insuranceStatus"))
    payload.insuranceStatus = (input.insuranceStatus ?? "pending") as InsuranceStatus;
  if (Object.hasOwn(input, "insuranceExpiry"))
    payload.insuranceExpiry = input.insuranceExpiry ?? null;
  if (Object.hasOwn(input, "phone")) payload.phone = input.phone ?? null;
  if (Object.hasOwn(input, "email")) payload.email = input.email ?? null;
  if (Object.hasOwn(input, "notes")) payload.notes = input.notes ?? null;

  if (Object.keys(payload).length > 0) {
    await db
      .update(carrier)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(carrier.id, carrierId));
  }

  return true;
};

export const deleteCarrier = async (carrierId: string): Promise<boolean> => {
  const [existing] = await db
    .select({ id: carrier.id })
    .from(carrier)
    .where(eq(carrier.id, carrierId));

  if (!existing) {
    return false;
  }

  await db.delete(carrier).where(eq(carrier.id, carrierId));

  return true;
};

export const assertCarrierExists = async (carrierId: string): Promise<void> => {
  const [row] = await db.select({ id: carrier.id }).from(carrier).where(eq(carrier.id, carrierId));

  if (!row) {
    throw createError.NotFound("Carrier not found");
  }
};
