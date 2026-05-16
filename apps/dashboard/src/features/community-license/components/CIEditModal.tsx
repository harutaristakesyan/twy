import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { FormDateInput, FormTextField } from "@/components/form";
import { useZodForm } from "@/libs/form";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { getCommunityLicenseById, updateCommunityLicense } from "../api/ciApi";

const schema = z.object({
  ciNumber: z
    .string()
    .min(1, "CI number is required")
    .max(50, "CI number must be at most 50 characters"),
  validFrom: z.string().min(1, "Valid from date is required"),
  validTo: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const CIEditModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("/settings");
  const { ciId } = useParams<{ ciId: string }>();

  const { data: communityLicense, isLoading } = useApiQuery(
    ["community-license", ciId],
    () => getCommunityLicenseById(ciId),
    { enabled: !!ciId },
  );

  const { control, handleSubmit, reset } = useZodForm(schema, {
    ciNumber: "",
    validFrom: "",
    validTo: null,
  });

  useEffect(() => {
    if (communityLicense) {
      reset({
        ciNumber: communityLicense.ciNumber,
        validFrom: communityLicense.validFrom,
        validTo: communityLicense.validTo ?? null,
      });
    }
  }, [communityLicense, reset]);

  const mutation = useApiMutation(updateCommunityLicense, {
    onSuccess: async () => {
      toast.success("Community license updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["community-licenses"] });
      await queryClient.invalidateQueries({ queryKey: ["community-license", ciId] });
      close();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    if (!communityLicense) return;
    mutation.mutate({
      id: communityLicense.id,
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
              <Modal.Heading>Edit Community License</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <form id="ci-edit-form" onSubmit={onSubmit} className="flex flex-col gap-4">
                  <FormTextField
                    control={control}
                    name="ciNumber"
                    label="CI Number"
                    placeholder="e.g. CI-123456"
                  />

                  <FormDateInput control={control} name="validFrom" label="Valid From" />

                  <FormDateInput control={control} name="validTo" label="Valid To" />
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
                form="ci-edit-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (isPending ? "Updating..." : "Update")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CIEditModal;
