import { documentCategoryValues } from "@twy/db";
import z from "zod";
import { AuthContext } from "../shared/auth.js";
import { MAX_BATCH_DELETE_FILE_IDS, MAX_UPLOAD_FILE_SIZE_BYTES } from "./constants.js";

export const documentCategorySchema = z.enum([...documentCategoryValues] as [
  (typeof documentCategoryValues)[number],
  ...(typeof documentCategoryValues)[number][],
]);

const UploadFilePayloadSchema = z.object({
  fileName: z.string().trim().min(1, "fileName is required"),
  contentType: z.string().trim().min(1, "contentType is required"),
  size: z
    .number()
    .int("size must be an integer")
    .positive("size must be greater than zero")
    .max(MAX_UPLOAD_FILE_SIZE_BYTES, "size must be less than or equal to 100MB"),
  documentCategory: documentCategorySchema.optional(),
});

export const UploadFileEventSchema = z.object({
  requestContext: AuthContext,
  body: UploadFilePayloadSchema,
});

export type UploadFileEvent = z.infer<typeof UploadFileEventSchema>;

export const DeleteFileEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    fileId: z.uuid("fileId must be a valid UUID"),
  }),
});

export type DeleteFileEvent = z.infer<typeof DeleteFileEventSchema>;

export const GetDownloadUrlEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    fileId: z.uuid("fileId must be a valid UUID"),
  }),
});

export type GetDownloadUrlEvent = z.infer<typeof GetDownloadUrlEventSchema>;

export const BatchDeleteFilesEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    fileIds: z
      .array(z.uuid("Each fileId must be a valid UUID"))
      .min(1, "At least one fileId is required")
      .max(MAX_BATCH_DELETE_FILE_IDS, `At most ${MAX_BATCH_DELETE_FILE_IDS} fileIds per request`),
  }),
});

export type BatchDeleteFilesEvent = z.infer<typeof BatchDeleteFilesEventSchema>;
