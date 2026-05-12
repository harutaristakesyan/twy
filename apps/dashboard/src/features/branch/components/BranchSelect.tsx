import { useDebounceFn, useInfiniteScroll } from "ahooks";
import { Select, Spin } from "antd";
import { useRef, useState } from "react";
import { LabeledOption } from "@/components/LabeledOption";
import { createPopupScrollHandler } from "@/utils/selectUtils";
import { getBranches } from "../api/branchApi";
import type { Branch } from "../types/branch";

interface BranchSelectProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  initialOption?: { value: string; label: string };
}

const BranchSelect: React.FC<BranchSelectProps> = ({
  value,
  onChange,
  placeholder = "Search and select branch",
  allowClear = true,
  disabled,
  initialOption,
}) => {
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  queryRef.current = query;

  const { data, loading, loadMore } = useInfiniteScroll(
    async (currentData) => {
      const limit = 20;
      const nextPage = Math.floor((currentData?.list?.length ?? 0) / limit);
      const response = await getBranches({
        page: nextPage,
        limit,
        query: queryRef.current || undefined,
      });
      return { list: response.branches as Branch[], total: response.total };
    },
    {
      reloadDeps: [query],
      isNoMore: (d) => (d ? d.list.length >= d.total : false),
    },
  );

  const { run: onSearch } = useDebounceFn((val: string) => setQuery(val), { wait: 300 });

  const handlePopupScroll = createPopupScrollHandler(loadMore);

  const fetched = data?.list?.map((b) => ({ value: b.id, label: b.name, owner: b.owner })) ?? [];
  const options =
    initialOption && !fetched.find((o) => o.value === initialOption.value)
      ? [{ ...initialOption, owner: null }, ...fetched]
      : fetched;

  return (
    <Select
      value={value ?? undefined}
      onChange={(val) => onChange?.(val ?? null)}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      showSearch={{ filterOption: false, onSearch }}
      onPopupScroll={handlePopupScroll}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : "No branches found"}
      options={options}
      optionRender={(option) => (
        <LabeledOption
          label={option.label}
          description={
            option.data.owner
              ? `Owner: ${option.data.owner.firstName} ${option.data.owner.lastName}`
              : undefined
          }
        />
      )}
    />
  );
};

export default BranchSelect;
