import { FilterOutlined } from "@ant-design/icons";
import { Button, Divider, Flex, Input, Popover, Typography, theme } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { FilterSection } from "./FilterSection.js";
import type { FilterValues } from "./filterTransform.js";
import { splitToFilterValues, valuesToFilter } from "./filterTransform.js";
import type { AdvancedFilter, FilterField } from "./types.js";

const { Text } = Typography;

// ── Private sub-component ─────────────────────────────────────────────────────

interface FilterContentProps {
  keyword: string;
  filterValues: FilterValues;
  fields: FilterField[];
  onKeywordChange: (v: string) => void;
  setValue: (key: string, val: unknown) => void;
  resetValue: (key: string) => void;
  onResetAll: () => void;
  onApply: () => void;
}

function FilterContent({
  keyword,
  filterValues,
  fields,
  onKeywordChange,
  setValue,
  resetValue,
  onResetAll,
  onApply,
}: FilterContentProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      gap={token.marginMD}
      style={{ width: "100%", maxHeight: "70vh", overflowY: "auto" }}
    >
      <Flex vertical gap={token.marginXS}>
        <Text strong style={{ fontSize: 13 }}>
          Keyword search
        </Text>
        <Input
          allowClear
          placeholder="Search…"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </Flex>

      <FilterSection
        fields={fields}
        filterValues={filterValues}
        setValue={setValue}
        resetValue={resetValue}
      />

      <Divider style={{ margin: 0 }} />
      <Flex justify="space-between" align="center">
        <Button type="text" danger size="small" onClick={onResetAll}>
          Reset all
        </Button>
        <Button type="primary" size="small" onClick={onApply}>
          Apply
        </Button>
      </Flex>
    </Flex>
  );
}

// ── Public component (state orchestrator) ─────────────────────────────────────

interface Props {
  fields?: FilterField[];
  initialFilter?: AdvancedFilter;
  initialQuery?: string;
  onApply: (filter: AdvancedFilter | undefined, query: string | undefined) => void;
}

export function AdvancedFilterPopover({
  fields = [],
  initialFilter,
  initialQuery,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);

  const isActive =
    !!(initialFilter && Object.keys(initialFilter).length > 0) || !!initialQuery?.trim();

  const [keyword, setKeyword] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  useEffect(() => {
    if (!open) return;
    const fv = splitToFilterValues(initialFilter, fields);

    for (const field of fields) {
      if (field.type === "dateRange" && fv[field.key]) {
        const pair = fv[field.key] as [string | null, string | null];
        fv[field.key] = [pair[0] ? dayjs(pair[0]) : null, pair[1] ? dayjs(pair[1]) : null];
      }
    }

    setKeyword(initialQuery ?? "");
    setFilterValues(fv);
  }, [open, initialFilter, initialQuery, fields]);

  const setValue = useCallback((key: string, val: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const resetValue = useCallback((key: string) => {
    setFilterValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleResetAll = useCallback(() => {
    setKeyword("");
    setFilterValues({});
  }, []);

  const handleApply = useCallback(() => {
    onApply(valuesToFilter(filterValues, fields), keyword.trim() || undefined);
    setOpen(false);
  }, [filterValues, fields, keyword, onApply]);

  const handleOpenChange = useCallback((v: boolean) => setOpen(v), []);

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <FilterContent
          keyword={keyword}
          filterValues={filterValues}
          fields={fields}
          onKeywordChange={setKeyword}
          setValue={setValue}
          resetValue={resetValue}
          onResetAll={handleResetAll}
          onApply={handleApply}
        />
      }
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      styles={{ root: { width: 380 } }}
    >
      <Button icon={<FilterOutlined />} type={isActive ? "primary" : "default"}>
        Filter
      </Button>
    </Popover>
  );
}
