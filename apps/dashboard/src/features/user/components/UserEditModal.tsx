import { Check, Power } from "@gravity-ui/icons";
import { Button, Input, Label, Modal, Spinner, Switch, TextField, toast } from "@heroui/react";
import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import BranchSelect from "@/features/branch/components/BranchSelect";
import TeamSelect from "@/features/team/components/TeamSelect";
import { useZodForm } from "@/libs/form";
import { queryKeys, useApiMutation, useApiQuery, useQueryActions } from "@/libs/query";
import { getUserById, updateUser } from "../api/userApi";

const schema = z.object({
  branch: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const UserEditModal = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { invalidate } = useQueryActions();
  const close = () => navigate("..");

  const { data: user, isLoading: userLoading } = useApiQuery(
    queryKeys.users.detail(userId),
    () => getUserById(userId),
    { enabled: !!userId },
  );

  const { control, handleSubmit, reset } = useZodForm(schema, {
    isActive: true,
    branch: null,
    teamId: null,
  });

  useEffect(() => {
    if (user) {
      reset({
        isActive: user.isActive,
        branch: user.branch?.id ?? user.branchId ?? null,
        teamId: user.teamId ?? null,
      });
    }
  }, [user, reset]);

  const mutation = useApiMutation(updateUser, {
    onSuccess: async () => {
      toast.success("User updated successfully");
      await invalidate(queryKeys.users.all, queryKeys.users.detail(userId));
      close();
    },
  });

  const branchInitialOption = user?.branch
    ? { value: user.branch.id, label: user.branch.name }
    : undefined;

  const teamInitialOption =
    user?.teamId && user?.teamName ? { value: user.teamId, label: user.teamName } : undefined;

  const onSubmit = handleSubmit((values: FormValues) => {
    if (!userId) return;
    mutation.mutate({
      id: userId,
      isActive: values.isActive,
      branch: values.branch ?? undefined,
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
              <Modal.Heading>Edit User</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {userLoading || !user ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <form id="user-edit-form" onSubmit={onSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <TextField isDisabled>
                      <Label>First Name</Label>
                      <Input placeholder="e.g. Jane" value={user.firstName ?? ""} />
                    </TextField>
                    <TextField isDisabled>
                      <Label>Last Name</Label>
                      <Input placeholder="e.g. Doe" value={user.lastName ?? ""} />
                    </TextField>
                  </div>

                  <TextField isDisabled>
                    <Label>Email</Label>
                    <Input placeholder="name@example.com" value={user.email ?? ""} />
                  </TextField>

                  <TextField isDisabled>
                    <Label>Phone</Label>
                    <Input placeholder="—" value={user.phone ?? ""} />
                  </TextField>

                  <hr className="my-1" />

                  <Controller
                    name="branch"
                    control={control}
                    render={({ field, fieldState }) => (
                      <BranchSelect
                        label="Branch"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        initialOption={branchInitialOption}
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
                        initialOption={teamInitialOption}
                        isInvalid={!!fieldState.error}
                      />
                    )}
                  />

                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <Switch isSelected={field.value} onChange={field.onChange} size="lg">
                        {({ isSelected }) => (
                          <>
                            <Switch.Control className={isSelected ? "bg-green-500/80" : ""}>
                              <Switch.Thumb>
                                <Switch.Icon>
                                  {isSelected ? (
                                    <Check className="size-3 text-inherit opacity-100" />
                                  ) : (
                                    <Power className="size-3 text-inherit opacity-70" />
                                  )}
                                </Switch.Icon>
                              </Switch.Thumb>
                            </Switch.Control>
                            <Switch.Content>
                              <Label>{isSelected ? "Active" : "Inactive"}</Label>
                            </Switch.Content>
                          </>
                        )}
                      </Switch>
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
                form="user-edit-form"
                isPending={mutation.isPending}
              >
                {({ isPending }) => (isPending ? "Updating..." : "Update User")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default UserEditModal;
