import { UploadOutlined } from "@ant-design/icons";
import { Button, Typography, Upload } from "antd";
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

    return (
      <div>
        <Upload
          multiple={multiple}
          fileList={upload.fileListForAntd}
          beforeUpload={upload.beforeUpload}
          customRequest={upload.customRequest}
          onChange={upload.onChange}
          onRemove={upload.onRemove}
          disabled={disabled}
        >
          <Button icon={<UploadOutlined />} disabled={buttonDisabled} loading={upload.isBusy}>
            {buttonLabel}
          </Button>
        </Upload>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          {upload.isBusy
            ? "Upload in progress… wait before submitting."
            : (helpText ?? `Up to ${max} file${max === 1 ? "" : "s"}.`)}
        </Typography.Paragraph>
      </div>
    );
  },
);

FileUploader.displayName = "FileUploader";

export default FileUploader;
export { FileUploader };
