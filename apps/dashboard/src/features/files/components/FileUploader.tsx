import { ArrowUpFromLine, Xmark } from "@gravity-ui/icons";
import { Button, Spinner } from "@heroui/react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { DocumentCategory } from "../constants";
import { MAX_FILE_SIZE_BYTES, MAX_FILES_DEFAULT } from "../constants";
import { useFileUpload } from "../hooks/useFileUpload";
import type { FileUploaderValueItem } from "../types";

export interface FileUploaderHandle {
  commit: () => void;
  fileIds: string[];
}

export interface FileUploaderProps {
  value?: FileUploaderValueItem[];
  onChange?: (items: FileUploaderValueItem[]) => void;
  documentCategory?: DocumentCategory;
  max?: number;
  maxSizeBytes?: number;
  acceptedMimeTypes?: readonly string[];
  disabled?: boolean;
  buttonLabel?: string;
  multiple?: boolean;
  helpText?: string;
}

const FileUploader = forwardRef<FileUploaderHandle, FileUploaderProps>(
  (
    {
      value,
      onChange,
      documentCategory,
      max = MAX_FILES_DEFAULT,
      maxSizeBytes = MAX_FILE_SIZE_BYTES,
      acceptedMimeTypes,
      disabled,
      buttonLabel = "Select files",
      multiple = true,
      helpText,
    },
    ref,
  ) => {
    const upload = useFileUpload({
      documentCategory,
      max,
      maxSizeBytes,
      acceptedMimeTypes,
      initial: value,
    });

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const inputRef = useRef<HTMLInputElement>(null);

    // Propagate item changes up to the parent form.
    useEffect(() => {
      onChangeRef.current?.(upload.items);
    }, [upload.items]);

    useImperativeHandle(
      ref,
      () => ({
        commit: upload.commit,
        fileIds: upload.fileIds,
      }),
      [upload.commit, upload.fileIds],
    );

    const doneCount = upload.items.filter((i) => i.status === "done").length;
    const buttonDisabled = disabled || doneCount >= max || upload.isBusy;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        upload.addFiles(e.target.files);
        // Reset input so the same file can be re-selected
        e.target.value = "";
      }
    };

    const acceptStr = acceptedMimeTypes?.join(",") || undefined;

    return (
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={acceptStr}
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />

        {upload.items.length > 0 && (
          <ul className="flex flex-col gap-1">
            {upload.items.map((item) => (
              <li
                key={item.uid}
                className="flex items-center justify-between gap-2 text-sm px-3 py-1.5 rounded bg-gray-50 border border-gray-200"
              >
                <span
                  className={`flex-1 truncate ${item.status === "error" ? "text-red-500" : "text-gray-800"}`}
                >
                  {item.name}
                </span>
                {item.status === "uploading" && <Spinner size="sm" />}
                {!disabled && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    onPress={() => upload.remove(item.uid)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Xmark className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onPress={() => inputRef.current?.click()}
            isDisabled={buttonDisabled}
          >
            {upload.isBusy ? <Spinner size="sm" /> : <ArrowUpFromLine className="h-4 w-4" />}
            {buttonLabel}
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          {upload.isBusy
            ? "Upload in progress… wait before submitting."
            : (helpText ?? `Up to ${max} file${max === 1 ? "" : "s"}.`)}
        </p>
      </div>
    );
  },
);

FileUploader.displayName = "FileUploader";

export default FileUploader;
export { FileUploader };
