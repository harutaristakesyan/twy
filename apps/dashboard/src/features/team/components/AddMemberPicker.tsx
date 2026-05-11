import { useDebounceFn, useInfiniteScroll, useRequest } from "ahooks";
import { App, Button, Flex, Select } from "antd";
import type React from "react";
import { useRef, useState } from "react";
import { SelectOption } from "@/components/SelectOption";
import { getErrorMessage } from "@/utils/errorUtils";
import { createPopupScrollHandler } from "@/utils/selectUtils";
import { addTeamMember, getUnassignedUsers } from "../api/teamApi";

interface AddMemberPickerProps {
  teamId: string;
  onAdded: () => void;
  onCancel: () => void;
}

const AddMemberPicker: React.FC<AddMemberPickerProps> = ({ teamId, onAdded, onCancel }) => {
  const { message } = App.useApp();
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  queryRef.current = query;

  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

  const { data, loading, loadMore } = useInfiniteScroll(
    async (currentData) => {
      const limit = 10;
      const nextPage = Math.floor((currentData?.list?.length ?? 0) / limit);
      const response = await getUnassignedUsers({ page: nextPage, limit, query: queryRef.current });
      return { list: response.items, total: response.total };
    },
    {
      reloadDeps: [query],
      isNoMore: (d) => (d ? d.list.length >= d.total : false),
    },
  );

  const { loading: adding, run: add } = useRequest(
    async () => {
      if (!selectedUserId) return;
      await addTeamMember(teamId, selectedUserId);
    },
    {
      manual: true,
      onSuccess: () => {
        setSelectedUserId(undefined);
        onAdded();
        message.success("Member added");
      },
      onError: (error) => {
        message.error(getErrorMessage(error));
      },
    },
  );

  const { run: onSearch } = useDebounceFn((val: string) => setQuery(val), { wait: 300 });

  const handlePopupScroll = createPopupScrollHandler(loadMore);

  return (
    <Flex gap="small">
      <Select
        style={{ flex: 1 }}
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
            label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
            email: u.email,
          })) ?? []
        }
        optionRender={(option) => (
          <SelectOption label={option.label} description={option.data.email} />
        )}
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
