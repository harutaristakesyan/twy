import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type DocumentCategory, db, file as fileTable } from "@twy/db";
import { and, eq, inArray } from "drizzle-orm";
import errors from "http-errors";
import { Resource } from "sst";

const s3Client = new S3Client({});

const DEFAULT_UPLOAD_URL_TTL_SECONDS = 15 * 60; // 15 minutes
const DEFAULT_DOWNLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hour

export interface CreateUploadUrlInput {
  readonly fileName: string;
  readonly contentType: string;
  readonly size: number;
  /** Cognito-linked user id; stored on `file.created_by` for attach authorization. */
  readonly uploadedByUserId: string;
  readonly documentCategory?: DocumentCategory;
}

export interface CreateUploadUrlResult {
  readonly fileId: string;
  readonly bucket: string;
  readonly key: string;
  readonly uploadUrl: string;
  readonly expiresAt: string;
  readonly requiredHeaders: Record<string, string>;
  readonly fileName: string;
  readonly contentType: string;
  readonly contentLength: number;
}

export interface CreateDownloadUrlInput {
  readonly fileId: string;
}

export interface CreateDownloadUrlResult {
  readonly downloadUrl: string;
  readonly expiresAt: string;
}

export const createUploadUrl = async ({
  fileName,
  contentType,
  size,
  uploadedByUserId,
  documentCategory,
}: CreateUploadUrlInput): Promise<CreateUploadUrlResult> => {
  const bucketName = Resource.Files.name;
  const fileId = randomUUID();
  const key = fileId;
  const ttlSeconds = DEFAULT_UPLOAD_URL_TTL_SECONDS;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: ttlSeconds,
  });

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await db.insert(fileTable).values({
    id: fileId,
    fileName,
    createdBy: uploadedByUserId,
    documentCategory: documentCategory ?? null,
  });

  return {
    fileId,
    bucket: bucketName,
    key,
    uploadUrl,
    expiresAt,
    requiredHeaders: {
      "Content-Type": contentType,
    },
    fileName,
    contentType,
    contentLength: size,
  };
};

export const createDownloadUrl = async ({
  fileId,
}: CreateDownloadUrlInput): Promise<CreateDownloadUrlResult> => {
  const bucketName = Resource.Files.name;
  const ttlSeconds = DEFAULT_DOWNLOAD_URL_TTL_SECONDS;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileId,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: ttlSeconds,
  });

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  return {
    downloadUrl,
    expiresAt,
  };
};

/** Low-level S3 object delete. Does not touch the `file` DB row. */
export const deleteFile = async (fileId: string): Promise<void> => {
  const bucketName = Resource.Files.name;
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileId,
  });

  await s3Client.send(command);
};

const isForeignKeyViolation = (err: unknown): boolean => {
  if (typeof err !== "object" || err === null) return false;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  const code = "code" in err && typeof err.code === "string" ? err.code : "";
  return code === "23503" || message.includes("foreign key") || message.includes("23503");
};

/**
 * Delete a single file the caller owns: removes the DB row, then the S3 object.
 * 404 if the file does not exist or is not owned by the caller.
 * 409 if the file is still linked to a domain entity (FK violation on `file.id`).
 */
export const deleteOwnedFile = async ({
  fileId,
  callerUserId,
}: {
  fileId: string;
  callerUserId: string;
}): Promise<void> => {
  const [owned] = await db
    .select({ id: fileTable.id })
    .from(fileTable)
    .where(and(eq(fileTable.id, fileId), eq(fileTable.createdBy, callerUserId)));

  if (!owned) throw new errors.NotFound(`file ${fileId} not found`);

  try {
    await db.delete(fileTable).where(eq(fileTable.id, fileId));
  } catch (err: unknown) {
    if (isForeignKeyViolation(err)) {
      throw new errors.Conflict(`file ${fileId} is still linked and cannot be deleted`);
    }
    throw err;
  }

  try {
    await deleteFile(fileId);
  } catch {
    /* Row is gone; orphan S3 object is acceptable vs. failing the response. */
  }
};

export interface BatchDeleteFilesInput {
  readonly fileIds: readonly string[];
  readonly callerUserId: string;
}

export interface BatchDeleteFilesResult {
  readonly deleted: string[];
}

/**
 * Best-effort batch delete scoped to caller-owned, unlinked files.
 * Silently skips ids the caller does not own or that are still referenced (FK restrict).
 * Used for orphan cleanup when a user cancels a form mid-upload.
 */
export const batchDeleteFiles = async ({
  fileIds,
  callerUserId,
}: BatchDeleteFilesInput): Promise<BatchDeleteFilesResult> => {
  if (fileIds.length === 0) return { deleted: [] };

  const targets = await db
    .select({ id: fileTable.id })
    .from(fileTable)
    .where(and(inArray(fileTable.id, [...fileIds]), eq(fileTable.createdBy, callerUserId)));
  if (targets.length === 0) return { deleted: [] };

  const deleted: string[] = [];
  for (const { id } of targets) {
    try {
      await db.delete(fileTable).where(eq(fileTable.id, id));
    } catch (err: unknown) {
      if (isForeignKeyViolation(err)) continue;
      throw err;
    }
    try {
      await deleteFile(id);
    } catch {
      /* Row is gone; orphan S3 object is acceptable. */
    }
    deleted.push(id);
  }

  return { deleted };
};
