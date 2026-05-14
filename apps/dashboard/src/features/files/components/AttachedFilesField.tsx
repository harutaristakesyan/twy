import { UploadOutlined } from "@ant-design/icons";
import { App, Button, Upload } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { filesApi } from "../api/filesApi";

export interface AttachedFile {
  /** Server-issued file id. Used as the AntD `uid`. */
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

const toUploadList = (files: AttachedFile[]): UploadFile[] =>
  files.map((f) => ({ uid: f.fileId, name: f.fileName, status: "done" as const }));

const getFileId = (file: UploadFile): string => (file.response as string | undefined) ?? file.uid;

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
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>(() => toUploadList(files));

  useEffect(() => {
    setFileList(toUploadList(files));
  }, [files]);

  const customRequest: UploadProps["customRequest"] = async ({ file, onSuccess: ok, onError }) => {
    if (readOnly) return;
    try {
      const fileId = await onAdd(file as File);
      ok?.(fileId);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const onChange: UploadProps["onChange"] = ({ file, fileList: next }) => {
    setFileList(next);
    onUploadingChange?.(next.some((f) => f.status === "uploading"));
    if (file.status === "done") {
      message.success(`${file.name} uploaded`);
      onChanged?.();
    } else if (file.status === "error") {
      message.error(`${file.name} failed to upload`);
    }
  };

  const handleRemove: UploadProps["onRemove"] = async (file) => {
    if (readOnly || !onRemove) return false;
    try {
      await onRemove(getFileId(file));
      message.success(`${file.name} removed`);
      setFileList((cur) => cur.filter((f) => f.uid !== file.uid));
      onChanged?.();
      return true;
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
      return false;
    }
  };

  const handleDownload: UploadProps["onDownload"] = (file) => {
    void filesApi.downloadFile(getFileId(file), file.name).catch((err: unknown) => {
      message.error(getErrorMessage(err));
    });
  };

  return (
    <Upload
      multiple={multiple}
      disabled={readOnly}
      fileList={fileList}
      customRequest={customRequest}
      onChange={onChange}
      onRemove={readOnly ? undefined : handleRemove}
      onDownload={handleDownload}
      showUploadList={{ showDownloadIcon: true, showRemoveIcon: !readOnly }}
    >
      {!readOnly && <Button icon={<UploadOutlined />}>{buttonLabel}</Button>}
    </Upload>
  );
};

export default AttachedFilesField;
export { AttachedFilesField };
