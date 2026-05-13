import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, file as fileTable } from "@twy/db";
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

  await db.insert(fileTable).values({ id: fileId, fileName, createdBy: uploadedByUserId });

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

export const deleteFile = async (fileId: string): Promise<void> => {
  const bucketName = Resource.Files.name;
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileId,
  });

  await s3Client.send(command);
};
