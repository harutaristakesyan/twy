import { Button, Modal, toast } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormDateInput, FormTextField } from "@/components/form";
import { useZodForm } from "@/libs/form";
import { queryKeys, useApiMutation, useQueryActions } from "@/libs/query";
import { createCommunityLicense } from "../api/ciApi";

const schema = z.object({
  ciNumber: z
    .string()
    .min(1, "CI number is required")
    .max(50, "CI number must be at most 50 characters"),
  validFrom: z.string().min(1, "Valid from date is required"),
  validTo: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const CICreateModal = () => {
  const navigate = useNavigate();
  const { invalidate } = useQueryActions();
  const close = () => navigate("/settings");

  const { control, handleSubmit } = useZodForm(schema, {
    ciNumber: "",
    validFrom: "",
    validTo: null,
  });

  const mutation = useApiMutation(createCommunityLicense, {
    onSuccess: async () => {
      toast.success("Community license created successfully");
      await invalidate(queryKeys.communityLicenses.all);
      close();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    mutation.mutate({
      ciNumber: values.ciNumber,
      validFrom: values.validFrom,
      validTo: values.validTo || null,
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
              <Modal.Heading>Add Community License</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="ci-create-form" onSubmit={onSubmit} className="flex flex-col gap-4">
                <FormTextField
                  control={control}
                  name="ciNumber"
                  label="CI Number"
                  placeholder="e.g. CI-123456"
                />

                <FormDateInput control={control} name="validFrom" label="Valid From" />

                <FormDateInput control={control} name="validTo" label="Valid To" />
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="ci-create-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (isPending ? "Creating..." : "Create")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CICreateModal;
