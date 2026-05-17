import { Button, Modal, toast } from "@heroui/react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { FormSelect, type SelectItem } from "@/components/form";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useZodForm } from "@/libs/form";
import { queryKeys, useApiMutation, useApiQuery, useQueryActions } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { paymentOrderApi } from "../api/paymentOrderApi";
import type { PaymentStatus } from "../types/paymentOrder";
import { STATUS_LABEL } from "./PaymentStatusTag";

const ALL_STATUSES = Object.keys(STATUS_LABEL) as PaymentStatus[];

const schema = z.object({
  paymentStatus: z.string().min(1, "Status is required"),
});

type FormValues = z.infer<typeof schema>;

export default function ChangePaymentStatusModal() {
  const { paymentOrderId } = useParams() as { paymentOrderId: string };
  const navigate = useNavigate();
  const { invalidate } = useQueryActions();
  const { permissions } = useCurrentUser();

  const close = () => navigate("..");

  const { data: paymentOrder } = useApiQuery(queryKeys.paymentOrders.detail(paymentOrderId), () =>
    paymentOrderApi.getById(paymentOrderId),
  );

  const allowedStatuses: PaymentStatus[] = ALL_STATUSES.filter(
    (s) =>
      s !== paymentOrder?.paymentStatus &&
      Boolean(
        (permissions as Record<string, Record<string, boolean>>).load_payment_order?.[
          `transition:${s}`
        ],
      ),
  );

  const items: SelectItem[] = allowedStatuses.map((s) => ({ id: s, label: STATUS_LABEL[s] }));

  const { control, handleSubmit } = useZodForm<FormValues>(schema, {
    paymentStatus: allowedStatuses[0] ?? "",
  });

  const mutation = useApiMutation(
    async (values: FormValues) => {
      if (!paymentOrder) return;
      await paymentOrderApi.update(paymentOrder.id, {
        paymentStatus: values.paymentStatus as PaymentStatus,
      });
    },
    {
      onSuccess: async () => {
        toast.success("Payment status updated");
        await invalidate(queryKeys.paymentOrders.all);
        close();
      },
      onError: (err) => toast.danger(getErrorMessage(err)),
    },
  );

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

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
              <Modal.Heading>Change Status — {paymentOrder?.referenceNumber ?? ""}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {!paymentOrder ? (
                <p className="py-4 text-center text-sm text-default-500">
                  Payment order not found. Open it from the list.
                </p>
              ) : allowedStatuses.length === 0 ? (
                <p className="py-4 text-center text-sm text-default-500">
                  You don't have permission to change this payment order's status.
                </p>
              ) : (
                <form id="change-payment-status-form" onSubmit={onSubmit} className="mt-2">
                  <div className="mb-3 flex gap-4 text-sm">
                    <div>
                      <span className="font-medium text-default-600">Reference:</span>{" "}
                      {paymentOrder.referenceNumber}
                    </div>
                    <div>
                      <span className="font-medium text-default-600">Current Status:</span>{" "}
                      {STATUS_LABEL[paymentOrder.paymentStatus]}
                    </div>
                  </div>
                  <FormSelect
                    control={control}
                    name="paymentStatus"
                    label="New Status"
                    items={items}
                  />
                </form>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              {paymentOrder && allowedStatuses.length > 0 && (
                <Button
                  variant="primary"
                  type="submit"
                  form="change-payment-status-form"
                  isDisabled={mutation.isPending}
                >
                  {mutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
