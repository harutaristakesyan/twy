import { randomUUID } from "node:crypto";
import { asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import createError from "http-errors";
import { db } from "../client.js";
import {
  branch,
  file,
  type LoadRow,
  type LoadStatus,
  load,
  loadFiles,
  type OrderDirection,
  users,
} from "../schema/index.js";

const DEFAULT_LOAD_STATUS: LoadStatus = "Pending";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export interface LoadFileInput {
  id: string;
  fileName: string;
}

export interface LoadFileRecord {
  id: string;
  fileName: string;
}

export interface LoadLocationRecord {
  cityZipCode: string | null;
  phone: string | null;
  carrier: string;
  name: string;
  address: string;
}

export interface LoadRecord {
  id: string;
  customer: string;
  referenceNumber: string;
  customerRate: number | null;
  contactName: string;
  carrier: string | null;
  carrierPaymentMethod: string | null;
  carrierRate: number;
  chargeServiceFeeToOffice: boolean;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature: string | null;
  pickup: LoadLocationRecord;
  dropoff: LoadLocationRecord;
  branchId: string;
  status: LoadStatus;
  statusChangedBy: string | null;
  files: LoadFileRecord[];
  createdAt: string | null;
  updatedAt: string | null;
}

export type CreateLoadInput = {
  customer: string;
  referenceNumber: string;
  customerRate?: number | null;
  contactName: string;
  carrier?: string | null;
  carrierPaymentMethod?: string | null;
  carrierRate: number;
  chargeServiceFeeToOffice?: boolean;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature?: string | null;
  pickupCityZipCode?: string | null;
  pickupPhone?: string | null;
  pickupCarrier: string;
  pickupName: string;
  pickupAddress: string;
  dropoffCityZipCode?: string | null;
  dropoffPhone?: string | null;
  dropoffCarrier: string;
  dropoffName: string;
  dropoffAddress: string;
  branchId: string;
  files?: LoadFileInput[] | undefined;
};

export type UpdateLoad = Partial<Omit<CreateLoadInput, "files">> & {
  files?: LoadFileInput[] | undefined;
};

const numericToNumber = (value: string | null): number | null =>
  value === null ? null : Number(value);

export interface ListLoadsInput {
  page: number;
  limit: number;
  sortField: "referenceNumber" | "status" | "createdAt" | "customer";
  sortOrder: OrderDirection;
  query?: string;
}

const normalizeLoadFiles = (files: LoadFileInput[]): LoadFileInput[] => {
  const seen = new Map<string, LoadFileInput>();
  const ordered: LoadFileInput[] = [];

  for (const f of files) {
    if (!seen.has(f.id)) {
      const normalized: LoadFileInput = { id: f.id, fileName: f.fileName };
      seen.set(f.id, normalized);
      ordered.push(normalized);
    }
  }

  return ordered;
};

const ensureBranchExists = async (executor: Executor, branchId: string): Promise<void> => {
  const [existing] = await executor
    .select({ id: branch.id })
    .from(branch)
    .where(eq(branch.id, branchId));

  if (!existing) {
    throw new createError.NotFound("Branch not found");
  }
};

const ensureFilesPersisted = async (
  executor: Executor,
  files: LoadFileInput[],
): Promise<string[]> => {
  const uniqueFiles = normalizeLoadFiles(files);

  if (uniqueFiles.length === 0) {
    return [];
  }

  const fileIds = uniqueFiles.map((f) => f.id);

  const existing = await executor
    .select({ id: file.id })
    .from(file)
    .where(inArray(file.id, fileIds));

  const existingIds = new Set(existing.map((row) => row.id));
  const missing = uniqueFiles.filter((f) => !existingIds.has(f.id));

  if (missing.length > 0) {
    await executor.insert(file).values(missing.map((f) => ({ id: f.id, fileName: f.fileName })));
  }

  return fileIds;
};

const fetchFilesForLoads = async (
  executor: Executor,
  loadIds: string[],
): Promise<Map<string, LoadFileRecord[]>> => {
  if (loadIds.length === 0) {
    return new Map();
  }

  const rows = await executor
    .select({
      loadId: loadFiles.loadId,
      fileId: loadFiles.fileId,
      fileName: file.fileName,
    })
    .from(loadFiles)
    .innerJoin(file, eq(file.id, loadFiles.fileId))
    .where(inArray(loadFiles.loadId, loadIds));

  const grouped = new Map<string, LoadFileRecord[]>();

  for (const row of rows) {
    const existing = grouped.get(row.loadId) ?? [];
    existing.push({ id: row.fileId, fileName: row.fileName });
    grouped.set(row.loadId, existing);
  }

  return grouped;
};

const mapLoadRow = (row: LoadRow, files: LoadFileRecord[]): LoadRecord => ({
  id: row.id,
  customer: row.customer ?? "",
  referenceNumber: row.referenceNumber,
  customerRate: numericToNumber(row.customerRate),
  contactName: row.contactName,
  carrier: row.carrier ?? null,
  carrierPaymentMethod: row.carrierPaymentMethod ?? null,
  carrierRate: Number(row.carrierRate),
  chargeServiceFeeToOffice: Boolean(row.chargeServiceFeeToOffice),
  loadType: row.loadType,
  serviceType: row.serviceType,
  serviceGivenAs: row.serviceGivenAs,
  commodity: row.commodity,
  bookedAs: row.bookedAs,
  soldAs: row.soldAs,
  weight: row.weight,
  temperature: row.temperature ?? null,
  pickup: {
    cityZipCode: row.pickupCityZipCode ?? null,
    phone: row.pickupPhone,
    carrier: row.pickupCarrier,
    name: row.pickupName,
    address: row.pickupAddress,
  },
  dropoff: {
    cityZipCode: row.dropoffCityZipCode ?? null,
    phone: row.dropoffPhone,
    carrier: row.dropoffCarrier,
    name: row.dropoffName,
    address: row.dropoffAddress,
  },
  branchId: row.branchId,
  status: row.status,
  statusChangedBy: row.statusChangedBy,
  files,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
});

const loadSortColumn = (field: ListLoadsInput["sortField"]) => {
  switch (field) {
    case "referenceNumber":
      return load.referenceNumber;
    case "status":
      return load.status;
    case "customer":
      return load.customer;
    default:
      return load.createdAt;
  }
};

export const listLoads = async (input: ListLoadsInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderColumn = loadSortColumn(input.sortField);
  const offset = input.page * input.limit;

  const searchClause = input.query
    ? or(
        ilike(load.referenceNumber, `%${input.query}%`),
        ilike(load.customer, `%${input.query}%`),
        ilike(load.contactName, `%${input.query}%`),
        ilike(load.carrier, `%${input.query}%`),
        ilike(load.commodity, `%${input.query}%`),
      )
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(load)
      .where(searchClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(load).where(searchClause),
  ]);

  const filesMap = await fetchFilesForLoads(
    db,
    rows.map((row) => row.id),
  );

  return {
    loads: rows.map((row) => mapLoadRow(row, filesMap.get(row.id) ?? [])),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

const replaceLoadFiles = async (
  executor: Executor,
  loadId: string,
  fileIds: string[],
): Promise<void> => {
  await executor.delete(loadFiles).where(eq(loadFiles.loadId, loadId));

  if (fileIds.length === 0) {
    return;
  }

  await executor.insert(loadFiles).values(fileIds.map((fileId) => ({ loadId, fileId })));
};

export const createLoad = async (input: CreateLoadInput): Promise<string> =>
  db.transaction(async (tx) => {
    await ensureBranchExists(tx, input.branchId);

    const fileIds = input.files ? await ensureFilesPersisted(tx, input.files) : [];

    const loadId = randomUUID();

    await tx.insert(load).values({
      id: loadId,
      customer: input.customer,
      referenceNumber: input.referenceNumber,
      customerRate: input.customerRate == null ? null : input.customerRate.toString(),
      contactName: input.contactName,
      carrier: input.carrier ?? null,
      carrierPaymentMethod: input.carrierPaymentMethod ?? null,
      carrierRate: input.carrierRate.toString(),
      chargeServiceFeeToOffice: Boolean(input.chargeServiceFeeToOffice),
      loadType: input.loadType,
      serviceType: input.serviceType,
      serviceGivenAs: input.serviceGivenAs,
      commodity: input.commodity,
      bookedAs: input.bookedAs,
      soldAs: input.soldAs,
      weight: input.weight,
      temperature: input.temperature ?? null,
      pickupCityZipCode: input.pickupCityZipCode ?? null,
      pickupPhone: input.pickupPhone ?? null,
      pickupCarrier: input.pickupCarrier,
      pickupName: input.pickupName,
      pickupAddress: input.pickupAddress,
      dropoffCityZipCode: input.dropoffCityZipCode ?? null,
      dropoffPhone: input.dropoffPhone ?? null,
      dropoffCarrier: input.dropoffCarrier,
      dropoffName: input.dropoffName,
      dropoffAddress: input.dropoffAddress,
      branchId: input.branchId,
      status: DEFAULT_LOAD_STATUS,
      statusChangedBy: null,
    });

    if (fileIds.length > 0) {
      await tx.insert(loadFiles).values(fileIds.map((fileId) => ({ loadId, fileId })));
    }

    return loadId;
  });

export const updateLoad = async (loadId: string, input: UpdateLoad): Promise<boolean> =>
  db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: load.id }).from(load).where(eq(load.id, loadId));

    if (!existing) {
      return false;
    }

    if (typeof input.branchId !== "undefined") {
      await ensureBranchExists(tx, input.branchId);
    }

    let normalizedFiles: string[] | undefined;
    if (typeof input.files !== "undefined") {
      normalizedFiles = input.files ? await ensureFilesPersisted(tx, input.files) : [];
    }

    const updatePayload: Partial<typeof load.$inferInsert> = {};

    if (typeof input.customer !== "undefined") updatePayload.customer = input.customer;
    if (typeof input.referenceNumber !== "undefined")
      updatePayload.referenceNumber = input.referenceNumber;
    if (typeof input.customerRate !== "undefined")
      updatePayload.customerRate =
        input.customerRate == null ? null : input.customerRate.toString();
    if (typeof input.contactName !== "undefined") updatePayload.contactName = input.contactName;
    if (typeof input.carrier !== "undefined") updatePayload.carrier = input.carrier ?? null;
    if (typeof input.carrierPaymentMethod !== "undefined")
      updatePayload.carrierPaymentMethod = input.carrierPaymentMethod ?? null;
    if (typeof input.carrierRate !== "undefined")
      updatePayload.carrierRate = input.carrierRate.toString();
    if (Object.hasOwn(input, "chargeServiceFeeToOffice"))
      updatePayload.chargeServiceFeeToOffice = Boolean(input.chargeServiceFeeToOffice);
    if (typeof input.loadType !== "undefined") updatePayload.loadType = input.loadType;
    if (typeof input.serviceType !== "undefined") updatePayload.serviceType = input.serviceType;
    if (typeof input.serviceGivenAs !== "undefined")
      updatePayload.serviceGivenAs = input.serviceGivenAs;
    if (typeof input.commodity !== "undefined") updatePayload.commodity = input.commodity;
    if (typeof input.bookedAs !== "undefined") updatePayload.bookedAs = input.bookedAs;
    if (typeof input.soldAs !== "undefined") updatePayload.soldAs = input.soldAs;
    if (typeof input.weight !== "undefined") updatePayload.weight = input.weight;
    if (typeof input.temperature !== "undefined")
      updatePayload.temperature = input.temperature ?? null;
    if (typeof input.pickupCityZipCode !== "undefined")
      updatePayload.pickupCityZipCode = input.pickupCityZipCode ?? null;
    if (typeof input.pickupPhone !== "undefined")
      updatePayload.pickupPhone = input.pickupPhone ?? null;
    if (typeof input.pickupCarrier !== "undefined")
      updatePayload.pickupCarrier = input.pickupCarrier;
    if (typeof input.pickupName !== "undefined") updatePayload.pickupName = input.pickupName;
    if (typeof input.pickupAddress !== "undefined")
      updatePayload.pickupAddress = input.pickupAddress;
    if (typeof input.dropoffCityZipCode !== "undefined")
      updatePayload.dropoffCityZipCode = input.dropoffCityZipCode ?? null;
    if (typeof input.dropoffPhone !== "undefined")
      updatePayload.dropoffPhone = input.dropoffPhone ?? null;
    if (typeof input.dropoffCarrier !== "undefined")
      updatePayload.dropoffCarrier = input.dropoffCarrier;
    if (typeof input.dropoffName !== "undefined") updatePayload.dropoffName = input.dropoffName;
    if (typeof input.dropoffAddress !== "undefined")
      updatePayload.dropoffAddress = input.dropoffAddress;
    if (typeof input.branchId !== "undefined") updatePayload.branchId = input.branchId;

    if (Object.keys(updatePayload).length > 0) {
      await tx
        .update(load)
        .set({ ...updatePayload, updatedAt: new Date() })
        .where(eq(load.id, loadId));
    }

    if (typeof normalizedFiles !== "undefined") {
      await replaceLoadFiles(tx, loadId, normalizedFiles);
    }

    return true;
  });

export const changeLoadStatus = async (
  loadId: string,
  status: LoadStatus,
  changedBy: string,
): Promise<{ updated: boolean; statusChangedByEmail: string | null }> =>
  db.transaction(async (tx) => {
    const [updateResult, userRow] = await Promise.all([
      tx
        .update(load)
        .set({ status, statusChangedBy: changedBy, updatedAt: new Date() })
        .where(eq(load.id, loadId))
        .returning({ id: load.id }),
      tx.select({ email: users.email }).from(users).where(eq(users.id, changedBy)),
    ]);

    const updated = updateResult.length > 0;

    return {
      updated,
      statusChangedByEmail: updated ? (userRow[0]?.email ?? null) : null,
    };
  });

export const deleteLoad = async (loadId: string): Promise<boolean> =>
  db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: load.id }).from(load).where(eq(load.id, loadId));

    if (!existing) {
      return false;
    }

    await tx.delete(loadFiles).where(eq(loadFiles.loadId, loadId));
    await tx.delete(load).where(eq(load.id, loadId));

    return true;
  });
