import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Divider,
  Drawer,
  Flex,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  theme,
} from "antd";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { AdvancedFilter, FieldConfig, FilterRule } from "./types.js";
import { ENUM_OPERATORS, NUMBER_OPERATORS, TEXT_OPERATORS } from "./types.js";

const { Text, Title } = Typography;

interface Props {
  open: boolean;
  title?: string;
  fields: FieldConfig[];
  /** Active filter when the drawer opens — used to hydrate the form. */
  initialFilter?: AdvancedFilter;
  onApply: (filter: AdvancedFilter) => void;
  onClose: () => void;
}

const makeRule = (): FilterRule => ({
  id: crypto.randomUUID(),
  field: "",
  operator: "",
  value: "",
});

function parseFilterFingerprint(fingerprint: string): AdvancedFilter | undefined {
  if (fingerprint === "null") return undefined;
  return JSON.parse(fingerprint) as AdvancedFilter;
}

function hydrateFromAdv(init: AdvancedFilter | undefined): {
  matchMode: "all" | "any";
  rules: FilterRule[];
} {
  return {
    matchMode: init?.matchMode ?? "all",
    rules:
      init?.rules?.length && init.rules.length > 0
        ? init.rules.map((r) => ({ ...r, id: r.id || crypto.randomUUID() }))
        : [makeRule()],
  };
}

export const AdvancedFilterDrawer: React.FC<Props> = ({
  open,
  title = "Advanced Search",
  fields,
  initialFilter,
  onApply,
  onClose,
}) => {
  const { token } = theme.useToken();

  const initialFingerprint = useMemo(() => JSON.stringify(initialFilter ?? null), [initialFilter]);

  const [matchMode, setMatchMode] = useState<"all" | "any">("all");
  const [rules, setRules] = useState<FilterRule[]>(() => [makeRule()]);

  useEffect(() => {
    if (!open) return;
    const h = hydrateFromAdv(parseFilterFingerprint(initialFingerprint));
    setMatchMode(h.matchMode);
    setRules(h.rules);
  }, [open, initialFingerprint]);

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
  };

  const handleApply = () => {
    const validRules = rules.filter((r) => r.field && r.operator && r.value !== "");
    onApply({
      matchMode,
      rules: validRules,
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

  const ruleSurface = {
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: token.paddingSM,
  };

  return (
    <Drawer
      title={title}
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
      styles={{ body: { paddingTop: token.paddingMD } }}
      footer={
        <Flex justify="space-between" align="center" gap="middle">
          <Button type="text" danger onClick={handleClear}>
            Reset form
          </Button>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleApply}>
              Apply filters
            </Button>
          </Space>
        </Flex>
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={5} style={{ marginTop: 0, marginBottom: token.marginSM }}>
            Rule combination
          </Title>
          <Select
            value={matchMode}
            onChange={(v: "all" | "any") => setMatchMode(v)}
            style={{ width: "100%" }}
            aria-label="How rules combine"
            options={[
              { label: "Match all rules (AND)", value: "all" },
              { label: "Match any rule (OR)", value: "any" },
            ]}
          />
        </div>

        <Divider style={{ margin: 0 }} />

        <div>
          <Flex align="baseline" gap="small" justify="space-between" wrap="wrap">
            <Title level={5} style={{ margin: 0 }}>
              Field conditions
            </Title>
          </Flex>
          <Flex align="center" gap={6} style={{ marginBottom: token.marginMD, flexWrap: "wrap" }}>
            <InfoCircleOutlined style={{ color: token.colorTextDescription }} aria-hidden />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Rows missing a field, operator, or value are ignored when you apply.
            </Text>
          </Flex>

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {rules.map((rule, index) => (
              <div key={rule.id} style={ruleSurface}>
                <Flex
                  justify="space-between"
                  align="center"
                  style={{ marginBottom: token.marginSM }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Condition {index + 1}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Remove condition ${index + 1}`}
                    onClick={() => removeRule(rule.id)}
                    disabled={rules.length === 1}
                  >
                    Remove
                  </Button>
                </Flex>
                <Flex gap={8} wrap="wrap">
                  <Select
                    style={{ flex: "1 1 140px", minWidth: 120 }}
                    placeholder="Field"
                    value={rule.field || undefined}
                    options={fields.map((f) => ({ label: f.label, value: f.key }))}
                    onChange={(v: string) => updateRule(rule.id, { field: v })}
                  />
                  <Select
                    style={{ flex: "1 1 120px", minWidth: 100 }}
                    placeholder="Operator"
                    value={rule.operator || undefined}
                    options={getOperators(rule.field)}
                    onChange={(v: string) => updateRule(rule.id, { operator: v })}
                    disabled={!rule.field}
                  />
                  <div style={{ flex: "2 1 160px", minWidth: 0 }}>{renderValue(rule)}</div>
                </Flex>
              </div>
            ))}
          </Space>

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            style={{ marginTop: token.marginMD }}
            onClick={addRule}
          >
            Add condition
          </Button>
        </div>
      </Space>
    </Drawer>
  );
};
