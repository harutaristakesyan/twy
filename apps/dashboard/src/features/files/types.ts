import type { DocumentCategory } from "./constants";

export type FileUploadStatus = "uploading" | "done" | "error";

export interface FileUploaderValueItem {
  readonly uid: string;
  readonly name: string;
  readonly status: FileUploadStatus;
  /** Present once status === "done". For "uploading" items this is unset. */
  readonly fileId?: string;
  readonly size?: number;
  readonly contentType?: string;
}

export interface UploadedFile {
  readonly id: string;
  readonly fileName: string;
  readonly documentCategory: DocumentCategory | null;
}
