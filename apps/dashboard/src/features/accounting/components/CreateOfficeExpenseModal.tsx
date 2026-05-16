import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FileUploaderHandle } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  type CreateOfficeExpenseDto,
  CURRENCY_OPTIONS,
  type Currency,
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  type OfficeExpenseService,
} from "../types/officeExpensePaymentOrder";

interface FormState {
  serviceName: OfficeExpenseService | "";
  paymentPurpose: string;
  isRange: boolean;
  date: string;
  dateStart: string;
  dateEnd: string;
  currency: Currency;
  amount: string;
}

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const CreateOfficeExpenseModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");
  const uploaderRef = useRef<FileUploaderHandle>(null);
  const [form, setForm] = useState<FormState>({
    serviceName: "",
    paymentPurpose: "",
    isRange: false,
    date: "",
    dateStart: "",
    dateEnd: "",
    currency: "USD",
    amount: "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.serviceName) errs.push("Service name is required");
    if (!form.paymentPurpose.trim()) errs.push("Payment purpose is required");
    if (form.isRange) {
      if (!form.dateStart || !form.dateEnd) errs.push("Date range is required");
    } else {
      if (!form.date) errs.push("Date is required");
    }
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) errs.push("Amount must be greater than 0");
    return errs;
  };

  const mutation = useApiMutation(
    async () => {
      const errs = validate();
      if (errs.length > 0) {
        setErrors(errs);
        throw new Error(errs[0]);
      }
      const fileIds = uploaderRef.current?.fileIds ?? [];
      const dto: CreateOfficeExpenseDto = {
        serviceName: form.serviceName as OfficeExpenseService,
        paymentPurpose: form.paymentPurpose,
        periodStart: form.isRange ? form.dateStart : form.date,
        periodEnd: form.isRange ? form.dateEnd : form.date,
        amount: Number(form.amount),
        currency: form.currency,
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
        const msg = getErrorMessage(err);
        if (!errors.length) toast.danger(msg);
      },
    },
  );

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
              <div className="mt-2 flex flex-col gap-4">
                {errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    {errors.map((e) => (
                      <p key={e} className="text-xs text-red-600">
                        {e}
                      </p>
                    ))}
                  </div>
                )}

                <label className={labelClass}>
                  Service Name *
                  <select
                    value={form.serviceName}
                    onChange={(e) =>
                      set("serviceName", e.target.value as OfficeExpenseService | "")
                    }
                    className={fieldClass}
                  >
                    <option value="">Select service</option>
                    {OFFICE_EXPENSE_SERVICE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Payment Purpose *
                  <textarea
                    rows={3}
                    className={fieldClass}
                    value={form.paymentPurpose}
                    onChange={(e) => set("paymentPurpose", e.target.value)}
                    placeholder="What is this expense for?"
                  />
                </label>

                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <span className={`${labelClass} mb-0`}>Date</span>
                    <label className="flex items-center gap-1.5 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={form.isRange}
                        onChange={(e) => set("isRange", e.target.checked)}
                      />
                      Date range
                    </label>
                  </div>
                  {form.isRange ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        className={fieldClass}
                        value={form.dateStart}
                        onChange={(e) => set("dateStart", e.target.value)}
                      />
                      <input
                        type="date"
                        className={fieldClass}
                        value={form.dateEnd}
                        onChange={(e) => set("dateEnd", e.target.value)}
                      />
                    </div>
                  ) : (
                    <input
                      type="date"
                      className={fieldClass}
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className={labelClass}>
                    Currency
                    <select
                      value={form.currency}
                      onChange={(e) => set("currency", e.target.value as Currency)}
                      className={fieldClass}
                    >
                      {CURRENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Amount *
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={fieldClass}
                      value={form.amount}
                      onChange={(e) => set("amount", e.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                </div>

                <div>
                  <span className={labelClass}>Attachments</span>
                  <FileUploader
                    ref={uploaderRef}
                    max={MAX_FILES_DEFAULT}
                    buttonLabel="Upload files"
                    helpText={`Up to ${MAX_FILES_DEFAULT} files. Files are linked when you create the order.`}
                  />
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={mutation.isPending}
                onPress={() => {
                  setErrors([]);
                  mutation.mutate(undefined);
                }}
              >
                {mutation.isPending ? <Spinner size="sm" /> : "Create"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CreateOfficeExpenseModal;
