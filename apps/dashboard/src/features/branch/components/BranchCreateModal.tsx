import { Button, Label, ListBox, Modal, Select, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormTextArea, FormTextField } from "@/components/form";
import CIAutocomplete from "@/features/community-license/components/CIAutocomplete";
import { getUsers } from "@/features/user/api/userApi";
import { useZodForm } from "@/libs/form";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { createBranch } from "../api/branchApi";

const schema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters"),
  contact: z.string().max(500, "Contact information cannot exceed 500 characters").optional(),
  ciId: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

const BranchCreateModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");

  const { control, handleSubmit } = useZodForm(schema, {
    name: "",
    contact: "",
    ciId: null,
    owner: null,
  });

  const { data: usersData } = useApiQuery(["users-owners-select"], () => getUsers({ limit: 100 }));
  const owners = usersData?.users ?? [];

  const mutation = useApiMutation(createBranch, {
    onSuccess: async () => {
      toast.success("Branch created successfully");
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      close();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    mutation.mutate({
      name: values.name,
      contact: values.contact || undefined,
      ciId: values.ciId ?? null,
      owner: values.owner ?? null,
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
              <Modal.Heading>Create New Branch</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="branch-create-form" onSubmit={onSubmit} className="flex flex-col gap-4">
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
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="branch-create-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (isPending ? "Creating..." : "Create Branch")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default BranchCreateModal;
