import { Flex, Typography } from "antd";
import { FileDownloadButton } from "./FileDownloadButton";

export interface FileListItem {
  id: string;
  fileName: string;
}

export interface FileListProps {
  files: FileListItem[];
  emptyText?: string;
}

const FileList = ({ files, emptyText = "No files" }: FileListProps) => {
  if (files.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }
  return (
    <Flex vertical gap={4}>
      {files.map((f) => (
        <FileDownloadButton
          key={f.id}
          fileId={f.id}
          fileName={f.fileName}
          style={{ padding: 0, height: "auto" }}
        />
      ))}
    </Flex>
  );
};

export default FileList;
export { FileList };
