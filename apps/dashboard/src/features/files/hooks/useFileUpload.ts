import { App } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { filesApi } from "../api/filesApi";
import type { DocumentCategory } from "../constants";
import { MAX_FILE_SIZE_BYTES, MAX_FILES_DEFAULT } from "../constants";
import type { FileUploaderValueItem } from "../types";

export interface UseFileUploadArgs {
  documentCategory?: DocumentCategory;
  max?: number;
  maxSizeBytes?: number;
  acceptedMimeTypes?: readonly string[];
  initial?: FileUploaderValueItem[];
}

const itemsToAntdList = (items: FileUploaderValueItem[]): UploadFile[] =>
  items.map((i) => ({
    uid: i.uid,
    name: i.name,
    status: i.status,
    size: i.size,
    type: i.contentType,
  }));

const mimeMatches = (fileType: string, accepted: readonly string[]): boolean => {
  if (!accepted.length) return true;
  return accepted.some((rule) => {
    if (rule.endsWith("/*")) return fileType.startsWith(rule.slice(0, -1));
    return fileType === rule;
  });
};

export const useFileUpload = ({
  documentCategory,
  max = MAX_FILES_DEFAULT,
  maxSizeBytes = MAX_FILE_SIZE_BYTES,
  acceptedMimeTypes = [],
  initial = [],
}: UseFileUploadArgs = {}) => {
  const { message } = App.useApp();
  const [items, setItems] = useState<FileUploaderValueItem[]>(initial);

  const committedRef = useRef(false);
  const uploadedIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(0);

  // Cleanup on unmount: best-effort delete any uploaded-but-uncommitted files.
  useEffect(() => {
    return () => {
      if (committedRef.current) return;
      const ids = [...uploadedIdsRef.current];
      if (ids.length === 0) return;
      void filesApi.batchDeleteFiles(ids).catch((): void => undefined);
    };
  }, []);

  const commit = useCallback(() => {
    committedRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    uploadedIdsRef.current = new Set();
    inFlightRef.current = 0;
    committedRef.current = false;
  }, []);

  const validate = useCallback(
    (file: File): string | null => {
      if (file.size > maxSizeBytes) {
        return `File "${file.name}" exceeds the maximum size of ${Math.floor(
          maxSizeBytes / (1024 * 1024),
        )}MB.`;
      }
      if (!mimeMatches(file.type, acceptedMimeTypes)) {
        return `File "${file.name}" has an unsupported type (${file.type || "unknown"}).`;
      }
      return null;
    },
    [maxSizeBytes, acceptedMimeTypes],
  );

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const fileId = await filesApi.uploadFile(file, documentCategory);
        uploadedIdsRef.current.add(fileId);
        return fileId;
      } catch (err: unknown) {
        message.error(getErrorMessage(err));
        return null;
      } finally {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
      }
    },
    [documentCategory, message],
  );

  const remove = useCallback((uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
    const fileId = uid;
    if (uploadedIdsRef.current.has(fileId)) {
      uploadedIdsRef.current.delete(fileId);
      void filesApi.deleteFile(fileId).catch((): void => undefined);
    }
  }, []);

  const beforeUpload: UploadProps["beforeUpload"] = useCallback(
    (file: File): boolean => {
      const done = items.filter((i) => i.status === "done").length;
      const uploading = items.filter((i) => i.status === "uploading").length;
      if (done + uploading + inFlightRef.current >= max) {
        message.warning(`You can attach at most ${max} file${max === 1 ? "" : "s"}.`);
        return false;
      }
      const error = validate(file);
      if (error) {
        message.warning(error);
        return false;
      }
      inFlightRef.current += 1;
      return true;
    },
    [items, max, message, validate],
  );

  const customRequest: UploadProps["customRequest"] = useCallback(
    async (options: Parameters<NonNullable<UploadProps["customRequest"]>>[0]) => {
      const { file, onSuccess: ok, onError } = options;
      const uploadFile = file as UploadFile;
      const fileId = await upload(file as File);
      if (fileId) {
        ok?.(fileId);
        setItems((cur) =>
          cur.map((x) =>
            x.uid === uploadFile.uid ? { ...x, uid: fileId, status: "done", fileId } : x,
          ),
        );
      } else {
        onError?.(new Error("Upload failed"));
        setItems((cur) => cur.filter((x) => x.uid !== uploadFile.uid));
      }
    },
    [upload],
  );

  const onChange: UploadProps["onChange"] = useCallback(
    (info: Parameters<NonNullable<UploadProps["onChange"]>>[0]) => {
      // AntD's fileList is the source of truth for status transitions during upload.
      const next: FileUploaderValueItem[] = info.fileList.map((f) => {
        // Try to keep existing fileId for "done" entries that we replaced uid.
        const existing = uploadedIdsRef.current.has(f.uid) ? f.uid : undefined;
        const status: FileUploaderValueItem["status"] =
          f.status === "done" || f.status === "uploading" || f.status === "error"
            ? f.status
            : "uploading";
        return {
          uid: f.uid,
          name: f.name,
          status,
          fileId: existing,
          size: f.size,
          contentType: f.type,
        };
      });
      setItems(next);
    },
    [],
  );

  const onRemove: UploadProps["onRemove"] = useCallback(
    (file: UploadFile) => {
      remove(file.uid);
      return true;
    },
    [remove],
  );

  const fileIds = useMemo(
    () => items.filter((i) => i.status === "done" && i.fileId).map((i) => i.fileId as string),
    [items],
  );

  const isBusy = useMemo(() => items.some((i) => i.status === "uploading"), [items]);
  const fileListForAntd = useMemo(() => itemsToAntdList(items), [items]);

  return {
    items,
    fileIds,
    isBusy,
    upload,
    remove,
    reset,
    commit,
    beforeUpload,
    customRequest,
    onChange,
    onRemove,
    fileListForAntd,
  };
};

export type UseFileUploadResult = ReturnType<typeof useFileUpload>;
