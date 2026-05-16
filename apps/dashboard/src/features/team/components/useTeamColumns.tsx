import { Persons } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { ActionsMenu } from "@/components/ActionsMenu";
import { TWY_TEAM_ID } from "../constants";
import type { Team } from "../types/team";

export type TeamColumnDef = {
  id: string;
  label: string;
  isRowHeader?: boolean;
};

export const TEAM_COLUMNS: TeamColumnDef[] = [
  { id: "name", label: "Name", isRowHeader: true },
  { id: "description", label: "Description" },
  { id: "scope", label: "Scope" },
  { id: "memberCount", label: "Members" },
  { id: "createdAt", label: "Created" },
  { id: "actions", label: "Actions" },
];

type UseTeamColumnsParams = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
};

export function useTeamColumns({ canEdit, canDelete, onEdit, onDelete }: UseTeamColumnsParams) {
  const renderCell = (record: Team, colId: string) => {
    switch (colId) {
      case "name":
        return (
          <div className="flex items-center gap-2">
            <Persons className="h-4 w-4 text-default-500" />
            <span className="font-medium">{record.name}</span>
          </div>
        );
      case "description":
        return record.description ? (
          <span className="text-sm">{record.description}</span>
        ) : (
          <Chip size="sm" variant="soft">
            No description
          </Chip>
        );
      case "scope":
        return (
          <div className="flex flex-wrap gap-1">
            {record.branchRestricted && (
              <Chip color="warning" size="sm" variant="soft">
                Branch-restricted
              </Chip>
            )}
            {record.onlyOwnData && (
              <Chip color="accent" size="sm" variant="soft">
                Own data only
              </Chip>
            )}
            {!record.branchRestricted && !record.onlyOwnData && (
              <Chip color="success" size="sm" variant="soft">
                Unrestricted
              </Chip>
            )}
          </div>
        );
      case "memberCount":
        return (
          <Chip size="sm" variant="soft">
            {record.memberCount} member{record.memberCount !== 1 ? "s" : ""}
          </Chip>
        );
      case "createdAt":
        return record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "—";
      case "actions": {
        const isSystemTeam = record.id === TWY_TEAM_ID;
        const deleteBlocked = record.memberCount > 0;
        return (
          <ActionsMenu
            actions={[
              { type: "edit", hidden: !canEdit, onAction: () => onEdit(record) },
              {
                type: "delete",
                hidden: !canDelete || isSystemTeam,
                disabled: deleteBlocked,
                onAction: () => onDelete(record.id),
              },
            ]}
          />
        );
      }
      default:
        return null;
    }
  };

  return { columns: TEAM_COLUMNS, renderCell };
}
