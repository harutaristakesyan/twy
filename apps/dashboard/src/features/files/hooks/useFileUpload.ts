import { toast } from "@heroui/react";
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
      const uid = `upload-${Date.now()}-${Math.random()}`;
      // Add optimistic uploading item
      const optimisticItem: FileUploaderValueItem = {
        uid,
        name: file.name,
        status: "uploading",
        size: file.size,
        contentType: file.type,
      };
      inFlightRef.current += 1;
      setItems((cur) => [...cur, optimisticItem]);

      try {
        const fileId = await filesApi.uploadFile(file, documentCategory);
        uploadedIdsRef.current.add(fileId);
        // Replace optimistic item with done item
        setItems((cur) =>
          cur.map((x) =>
            x.uid === uid ? { ...x, uid: fileId, status: "done" as const, fileId } : x,
          ),
        );
        return fileId;
      } catch (err: unknown) {
        toast.danger(getErrorMessage(err));
        // Remove failed item
        setItems((cur) => cur.filter((x) => x.uid !== uid));
        return null;
      } finally {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
      }
    },
    [documentCategory],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const done = items.filter((i) => i.status === "done").length;
        const uploading = items.filter((i) => i.status === "uploading").length;
        if (done + uploading + inFlightRef.current >= max) {
          toast.warning(`You can attach at most ${max} file${max === 1 ? "" : "s"}.`);
          break;
        }
        const error = validate(file);
        if (error) {
          toast.warning(error);
          continue;
        }
        void upload(file);
      }
    },
    [items, max, validate, upload],
  );

  const remove = useCallback((uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
    const fileId = uid;
    if (uploadedIdsRef.current.has(fileId)) {
      uploadedIdsRef.current.delete(fileId);
      void filesApi.deleteFile(fileId).catch((): void => undefined);
    }
  }, []);

  const fileIds = useMemo(
    () => items.filter((i) => i.status === "done" && i.fileId).map((i) => i.fileId as string),
    [items],
  );

  const isBusy = useMemo(() => items.some((i) => i.status === "uploading"), [items]);

  return {
    items,
    fileIds,
    isBusy,
    upload,
    addFiles,
    remove,
    reset,
    commit,
  };
};

export type UseFileUploadResult = ReturnType<typeof useFileUpload>;
