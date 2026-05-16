import { TrashBin } from "@gravity-ui/icons";
import type { TeamMember } from "../types/team";

interface Column {
  key: string;
  label: string;
  render: (record: TeamMember) => React.ReactNode;
}

export function useTeamMemberColumns(removeMember: (memberId: string) => void): Column[] {
  return [
    {
      key: "name",
      label: "Name",
      render: (r) => `${r.firstName} ${r.lastName}`,
    },
    {
      key: "email",
      label: "Email",
      render: (r) => r.email,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            r.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <button
          type="button"
          title="Remove member"
          onClick={() => removeMember(r.id)}
          className="rounded p-1 text-red-400 hover:bg-red-50"
        >
          <TrashBin className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];
}
