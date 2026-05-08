import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Drawer,
  Flex,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
} from "antd";
import type React from "react";
import { useState } from "react";
import type { AdvancedFilter, DateFieldConfig, FieldConfig, FilterRule } from "./types.js";
import { ENUM_OPERATORS, NUMBER_OPERATORS, TEXT_OPERATORS } from "./types.js";

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface Props {
  open: boolean;
  title?: string;
  fields: FieldConfig[];
  dateFields?: DateFieldConfig[];
  onApply: (filter: AdvancedFilter) => void;
  onClose: () => void;
}

const makeRule = (): FilterRule => ({
  id: crypto.randomUUID(),
  field: "",
  operator: "",
  value: "",
});

export const AdvancedFilterDrawer: React.FC<Props> = ({
  open,
  title = "Advanced Search",
  fields,
  dateFields = [],
  onApply,
  onClose,
}) => {
  const [matchMode, setMatchMode] = useState<"all" | "any">("all");
  const [rules, setRules] = useState<FilterRule[]>(() => [makeRule()]);
  const [dateField, setDateField] = useState<string | undefined>(dateFields[0]?.key);
  const [dateRange, setDateRange] = useState<[string, string] | undefined>();

  const addRule = () => setRules((prev) => [...prev, makeRule()]);

  const removeRule = (id: string) =>
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [makeRule()];
    });

  const updateRule = (id: string, patch: Partial<FilterRule>) =>
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if ("field" in patch && patch.field !== r.field) {
          next.operator = "";
          next.value = "";
        }
        return next;
      }),
    );

  const handleClear = () => {
    setMatchMode("all");
    setRules([makeRule()]);
    setDateRange(undefined);
  };

  const handleApply = () => {
    const validRules = rules.filter((r) => r.field && r.operator && r.value !== "");
    onApply({
      matchMode,
      rules: validRules,
      dateField: dateRange ? dateField : undefined,
      dateFrom: dateRange?.[0],
      dateTo: dateRange?.[1],
    });
  };

  const getOperators = (fieldKey: string) => {
    const f = fields.find((fc) => fc.key === fieldKey);
    if (!f) return [];
    if (f.type === "enum") return ENUM_OPERATORS;
    if (f.type === "number") return NUMBER_OPERATORS;
    return TEXT_OPERATORS;
  };

  const renderValue = (rule: FilterRule) => {
    const f = fields.find((fc) => fc.key === rule.field);
    const disabled = !rule.operator;

    if (!f || !rule.field) {
      return <Input disabled placeholder="Value" style={{ width: "100%" }} />;
    }

    if (f.type === "enum" && f.options) {
      return (
        <Select
          disabled={disabled}
          style={{ width: "100%" }}
          placeholder="Select value"
          value={rule.value || undefined}
          options={f.options}
          onChange={(v: string) => updateRule(rule.id, { value: v })}
        />
      );
    }

    if (f.type === "number") {
      return (
        <InputNumber
          disabled={disabled}
          style={{ width: "100%" }}
          placeholder="Value"
          value={rule.value ? Number(rule.value) : undefined}
          onChange={(v) => updateRule(rule.id, { value: v?.toString() ?? "" })}
        />
      );
    }

    return (
      <Input
        disabled={disabled}
        placeholder="Value"
        value={rule.value}
        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
      />
    );
  };

  return (
    <Drawer
      title={title}
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
      footer={
        <Flex justify="space-between" align="center">
          <Button type="text" danger onClick={handleClear}>
            Clear Filters
          </Button>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleApply}>
              Apply
            </Button>
          </Space>
        </Flex>
      }
    >
      <Flex align="center" gap="small" style={{ marginBottom: 20 }}>
        <Text>Match</Text>
        <Select
          value={matchMode}
          onChange={(v: "all" | "any") => setMatchMode(v)}
          style={{ width: 72 }}
          options={[
            { label: "all", value: "all" },
            { label: "any", value: "any" },
          ]}
        />
        <Text>of the following rules:</Text>
      </Flex>

      <Text strong style={{ display: "block", marginBottom: 8 }}>
        Select Fields
      </Text>
      {rules.map((rule) => (
        <Flex key={rule.id} gap={8} style={{ marginBottom: 8 }} align="center">
          <Select
            style={{ flex: 2, minWidth: 0 }}
            placeholder="Field"
            value={rule.field || undefined}
            options={fields.map((f) => ({ label: f.label, value: f.key }))}
            onChange={(v: string) => updateRule(rule.id, { field: v })}
          />
          <Select
            style={{ flex: 1.5, minWidth: 0 }}
            placeholder="Operator"
            value={rule.operator || undefined}
            options={getOperators(rule.field)}
            onChange={(v: string) => updateRule(rule.id, { operator: v })}
            disabled={!rule.field}
          />
          <div style={{ flex: 2, minWidth: 0 }}>{renderValue(rule)}</div>
          <Button icon={<PlusOutlined />} onClick={addRule} />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => removeRule(rule.id)}
            disabled={rules.length === 1}
          />
        </Flex>
      ))}

      {dateFields.length > 0 && (
        <>
          <Text strong style={{ display: "block", marginTop: 20, marginBottom: 8 }}>
            Select Date
          </Text>
          <Flex gap={8} align="center">
            <Select
              style={{ width: 160 }}
              value={dateField}
              onChange={(v: string) => setDateField(v)}
              options={dateFields.map((d) => ({ label: d.label, value: d.key }))}
            />
            <RangePicker
              style={{ flex: 1 }}
              onChange={(_, strings) => {
                const [from, to] = strings;
                setDateRange(from && to ? [from, to] : undefined);
              }}
            />
          </Flex>
        </>
      )}
    </Drawer>
  );
};
