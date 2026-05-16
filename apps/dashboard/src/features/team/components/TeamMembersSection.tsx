import { Plus } from "@gravity-ui/icons";
import { Spinner, Table, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useState } from "react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import PageControls from "@/components/PageControls";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { getTeamMembers, removeTeamMember } from "../api/teamApi";
import type { TeamMember } from "../types/team";
import AddMemberPicker from "./AddMemberPicker";
import { useTeamMemberColumns } from "./useTeamMemberColumns";

interface TeamMembersSectionProps {
  teamId: string;
}

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ teamId }) => {
  const [showPicker, setShowPicker] = useState(false);

  const { items, total, page, pageSize, isLoading, setPage, refetch } = useServerTable<TeamMember>({
    queryKey: ["team-members", teamId],
    fetcher: async ({ page: p, pageSize: ps }) => {
      const result = await getTeamMembers(teamId, { page: p - 1, limit: ps });
      return { items: result.items, total: result.total };
    },
    initialPageSize: 20,
  });

  const removeMutation = useApiMutation((memberId: string) => removeTeamMember(teamId, memberId), {
    onSuccess: () => {
      toast.success("Member removed");
      refetch();
    },
    onError: (err) => toast.danger(getErrorMessage(err)),
  });

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleRemoveMember = useCallback(
    (id: string) =>
      confirm({
        title: "Remove this member from the team?",
        confirmLabel: "Remove",
        status: "danger",
        onConfirm: () => removeMutation.mutate(id),
      }),
    [confirm, removeMutation],
  );

  const rawColumns = useTeamMemberColumns(handleRemoveMember);

  // Adapt the columns from the hook into the ColDef shape required by Table.Collection
  const columns = rawColumns.map((col) => ({ id: col.key, label: col.label, render: col.render }));

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Members ({total})</h3>
        {!showPicker && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" />
            Add member
          </button>
        )}
      </div>

      {showPicker && (
        <div className="mb-3">
          <AddMemberPicker
            teamId={teamId}
            onAdded={() => {
              setShowPicker(false);
              refetch();
            }}
            onCancel={() => setShowPicker(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Team members" className="min-w-full text-sm">
              <Table.Header columns={columns}>
                {(col) => <Table.Column>{col.label}</Table.Column>}
              </Table.Header>
              <Table.Body items={items}>
                {(record) => (
                  <Table.Row id={record.id}>
                    <Table.Collection items={columns}>
                      {(col) => <Table.Cell>{col.render(record)}</Table.Cell>}
                    </Table.Collection>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {total > pageSize && (
            <Table.Footer>
              <div className="flex justify-center pt-2">
                <PageControls
                  totalPages={Math.ceil(total / pageSize)}
                  page={page}
                  onPageChange={setPage}
                />
              </div>
            </Table.Footer>
          )}
        </Table>
      )}
      {confirmDialog}
    </div>
  );
};

export default TeamMembersSection;
