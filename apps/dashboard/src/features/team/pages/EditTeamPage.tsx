import { ArrowLeft, Persons } from "@gravity-ui/icons";
import { Button, Chip, Spinner, toast } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useZodForm } from "@/libs/form";
import { queryKeys, useApiMutation, useApiQuery, useQueryActions } from "@/libs/query";
import {
  emptyPermissionsMap,
  normalizePermissionsMap,
  type PermissionsMap,
  RESOURCE_ACTIONS,
  RESOURCES,
} from "@/utils/permissions";
import { getTeamById, updateTeam } from "../api/teamApi";
import PermissionMatrixField from "../components/PermissionMatrixField";
import TeamFormSection from "../components/TeamFormSection";
import TeamInfoFields from "../components/TeamInfoFields";
import TeamMembersSection from "../components/TeamMembersSection";
import TeamScopeFields from "../components/TeamScopeFields";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().max(500).optional(),
  branchRestricted: z.boolean(),
  onlyOwnData: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function countCapabilities(permissions: PermissionsMap): number {
  let count = 0;
  for (const r of RESOURCES) {
    for (const a of RESOURCE_ACTIONS[r]) {
      if (permissions[r]?.[a]) count++;
    }
  }
  return count;
}

function scopeLabel(branchRestricted: boolean, onlyOwnData: boolean): string {
  if (onlyOwnData && branchRestricted) return "Branch + own data";
  if (onlyOwnData) return "Own data only";
  if (branchRestricted) return "Branch-restricted";
  return "Workspace-wide";
}

const EditTeamPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { invalidate } = useQueryActions();
  const [permissions, setPermissions] = useState<PermissionsMap>(() => emptyPermissionsMap());

  const close = () => navigate("/user-management/teams");

  const { data: team, isLoading } = useApiQuery(
    queryKeys.teams.detail(teamId),
    () => getTeamById(teamId),
    { enabled: !!teamId },
  );

  const { control, handleSubmit, reset } = useZodForm(schema, {
    name: "",
    description: "",
    branchRestricted: false,
    onlyOwnData: false,
  });

  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        description: team.description ?? "",
        branchRestricted: team.branchRestricted,
        onlyOwnData: team.onlyOwnData,
      });
      setPermissions(normalizePermissionsMap(team.permissions));
    }
  }, [team, reset]);

  const branchRestricted = useWatch({ control, name: "branchRestricted" });
  const onlyOwnData = useWatch({ control, name: "onlyOwnData" });

  const capabilityCount = useMemo(() => countCapabilities(permissions), [permissions]);
  const scopeText = scopeLabel(branchRestricted, onlyOwnData);

  const mutation = useApiMutation(
    (data: Parameters<typeof updateTeam>[1]) => updateTeam(teamId as string, data),
    {
      onSuccess: async () => {
        toast.success("Team updated successfully");
        await invalidate(queryKeys.teams.all, queryKeys.teams.detail(teamId));
        close();
      },
    },
  );

  const onSubmit = handleSubmit((values: FormValues) => {
    if (!teamId) return;
    mutation.mutate({
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      branchRestricted: values.branchRestricted,
      onlyOwnData: values.onlyOwnData,
      permissions,
    });
  });

  if (isLoading || !team) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button isIconOnly variant="ghost" aria-label="Back" onPress={close}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold leading-tight">{team.name}</h1>
          <p className="text-xs text-default-500">Edit team settings, scope, and permissions.</p>
        </div>
        <Chip size="sm" variant="soft" className="ml-auto font-medium">
          <Persons className="size-3" />
          <Chip.Label>
            {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
          </Chip.Label>
        </Chip>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <TeamFormSection
          title="Team info"
          description="A clear name and short description help admins pick the right team."
        >
          <TeamInfoFields control={control} nameField="name" descriptionField="description" />
        </TeamFormSection>

        <TeamFormSection
          title="Data scope"
          description="Narrow what records this team's members see across the app."
          action={
            <Chip size="sm" variant="soft" className="font-medium">
              <Chip.Label>{scopeText}</Chip.Label>
            </Chip>
          }
        >
          <TeamScopeFields
            control={control}
            branchRestrictedField="branchRestricted"
            onlyOwnDataField="onlyOwnData"
          />
        </TeamFormSection>

        <TeamFormSection
          title="Permissions"
          description="Pick a preset to get started, then fine-tune per resource."
          action={
            <Chip
              size="sm"
              variant="soft"
              color={capabilityCount === 0 ? "default" : "success"}
              className="font-medium"
            >
              <Chip.Label>
                {capabilityCount === 0
                  ? "No permissions"
                  : `${capabilityCount} capabilit${capabilityCount === 1 ? "y" : "ies"}`}
              </Chip.Label>
            </Chip>
          }
        >
          <PermissionMatrixField value={permissions} onChange={setPermissions} />
        </TeamFormSection>

        <TeamFormSection
          title="Members"
          description="Add or remove people on this team."
          action={
            <Chip size="sm" variant="soft" className="font-medium">
              <Persons className="size-3" />
              <Chip.Label>
                {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
              </Chip.Label>
            </Chip>
          }
        >
          <TeamMembersSection teamId={team.id} />
        </TeamFormSection>

        <div className="sticky bottom-2 z-10 flex justify-end gap-2 rounded-xl border border-default-200 bg-content1/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <Button variant="ghost" onPress={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isPending={mutation.isPending}>
            {({ isPending }) => (isPending ? "Saving…" : "Save changes")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTeamPage;
