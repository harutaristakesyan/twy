import { Button, Label, Modal, Switch, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormTextField } from "@/components/form";
import BranchSelect from "@/features/branch/components/BranchSelect";
import TeamSelect from "@/features/team/components/TeamSelect";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
import { createUser } from "../api/userApi";

const schema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  branch: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const UserCreateModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");

  const { control, handleSubmit } = useZodForm(schema, {
    isActive: true,
    firstName: "",
    lastName: "",
    email: "",
    branch: null,
    teamId: null,
  });

  const mutation = useApiMutation(createUser, {
    onSuccess: async () => {
      toast.success("User created successfully");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      close();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    mutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      isActive: values.isActive,
      branch: values.branch ?? null,
      teamId: values.teamId ?? null,
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
              <Modal.Heading>Create New User</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="user-create-form" onSubmit={onSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormTextField
                    control={control}
                    name="firstName"
                    label="First Name"
                    placeholder="e.g. Jane"
                  />
                  <FormTextField
                    control={control}
                    name="lastName"
                    label="Last Name"
                    placeholder="e.g. Doe"
                  />
                </div>

                <FormTextField
                  control={control}
                  name="email"
                  type="email"
                  label="Email"
                  placeholder="name@example.com"
                />

                <Controller
                  name="branch"
                  control={control}
                  render={({ field, fieldState }) => (
                    <BranchSelect
                      label="Branch"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="teamId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TeamSelect
                      label="Team"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                    />
                  )}
                />

                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch isSelected={field.value} onChange={field.onChange}>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <Switch.Content>
                        <Label>{field.value ? "Active" : "Inactive"}</Label>
                      </Switch.Content>
                    </Switch>
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
                form="user-create-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (isPending ? "Creating..." : "Create User")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default UserCreateModal;
