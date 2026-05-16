import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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

export default function OfficeExpensePaymentOrderDetailModal() {
  const { officeExpenseOrderId } = useParams<{ officeExpenseOrderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mode = (searchParams.get("mode") ?? "view") as "edit" | "view";
  const readOnly = mode === "view";

  const close = () => navigate("..");

  // Look up the order from the React Query cache (populated by useServerTable).
  const cached = queryClient.getQueriesData<{ items: OfficeExpensePaymentOrder[]; total: number }>({
    queryKey: ["office-expense-orders"],
  });
  const order: OfficeExpensePaymentOrder | undefined = cached
    .flatMap(([, data]) => data?.items ?? [])
    .find((r) => r.id === officeExpenseOrderId);

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
      onSuccess: async () => {
        toast.success("Office expense payment order updated");
        await queryClient.invalidateQueries({ queryKey: ["office-expense-orders"] });
        close();
      },
      onError: (err) => toast.danger(getErrorMessage(err)),
    },
  );

  const handleFilesChanged = async () => {
    await queryClient.invalidateQueries({ queryKey: ["office-expense-orders"] });
  };

  const modalTitle = order
    ? `${readOnly ? "View" : "Edit"} Office Expense — ${titleSuffix(order.serviceName, order.paymentPurpose)}`
    : `${readOnly ? "View" : "Edit"} Office Expense`;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{modalTitle}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {!order ? (
                <p className="py-4 text-center text-sm text-default-500">
                  Order not found. Open it from the list.
                </p>
              ) : (
                formValues && (
                  <OfficeExpensePaymentOrderForm
                    key={order.id}
                    values={formValues}
                    onChange={setFormValues}
                    order={order}
                    readOnly={readOnly}
                    onFilesChanged={handleFilesChanged}
                    onUploadingChange={setUploading}
                  />
                )
              )}
            </Modal.Body>
            <Modal.Footer>
              {readOnly ? (
                <Button variant="ghost" onPress={close}>
                  Close
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onPress={close}>
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
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
