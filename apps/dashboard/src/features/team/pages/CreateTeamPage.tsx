import { ArrowLeft } from "@gravity-ui/icons";
import { Button, Switch, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormTextArea, FormTextField } from "@/components/form";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
import { emptyPermissionsMap, type PermissionsMap } from "@/utils/permissions";
import { createTeam } from "../api/teamApi";
import PermissionMatrixField from "../components/PermissionMatrixField";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().max(500).optional(),
  branchRestricted: z.boolean(),
  onlyOwnData: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const CreateTeamPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<PermissionsMap>(() => emptyPermissionsMap());

  const close = () => navigate("/user-management/teams");

  const { control, handleSubmit } = useZodForm(schema, {
    name: "",
    description: "",
    branchRestricted: false,
    onlyOwnData: false,
  });

  const mutation = useApiMutation(createTeam, {
    onSuccess: async () => {
      toast.success("Team created successfully");
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
      close();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    mutation.mutate({
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      branchRestricted: values.branchRestricted,
      onlyOwnData: values.onlyOwnData,
      permissions,
    });
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button isIconOnly variant="ghost" aria-label="Back" onPress={close}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Create Team</h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-default-500">
            Team Info
          </h2>
          <FormTextField control={control} name="name" label="Name" placeholder="Team name" />
          <FormTextArea
            control={control}
            name="description"
            label="Description"
            placeholder="Optional description"
            rows={2}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-default-500">Scope</h2>
          <Controller
            name="branchRestricted"
            control={control}
            render={({ field }) => (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Branch-restricted</p>
                  <p className="text-xs text-default-500">
                    Members can only see loads from their assigned branch
                  </p>
                </div>
                <Switch isSelected={field.value} onChange={field.onChange}>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
            )}
          />
          <Controller
            name="onlyOwnData"
            control={control}
            render={({ field }) => (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Own data only</p>
                  <p className="text-xs text-default-500">
                    Members only see records they created or are assigned to
                  </p>
                </div>
                <Switch isSelected={field.value} onChange={field.onChange}>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
            )}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-default-500">
            Permissions
          </h2>
          <PermissionMatrixField value={permissions} onChange={setPermissions} />
        </section>

        <div className="flex justify-end gap-2 pb-2">
          <Button variant="ghost" onPress={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isPending={mutation.isPending}>
            {({ isPending }) => (isPending ? "Creating..." : "Create Team")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeamPage;
