import { useRequest } from "ahooks";
import { App, Button, Form, Modal, Space } from "antd";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  type OfficeExpensePaymentOrder,
  type OfficeExpenseService,
  SERVICE_LABELS,
  type UpdateOfficeExpenseDto,
} from "../types/officeExpensePaymentOrder";
import OfficeExpensePaymentOrderForm, {
  type OfficeExpenseFormValues,
} from "./OfficeExpensePaymentOrderForm";

interface Props {
  order: OfficeExpensePaymentOrder | null;
  open: boolean;
  mode: "view" | "edit";
  onClose: () => void;
  onSuccess: () => void;
}

const titleSuffix = (svc: OfficeExpenseService, purpose: string) => {
  const trimmed = purpose.replace(/\s+/g, " ").trim();
  const short = trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed;
  return `${SERVICE_LABELS[svc]} — ${short}`;
};

const buildUpdateDto = (values: OfficeExpenseFormValues): UpdateOfficeExpenseDto | null => {
  let periodStart: string;
  let periodEnd: string;
  if (values.date) {
    periodStart = values.date.format("YYYY-MM-DD");
    periodEnd = periodStart;
  } else if (values.dateRange?.[0] && values.dateRange[1]) {
    periodStart = values.dateRange[0].format("YYYY-MM-DD");
    periodEnd = values.dateRange[1].format("YYYY-MM-DD");
  } else {
    return null;
  }
  return {
    serviceName: values.serviceName,
    paymentPurpose: values.paymentPurpose,
    periodStart,
    periodEnd,
    amount: values.amount,
    currency: values.currency,
    paymentStatus: values.paymentStatus,
  };
};

export default function OfficeExpensePaymentOrderDetailModal({
  order,
  open,
  mode,
  onClose,
  onSuccess,
}: Props) {
  const readOnly = mode === "view";
  const { message } = App.useApp();
  const [form] = Form.useForm<OfficeExpenseFormValues>();
  const [uploading, setUploading] = useState(false);

  const { loading: saving, run: save } = useRequest(
    async (values: OfficeExpenseFormValues) => {
      if (!order) return;
      const dto = buildUpdateDto(values);
      if (!dto) return;
      await officeExpenseApi.update(order.id, dto);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Office expense payment order updated");
        onSuccess();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const modalTitle = order
    ? `${readOnly ? "View" : "Edit"} Office Expense Payment Order — ${titleSuffix(order.serviceName, order.paymentPurpose)}`
    : `${readOnly ? "View" : "Edit"} Office Expense Payment Order`;

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onClose}
      width={640}
      destroyOnHidden
      footer={
        readOnly ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              disabled={uploading}
              onClick={() => form.submit()}
            >
              Save
            </Button>
          </Space>
        )
      }
    >
      {order && (
        <OfficeExpensePaymentOrderForm
          key={order.id}
          form={form}
          order={order}
          readOnly={readOnly}
          onFinish={save}
          onFilesChanged={onSuccess}
          onUploadingChange={setUploading}
        />
      )}
    </Modal>
  );
}
