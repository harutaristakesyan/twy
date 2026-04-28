import { AuthContext } from "@contracts/common/auth";
import z from "zod";

const UploadFilePayloadSchema = z.object({
  fileName: z.string().trim().min(1, "fileName is required"),
  contentType: z.string().trim().min(1, "contentType is required"),
  size: z
    .number()
    .int("size must be an integer")
    .positive("size must be greater than zero")
    .max(100 * 1024 * 1024, "size must be less than or equal to 100MB"),
});

export const UploadFileEventSchema = z.object({
  requestContext: AuthContext,
  body: UploadFilePayloadSchema,
});

export type UploadFileEvent = z.infer<typeof UploadFileEventSchema>;

export const DeleteFileEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    fileId: z.string().uuid("fileId must be a valid UUID"),
  }),
});

export type DeleteFileEvent = z.infer<typeof DeleteFileEventSchema>;

export const GetDownloadUrlEventSchema = z.object({
  requestContext: AuthContext,
  pathParameters: z.object({
    fileId: z.string().uuid("fileId must be a valid UUID"),
  }),
});

export type GetDownloadUrlEvent = z.infer<typeof GetDownloadUrlEventSchema>;
