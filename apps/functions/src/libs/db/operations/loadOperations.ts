import { randomUUID } from "node:crypto";
import createError from "http-errors";
import {
  Database,
  getDb,
  LoadStatus,
  loadStatusValues,
  LoadTable,
  NewRow,
  OrderDirection,
  PatchRow,
} from "@libs/db";
import { Kysely, Selectable, Transaction } from "kysely";

const LOAD_TABLE = "load";
const LOAD_FILES_TABLE = "load_files";
const FILE_TABLE = "file";
const BRANCH_TABLE = "branch";
const USER_TABLE = "users";

const DEFAULT_LOAD_STATUS: LoadStatus = loadStatusValues[0];

type Executor = Kysely<Database> | Transaction<Database>;

type LoadRow = Selectable<LoadTable>;

export type NewLoad = Omit<NewRow<LoadTable>, "status" | "statusChangedBy"> & {
  files: LoadFileRecord[] | undefined;
};
export type UpdateLoad = PatchRow<LoadTable> & {
  files?: LoadFileRecord[] | undefined;
};

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

  for (const file of files) {
    const existing = seen.get(file.id);

    if (!existing) {
      const normalized: LoadFileInput = {
        id: file.id,
        fileName: file.fileName,
      };

      seen.set(file.id, normalized);
      ordered.push(normalized);
    }
  }

  return ordered;
};

const ensureBranchExists = async (
  db: Executor,
  branchId: string,
): Promise<void> => {
  const branch = await db
    .selectFrom(BRANCH_TABLE)
    .select(["id"])
    .where("id", "=", branchId)
    .executeTakeFirst();

  if (!branch) {
    throw new createError.NotFound("Branch not found");
  }
};

const ensureFilesPersisted = async (
  db: Executor,
  files: LoadFileInput[],
): Promise<string[]> => {
  const uniqueFiles = normalizeLoadFiles(files);

  if (uniqueFiles.length === 0) {
    return [];
  }

  const fileIds = uniqueFiles.map((file) => file.id);

  const existing = await db
    .selectFrom(FILE_TABLE)
    .select(["id"])
    .where("id", "in", fileIds)
    .execute();

  const existingIds = new Set(existing.map((file) => file.id));

  const missing = uniqueFiles.filter((file) => !existingIds.has(file.id));

  if (missing.length > 0) {
    const now = new Date();

    await db
      .insertInto(FILE_TABLE)
      .values(
        missing.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .execute();
  }

  return fileIds;
};

interface LoadFileRow {
  loadId: string;
  fileId: string;
  fileName: string;
}

const fetchFilesForLoads = async (
  db: Executor,
  loadIds: string[],
): Promise<Map<string, LoadFileRecord[]>> => {
  if (loadIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom(LOAD_FILES_TABLE)
    .innerJoin(FILE_TABLE, `${FILE_TABLE}.id`, `${LOAD_FILES_TABLE}.fileId`)
    .select([
      `${LOAD_FILES_TABLE}.loadId as loadId`,
      `${LOAD_FILES_TABLE}.fileId as fileId`,
      `${FILE_TABLE}.fileName as fileName`,
    ])
    .where(`${LOAD_FILES_TABLE}.loadId`, "in", loadIds)
    .execute();

  const grouped = new Map<string, LoadFileRecord[]>();

  for (const row of rows as LoadFileRow[]) {
    const existing = grouped.get(row.loadId) ?? [];
    existing.push({ id: row.fileId, fileName: row.fileName });
    grouped.set(row.loadId, existing);
  }

  return grouped;
};

const mapLoadRow = (row: LoadRow, files: LoadFileRecord[]): LoadRecord => ({
  id: row.id,
  customer: row.customer,
  referenceNumber: row.referenceNumber,
  customerRate: row.customerRate ?? null,
  contactName: row.contactName,
  carrier: row.carrier ?? null,
  carrierPaymentMethod: row.carrierPaymentMethod ?? null,
  carrierRate: row.carrierRate,
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

export const listLoads = async (input: ListLoadsInput) => {
  const db = await getDb();
  const page = input.page;
  const limit = input.limit;
  const sortField = input.sortField;
  const sortOrder = input.sortOrder;
  const searchQuery = input.query;

  let dataQuery = db.selectFrom(LOAD_TABLE).selectAll();
  let countQuery = db
    .selectFrom(LOAD_TABLE)
    .select(db.fn.count<number>("id").as("count"));

  if (searchQuery) {
    dataQuery = dataQuery.where((wb) =>
      wb.or([
        wb(`${LOAD_TABLE}.referenceNumber`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.customer`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.contactName`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.carrier`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.commodity`, "like", `%${searchQuery}%`),
      ]),
    );

    countQuery = countQuery.where((wb) =>
      wb.or([
        wb(`${LOAD_TABLE}.referenceNumber`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.customer`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.contactName`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.carrier`, "like", `%${searchQuery}%`),
        wb(`${LOAD_TABLE}.commodity`, "like", `%${searchQuery}%`),
      ]),
    );
  }

  dataQuery = dataQuery.orderBy(sortField, sortOrder);

  const offset = page * limit;
  dataQuery = dataQuery.limit(limit).offset(offset);

  const [rows, countResult] = await Promise.all([
    dataQuery.execute(),
    countQuery.executeTakeFirst(),
  ]);

  const loadIds = rows.map((row) => row.id);

  const filesMap = await fetchFilesForLoads(db, loadIds);

  const total = Number(countResult?.count ?? 0);

  return {
    loads: rows.map((row) => mapLoadRow(row, filesMap.get(row.id) ?? [])),
    total,
  };
};

const replaceLoadFiles = async (
  db: Executor,
  loadId: string,
  fileIds: string[],
): Promise<void> => {
  await db.deleteFrom(LOAD_FILES_TABLE).where("loadId", "=", loadId).execute();

  if (fileIds.length === 0) {
    return;
  }

  const values = fileIds.map((fileId) => ({ loadId, fileId }));

  await db.insertInto(LOAD_FILES_TABLE).values(values).execute();
};

export const createLoad = async (input: NewLoad): Promise<string> => {
  const db = await getDb();

  return db.transaction().execute(async (trx) => {
    await ensureBranchExists(trx, input.branchId);

    const fileIds = input.files
      ? await ensureFilesPersisted(trx, input.files)
      : [];

    const loadId = randomUUID();

    await trx
      .insertInto(LOAD_TABLE)
      .values({
        id: loadId,
        customer: input.customer,
        referenceNumber: input.referenceNumber,
        customerRate:
          typeof input.customerRate === "undefined" ? null : input.customerRate,
        contactName: input.contactName,
        carrier: typeof input.carrier === "undefined" ? null : input.carrier,
        carrierPaymentMethod:
          typeof input.carrierPaymentMethod === "undefined"
            ? null
            : input.carrierPaymentMethod,
        carrierRate: input.carrierRate,
        chargeServiceFeeToOffice: Boolean(input.chargeServiceFeeToOffice),
        loadType: input.loadType,
        serviceType: input.serviceType,
        serviceGivenAs: input.serviceGivenAs,
        commodity: input.commodity,
        bookedAs: input.bookedAs,
        soldAs: input.soldAs,
        weight: input.weight,
        temperature:
          typeof input.temperature === "undefined" ? null : input.temperature,
        pickupCityZipCode: input.pickupCityZipCode ?? null,
        pickupPhone: input.pickupPhone,
        pickupCarrier: input.pickupCarrier,
        pickupName: input.pickupName,
        pickupAddress: input.pickupAddress,
        dropoffCityZipCode: input.dropoffCityZipCode ?? null,
        dropoffPhone: input.dropoffPhone,
        dropoffCarrier: input.dropoffCarrier,
        dropoffName: input.dropoffName,
        dropoffAddress: input.dropoffAddress,
        branchId: input.branchId,
        status: DEFAULT_LOAD_STATUS,
        statusChangedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();

    if (fileIds.length > 0) {
      await trx
        .insertInto(LOAD_FILES_TABLE)
        .values(fileIds.map((fileId) => ({ loadId, fileId })))
        .execute();
    }

    return loadId;
  });
};

export const updateLoad = async (
  loadId: string,
  input: UpdateLoad,
): Promise<boolean> => {
  const db = await getDb();

  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom(LOAD_TABLE)
      .select(["id"])
      .where("id", "=", loadId)
      .executeTakeFirst();

    if (!existing) {
      return false;
    }

    if (typeof input.branchId !== "undefined") {
      await ensureBranchExists(trx, input.branchId);
    }

    let normalizedFiles: string[] | undefined;
    if (typeof input.files !== "undefined") {
      normalizedFiles = input.files
        ? await ensureFilesPersisted(trx, input.files)
        : [];
    }

    const updatePayload: Record<string, unknown> = {};

    if (typeof input.customer !== "undefined") {
      updatePayload.customer = input.customer;
    }

    if (typeof input.referenceNumber !== "undefined") {
      updatePayload.referenceNumber = input.referenceNumber;
    }

    if (typeof input.customerRate !== "undefined") {
      updatePayload.customerRate = input.customerRate ?? null;
    }

    if (typeof input.contactName !== "undefined") {
      updatePayload.contactName = input.contactName;
    }

    if (typeof input.carrier !== "undefined") {
      updatePayload.carrier = input.carrier ?? null;
    }

    if (typeof input.carrierPaymentMethod !== "undefined") {
      updatePayload.carrierPaymentMethod = input.carrierPaymentMethod ?? null;
    }

    if (typeof input.carrierRate !== "undefined") {
      updatePayload.carrierRate = input.carrierRate;
    }

    if (
      Object.prototype.hasOwnProperty.call(input, "chargeServiceFeeToOffice")
    ) {
      updatePayload.chargeServiceFeeToOffice = Boolean(
        input.chargeServiceFeeToOffice,
      );
    }

    if (typeof input.loadType !== "undefined") {
      updatePayload.loadType = input.loadType;
    }

    if (typeof input.serviceType !== "undefined") {
      updatePayload.serviceType = input.serviceType;
    }

    if (typeof input.serviceGivenAs !== "undefined") {
      updatePayload.serviceGivenAs = input.serviceGivenAs;
    }

    if (typeof input.commodity !== "undefined") {
      updatePayload.commodity = input.commodity;
    }

    if (typeof input.bookedAs !== "undefined") {
      updatePayload.bookedAs = input.bookedAs;
    }

    if (typeof input.soldAs !== "undefined") {
      updatePayload.soldAs = input.soldAs;
    }

    if (typeof input.weight !== "undefined") {
      updatePayload.weight = input.weight;
    }

    if (typeof input.temperature !== "undefined") {
      updatePayload.temperature = input.temperature ?? null;
    }

    if (typeof input.pickupCityZipCode !== "undefined") {
      updatePayload.pickupCityZipCode = input.pickupCityZipCode ?? null;
    }

    if (typeof input.pickupPhone !== "undefined") {
      updatePayload.pickupPhone = input.pickupPhone;
    }

    if (typeof input.pickupCarrier !== "undefined") {
      updatePayload.pickupCarrier = input.pickupCarrier;
    }

    if (typeof input.pickupName !== "undefined") {
      updatePayload.pickupName = input.pickupName;
    }

    if (typeof input.pickupAddress !== "undefined") {
      updatePayload.pickupAddress = input.pickupAddress;
    }

    if (typeof input.dropoffCityZipCode !== "undefined") {
      updatePayload.dropoffCityZipCode = input.dropoffCityZipCode ?? null;
    }

    if (typeof input.dropoffPhone !== "undefined") {
      updatePayload.dropoffPhone = input.dropoffPhone;
    }

    if (typeof input.dropoffCarrier !== "undefined") {
      updatePayload.dropoffCarrier = input.dropoffCarrier;
    }

    if (typeof input.dropoffName !== "undefined") {
      updatePayload.dropoffName = input.dropoffName;
    }

    if (typeof input.dropoffAddress !== "undefined") {
      updatePayload.dropoffAddress = input.dropoffAddress;
    }

    if (typeof input.branchId !== "undefined") {
      updatePayload.branchId = input.branchId;
    }

    if (Object.keys(updatePayload).length > 0) {
      await trx
        .updateTable(LOAD_TABLE)
        .set({
          ...updatePayload,
          updatedAt: new Date(),
        })
        .where("id", "=", loadId)
        .execute();
    }

    if (typeof normalizedFiles !== "undefined") {
      await replaceLoadFiles(trx, loadId, normalizedFiles);
    }

    return true;
  });
};

export const changeLoadStatus = async (
  loadId: string,
  status: LoadStatus,
  changedBy: string,
): Promise<{ updated: boolean; statusChangedByEmail: string | null }> => {
  const db = await getDb();

  return db.transaction().execute(async (trx) => {
    const [result, user] = await Promise.all([
      trx
        .updateTable(LOAD_TABLE)
        .set({ status, statusChangedBy: changedBy, updatedAt: new Date() })
        .where("id", "=", loadId)
        .executeTakeFirst(),
      trx
        .selectFrom(USER_TABLE)
        .select(["email"])
        .where("id", "=", changedBy)
        .executeTakeFirst(),
    ]);

    const updated = (result?.numUpdatedRows ?? 0n) > 0n;

    return {
      updated,
      statusChangedByEmail: updated ? (user?.email ?? null) : null,
    };
  });
};

export const deleteLoad = async (loadId: string): Promise<boolean> => {
  const db = await getDb();

  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom(LOAD_TABLE)
      .select(["id"])
      .where("id", "=", loadId)
      .executeTakeFirst();

    if (!existing) {
      return false;
    }

    await trx
      .deleteFrom(LOAD_FILES_TABLE)
      .where("loadId", "=", loadId)
      .execute();

    await trx.deleteFrom(LOAD_TABLE).where("id", "=", loadId).execute();

    return true;
  });
};
