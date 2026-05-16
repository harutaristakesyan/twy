import { Plus } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type { Filter, FilterField } from "@/components/Search";
import { ActiveFilters, Search } from "@/components/Search";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteTeam, getTeams } from "../api/teamApi";
import TeamManagementTable from "../components/TeamManagementTable";
import { useTeamColumns } from "../components/useTeamColumns";
import type { Team } from "../types/team";

const BOOL_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const FILTER_FIELDS: FilterField[] = [
  { key: "branchRestricted", label: "Branch restricted", type: "select", options: BOOL_OPTIONS },
  { key: "onlyOwnData", label: "Only own data", type: "select", options: BOOL_OPTIONS },
];

const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.teams.add;
  const canEdit = permissions.teams.edit;

  const [activeFilter, setActiveFilter] = useState<Filter | undefined>();
  const [activeQuery, setActiveQuery] = useState("");

  const table = useServerTable<Team>({
    queryKey: ["teams", activeQuery, activeFilter],
    fetcher: async ({ page, pageSize, sort }) => {
      const result = await getTeams({
        page: page - 1,
        limit: pageSize,
        sortOrder: sort?.direction === "ascending" ? "ascend" : sort ? "descend" : undefined,
        query: activeQuery || undefined,
        filters: activeFilter ? JSON.stringify(activeFilter) : undefined,
      });
      return { items: result.teams, total: result.total };
    },
    initialPageSize: 10,
  });

  const deleteMutation = useApiMutation((id: string) => deleteTeam(id), {
    onSuccess: () => {
      toast.success("Team deleted successfully");
      void table.refetch();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const handleCreate = useCallback(() => navigate("/user-management/teams/create"), [navigate]);
  const handleEdit = useCallback(
    (team: Team) => navigate(`/user-management/teams/${team.id}/edit`),
    [navigate],
  );

  const handleDelete = useCallback(
    (id: string) =>
      confirm({
        title: "Delete this team?",
        description: "This action cannot be undone.",
        confirmLabel: "Delete",
        status: "danger",
        onConfirm: () => deleteMutation.mutate(id),
      }),
    [confirm, deleteMutation],
  );

  const { columns, renderCell } = useTeamColumns({
    canEdit,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Teams ({table.total})</h2>
        <div className="flex items-center gap-2">
          <Search
            query={activeQuery}
            onQueryChange={setActiveQuery}
            placeholder="Search teams..."
            fields={FILTER_FIELDS}
            filter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          {canAdd && (
            <Button variant="primary" onPress={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Team
            </Button>
          )}
        </div>
      </div>

      <ActiveFilters filter={activeFilter} fields={FILTER_FIELDS} onChange={setActiveFilter} />

      <TeamManagementTable
        items={table.items}
        columns={columns}
        renderCell={renderCell}
        total={table.total}
        page={table.page}
        pageSize={table.pageSize}
        isLoading={table.isLoading}
        onPageChange={table.setPage}
      />
      {confirmDialog}
    </div>
  );
};

export default TeamsPage;
