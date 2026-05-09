import { Flex, Tag, Typography } from "antd";
import { useCallback } from "react";
import type { AdvancedFilter, FieldConfig, QuickFilterField } from "./types.js";

const { Text } = Typography;

interface ActiveFilterChipsProps {
  filter: AdvancedFilter | undefined;
  quickFields: QuickFilterField[];
  ruleFields: FieldConfig[];
  onChange: (next: AdvancedFilter | undefined) => void;
}

interface Chip {
  id: string;
  label: string;
  onRemove: () => void;
}

function buildChips(
  filter: AdvancedFilter,
  quickFields: QuickFilterField[],
  ruleFields: FieldConfig[],
  removeQuickField: (key: string) => void,
  removeRule: (id: string) => void,
): Chip[] {
  const chips: Chip[] = [];

  // Date range chip (top-level, not in rules[])
  if (filter.dateField) {
    const qf = quickFields.find((f) => f.key === filter.dateField);
    const label = qf?.label ?? filter.dateField;
    const from = filter.dateFrom ?? "…";
    const to = filter.dateTo ?? "…";
    chips.push({
      id: `__date__${filter.dateField}`,
      label: `${label}: ${from} – ${to}`,
      onRemove: () => removeQuickField(filter.dateField as string),
    });
  }

  // Group rules by fieldKey so we can render one chip per field for multi-value types
  const seen = new Set<string>();
  for (const rule of filter.rules) {
    if (seen.has(rule.field)) continue;
    const qf = quickFields.find((f) => f.key === rule.field);

    if (qf) {
      seen.add(rule.field);
      const rulesForField = filter.rules.filter((r) => r.field === rule.field);
      let valueStr = "";

      if (qf.type === "search") {
        valueStr = rulesForField[0]?.value ?? "";
      } else if (qf.type === "select") {
        const v = rulesForField[0]?.value ?? "";
        valueStr = qf.options?.find((o) => o.value === v)?.label ?? v;
      } else if (qf.type === "multiSelect") {
        const values = (rulesForField[0]?.value ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        valueStr = values.map((v) => qf.options?.find((o) => o.value === v)?.label ?? v).join(", ");
      } else if (qf.type === "numberRange") {
        const gte = rulesForField.find((r) => r.operator === "gte")?.value;
        const lte = rulesForField.find((r) => r.operator === "lte")?.value;
        if (gte && lte) valueStr = `${gte} – ${lte}`;
        else if (gte) valueStr = `≥ ${gte}`;
        else valueStr = `≤ ${lte ?? ""}`;
      }

      chips.push({
        id: `__quick__${rule.field}`,
        label: `${qf.label}: ${valueStr}`,
        onRemove: () => removeQuickField(rule.field),
      });
    } else {
      // Advanced rule — one chip per rule
      const rf = ruleFields.find((f) => f.key === rule.field);
      const fieldLabel = rf?.label ?? rule.field;
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator} ${rule.value}`,
        onRemove: () => removeRule(rule.id),
      });
    }
  }

  return chips;
}

export function ActiveFilterChips({
  filter,
  quickFields,
  ruleFields,
  onChange,
}: ActiveFilterChipsProps) {
  const removeQuickField = useCallback(
    (fieldKey: string) => {
      if (!filter) return;
      const newRules = filter.rules.filter((r) => r.field !== fieldKey);
      const isDateField = filter.dateField === fieldKey;
      const next: AdvancedFilter = {
        ...filter,
        rules: newRules,
        dateField: isDateField ? undefined : filter.dateField,
        dateFrom: isDateField ? undefined : filter.dateFrom,
        dateTo: isDateField ? undefined : filter.dateTo,
      };
      onChange(newRules.length === 0 && !next.dateField ? undefined : next);
    },
    [filter, onChange],
  );

  const removeRule = useCallback(
    (ruleId: string) => {
      if (!filter) return;
      const newRules = filter.rules.filter((r) => r.id !== ruleId);
      onChange(
        newRules.length === 0 && !filter.dateField ? undefined : { ...filter, rules: newRules },
      );
    },
    [filter, onChange],
  );

  if (!filter) return null;
  if (filter.rules.length === 0 && !filter.dateField) return null;

  const chips = buildChips(filter, quickFields, ruleFields, removeQuickField, removeRule);
  if (chips.length === 0) return null;

  return (
    <Flex align="center" gap={6} wrap style={{ marginBottom: 12 }}>
      <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        Active filters:
      </Text>
      {chips.map((chip) => (
        <Tag key={chip.id} closable onClose={chip.onRemove} style={{ margin: 0, fontSize: 12 }}>
          {chip.label}
        </Tag>
      ))}
      <Typography.Link style={{ fontSize: 12 }} onClick={() => onChange(undefined)}>
        Clear all
      </Typography.Link>
    </Flex>
  );
}
