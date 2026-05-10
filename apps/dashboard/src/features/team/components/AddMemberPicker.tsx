import { useDebounceFn } from "ahooks";
import { Button, Flex, List, message, Select } from "antd";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { addTeamMember, getUnassignedUsers } from "../api/teamApi";
import type { TeamMember } from "../types/team";

interface AddMemberPickerProps {
  teamId: string;
  onAdded: () => void;
  onCancel: () => void;
}

interface PickerState {
  items: TeamMember[];
  loading: boolean;
  page: number;
  hasMore: boolean;
}

const AddMemberPicker: React.FC<AddMemberPickerProps> = ({ teamId, onAdded, onCancel }) => {
  const [picker, setPicker] = useState<PickerState>({
    items: [],
    loading: false,
    page: 0,
    hasMore: true,
  });
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  const fetchUnassigned = useCallback(async (page: number, query: string, append = false) => {
    setPicker((prev) => ({ ...prev, loading: true }));
    try {
      const result = await getUnassignedUsers({ page, limit: 20, query: query || undefined });
      setPicker((prev) => ({
        ...prev,
        items: append ? [...prev.items, ...result.items] : result.items,
        page,
        hasMore: (page + 1) * 20 < result.total,
        loading: false,
      }));
    } catch (error) {
      message.error(getErrorMessage(error));
      setPicker((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchUnassigned(0, "");
  }, [fetchUnassigned]);

  const { run: debouncedSearch } = useDebounceFn(
    (val: string) => {
      setSearch(val);
      fetchUnassigned(0, val, false);
    },
    { wait: 300 },
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const isBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10;
      if (isBottom && !picker.loading && picker.hasMore) {
        fetchUnassigned(picker.page + 1, search, true);
      }
    },
    [picker.loading, picker.hasMore, picker.page, search, fetchUnassigned],
  );

  const handleAdd = useCallback(async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      await addTeamMember(teamId, selectedUserId);
      message.success("Member added");
      onAdded();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setAdding(false);
    }
  }, [selectedUserId, teamId, onAdded]);

  return (
    <Flex gap="small">
      <Select
        showSearch={{ filterOption: false, onSearch: debouncedSearch }}
        onPopupScroll={handleScroll}
        loading={picker.loading}
        value={selectedUserId}
        onChange={setSelectedUserId}
        style={{ flex: 1 }}
        placeholder="Search unassigned users"
        options={picker.items.map((u) => ({
          value: u.id,
          label: `${u.firstName ?? ""} ${u.lastName ?? ""}`,
          email: u.email,
        }))}
        optionRender={(option) => (
          <List.Item>
            <List.Item.Meta title={option.data.label} description={option.data.email} />
          </List.Item>
        )}
      />
      <Button
        type="primary"
        size="small"
        onClick={handleAdd}
        loading={adding}
        disabled={!selectedUserId}
      >
        Add
      </Button>
      <Button size="small" onClick={onCancel}>
        Cancel
      </Button>
    </Flex>
  );
};

export default AddMemberPicker;
