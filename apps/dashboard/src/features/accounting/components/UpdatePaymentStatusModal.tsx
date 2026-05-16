import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useCallback, useState } from "react";
import { AttachedFilesField } from "@/features/files";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { getDirtyFields } from "@/utils/getDirtyFields";
import { paymentOrderApi } from "../api/paymentOrderApi";
import type { PaymentOrder, PaymentStatus } from "../types/paymentOrder";
import { STATUS_LABEL } from "./PaymentStatusTag";

type NormalizedPayload = {
  paymentStatus: PaymentStatus;
  carrierPaidAmount: number | null;
  carrierPaidDate: string | null;
  brokerReceivedAmount: number | null;
  brokerReceivedDate: string | null;
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as PaymentStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

interface FormState {
  paymentStatus: PaymentStatus;
  carrierPaidAmount: string;
  carrierPaidDate: string;
  brokerReceivedAmount: string;
  brokerReceivedDate: string;
}

const toFormState = (po: PaymentOrder): FormState => ({
  paymentStatus: po.paymentStatus,
  carrierPaidAmount: po.carrierPaidAmount != null ? String(po.carrierPaidAmount) : "",
  carrierPaidDate: po.carrierPaidDate ?? "",
  brokerReceivedAmount: po.brokerReceivedAmount != null ? String(po.brokerReceivedAmount) : "",
  brokerReceivedDate: po.brokerReceivedDate ?? "",
});

const toPayload = (f: FormState): NormalizedPayload => ({
  paymentStatus: f.paymentStatus,
  carrierPaidAmount: f.carrierPaidAmount !== "" ? Number(f.carrierPaidAmount) : null,
  carrierPaidDate: f.carrierPaidDate || null,
  brokerReceivedAmount: f.brokerReceivedAmount !== "" ? Number(f.brokerReceivedAmount) : null,
  brokerReceivedDate: f.brokerReceivedDate || null,
});

const toOriginalPayload = (po: PaymentOrder): NormalizedPayload => ({
  paymentStatus: po.paymentStatus,
  carrierPaidAmount: po.carrierPaidAmount,
  carrierPaidDate: po.carrierPaidDate,
  brokerReceivedAmount: po.brokerReceivedAmount,
  brokerReceivedDate: po.brokerReceivedDate,
});

interface Props {
  paymentOrder: PaymentOrder | null;
  open: boolean;
  mode?: "edit" | "view";
  onClose: () => void;
  onSuccess: () => void;
}

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function UpdatePaymentStatusModal({
  paymentOrder,
  open,
  mode = "edit",
  onClose,
  onSuccess,
}: Props) {
  const readOnly = mode === "view";
  const [form, setForm] = useState<FormState>(() =>
    paymentOrder
      ? toFormState(paymentOrder)
      : {
          paymentStatus: "Pending" as PaymentStatus,
          carrierPaidAmount: "",
          carrierPaidDate: "",
          brokerReceivedAmount: "",
          brokerReceivedDate: "",
        },
  );

  const isDirty = paymentOrder
    ? Object.keys(getDirtyFields(toOriginalPayload(paymentOrder), toPayload(form))).length > 0
    : false;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const mutation = useApiMutation(
    async () => {
      if (!paymentOrder) return;
      const dirty = getDirtyFields(toOriginalPayload(paymentOrder), toPayload(form));
      if (Object.keys(dirty).length === 0) return;
      await paymentOrderApi.update(paymentOrder.id, dirty);
    },
    {
      onSuccess: () => {
        toast.success("Payment order updated");
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

  return (
    <Modal isOpen={open} onOpenChange={handleOpenChange}>
      <Modal.Header>
        {readOnly ? "View" : "Edit"} Payment Order — {paymentOrder?.referenceNumber ?? ""}
      </Modal.Header>
      <Modal.Body className="p-2">
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
            <div>
              <p className={labelClass}>Broker Receivable</p>
              <p className="text-sm font-medium">
                {paymentOrder?.brokerReceivable != null
                  ? `€${paymentOrder.brokerReceivable.toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className={labelClass}>Carrier Payable</p>
              <p className="text-sm font-medium">
                {paymentOrder?.carrierPayable != null
                  ? `€${paymentOrder.carrierPayable.toFixed(2)}`
                  : "—"}
              </p>
            </div>
          </div>

          <label className={labelClass}>
            Payment Status
            <select
              value={form.paymentStatus}
              onChange={(e) => set("paymentStatus", e.target.value as PaymentStatus)}
              disabled={readOnly}
              className={fieldClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className={labelClass}>
              Carrier Paid (€)
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                value={form.carrierPaidAmount}
                onChange={(e) => set("carrierPaidAmount", e.target.value)}
                disabled={readOnly}
                placeholder="0.00"
              />
            </label>
            <label className={labelClass}>
              Carrier Paid Date
              <input
                type="date"
                className={fieldClass}
                value={form.carrierPaidDate}
                onChange={(e) => set("carrierPaidDate", e.target.value)}
                disabled={readOnly}
              />
            </label>
            <label className={labelClass}>
              Broker Received (€)
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                value={form.brokerReceivedAmount}
                onChange={(e) => set("brokerReceivedAmount", e.target.value)}
                disabled={readOnly}
                placeholder="0.00"
              />
            </label>
            <label className={labelClass}>
              Broker Received Date
              <input
                type="date"
                className={fieldClass}
                value={form.brokerReceivedDate}
                onChange={(e) => set("brokerReceivedDate", e.target.value)}
                disabled={readOnly}
              />
            </label>
          </div>

          <div>
            <span className={labelClass}>Invoices</span>
            <AttachedFilesField
              files={(paymentOrder?.invoices ?? []).map((inv) => ({
                fileId: inv.fileId,
                fileName: inv.fileName,
              }))}
              onAdd={(file) =>
                paymentOrder
                  ? paymentOrderApi.addInvoice(paymentOrder.id, file)
                  : Promise.reject(new Error("Payment order missing"))
              }
              onRemove={
                paymentOrder
                  ? (fileId) => paymentOrderApi.removeInvoice(paymentOrder.id, fileId)
                  : undefined
              }
              onChanged={onSuccess}
              readOnly={readOnly}
              buttonLabel="Upload Invoice"
            />
          </div>
        </div>
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
              isDisabled={!isDirty || mutation.isPending}
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
