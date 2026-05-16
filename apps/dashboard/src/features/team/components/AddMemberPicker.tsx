import { Spinner, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useState } from "react";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { addTeamMember, getUnassignedUsers } from "../api/teamApi";

interface AddMemberPickerProps {
  teamId: string;
  onAdded: () => void;
  onCancel: () => void;
}

const AddMemberPicker: React.FC<AddMemberPickerProps> = ({ teamId, onAdded, onCancel }) => {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data, isLoading } = useApiQuery(["unassigned-users", query], () =>
    getUnassignedUsers({ page: 0, limit: 20, query: query || undefined }),
  );

  const mutation = useApiMutation(
    async () => {
      if (!selectedUserId) throw new Error("No user selected");
      await addTeamMember(teamId, selectedUserId);
    },
    {
      onSuccess: () => {
        toast.success("Member added");
        setSelectedUserId("");
        onAdded();
      },
      onError: (err) => toast.danger(getErrorMessage(err)),
    },
  );

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const users = data?.items ?? [];

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search unassigned users…"
          value={query}
          onChange={handleSearch}
        />
      </div>
      <select
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select user</option>
        {isLoading && <option disabled>Loading…</option>}
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.firstName} {u.lastName} — {u.email}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selectedUserId || mutation.isPending}
        onClick={() => mutation.mutate(undefined)}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? <Spinner size="sm" /> : "Add"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );
};

export default AddMemberPicker;
