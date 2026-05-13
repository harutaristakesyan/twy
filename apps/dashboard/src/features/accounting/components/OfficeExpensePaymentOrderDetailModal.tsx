import { useRequest } from "ahooks";
import { App, Button, Form, Modal, Space } from "antd";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { getDirtyFields } from "@/utils/getDirtyFields";
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

const buildOriginalDto = (order: OfficeExpensePaymentOrder): UpdateOfficeExpenseDto => ({
  serviceName: order.serviceName,
  paymentPurpose: order.paymentPurpose,
  periodStart: order.periodStart,
  periodEnd: order.periodEnd,
  amount: order.amount,
  currency: order.currency,
  paymentStatus: order.paymentStatus,
});

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
  const [isDirty, setIsDirty] = useState(false);

  const handleClose = () => {
    setIsDirty(false);
    onClose();
  };

  const handleValuesChange = useCallback(
    (_changed: Partial<OfficeExpenseFormValues>, allValues: OfficeExpenseFormValues) => {
      if (!order) return;
      const currentDto = buildUpdateDto(allValues);
      if (!currentDto) {
        setIsDirty(false);
        return;
      }
      setIsDirty(Object.keys(getDirtyFields(buildOriginalDto(order), currentDto)).length > 0);
    },
    [order],
  );

  const { loading: saving, run: save } = useRequest(
    async (values: OfficeExpenseFormValues) => {
      if (!order) return false;
      const currentDto = buildUpdateDto(values);
      if (!currentDto) return false;
      const dirty = getDirtyFields(buildOriginalDto(order), currentDto);
      if (Object.keys(dirty).length === 0) return false;
      await officeExpenseApi.update(order.id, dirty);
      return true;
    },
    {
      manual: true,
      onSuccess: (saved) => {
        if (!saved) return;
        message.success("Office expense payment order updated");
        onSuccess();
        handleClose();
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
      onCancel={handleClose}
      width={640}
      destroyOnHidden
      footer={
        readOnly ? (
          <Button onClick={handleClose}>Close</Button>
        ) : (
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              disabled={!isDirty || uploading}
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
          onValuesChange={readOnly ? undefined : handleValuesChange}
        />
      )}
    </Modal>
  );
}
