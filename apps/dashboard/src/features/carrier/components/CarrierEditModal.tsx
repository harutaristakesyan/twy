import {
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { FormTextArea, FormTextField } from "@/components/form";
import { useZodForm } from "@/libs/form";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { getCarrierById, updateCarrier } from "../api/carrierApi";
import { CarrierStatus } from "../types/carrier";

const schema = z.object({
  carrierName: z.string().min(2, "Carrier name must be at least 2 characters"),
  mcDotNumber: z.string().min(1, "MC/DOT number is required"),
  equipmentType: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /\S+@\S+\.\S+/.test(v), { message: "Invalid email address" }),
  notes: z.string().optional(),
  status: z.nativeEnum(CarrierStatus),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = [
  { id: CarrierStatus.APPROVED, label: "Approved" },
  { id: CarrierStatus.DENIED, label: "Denied" },
];

const CarrierEditModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");
  const { carrierId } = useParams<{ carrierId: string }>();

  const { data: carrier, isLoading } = useApiQuery(
    ["carrier", carrierId],
    () => getCarrierById(carrierId ?? ""),
    { enabled: !!carrierId },
  );

  const { control, handleSubmit, reset } = useZodForm(schema, {
    carrierName: "",
    mcDotNumber: "",
    equipmentType: "",
    insuranceExpiry: "",
    phone: "",
    email: "",
    notes: "",
    status: CarrierStatus.APPROVED,
  });

  useEffect(() => {
    if (carrier) {
      reset({
        carrierName: carrier.carrierName,
        mcDotNumber: carrier.mcDotNumber,
        equipmentType: carrier.equipmentType ?? "",
        insuranceExpiry: carrier.insuranceExpiry ?? "",
        phone: carrier.phone ?? "",
        email: carrier.email ?? "",
        notes: carrier.notes ?? "",
        status: carrier.status,
      });
    }
  }, [carrier, reset]);

  const mutation = useApiMutation(
    (data: Parameters<typeof updateCarrier>[0]) => updateCarrier(data),
    {
      onSuccess: async () => {
        toast.success("Carrier updated successfully");
        await queryClient.invalidateQueries({ queryKey: ["carriers"] });
        close();
      },
      onError: (err: unknown) => toast.danger(getErrorMessage(err)),
    },
  );

  const onSubmit = handleSubmit((values: FormValues) => {
    if (!carrier) return;
    mutation.mutate({
      id: carrier.id,
      carrierName: values.carrierName.trim(),
      mcDotNumber: values.mcDotNumber.trim(),
      equipmentType: values.equipmentType?.trim() || undefined,
      insuranceExpiry: values.insuranceExpiry?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      status: values.status,
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
              <Modal.Heading>Edit Carrier</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <form id="carrier-edit-form" onSubmit={onSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormTextField
                      control={control}
                      name="carrierName"
                      label="Carrier Name"
                      placeholder="Enter carrier name"
                    />
                    <FormTextField
                      control={control}
                      name="mcDotNumber"
                      label="MC / DOT Number"
                      placeholder="Enter MC/DOT number"
                    />
                    <FormTextField
                      control={control}
                      name="equipmentType"
                      label="Equipment Type"
                      placeholder="Enter equipment type"
                    />
                    <Controller
                      name="insuranceExpiry"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          isInvalid={!!fieldState.error}
                          fullWidth
                        >
                          <Label>Insurance Expiry</Label>
                          <Input type="date" />
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </TextField>
                      )}
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
                form="carrier-edit-form"
                isDisabled={mutation.isPending}
              >
                {mutation.isPending ? <Spinner size="sm" /> : "Update Carrier"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CarrierEditModal;
