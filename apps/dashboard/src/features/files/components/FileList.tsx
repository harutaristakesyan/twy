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
    return <span className="text-sm text-gray-500">{emptyText}</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {files.map((f) => (
        <FileDownloadButton key={f.id} fileId={f.id} fileName={f.fileName} />
      ))}
    </div>
  );
};

export default FileList;
export { FileList };
