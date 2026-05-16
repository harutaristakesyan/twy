import { Button, Checkbox, Label, ListBox, Modal, Select, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { FormNumberInput, FormTextArea, FormTextField } from "@/components/form";
import { useZodForm } from "@/libs/form";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { getOutsideBrokerById, updateOutsideBroker } from "../api/brokerApi";
import { BrokerStatus } from "../types/broker";

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
    paymentMethod: z.string().optional(),
    paymentTerms: z.string().optional(),
    status: z.nativeEnum(BrokerStatus),
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

const STATUS_OPTIONS = [
  { id: BrokerStatus.APPROVED, label: "Approved" },
  { id: BrokerStatus.PENDING, label: "Pending" },
  { id: BrokerStatus.DENIED, label: "Denied" },
];

const OutsideBrokerEditModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");
  const { brokerId } = useParams<{ brokerId: string }>();

  const { data: broker, isLoading } = useApiQuery(
    ["outside-broker", brokerId],
    () => getOutsideBrokerById(brokerId),
    { enabled: !!brokerId },
  );

  const { control, handleSubmit, reset, watch } = useZodForm(schema, {
    brokerName: "",
    mcNumber: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    paymentMethod: "",
    paymentTerms: "",
    status: BrokerStatus.PENDING,
    creditLimitUnlimited: true,
    creditLimit: null,
  });

  useEffect(() => {
    if (broker) {
      reset({
        brokerName: broker.brokerName,
        mcNumber: broker.mcNumber,
        contactName: broker.contactName ?? "",
        phone: broker.phone ?? "",
        email: broker.email ?? "",
        address: broker.address ?? "",
        notes: broker.notes ?? "",
        paymentMethod: broker.paymentMethod ?? "",
        paymentTerms: broker.paymentTerms ?? "",
        status: broker.status,
        creditLimitUnlimited: broker.creditLimitUnlimited ?? true,
        creditLimit: broker.creditLimit ?? null,
      });
    }
  }, [broker, reset]);

  const isUnlimited = watch("creditLimitUnlimited");

  const mutation = useApiMutation(updateOutsideBroker, {
    onSuccess: async () => {
      toast.success("Outside broker updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["outside-brokers"] });
      await queryClient.invalidateQueries({ queryKey: ["outside-broker", brokerId] });
      close();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    if (!broker) return;
    mutation.mutate({
      id: broker.id,
      brokerName: values.brokerName.trim(),
      mcNumber: values.mcNumber.trim(),
      contactName: values.contactName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      paymentMethod: values.paymentMethod?.trim() || undefined,
      paymentTerms: values.paymentTerms?.trim() || undefined,
      status: values.status,
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
              <Modal.Heading>Edit Outside Broker</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <form id="outside-broker-edit-form" onSubmit={onSubmit}>
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
                    <FormTextField
                      control={control}
                      name="email"
                      type="email"
                      label="Email"
                      placeholder="Enter email address"
                    />
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onChange={(key) => field.onChange(key)}>
                          <Label>Status</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {STATUS_OPTIONS.map((opt) => (
                                <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                                  {opt.label}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      )}
                    />
                    <FormTextField
                      control={control}
                      name="paymentMethod"
                      label="Payment Method"
                      placeholder="e.g. ACH, Wire, Check"
                    />
                    <FormTextField
                      control={control}
                      name="paymentTerms"
                      label="Payment Terms"
                      placeholder="e.g. Net 30, Quick Pay"
                    />
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
                          <Checkbox
                            id="broker-edit-unlimited-credit"
                            isSelected={field.value}
                            onChange={field.onChange}
                          >
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Checkbox.Content>
                              <Label htmlFor="broker-edit-unlimited-credit">
                                Unlimited credit limit
                              </Label>
                            </Checkbox.Content>
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
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="outside-broker-edit-form"
                isDisabled={mutation.isPending}
              >
                {mutation.isPending ? <Spinner size="sm" /> : "Update Broker"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default OutsideBrokerEditModal;
