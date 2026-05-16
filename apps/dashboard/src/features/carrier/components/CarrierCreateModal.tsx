import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormDateInput, FormTextArea, FormTextField } from "@/components/form";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { submitCarrierRequest } from "../api/carrierRequestApi";
import type { CarrierKind } from "../types/carrier";
import type { SubmitCarrierRequestBody } from "../types/carrierRequest";

type Props = {
  kind: CarrierKind;
};

const schema = z.object({
  carrierName: z.string().min(2, "Carrier name must be at least 2 characters"),
  mcDotNumber: z.string().min(1, "MC/DOT number is required"),
  equipmentType: z.string().min(1, "Equipment type is required"),
  insuranceExpiry: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const CarrierCreateModal = ({ kind }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");

  const { control, handleSubmit } = useZodForm(schema, {
    carrierName: "",
    mcDotNumber: "",
    equipmentType: "",
    insuranceExpiry: "",
    phone: "",
    email: "",
    notes: "",
  });

  const mutation = useApiMutation((data: SubmitCarrierRequestBody) => submitCarrierRequest(data), {
    onSuccess: async () => {
      toast.success("Carrier request submitted for review");
      await queryClient.invalidateQueries({ queryKey: ["carriers"] });
      close();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    mutation.mutate({
      kind,
      carrierName: values.carrierName.trim(),
      mcDotNumber: values.mcDotNumber.trim(),
      equipmentType: values.equipmentType.trim(),
      insuranceExpiry: values.insuranceExpiry?.trim() || undefined,
      phone: values.phone.trim(),
      email: values.email.trim(),
      notes: values.notes?.trim() || undefined,
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
              <Modal.Heading>Submit Carrier Request</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="carrier-create-form" onSubmit={onSubmit}>
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
                    placeholder="e.g. Flatbed, Dry Van, Refrigerated"
                  />
                  <FormDateInput
                    control={control}
                    name="insuranceExpiry"
                    label="Insurance Expiry"
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
                form="carrier-create-form"
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

export default CarrierCreateModal;
