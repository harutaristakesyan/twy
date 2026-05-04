import { randomUUID } from "node:crypto";
import {
  branch,
  db,
  file,
  type LoadRow,
  type LoadStatus,
  type LoadStopKind,
  load,
  loadFiles,
  loadStop,
  type OrderDirection,
} from "@twy/db";
import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import createError from "http-errors";

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
  paymentMethod: string;
  paymentTerms: string;
  carrier: string | null;
  carrierPaymentMethod: string | null;
  carrierRate: number;
  chargeServiceFeeToOffice: boolean;
  isChargable: boolean;
  chargeAmount: number | null;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature: string | null;
  pickups: LoadLocationRecord[];
  dropoffs: LoadLocationRecord[];
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
  paymentMethod: string;
  paymentTerms: string;
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
  pickups: LoadLocationRecord[];
  dropoffs: LoadLocationRecord[];
  branchId: string;
  createdBy: string;
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
  branchId?: string;
  ownerId?: string;
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

type LoadStopSelectRow = {
  loadId: string;
  kind: LoadStopKind;
  sortOrder: number;
  cityZipCode: string | null;
  phone: string | null;
  carrier: string;
  name: string;
  address: string;
};

const mapStopRowToLocation = (row: LoadStopSelectRow): LoadLocationRecord => ({
  cityZipCode: row.cityZipCode ?? null,
  phone: row.phone ?? null,
  carrier: row.carrier,
  name: row.name,
  address: row.address,
});

const fetchStopsForLoads = async (
  executor: Executor,
  loadIds: string[],
): Promise<Map<string, { pickups: LoadLocationRecord[]; dropoffs: LoadLocationRecord[] }>> => {
  if (loadIds.length === 0) {
    return new Map();
  }

  const rows = await executor.select().from(loadStop).where(inArray(loadStop.loadId, loadIds));

  type Agg = { pickupRows: LoadStopSelectRow[]; dropoffRows: LoadStopSelectRow[] };
  const grouped = new Map<string, Agg>();

  for (const row of rows) {
    const mapped: LoadStopSelectRow = {
      loadId: row.loadId,
      kind: row.kind,
      sortOrder: row.sortOrder,
      cityZipCode: row.cityZipCode ?? null,
      phone: row.phone ?? null,
      carrier: row.carrier,
      name: row.name,
      address: row.address,
    };
    const g = grouped.get(row.loadId) ?? { pickupRows: [], dropoffRows: [] };
    if (row.kind === "pickup") {
      g.pickupRows.push(mapped);
    } else if (row.kind === "dropoff") {
      g.dropoffRows.push(mapped);
    }
    grouped.set(row.loadId, g);
  }

  const result = new Map<
    string,
    { pickups: LoadLocationRecord[]; dropoffs: LoadLocationRecord[] }
  >();
  for (const [loadId, { pickupRows, dropoffRows }] of grouped) {
    pickupRows.sort((a, b) => a.sortOrder - b.sortOrder);
    dropoffRows.sort((a, b) => a.sortOrder - b.sortOrder);
    result.set(loadId, {
      pickups: pickupRows.map(mapStopRowToLocation),
      dropoffs: dropoffRows.map(mapStopRowToLocation),
    });
  }

  return result;
};

const mapLoadRow = (
  row: LoadRow,
  files: LoadFileRecord[],
  stops: { pickups: LoadLocationRecord[]; dropoffs: LoadLocationRecord[] },
): LoadRecord => ({
  id: row.id,
  customer: row.customer ?? "",
  referenceNumber: row.referenceNumber,
  customerRate: numericToNumber(row.customerRate),
  contactName: row.contactName,
  paymentMethod: row.paymentMethod ?? "",
  paymentTerms: row.paymentTerms ?? "",
  carrier: row.carrier ?? null,
  carrierPaymentMethod: row.carrierPaymentMethod ?? null,
  carrierRate: Number(row.carrierRate),
  chargeServiceFeeToOffice: Boolean(row.chargeServiceFeeToOffice),
  isChargable: Boolean(row.isChargable),
  chargeAmount: numericToNumber(row.chargeAmount),
  loadType: row.loadType,
  serviceType: row.serviceType,
  serviceGivenAs: row.serviceGivenAs,
  commodity: row.commodity,
  bookedAs: row.bookedAs,
  soldAs: row.soldAs,
  weight: row.weight,
  temperature: row.temperature ?? null,
  pickups: stops.pickups,
  dropoffs: stops.dropoffs,
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
  const branchClause = input.branchId ? eq(load.branchId, input.branchId) : undefined;
  const ownerClause = input.ownerId ? eq(load.createdBy, input.ownerId) : undefined;
  const whereClause = and(searchClause, branchClause, ownerClause);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(load)
      .where(whereClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db.select({ value: count() }).from(load).where(whereClause),
  ]);

  const loadIds = rows.map((row) => row.id);

  const [filesMap, stopsMap] = await Promise.all([
    fetchFilesForLoads(db, loadIds),
    fetchStopsForLoads(db, loadIds),
  ]);

  return {
    loads: rows.map((row) =>
      mapLoadRow(
        row,
        filesMap.get(row.id) ?? [],
        stopsMap.get(row.id) ?? { pickups: [], dropoffs: [] },
      ),
    ),
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

const replaceLoadStopsForKind = async (
  executor: Executor,
  loadId: string,
  kind: LoadStopKind,
  locations: LoadLocationRecord[],
): Promise<void> => {
  await executor.delete(loadStop).where(and(eq(loadStop.loadId, loadId), eq(loadStop.kind, kind)));

  if (locations.length === 0) {
    return;
  }

  await executor.insert(loadStop).values(
    locations.map((loc, sortOrder) => ({
      loadId,
      kind,
      sortOrder,
      cityZipCode: loc.cityZipCode ?? null,
      phone: loc.phone ?? null,
      carrier: loc.carrier,
      name: loc.name,
      address: loc.address,
    })),
  );
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
      paymentMethod: input.paymentMethod,
      paymentTerms: input.paymentTerms,
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
      branchId: input.branchId,
      createdBy: input.createdBy,
      status: DEFAULT_LOAD_STATUS,
      statusChangedBy: null,
    });

    await replaceLoadStopsForKind(tx, loadId, "pickup", input.pickups);
    await replaceLoadStopsForKind(tx, loadId, "dropoff", input.dropoffs);

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
    if (typeof input.paymentMethod !== "undefined")
      updatePayload.paymentMethod = input.paymentMethod;
    if (typeof input.paymentTerms !== "undefined") updatePayload.paymentTerms = input.paymentTerms;
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

    if (typeof input.pickups !== "undefined") {
      await replaceLoadStopsForKind(tx, loadId, "pickup", input.pickups);
    }
    if (typeof input.dropoffs !== "undefined") {
      await replaceLoadStopsForKind(tx, loadId, "dropoff", input.dropoffs);
    }

    return true;
  });

export const changeLoadStatus = async (
  loadId: string,
  status: LoadStatus,
  changedBy: string,
  isChargable: boolean,
  chargeAmount: number | null,
): Promise<{ updated: boolean }> => {
  const result = await db
    .update(load)
    .set({
      status,
      statusChangedBy: changedBy,
      isChargable,
      chargeAmount: isChargable && chargeAmount != null ? chargeAmount.toString() : null,
      updatedAt: new Date(),
    })
    .where(eq(load.id, loadId))
    .returning({ id: load.id });
  return { updated: result.length > 0 };
};

export const deleteLoad = async (loadId: string): Promise<boolean> =>
  db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: load.id }).from(load).where(eq(load.id, loadId));

    if (!existing) {
      return false;
    }

    await tx.delete(load).where(eq(load.id, loadId));

    return true;
  });
