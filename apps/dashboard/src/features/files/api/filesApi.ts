import ApiClient from "@/libs/ApiClient";
import type { ApiResponse } from "@/libs/api-types";
import type { DocumentCategory } from "../constants";

const toProxiedS3Url = (url: string): string => {
  if (!import.meta.env.DEV) return url;
  try {
    const parsedUrl = new URL(url);
    return `/s3-proxy${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return url;
  }
};

export interface FileUploadPayload {
  fileName: string;
  contentType: string;
  size: number;
  documentCategory?: DocumentCategory;
}

export interface FileUploadResponse {
  fileId: string;
  bucket: string;
  key: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: { "Content-Type": string };
  fileName: string;
  contentType: string;
  contentLength: number;
}

export interface FileDownloadResponse {
  downloadUrl: string;
  expiresAt: string;
}

export const filesApi = {
  requestUploadUrl: async (payload: FileUploadPayload): Promise<FileUploadResponse> => {
    const response = await ApiClient.post<ApiResponse<FileUploadResponse>>("/files", payload);
    return response.data;
  },

  uploadToS3: async (
    uploadUrl: string,
    file: File,
    headers: Record<string, string>,
  ): Promise<void> => {
    const targetUrl = toProxiedS3Url(uploadUrl);
    const response = await fetch(targetUrl, { method: "PUT", headers, body: file });
    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
    }
  },

  uploadFile: async (file: File, documentCategory?: DocumentCategory): Promise<string> => {
    const payload: FileUploadPayload = {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      ...(documentCategory && { documentCategory }),
    };
    const contract = await filesApi.requestUploadUrl(payload);
    await filesApi.uploadToS3(contract.uploadUrl, file, contract.requiredHeaders);
    return contract.fileId;
  },

  getDownloadUrl: async (fileId: string): Promise<FileDownloadResponse> => {
    const response = await ApiClient.get<ApiResponse<FileDownloadResponse>>(`/files/${fileId}`);
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await ApiClient.delete<ApiResponse<{ message: string }>>(`/files/${fileId}`);
  },

  batchDeleteFiles: async (fileIds: string[]): Promise<void> => {
    if (fileIds.length === 0) return;
    await ApiClient.post<ApiResponse<{ message: string }>>("/files/batch-delete", { fileIds });
  },

  downloadFile: async (fileId: string, fileName?: string): Promise<void> => {
    const { downloadUrl } = await filesApi.getDownloadUrl(fileId);
    const response = await fetch(downloadUrl, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
