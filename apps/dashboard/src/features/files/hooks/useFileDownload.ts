import { toast } from "@heroui/react";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { filesApi } from "../api/filesApi";

export const useFileDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async (fileId: string, fileName?: string) => {
    setIsDownloading(true);
    try {
      await filesApi.downloadFile(fileId, fileName);
    } catch (err: unknown) {
      toast.danger(getErrorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
};
