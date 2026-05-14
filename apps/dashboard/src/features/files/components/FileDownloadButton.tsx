import { DownloadOutlined } from "@ant-design/icons";
import type { ButtonProps } from "antd";
import { Button } from "antd";
import { useFileDownload } from "../hooks/useFileDownload";

export interface FileDownloadButtonProps {
  fileId: string;
  fileName: string;
  size?: ButtonProps["size"];
  type?: ButtonProps["type"];
  icon?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const FileDownloadButton = ({
  fileId,
  fileName,
  size = "small",
  type = "link",
  icon = false,
  children,
  style,
}: FileDownloadButtonProps) => {
  const { download, isDownloading } = useFileDownload();
  return (
    <Button
      type={type}
      size={size}
      loading={isDownloading}
      icon={icon && !isDownloading ? <DownloadOutlined /> : undefined}
      onClick={() => void download(fileId, fileName)}
      style={style}
    >
      {children ?? fileName}
    </Button>
  );
};

export default FileDownloadButton;
export { FileDownloadButton };
