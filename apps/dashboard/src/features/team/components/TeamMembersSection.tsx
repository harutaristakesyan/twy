import { Plus } from "@gravity-ui/icons";
import { Button, Chip, toast } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import { ActionsMenu } from "@/components/ActionsMenu";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type { ColumnDef } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import UserSelect from "@/features/user/components/UserSelect";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { addTeamMember, getTeamMembers, removeTeamMember } from "../api/teamApi";
import type { TeamMember } from "../types/team";

interface TeamMembersSectionProps {
  teamId: string;
}

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ teamId }) => {
  const { permissions } = useCurrentUser();
  const canManageMembers = permissions.teams.edit;
  const [pickedUserId, setPickedUserId] = useState<string | null>(null);

  const { items, total, page, pageSize, isLoading, setPage, refetch } = useServerTable<TeamMember>({
    queryKey: ["team-members", teamId],
    fetcher: async ({ page: p, pageSize: ps }) => {
      const result = await getTeamMembers(teamId, { page: p - 1, limit: ps });
      return { items: result.items, total: result.total };
    },
    initialPageSize: 20,
  });

  const addMutation = useApiMutation(
    async (userId: string) => {
      await addTeamMember(teamId, userId);
    },
    {
      onSuccess: () => {
        toast.success("Member added");
        setPickedUserId(null);
        refetch();
      },
      onError: (err) => toast.danger(getErrorMessage(err)),
    },
  );

  const removeMutation = useApiMutation((memberId: string) => removeTeamMember(teamId, memberId), {
    onSuccess: () => {
      toast.success("Member removed");
      refetch();
    },
    onError: (err) => toast.danger(getErrorMessage(err)),
  });

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleRemoveMember = (id: string) =>
    confirm({
      title: "Remove this member from the team?",
      confirmLabel: "Remove",
      status: "danger",
      onConfirm: () => removeMutation.mutate(id),
    });

  const handleAdd = () => {
    if (!pickedUserId) return;
    addMutation.mutate(pickedUserId);
  };

  const memberColumns: ColumnDef[] = [
    { id: "name", label: "Name", isRowHeader: true },
    { id: "email", label: "Email" },
    { id: "status", label: "Status" },
    { id: "actions", label: "" },
  ];

  const renderMemberCell = (record: TeamMember, colId: string) => {
    switch (colId) {
      case "name":
        return `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim() || "—";
      case "email":
        return record.email;
      case "status":
        return (
          <Chip
            size="sm"
            variant="soft"
            color={record.isActive ? "success" : "danger"}
            className="font-medium"
          >
            <Chip.Label>{record.isActive ? "Active" : "Inactive"}</Chip.Label>
          </Chip>
        );
      case "actions":
        return (
          <ActionsMenu
            actions={[
              {
                type: "remove",
                hidden: !canManageMembers,
                label: "Remove from team",
                onAction: () => handleRemoveMember(record.id),
              },
            ]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Chip size="sm" variant="soft" className="self-start font-medium">
          <Chip.Label>
            {total} member{total === 1 ? "" : "s"}
          </Chip.Label>
        </Chip>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-full sm:w-72">
            <UserSelect
              label=""
              placeholder="Search unassigned users…"
              value={pickedUserId}
              onChange={setPickedUserId}
              source="unassigned"
            />
          </div>
          <Button
            variant="primary"
            isDisabled={!pickedUserId}
            isPending={addMutation.isPending}
            onPress={handleAdd}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      </div>

      <DataTable
        ariaLabel="Team members"
        items={items}
        columns={memberColumns}
        renderCell={renderMemberCell}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setPage}
      />
      {confirmDialog}
    </div>
  );
};

export default TeamMembersSection;
