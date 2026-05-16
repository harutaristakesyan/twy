import { Button, Label, ListBox, Modal, Select, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { FormTextArea, FormTextField } from "@/components/form";
import CIAutocomplete from "@/features/community-license/components/CIAutocomplete";
import { getUsers } from "@/features/user/api/userApi";
import { useZodForm } from "@/libs/form";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { getBranchById, updateBranch } from "../api/branchApi";

const schema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters"),
  contact: z.string().max(500, "Contact information cannot exceed 500 characters").optional(),
  ciId: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const BranchEditModal = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");

  const { data: branch, isLoading: branchLoading } = useApiQuery(
    ["branch", branchId],
    () => getBranchById(branchId as string),
    { enabled: !!branchId },
  );

  const { control, handleSubmit, reset } = useZodForm(schema, {
    name: "",
    contact: "",
    ciId: null,
    owner: null,
  });

  useEffect(() => {
    if (branch) {
      reset({
        name: branch.name,
        contact: branch.contact ?? "",
        ciId: branch.ci?.id ?? null,
        owner: branch.owner?.id ?? null,
      });
    }
  }, [branch, reset]);

  const { data: usersData } = useApiQuery(["users-owners-select"], () => getUsers({ limit: 100 }));
  const owners = usersData?.users ?? [];

  const mutation = useApiMutation(updateBranch, {
    onSuccess: async () => {
      toast.success("Branch updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      close();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    if (!branchId) return;
    mutation.mutate({
      id: branchId,
      name: values.name,
      contact: values.contact || null,
      owner: values.owner ?? null,
      ciId: values.ciId ?? null,
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
              <Modal.Heading>Edit Branch</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {branchLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <form id="branch-edit-form" onSubmit={onSubmit} className="flex flex-col gap-4">
                  <FormTextField
                    control={control}
                    name="name"
                    label="Branch Name"
                    placeholder="Enter branch name"
                  />

                  <FormTextArea
                    control={control}
                    name="contact"
                    label="Contact Information"
                    placeholder="Enter contact information (phone, email, address, etc.)"
                    rows={3}
                  />

                  <Controller
                    name="ciId"
                    control={control}
                    render={({ field, fieldState }) => (
                      <CIAutocomplete
                        label="Community License"
                        value={field.value ?? null}
                        onChange={(uuid) => field.onChange(uuid)}
                        placeholder="Search by CI number"
                        existingCI={branch?.ci}
                        isInvalid={!!fieldState.error}
                      />
                    )}
                  />

                  <Controller
                    name="owner"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? undefined}
                        onChange={(key) => field.onChange(key ? String(key) : null)}
                      >
                        <Label>Branch Owner</Label>
                        <Select.Trigger>
                          <Select.Value>
                            {({ defaultChildren, isPlaceholder }) =>
                              isPlaceholder ? "— No owner —" : defaultChildren
                            }
                          </Select.Value>
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {owners.map((o) => (
                              <ListBox.Item
                                key={o.id}
                                id={o.id}
                                textValue={`${o.firstName} ${o.lastName}`}
                              >
                                {o.firstName} {o.lastName} ({o.email})
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  />
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
                form="branch-edit-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (isPending ? "Updating..." : "Update Branch")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default BranchEditModal;
