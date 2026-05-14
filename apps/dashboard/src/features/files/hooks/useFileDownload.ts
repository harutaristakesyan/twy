import { App } from "antd";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { filesApi } from "../api/filesApi";

export const useFileDownload = () => {
  const { message } = App.useApp();
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(
    async (fileId: string, fileName?: string) => {
      setIsDownloading(true);
      try {
        await filesApi.downloadFile(fileId, fileName);
      } catch (err: unknown) {
        message.error(getErrorMessage(err));
      } finally {
        setIsDownloading(false);
      }
    },
    [message],
  );

  return { download, isDownloading };
};
