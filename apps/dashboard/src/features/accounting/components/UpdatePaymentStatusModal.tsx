import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { FormDateInput, FormNumberInput, FormSelect } from "@/components/form";
import { AttachedFilesField } from "@/features/files";
import { useZodForm } from "@/libs/form";
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

const statusItems = STATUS_OPTIONS.map((o) => ({ id: o.value, label: o.label }));

const schema = z.object({
  paymentStatus: z.string().min(1, "Payment status is required"),
  carrierPaidAmount: z.number().nullable(),
  carrierPaidDate: z.string(),
  brokerReceivedAmount: z.number().nullable(),
  brokerReceivedDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

const toOriginalPayload = (po: PaymentOrder): NormalizedPayload => ({
  paymentStatus: po.paymentStatus,
  carrierPaidAmount: po.carrierPaidAmount,
  carrierPaidDate: po.carrierPaidDate,
  brokerReceivedAmount: po.brokerReceivedAmount,
  brokerReceivedDate: po.brokerReceivedDate,
});

const toPayloadFromValues = (values: FormValues): NormalizedPayload => ({
  paymentStatus: values.paymentStatus as PaymentStatus,
  carrierPaidAmount: values.carrierPaidAmount,
  carrierPaidDate: values.carrierPaidDate || null,
  brokerReceivedAmount: values.brokerReceivedAmount,
  brokerReceivedDate: values.brokerReceivedDate || null,
});

export default function UpdatePaymentStatusModal() {
  const { paymentOrderId } = useParams<{ paymentOrderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mode = (searchParams.get("mode") ?? "view") as "edit" | "view";
  const readOnly = mode === "view";

  const close = () => navigate("..");

  // Look up the payment order from the React Query cache (populated by useServerTable).
  const cached = queryClient.getQueriesData<{ items: PaymentOrder[]; total: number }>({
    queryKey: ["payment-orders"],
  });
  const paymentOrder: PaymentOrder | undefined = cached
    .flatMap(([, data]) => data?.items ?? [])
    .find((r) => r.id === paymentOrderId);

  const { control, handleSubmit, reset, watch } = useZodForm<FormValues>(schema, {
    paymentStatus: "Pending",
    carrierPaidAmount: null,
    carrierPaidDate: "",
    brokerReceivedAmount: null,
    brokerReceivedDate: "",
  });

  useEffect(() => {
    if (paymentOrder) {
      reset({
        paymentStatus: paymentOrder.paymentStatus,
        carrierPaidAmount: paymentOrder.carrierPaidAmount,
        carrierPaidDate: paymentOrder.carrierPaidDate ?? "",
        brokerReceivedAmount: paymentOrder.brokerReceivedAmount,
        brokerReceivedDate: paymentOrder.brokerReceivedDate ?? "",
      });
    }
  }, [paymentOrder, reset]);

  const currentValues = watch();
  const isDirty = paymentOrder
    ? Object.keys(
        getDirtyFields(toOriginalPayload(paymentOrder), toPayloadFromValues(currentValues)),
      ).length > 0
    : false;

  const mutation = useApiMutation(
    async (values: FormValues) => {
      if (!paymentOrder) return;
      const dirty = getDirtyFields(toOriginalPayload(paymentOrder), toPayloadFromValues(values));
      if (Object.keys(dirty).length === 0) return;
      await paymentOrderApi.update(paymentOrder.id, dirty);
    },
    {
      onSuccess: async () => {
        toast.success("Payment order updated");
        await queryClient.invalidateQueries({ queryKey: ["payment-orders"] });
        close();
      },
      onError: (err) => toast.danger(getErrorMessage(err)),
    },
  );

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  const handleFilesChanged = async () => {
    await queryClient.invalidateQueries({ queryKey: ["payment-orders"] });
  };

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
              <Modal.Heading>
                {readOnly ? "View" : "Edit"} Payment Order — {paymentOrder?.referenceNumber ?? ""}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {!paymentOrder ? (
                <p className="py-4 text-center text-sm text-default-500">
                  Payment order not found. Open it from the list.
                </p>
              ) : (
                <form
                  id="update-payment-status-form"
                  onSubmit={onSubmit}
                  className="flex flex-col gap-4 mt-2"
                >
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="block text-sm font-medium text-gray-700 mb-1">
                        Broker Receivable
                      </p>
                      <p className="text-sm font-medium">
                        {paymentOrder.brokerReceivable != null
                          ? `€${paymentOrder.brokerReceivable.toFixed(2)}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="block text-sm font-medium text-gray-700 mb-1">
                        Carrier Payable
                      </p>
                      <p className="text-sm font-medium">
                        {paymentOrder.carrierPayable != null
                          ? `€${paymentOrder.carrierPayable.toFixed(2)}`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <FormSelect
                    control={control}
                    name="paymentStatus"
                    label="Payment Status"
                    items={statusItems}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormNumberInput
                      control={control}
                      name="carrierPaidAmount"
                      label="Carrier Paid (€)"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                    <FormDateInput
                      control={control}
                      name="carrierPaidDate"
                      label="Carrier Paid Date"
                    />
                    <FormNumberInput
                      control={control}
                      name="brokerReceivedAmount"
                      label="Broker Received (€)"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                    <FormDateInput
                      control={control}
                      name="brokerReceivedDate"
                      label="Broker Received Date"
                    />
                  </div>

                  <div>
                    <AttachedFilesField
                      files={(paymentOrder.invoices ?? []).map((inv) => ({
                        fileId: inv.fileId,
                        fileName: inv.fileName,
                      }))}
                      onAdd={(file) => paymentOrderApi.addInvoice(paymentOrder.id, file)}
                      onRemove={(fileId) => paymentOrderApi.removeInvoice(paymentOrder.id, fileId)}
                      onChanged={handleFilesChanged}
                      readOnly={readOnly}
                      buttonLabel="Upload Invoice"
                    />
                  </div>
                </form>
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
                    type="submit"
                    form="update-payment-status-form"
                    isDisabled={!isDirty || mutation.isPending}
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
