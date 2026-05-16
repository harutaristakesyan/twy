import type React from "react";
import { FileList } from "@/features/files";
import type { Load } from "@/features/load/types/load";

export const LoadDetailDocsTab: React.FC<{ load: Load }> = ({ load }) => {
  if (load.files.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-default-500">No documents attached.</p>
      </div>
    );
  }
  return <FileList files={load.files.map((f) => ({ id: f.id, fileName: f.fileName }))} />;
};
