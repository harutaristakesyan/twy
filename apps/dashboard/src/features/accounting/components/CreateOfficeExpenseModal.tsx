import { Button, Checkbox, Label, Modal, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormAmountField, FormDateInput, FormSelect, FormTextArea } from "@/components/form";
import type { FileUploaderHandle } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  type CreateOfficeExpenseDto,
  CURRENCY_OPTIONS,
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  type OfficeExpenseService,
} from "../types/officeExpensePaymentOrder";

const schema = z
  .object({
    serviceName: z.string().min(1, "Service name is required"),
    paymentPurpose: z.string().min(1, "Payment purpose is required"),
    isRange: z.boolean(),
    date: z.string(),
    dateStart: z.string(),
    dateEnd: z.string(),
    currency: z.string().min(1),
    amount: z
      .number({ invalid_type_error: "Amount is required" })
      .positive("Amount must be greater than 0"),
  })
  .superRefine((data, ctx) => {
    if (data.isRange) {
      if (!data.dateStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date is required",
          path: ["dateStart"],
        });
      }
      if (!data.dateEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date is required",
          path: ["dateEnd"],
        });
      }
    } else {
      if (!data.date) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date is required", path: ["date"] });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const serviceItems = OFFICE_EXPENSE_SERVICE_OPTIONS.map((o) => ({ id: o.value, label: o.label }));
const currencyItems = CURRENCY_OPTIONS.map((o) => ({ id: o.value, label: o.label }));

const CreateOfficeExpenseModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");
  const uploaderRef = useRef<FileUploaderHandle>(null);

  const { control, handleSubmit, setValue, watch } = useZodForm<FormValues>(schema, {
    serviceName: "",
    paymentPurpose: "",
    isRange: false,
    date: "",
    dateStart: "",
    dateEnd: "",
    currency: "USD",
    amount: 0,
  });

  const isRange = watch("isRange");

  const mutation = useApiMutation(
    async (values: FormValues) => {
      const fileIds = uploaderRef.current?.fileIds ?? [];
      const dto: CreateOfficeExpenseDto = {
        serviceName: values.serviceName as OfficeExpenseService,
        paymentPurpose: values.paymentPurpose,
        periodStart: values.isRange ? values.dateStart : values.date,
        periodEnd: values.isRange ? values.dateEnd : values.date,
        amount: values.amount,
        currency: values.currency as CreateOfficeExpenseDto["currency"],
        ...(fileIds.length > 0 && { fileIds }),
      };
      await officeExpenseApi.create(dto);
    },
    {
      onSuccess: async () => {
        uploaderRef.current?.commit();
        toast.success("Office expense payment order created");
        await queryClient.invalidateQueries({ queryKey: ["office-expense-orders"] });
        close();
      },
      onError: (err) => {
        toast.danger(getErrorMessage(err));
      },
    },
  );

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={true}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Create Office Expense Payment Order</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form
                id="create-office-expense-form"
                onSubmit={onSubmit}
                className="mt-2 flex flex-col gap-4"
              >
                <FormSelect
                  control={control}
                  name="serviceName"
                  label="Service Name *"
                  placeholder="Select service"
                  items={serviceItems}
                />

                <FormTextArea
                  control={control}
                  name="paymentPurpose"
                  label="Payment Purpose *"
                  rows={3}
                  placeholder="What is this expense for?"
                />

                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <Label>Date</Label>
                    <Checkbox
                      isSelected={isRange}
                      onChange={(checked) => {
                        setValue("isRange", checked, { shouldValidate: false });
                      }}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label>Date range</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                  {isRange ? (
                    <div className="grid grid-cols-2 gap-2">
                      <FormDateInput control={control} name="dateStart" />
                      <FormDateInput control={control} name="dateEnd" />
                    </div>
                  ) : (
                    <FormDateInput control={control} name="date" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormSelect
                    control={control}
                    name="currency"
                    label="Currency"
                    items={currencyItems}
                  />
                  <FormAmountField control={control} name="amount" label="Amount *" />
                </div>

                <div>
                  <Label>Attachments</Label>
                  <FileUploader
                    ref={uploaderRef}
                    max={MAX_FILES_DEFAULT}
                    buttonLabel="Upload files"
                    helpText={`Up to ${MAX_FILES_DEFAULT} files. Files are linked when you create the order.`}
                  />
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="create-office-expense-form"
                isPending={mutation.isPending}
              >
                Create
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CreateOfficeExpenseModal;
