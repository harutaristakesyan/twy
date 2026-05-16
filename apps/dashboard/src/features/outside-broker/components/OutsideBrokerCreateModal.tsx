import { Button, Checkbox, Modal, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormNumberInput, FormTextArea, FormTextField } from "@/components/form";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { submitBrokerRequest } from "../api/brokerRequestApi";
import type { SubmitBrokerRequestBody } from "../types/brokerRequest";

const schema = z
  .object({
    brokerName: z.string().min(2, "Broker name must be at least 2 characters"),
    mcNumber: z.string().min(1, "MC number is required"),
    contactName: z.string().optional(),
    phone: z.string().optional(),
    email: z
      .string()
      .optional()
      .refine((v) => !v || /\S+@\S+\.\S+/.test(v), { message: "Invalid email address" }),
    address: z.string().optional(),
    notes: z.string().optional(),
    creditLimitUnlimited: z.boolean(),
    creditLimit: z.number().nullable().optional(),
  })
  .refine(
    (v) => v.creditLimitUnlimited || (typeof v.creditLimit === "number" && v.creditLimit > 0),
    {
      message: "Please enter a valid credit limit greater than 0",
      path: ["creditLimit"],
    },
  );

type FormValues = z.infer<typeof schema>;

const OutsideBrokerCreateModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");

  const { control, handleSubmit, watch } = useZodForm(schema, {
    brokerName: "",
    mcNumber: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    creditLimitUnlimited: true,
    creditLimit: null,
  });

  const isUnlimited = watch("creditLimitUnlimited");

  const mutation = useApiMutation((data: SubmitBrokerRequestBody) => submitBrokerRequest(data), {
    onSuccess: async () => {
      toast.success("Broker request submitted for review");
      await queryClient.invalidateQueries({ queryKey: ["outside-brokers"] });
      close();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    mutation.mutate({
      brokerName: values.brokerName.trim(),
      mcNumber: values.mcNumber.trim(),
      contactName: values.contactName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      creditLimitUnlimited: values.creditLimitUnlimited,
      creditLimit: values.creditLimitUnlimited ? null : (values.creditLimit ?? null),
    });
  });

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Request Outside Broker</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="outside-broker-create-form" onSubmit={onSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <FormTextField
                    control={control}
                    name="brokerName"
                    label="Broker Name"
                    placeholder="Enter broker name"
                  />
                  <FormTextField
                    control={control}
                    name="mcNumber"
                    label="MC Number"
                    placeholder="Enter MC number"
                  />
                  <FormTextField
                    control={control}
                    name="contactName"
                    label="Contact Name"
                    placeholder="Enter contact name"
                  />
                  <FormTextField
                    control={control}
                    name="phone"
                    label="Phone"
                    placeholder="Enter phone number"
                  />
                  <div className="col-span-2">
                    <FormTextField
                      control={control}
                      name="email"
                      type="email"
                      label="Email"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="col-span-2">
                    <FormTextArea
                      control={control}
                      name="address"
                      label="Address"
                      placeholder="Enter address"
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-2">
                    <Controller
                      name="creditLimitUnlimited"
                      control={control}
                      render={({ field }) => (
                        <Checkbox isSelected={field.value} onChange={field.onChange}>
                          Unlimited credit limit
                        </Checkbox>
                      )}
                    />
                    {!isUnlimited && (
                      <FormNumberInput
                        control={control}
                        name="creditLimit"
                        label="Credit Limit"
                        placeholder="Enter credit limit"
                        min="0.01"
                        step="0.01"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <FormTextArea
                      control={control}
                      name="notes"
                      label="Notes"
                      placeholder="Enter notes"
                      rows={2}
                    />
                  </div>
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
                form="outside-broker-create-form"
                isDisabled={mutation.isPending}
              >
                {mutation.isPending ? <Spinner size="sm" /> : "Submit Request"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default OutsideBrokerCreateModal;
