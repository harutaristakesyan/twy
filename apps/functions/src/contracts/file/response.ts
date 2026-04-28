export interface UploadFileResponse {
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

export interface DownloadFileResponse {
  readonly downloadUrl: string;
  readonly expiresAt: string;
}
