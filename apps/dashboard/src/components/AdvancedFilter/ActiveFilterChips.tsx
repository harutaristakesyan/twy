import { Flex, Tag, Typography } from "antd";
import { useMemo } from "react";
import type { AdvancedFilter, FilterField } from "./types.js";

const { Text } = Typography;

const containerStyle = { marginBottom: 12 };

interface Props {
  filter: AdvancedFilter | undefined;
  fields?: FilterField[];
  query: string | undefined;
  onChange: (next: AdvancedFilter | undefined) => void;
  onClearQuery: () => void;
}

interface Chip {
  id: string;
  label: string;
  onRemove: () => void;
}

function removeKeys(filter: AdvancedFilter, keys: string[]): AdvancedFilter | undefined {
  const next = { ...filter };
  for (const k of keys) {
    delete next[k];
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function ActiveFilterChips({ filter, fields = [], query, onChange, onClearQuery }: Props) {
  const chips = useMemo((): Chip[] => {
    const result: Chip[] = [];

    if (query?.trim()) {
      result.push({
        id: "__query__",
        label: `Keyword: ${query.trim()}`,
        onRemove: onClearQuery,
      });
    }

    if (!filter) return result;

    for (const field of fields) {
      if (field.type === "select") {
        const v = filter[field.key];
        if (v === undefined) continue;
        const label = field.options?.find((o) => o.value === v)?.label ?? v;
        result.push({
          id: `__field__${field.key}`,
          label: `${field.label}: ${label}`,
          onRemove: () => onChange(removeKeys(filter, [field.key])),
        });
      } else if (field.type === "multiSelect") {
        const raw = filter[field.key];
        if (raw === undefined) continue;
        const values = raw.split(",").filter(Boolean);
        const labelStr = values
          .map((v) => field.options?.find((o) => o.value === v)?.label ?? v)
          .join(", ");
        result.push({
          id: `__field__${field.key}`,
          label: `${field.label}: ${labelStr}`,
          onRemove: () => onChange(removeKeys(filter, [field.key])),
        });
      } else if (field.type === "numberRange") {
        const gte = filter[`${field.key}__gte`];
        const lte = filter[`${field.key}__lte`];
        if (gte === undefined && lte === undefined) continue;
        const valueStr = gte && lte ? `${gte} – ${lte}` : gte ? `≥ ${gte}` : `≤ ${lte ?? ""}`;
        result.push({
          id: `__field__${field.key}`,
          label: `${field.label}: ${valueStr}`,
          onRemove: () => onChange(removeKeys(filter, [`${field.key}__gte`, `${field.key}__lte`])),
        });
      } else if (field.type === "dateRange") {
        const from = filter[`${field.key}__from`];
        const to = filter[`${field.key}__to`];
        if (from === undefined && to === undefined) continue;
        result.push({
          id: `__field__${field.key}`,
          label: `${field.label}: ${from ?? "…"} – ${to ?? "…"}`,
          onRemove: () => onChange(removeKeys(filter, [`${field.key}__from`, `${field.key}__to`])),
        });
      }
    }

    return result;
  }, [filter, fields, query, onChange, onClearQuery]);

  if (!chips.length) return null;

  return (
    <Flex align="center" gap={6} wrap style={containerStyle}>
      <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        Active filters:
      </Text>
      {chips.map((chip) => (
        <Tag key={chip.id} closable onClose={chip.onRemove} style={{ margin: 0, fontSize: 12 }}>
          {chip.label}
        </Tag>
      ))}
      <Typography.Link
        style={{ fontSize: 12 }}
        onClick={() => {
          onChange(undefined);
          onClearQuery();
        }}
      >
        Clear all
      </Typography.Link>
    </Flex>
  );
}
