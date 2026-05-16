import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useCallback, useState } from "react";
import { useApiMutation } from "@/libs/query";
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
  buildInitialValues,
  formValuesToPeriod,
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
  const period = formValuesToPeriod(values);
  if (!period) return null;
  if (!values.serviceName) return null;
  return {
    serviceName: values.serviceName,
    paymentPurpose: values.paymentPurpose,
    ...period,
    amount: Number(values.amount),
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
  const [formValues, setFormValues] = useState<OfficeExpenseFormValues | null>(() =>
    order ? buildInitialValues(order) : null,
  );
  const [uploading, setUploading] = useState(false);

  const isDirty = (() => {
    if (!order || !formValues) return false;
    const currentDto = buildUpdateDto(formValues);
    if (!currentDto) return false;
    return Object.keys(getDirtyFields(buildOriginalDto(order), currentDto)).length > 0;
  })();

  const mutation = useApiMutation(
    async () => {
      if (!order || !formValues) return;
      const currentDto = buildUpdateDto(formValues);
      if (!currentDto) return;
      const dirty = getDirtyFields(buildOriginalDto(order), currentDto);
      if (Object.keys(dirty).length === 0) return;
      await officeExpenseApi.update(order.id, dirty);
    },
    {
      onSuccess: () => {
        toast.success("Office expense payment order updated");
        onSuccess();
        onClose();
      },
      onError: (err) => toast.danger(getErrorMessage(err)),
    },
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) onClose();
    },
    [onClose],
  );

  const modalTitle = order
    ? `${readOnly ? "View" : "Edit"} Office Expense — ${titleSuffix(order.serviceName, order.paymentPurpose)}`
    : `${readOnly ? "View" : "Edit"} Office Expense`;

  return (
    <Modal isOpen={open} onOpenChange={handleOpenChange}>
      <Modal.Header>{modalTitle}</Modal.Header>
      <Modal.Body className="p-2">
        {order && formValues && (
          <OfficeExpensePaymentOrderForm
            key={order.id}
            values={formValues}
            onChange={setFormValues}
            order={order}
            readOnly={readOnly}
            onFilesChanged={onSuccess}
            onUploadingChange={setUploading}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        {readOnly ? (
          <Button variant="ghost" onPress={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="ghost" onPress={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isDisabled={!isDirty || uploading || mutation.isPending}
              onPress={() => mutation.mutate(undefined)}
            >
              {mutation.isPending ? <Spinner size="sm" /> : "Save"}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}
