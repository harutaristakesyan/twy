import { ArrowDownToLine, ArrowUpFromLine, Xmark } from "@gravity-ui/icons";
import { Button, Spinner, toast } from "@heroui/react";
import { useRef, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { filesApi } from "../api/filesApi";

export interface AttachedFile {
  /** Server-issued file id. */
  fileId: string;
  fileName: string;
}

export interface AttachedFilesFieldProps {
  files: AttachedFile[];
  onAdd: (file: File) => Promise<string>;
  onRemove?: (fileId: string) => Promise<void>;
  onChanged?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  readOnly?: boolean;
  multiple?: boolean;
  buttonLabel?: string;
}

interface LocalFile extends AttachedFile {
  uploading?: boolean;
  error?: boolean;
}

const AttachedFilesField = ({
  files,
  onAdd,
  onRemove,
  onChanged,
  onUploadingChange,
  readOnly = false,
  multiple = true,
  buttonLabel = "Upload file",
}: AttachedFilesFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>(() => files.map((f) => ({ ...f })));
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Sync when external files change
  // We use a ref pattern to avoid re-render on every parent update
  const prevFilesRef = useRef<AttachedFile[]>(files);
  if (prevFilesRef.current !== files) {
    prevFilesRef.current = files;
    // Merge: keep uploading items, replace done items from props
    setLocalFiles((cur) => {
      const uploading = cur.filter((f) => f.uploading);
      const fromProps = files.map((f) => ({ ...f }));
      return [...fromProps, ...uploading];
    });
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || readOnly) return;
    const fileArray = Array.from(e.target.files);
    e.target.value = "";

    for (const file of fileArray) {
      const tempId = `uploading-${Date.now()}-${Math.random()}`;
      const tempItem: LocalFile = { fileId: tempId, fileName: file.name, uploading: true };
      setLocalFiles((cur) => [...cur, tempItem]);
      onUploadingChange?.(true);
      try {
        await onAdd(file);
        toast.success(`${file.name} uploaded`);
        onChanged?.();
      } catch (err: unknown) {
        toast.danger(`${file.name} failed to upload: ${getErrorMessage(err)}`);
        setLocalFiles((cur) => cur.filter((f) => f.fileId !== tempId));
      } finally {
        setLocalFiles((cur) => cur.filter((f) => f.fileId !== tempId));
        onUploadingChange?.(false);
      }
    }
  };

  const handleRemove = async (fileId: string, fileName: string) => {
    if (readOnly || !onRemove) return;
    setRemovingId(fileId);
    try {
      await onRemove(fileId);
      toast.success(`${fileName} removed`);
      setLocalFiles((cur) => cur.filter((f) => f.fileId !== fileId));
      onChanged?.();
    } catch (err: unknown) {
      toast.danger(getErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingId(fileId);
    try {
      await filesApi.downloadFile(fileId, fileName);
    } catch (err: unknown) {
      toast.danger(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  const doneFiles = localFiles.filter((f) => !f.uploading);

  return (
    <div className="flex flex-col gap-2">
      {doneFiles.length > 0 && (
        <ul className="flex flex-col gap-1">
          {doneFiles.map((f) => (
            <li
              key={f.fileId}
              className="flex items-center justify-between gap-2 text-sm px-3 py-1.5 rounded bg-gray-50 border border-gray-200"
            >
              <span className="flex-1 truncate text-gray-800">{f.fileName}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  className="text-gray-500 hover:text-primary"
                  onPress={() => void handleDownload(f.fileId, f.fileName)}
                  isDisabled={downloadingId === f.fileId}
                  aria-label="Download"
                >
                  {downloadingId === f.fileId ? (
                    <Spinner size="sm" />
                  ) : (
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  )}
                </Button>
                {!readOnly && onRemove && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-red-500"
                    onPress={() => void handleRemove(f.fileId, f.fileName)}
                    isDisabled={removingId === f.fileId}
                    aria-label="Remove"
                  >
                    {removingId === f.fileId ? (
                      <Spinner size="sm" />
                    ) : (
                      <Xmark className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {localFiles.some((f) => f.uploading) && (
        <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-1.5">
          <Spinner size="sm" />
          <span>Uploading…</span>
        </div>
      )}

      {!readOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            className="hidden"
            onChange={(e) => void handleInputChange(e)}
          />
          <Button variant="outline" onPress={() => inputRef.current?.click()}>
            <ArrowUpFromLine className="h-4 w-4" />
            {buttonLabel}
          </Button>
        </>
      )}
    </div>
  );
};

export default AttachedFilesField;
export { AttachedFilesField };
