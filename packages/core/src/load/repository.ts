import { randomUUID } from "node:crypto";
import {
  branch,
  type ChargeSide,
  carrier,
  db,
  file,
  type LoadCommentType,
  type LoadStatus,
  type LoadStopKind,
  load,
  loadComment,
  loadFiles,
  loadStop,
  type OrderDirection,
  outsideBroker,
  paymentOrder,
  users,
} from "@twy/db";
import { and, asc, count, desc, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import createError from "http-errors";
import {
  createPaymentOrderForLoad,
  PaymentOrderRequiredError,
  syncPaymentOrderFromLoad,
} from "../payment-order/repository.js";
import type { AdvancedFilter } from "../shared/advanced-filter-schema.js";
import { buildLoadAdvancedFilterClause } from "../shared/load-advanced-filter.js";
import type { PermissionsScope } from "../shared/permissions.js";
import { allocateLoadReferenceNumber } from "./refNumber.js";
import type { LoadCommentResponse } from "./response.js";
import { assertValidTransition } from "./status-machine.js";

const DEFAULT_LOAD_STATUS: LoadStatus = "Pending";

export class FinancialsLockedError extends Error {
  constructor() {
    super("Financial fields cannot be modified after load is approved");
    this.name = "FinancialsLockedError";
  }
}

export class LoadEditBlockedByStatusError extends Error {
  readonly code = "LOAD_EDIT_BLOCKED_BY_STATUS" as const;

  constructor(readonly loadStatus: Extract<LoadStatus, "Delivered" | "Declined">) {
    super(`Load cannot be edited while in ${loadStatus} status`);
    this.name = "LoadEditBlockedByStatusError";
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export interface LoadFileInput {
  id: string;
  fileName: string;
}

export interface LoadFileRecord {
  id: string;
  fileName: string;
  documentCategory: string | null;
}

export interface LoadLocationRecord {
  cityZipCode: string | null;
  phone: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
}

export interface LoadBrokerRecord {
  id: string;
  brokerName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
}

export interface LoadCarrierRecord {
  id: string;
  carrierName: string;
  mcDotNumber: string;
  paymentMethod: string | null;
  paymentTerms: string | null;
}

export interface LoadRecord {
  id: string;
  referenceNumber: string;
  brokerRate: number | null;
  broker: LoadBrokerRecord;
  carrier: LoadCarrierRecord | null;
  carrierRate: number;
  chargeServiceFeeToOffice: boolean;
  isChargable: boolean;
  chargeAmount: number | null;
  chargeSide: ChargeSide | null;
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
  branchName: string;
  serviceFee: number | null;
  status: LoadStatus;
  statusChangedBy: string | null;
  files: LoadFileRecord[];
  createdAt: string | null;
  updatedAt: string | null;
}

export type CreateLoadInput = {
  brokerId: string;
  brokerRate?: number | null;
  carrierId?: string | null;
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
  sortField: "referenceNumber" | "status" | "createdAt" | "broker";
  sortOrder: OrderDirection;
  query?: string;
  branchId?: string;
  ownerId?: string;
  advancedFilter?: AdvancedFilter;
  /** When true, exclude loads that already have a payment order. */
  excludeWithExistingPO?: boolean;
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
      documentCategory: file.documentCategory,
    })
    .from(loadFiles)
    .innerJoin(file, eq(file.id, loadFiles.fileId))
    .where(inArray(loadFiles.loadId, loadIds));

  const grouped = new Map<string, LoadFileRecord[]>();

  for (const row of rows) {
    const existing = grouped.get(row.loadId) ?? [];
    existing.push({
      id: row.fileId,
      fileName: row.fileName,
      documentCategory: row.documentCategory ?? null,
    });
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
  address: string;
  latitude: string | null;
  longitude: string | null;
  placeId: string | null;
};

const mapStopRowToLocation = (row: LoadStopSelectRow): LoadLocationRecord => ({
  cityZipCode: row.cityZipCode ?? null,
  phone: row.phone ?? null,
  address: row.address,
  latitude: row.latitude !== null ? Number(row.latitude) : null,
  longitude: row.longitude !== null ? Number(row.longitude) : null,
  placeId: row.placeId ?? null,
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
      address: row.address,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      placeId: row.placeId ?? null,
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

interface LoadJoinedRow {
  load: typeof load.$inferSelect;
  branchName: string;
  broker: {
    id: string;
    brokerName: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    paymentMethod: string | null;
    paymentTerms: string | null;
  };
  carrier: {
    id: string;
    carrierName: string;
    mcDotNumber: string;
    paymentMethod: string | null;
    paymentTerms: string | null;
  } | null;
}

const mapLoadRow = (
  joined: LoadJoinedRow,
  files: LoadFileRecord[],
  stops: { pickups: LoadLocationRecord[]; dropoffs: LoadLocationRecord[] },
): LoadRecord => {
  const row = joined.load;
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    brokerRate: numericToNumber(row.brokerRate),
    broker: joined.broker,
    carrier: joined.carrier,
    carrierRate: Number(row.carrierRate),
    chargeServiceFeeToOffice: Boolean(row.chargeServiceFeeToOffice),
    isChargable: Boolean(row.isChargable),
    chargeAmount: numericToNumber(row.chargeAmount),
    chargeSide: (row.chargeSide as ChargeSide | null) ?? null,
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
    branchName: joined.branchName,
    serviceFee: numericToNumber(row.serviceFee),
    status: row.status,
    statusChangedBy: row.statusChangedBy,
    files,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
};

const loadSortColumn = (field: ListLoadsInput["sortField"]) => {
  switch (field) {
    case "referenceNumber":
      return load.referenceNumber;
    case "status":
      return load.status;
    case "broker":
      return outsideBroker.brokerName;
    default:
      return load.createdAt;
  }
};

const loadJoinedSelection = {
  load: load,
  branchName: branch.name,
  broker: {
    id: outsideBroker.id,
    brokerName: outsideBroker.brokerName,
    contactName: outsideBroker.contactName,
    phone: outsideBroker.phone,
    email: outsideBroker.email,
    paymentMethod: outsideBroker.paymentMethod,
    paymentTerms: outsideBroker.paymentTerms,
  },
  carrier: {
    id: carrier.id,
    carrierName: carrier.carrierName,
    mcDotNumber: carrier.mcDotNumber,
    paymentMethod: carrier.paymentMethod,
    paymentTerms: carrier.paymentTerms,
  },
} as const;

const normalizeJoinedRow = (row: {
  load: typeof load.$inferSelect;
  branchName: string;
  broker: LoadJoinedRow["broker"];
  carrier: {
    id: string | null;
    carrierName: string | null;
    mcDotNumber: string | null;
    paymentMethod: string | null;
    paymentTerms: string | null;
  } | null;
}): LoadJoinedRow => ({
  load: row.load,
  branchName: row.branchName,
  broker: row.broker,
  carrier:
    row.carrier && row.carrier.id && row.carrier.carrierName && row.carrier.mcDotNumber
      ? {
          id: row.carrier.id,
          carrierName: row.carrier.carrierName,
          mcDotNumber: row.carrier.mcDotNumber,
          paymentMethod: row.carrier.paymentMethod,
          paymentTerms: row.carrier.paymentTerms,
        }
      : null,
});

export const listLoads = async (input: ListLoadsInput) => {
  const direction = input.sortOrder === "asc" ? asc : desc;
  const orderColumn = loadSortColumn(input.sortField);
  const offset = input.page * input.limit;

  const searchClause = input.query
    ? or(
        ilike(load.referenceNumber, `%${input.query}%`),
        ilike(outsideBroker.brokerName, `%${input.query}%`),
        ilike(carrier.carrierName, `%${input.query}%`),
        ilike(load.commodity, `%${input.query}%`),
      )
    : undefined;
  const branchClause = input.branchId ? eq(load.branchId, input.branchId) : undefined;
  const ownerClause = input.ownerId ? eq(load.createdBy, input.ownerId) : undefined;
  const filterClause = buildLoadAdvancedFilterClause(input.advancedFilter);
  const excludePOClause = input.excludeWithExistingPO
    ? notInArray(load.id, db.select({ id: paymentOrder.loadId }).from(paymentOrder))
    : undefined;
  const whereClause = and(searchClause, branchClause, ownerClause, filterClause, excludePOClause);

  const [rows, totalRows] = await Promise.all([
    db
      .select(loadJoinedSelection)
      .from(load)
      .innerJoin(branch, eq(branch.id, load.branchId))
      .innerJoin(outsideBroker, eq(outsideBroker.id, load.brokerId))
      .leftJoin(carrier, eq(carrier.id, load.carrierId))
      .where(whereClause)
      .orderBy(direction(orderColumn))
      .limit(input.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(load)
      .innerJoin(outsideBroker, eq(outsideBroker.id, load.brokerId))
      .leftJoin(carrier, eq(carrier.id, load.carrierId))
      .where(whereClause),
  ]);

  const joinedRows = rows.map(normalizeJoinedRow);
  const loadIds = joinedRows.map((r) => r.load.id);

  const [filesMap, stopsMap] = await Promise.all([
    fetchFilesForLoads(db, loadIds),
    fetchStopsForLoads(db, loadIds),
  ]);

  return {
    loads: joinedRows.map((joined) =>
      mapLoadRow(
        joined,
        filesMap.get(joined.load.id) ?? [],
        stopsMap.get(joined.load.id) ?? { pickups: [], dropoffs: [] },
      ),
    ),
    total: Number(totalRows[0]?.value ?? 0),
  };
};

export const getLoadById = async (loadId: string): Promise<LoadRecord | null> => {
  const [row] = await db
    .select(loadJoinedSelection)
    .from(load)
    .innerJoin(branch, eq(branch.id, load.branchId))
    .innerJoin(outsideBroker, eq(outsideBroker.id, load.brokerId))
    .leftJoin(carrier, eq(carrier.id, load.carrierId))
    .where(eq(load.id, loadId));

  if (!row) {
    return null;
  }

  const joined = normalizeJoinedRow(row);

  const [filesMap, stopsMap] = await Promise.all([
    fetchFilesForLoads(db, [loadId]),
    fetchStopsForLoads(db, [loadId]),
  ]);

  return mapLoadRow(
    joined,
    filesMap.get(loadId) ?? [],
    stopsMap.get(loadId) ?? { pickups: [], dropoffs: [] },
  );
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
      address: loc.address,
      latitude: loc.latitude !== null && loc.latitude !== undefined ? String(loc.latitude) : null,
      longitude:
        loc.longitude !== null && loc.longitude !== undefined ? String(loc.longitude) : null,
      placeId: loc.placeId ?? null,
    })),
  );
};

export const createLoad = async (
  input: CreateLoadInput,
): Promise<{ loadId: string; referenceNumber: string }> =>
  db.transaction(async (tx) => {
    await ensureBranchExists(tx, input.branchId);

    const fileIds = input.files ? await ensureFilesPersisted(tx, input.files) : [];

    const loadId = randomUUID();
    const referenceNumber = await allocateLoadReferenceNumber(tx);

    await tx.insert(load).values({
      id: loadId,
      referenceNumber,
      brokerRate: input.brokerRate == null ? null : input.brokerRate.toString(),
      brokerId: input.brokerId,
      carrierId: input.carrierId ?? null,
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

    return { loadId, referenceNumber };
  });

const FINANCIAL_FIELDS = ["brokerRate", "carrierRate"] as const;

export const updateLoad = async (loadId: string, input: UpdateLoad): Promise<boolean> =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: load.id, status: load.status, financialsLockedAt: load.financialsLockedAt })
      .from(load)
      .where(eq(load.id, loadId));

    if (!existing) {
      return false;
    }

    if (existing.status === "Delivered" || existing.status === "Declined") {
      throw new LoadEditBlockedByStatusError(existing.status);
    }

    if (existing.financialsLockedAt !== null) {
      const touchesFinancial = FINANCIAL_FIELDS.some((f) => typeof input[f] !== "undefined");
      if (touchesFinancial) throw new FinancialsLockedError();
    }

    if (typeof input.branchId !== "undefined") {
      await ensureBranchExists(tx, input.branchId);
    }

    let normalizedFiles: string[] | undefined;
    if (typeof input.files !== "undefined") {
      normalizedFiles = input.files ? await ensureFilesPersisted(tx, input.files) : [];
    }

    const updatePayload: Partial<typeof load.$inferInsert> = {};

    if (typeof input.brokerId !== "undefined") updatePayload.brokerId = input.brokerId;
    if (typeof input.brokerRate !== "undefined")
      updatePayload.brokerRate = input.brokerRate == null ? null : input.brokerRate.toString();
    if (typeof input.carrierId !== "undefined") updatePayload.carrierId = input.carrierId ?? null;
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

const commentTypeForStatus = (status: LoadStatus, isChargable: boolean): LoadCommentType => {
  if (status === "Hold") return "hold_reason";
  if (status === "Declined") return "decline_reason";
  if (status === "Delivered" && isChargable) return "charge_reason";
  return "general";
};

export const changeLoadStatus = async (
  loadId: string,
  status: LoadStatus,
  changedBy: string,
  isChargable: boolean,
  chargeAmount: number | null,
  chargeSide: ChargeSide | null,
  scope: PermissionsScope,
  fileIds?: string[],
  comment?: string,
): Promise<{ updated: boolean }> =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: load.id,
        status: load.status,
        branchId: load.branchId,
        createdBy: load.createdBy,
        brokerRate: load.brokerRate,
        carrierRate: load.carrierRate,
        serviceFee: load.serviceFee,
      })
      .from(load)
      .where(eq(load.id, loadId));

    if (!existing) return { updated: false };

    if (scope.branchId && existing.branchId !== scope.branchId) return { updated: false };
    if (scope.ownerId && existing.createdBy !== scope.ownerId) return { updated: false };

    assertValidTransition(existing.status, status);

    if (status === "Delivered") {
      const [existingPO] = await tx
        .select({ id: paymentOrder.id })
        .from(paymentOrder)
        .where(eq(paymentOrder.loadId, loadId));
      if (!existingPO) throw new PaymentOrderRequiredError();
    }

    const result = await tx
      .update(load)
      .set({
        status,
        statusChangedBy: changedBy,
        isChargable,
        chargeAmount: isChargable && chargeAmount != null ? chargeAmount.toString() : null,
        chargeSide: isChargable ? chargeSide : null,
        ...(status === "Hold"
          ? { financialsLockedAt: null }
          : status === "Approved" || status === "Delivered"
            ? { financialsLockedAt: new Date() }
            : {}),
        updatedAt: new Date(),
      })
      .where(eq(load.id, loadId))
      .returning({ id: load.id });

    if (status === "Approved") {
      await createPaymentOrderForLoad(tx, loadId, changedBy);
    }

    await syncPaymentOrderFromLoad(tx, loadId, status, {
      brokerRate: existing.brokerRate,
      carrierRate: existing.carrierRate,
      serviceFee: existing.serviceFee,
    });

    if (fileIds && fileIds.length > 0) {
      const owned = await tx
        .select({ id: file.id })
        .from(file)
        .where(and(inArray(file.id, fileIds), eq(file.createdBy, changedBy)));
      if (owned.length !== fileIds.length) {
        throw new createError.Forbidden("One or more files are not owned by the caller");
      }
      await tx
        .insert(loadFiles)
        .values(fileIds.map((fileId) => ({ loadId, fileId })))
        .onConflictDoNothing();
    }

    if (comment) {
      await tx.insert(loadComment).values({
        id: randomUUID(),
        loadId,
        userId: changedBy,
        commentType: commentTypeForStatus(status, isChargable),
        body: comment,
      });
    }

    return { updated: result.length > 0 };
  });

export const getLoadBranchId = async (loadId: string): Promise<string | null> => {
  const [row] = await db.select({ branchId: load.branchId }).from(load).where(eq(load.id, loadId));
  return row?.branchId ?? null;
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

export const listLoadComments = async (loadId: string): Promise<LoadCommentResponse[]> => {
  const rows = await db
    .select({
      id: loadComment.id,
      loadId: loadComment.loadId,
      userId: loadComment.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      profilePictureFileId: users.profilePictureFileId,
      commentType: loadComment.commentType,
      body: loadComment.body,
      createdAt: loadComment.createdAt,
    })
    .from(loadComment)
    .leftJoin(users, eq(users.id, loadComment.userId))
    .where(eq(loadComment.loadId, loadId))
    .orderBy(desc(loadComment.createdAt))
    .limit(200);

  return rows.map((row) => {
    const first = row.firstName ?? null;
    const last = row.lastName ?? null;
    const authorName = first && last ? `${first} ${last}` : (first ?? last ?? null);
    return {
      id: row.id,
      loadId: row.loadId,
      userId: row.userId,
      authorName,
      authorProfilePictureFileId: row.profilePictureFileId ?? null,
      commentType: row.commentType as LoadCommentType,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  });
};

export const addLoadComment = async (
  loadId: string,
  userId: string,
  body: string,
): Promise<string> => {
  const id = randomUUID();
  await db.insert(loadComment).values({ id, loadId, userId, commentType: "general", body });
  return id;
};
