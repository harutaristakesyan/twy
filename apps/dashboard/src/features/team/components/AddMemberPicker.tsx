import { useDebounceFn, useInfiniteScroll, useRequest } from "ahooks";
import { Button, Flex, message, Select } from "antd";
import type React from "react";
import { useRef, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { addTeamMember, getUnassignedUsers } from "../api/teamApi";

interface AddMemberPickerProps {
  teamId: string;
  onAdded: () => void;
  onCancel: () => void;
}

const AddMemberPicker: React.FC<AddMemberPickerProps> = ({ teamId, onAdded, onCancel }) => {
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  queryRef.current = query;
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

  const { data, loading, loadMore } = useInfiniteScroll(
    async (currentData) => {
      const currentCount = currentData?.list?.length ?? 0;
      const limit = 10;
      const nextPage = Math.floor(currentCount / limit);

      const response = await getUnassignedUsers({
        page: nextPage,
        limit,
        query: queryRef.current,
      });

      return { list: response.items, total: response.total };
    },
    {
      reloadDeps: [query],
      isNoMore: (d) => (d ? d.list.length >= d.total : false),
    },
  );

  const handleAdd = async () => {
    if (!selectedUserId) return;
    await addTeamMember(teamId, selectedUserId);
  };

  const { loading: adding, run: add } = useRequest(handleAdd, {
    manual: true,
    onSuccess: () => {
      onAdded();
      message.success("Member added");
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });

  const { run: onSearch } = useDebounceFn((val: string) => setQuery(val), { wait: 300 });

  const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
      loadMore();
    }
  };

  return (
    <Flex gap="small">
      <Select
        size="small"
        showSearch={{ filterOption: false, onSearch }}
        onPopupScroll={handlePopupScroll}
        loading={loading}
        value={selectedUserId}
        onChange={setSelectedUserId}
        placeholder="Search unassigned users"
        options={
          data?.list?.map((u) => ({
            value: u.id,
            label: `${u.firstName ?? ""} ${u.lastName ?? ""} (${u.email})`,
          })) ?? []
        }
      />
      <Button type="primary" size="small" onClick={add} loading={adding} disabled={!selectedUserId}>
        Add
      </Button>
      <Button size="small" onClick={onCancel}>
        Cancel
      </Button>
    </Flex>
  );
};

export default AddMemberPicker;
