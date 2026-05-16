import { ArrowDownToLine } from "@gravity-ui/icons";
import { Spinner } from "@heroui/react";
import type React from "react";
import { useFileDownload } from "../hooks/useFileDownload";

export interface FileDownloadButtonProps {
  fileId: string;
  fileName: string;
  icon?: boolean;
  children?: React.ReactNode;
}

const FileDownloadButton = ({
  fileId,
  fileName,
  icon = false,
  children,
}: FileDownloadButtonProps) => {
  const { download, isDownloading } = useFileDownload();
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50"
      disabled={isDownloading}
      onClick={() => void download(fileId, fileName)}
    >
      {isDownloading ? (
        <Spinner size="sm" />
      ) : icon ? (
        <ArrowDownToLine className="h-3.5 w-3.5" />
      ) : null}
      {children ?? fileName}
    </button>
  );
};

export default FileDownloadButton;
export { FileDownloadButton };
