import type { UploadFile, UploadProps } from "antd";
import { App } from "antd";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { paymentOrderApi } from "../api/paymentOrderApi";
import type { PaymentOrder } from "../types/paymentOrder";

const getFileId = (file: UploadFile): string => (file.response as string | undefined) ?? file.uid;

export function useInvoiceHandlers(paymentOrder: PaymentOrder | null, onSuccess: () => void) {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>(() =>
    (paymentOrder?.invoices ?? []).map((inv) => ({
      uid: inv.fileId,
      name: inv.fileName,
      status: "done" as const,
    })),
  );

  const handleUpload: NonNullable<UploadProps["customRequest"]> = async ({
    file,
    onSuccess: onUploadSuccess,
    onError,
  }) => {
    if (!paymentOrder) return;
    try {
      const fileId = await paymentOrderApi.addInvoice(paymentOrder.id, file as File);
      onUploadSuccess?.(fileId);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleChange: UploadProps["onChange"] = ({ file, fileList: newList }) => {
    setFileList(newList);
    if (file.status === "done") {
      message.success(`${file.name} uploaded`);
      onSuccess();
    } else if (file.status === "error") {
      message.error(`${file.name} failed to upload`);
    }
  };

  const handleRemove = async (file: UploadFile): Promise<boolean> => {
    if (!paymentOrder) return false;
    try {
      await paymentOrderApi.removeInvoice(paymentOrder.id, getFileId(file));
      message.success(`${file.name} removed`);
      onSuccess();
      return true;
    } catch (err) {
      message.error(getErrorMessage(err));
      return false;
    }
  };

  const handleDownload = (file: UploadFile) => {
    paymentOrderApi.downloadInvoice(getFileId(file), file.name).catch((err) => {
      message.error(getErrorMessage(err));
    });
  };

  return { fileList, handleUpload, handleChange, handleRemove, handleDownload };
}
