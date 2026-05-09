import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Collapse,
  DatePicker,
  Divider,
  Flex,
  Input,
  InputNumber,
  Popover,
  Segmented,
  Select,
  Space,
  Typography,
  theme,
} from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import type { QuickValues } from "./quickFilterTransform.js";
import { quickValuesToFilter, splitFilterToQuickValues } from "./quickFilterTransform.js";
import type { AdvancedFilter, FieldConfig, FilterRule, QuickFilterField } from "./types.js";
import { ENUM_OPERATORS, NUMBER_OPERATORS, TEXT_OPERATORS } from "./types.js";

const { Text } = Typography;

interface Props {
  open: boolean;
  title?: string;
  quickFields: QuickFilterField[];
  ruleFields: FieldConfig[];
  initialFilter?: AdvancedFilter;
  onApply: (filter: AdvancedFilter | undefined) => void;
  onClose: () => void;
  children: ReactNode;
}

const makeRule = (): FilterRule => ({
  id: crypto.randomUUID(),
  field: "",
  operator: "",
  value: "",
});

function fieldHasValue(val: unknown, type: string): boolean {
  if (val === undefined || val === null) return false;
  if (type === "multiSelect") return (val as string[]).length > 0;
  if (type === "dateRange") {
    const v = val as Array<unknown>;
    return v[0] !== null || v[1] !== null;
  }
  if (type === "numberRange") {
    const v = val as { min: unknown; max: unknown };
    return v.min !== null || v.max !== null;
  }
  return (val as string).length > 0;
}

export function AdvancedFilterPopover({
  open,
  title = "Filter",
  quickFields,
  ruleFields,
  initialFilter,
  onApply,
  onClose,
  children,
}: Props) {
  const { token } = theme.useToken();

  const [matchMode, setMatchMode] = useState<"all" | "any">("all");
  const [quickValues, setQuickValues] = useState<QuickValues>({});
  const [rules, setRules] = useState<FilterRule[]>([]);

  useEffect(() => {
    if (!open) return;
    const { quickValues: qv, extraRules } = splitFilterToQuickValues(initialFilter, quickFields);

    for (const field of quickFields) {
      if (field.type === "dateRange" && qv[field.key]) {
        const pair = qv[field.key] as [string | null, string | null];
        qv[field.key] = [pair[0] ? dayjs(pair[0]) : null, pair[1] ? dayjs(pair[1]) : null];
      }
    }

    setMatchMode(initialFilter?.matchMode ?? "all");
    setQuickValues(qv);
    setRules(extraRules);
  }, [open, initialFilter, quickFields]);

  const setQuickValue = useCallback((key: string, val: unknown) => {
    setQuickValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const resetQuickValue = useCallback((key: string) => {
    setQuickValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const addRule = useCallback(() => setRules((prev) => [...prev, makeRule()]), []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRule = useCallback((id: string, patch: Partial<FilterRule>) => {
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
  }, []);

  const handleResetAll = useCallback(() => {
    setMatchMode("all");
    setQuickValues({});
    setRules([]);
  }, []);

  const handleApply = useCallback(() => {
    const validRules = rules.filter((r) => r.field && r.operator && r.value !== "");
    onApply(quickValuesToFilter(quickValues, quickFields, matchMode, validRules));
    onClose();
  }, [quickValues, quickFields, matchMode, rules, onApply, onClose]);

  // ── Quick filter controls ──────────────────────────────────────────────────

  const renderQuickControl = useCallback(
    (field: QuickFilterField) => {
      const val = quickValues[field.key];

      if (field.type === "search") {
        return (
          <Input
            allowClear
            placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}…`}
            value={(val as string | undefined) ?? ""}
            onChange={(e) => setQuickValue(field.key, e.target.value || undefined)}
          />
        );
      }

      if (field.type === "select") {
        return (
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
            value={(val as string | undefined) ?? undefined}
            options={field.options}
            onChange={(v: string | undefined) =>
              v ? setQuickValue(field.key, v) : resetQuickValue(field.key)
            }
          />
        );
      }

      if (field.type === "multiSelect") {
        return (
          <Select
            mode="multiple"
            allowClear
            style={{ width: "100%" }}
            placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
            value={(val as string[] | undefined) ?? []}
            options={field.options}
            onChange={(v: string[]) =>
              v.length > 0 ? setQuickValue(field.key, v) : resetQuickValue(field.key)
            }
          />
        );
      }

      if (field.type === "dateRange") {
        type DayjsPair = [dayjs.Dayjs | null, dayjs.Dayjs | null];
        return (
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            value={(val as DayjsPair | null | undefined) ?? null}
            onChange={(dates) =>
              dates && (dates[0] || dates[1])
                ? setQuickValue(field.key, dates)
                : resetQuickValue(field.key)
            }
          />
        );
      }

      if (field.type === "numberRange") {
        const range = (val as { min: number | null; max: number | null } | undefined) ?? {
          min: null,
          max: null,
        };
        const updateRange = (patch: Partial<typeof range>) => {
          const next = { ...range, ...patch };
          if (next.min === null && next.max === null) {
            resetQuickValue(field.key);
          } else {
            setQuickValue(field.key, next);
          }
        };
        return (
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              style={{ width: "50%" }}
              placeholder="Min"
              value={range.min ?? undefined}
              onChange={(v) => updateRange({ min: v ?? null })}
            />
            <InputNumber
              style={{ width: "50%" }}
              placeholder="Max"
              value={range.max ?? undefined}
              onChange={(v) => updateRange({ max: v ?? null })}
            />
          </Space.Compact>
        );
      }

      return null;
    },
    [quickValues, setQuickValue, resetQuickValue],
  );

  // ── Advanced rule-based section (collapsible) ──────────────────────────────

  const getOperators = useCallback(
    (fieldKey: string): ReadonlyArray<{ label: string; value: string }> => {
      const f = ruleFields.find((fc) => fc.key === fieldKey);
      if (!f) return [];
      if (f.type === "enum") return ENUM_OPERATORS;
      if (f.type === "number") return NUMBER_OPERATORS;
      return TEXT_OPERATORS;
    },
    [ruleFields],
  );

  const renderRuleValue = useCallback(
    (rule: FilterRule): ReactNode => {
      const f = ruleFields.find((fc) => fc.key === rule.field);
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
    },
    [ruleFields, updateRule],
  );

  const validRuleCount = rules.filter((r) => r.field && r.operator && r.value !== "").length;

  const ruleSurface = {
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: token.paddingSM,
  };

  const collapseItems =
    ruleFields.length > 0
      ? [
          {
            key: "rules",
            label: (
              <Text strong>
                Advanced rules{" "}
                {validRuleCount > 0 && (
                  <Text type="secondary" style={{ fontWeight: "normal" }}>
                    ({validRuleCount})
                  </Text>
                )}
              </Text>
            ),
            children: (
              <Flex vertical gap="middle" style={{ width: "100%" }}>
                {rules.length > 0 ? (
                  rules.map((rule, index) => (
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
                          onClick={() => removeRule(rule.id)}
                        />
                      </Flex>
                      <Flex gap={8} wrap="wrap">
                        <Select
                          style={{ flex: "1 1 140px", minWidth: 120 }}
                          placeholder="Field"
                          value={rule.field || undefined}
                          options={ruleFields.map((f) => ({ label: f.label, value: f.key }))}
                          onChange={(v: string) => updateRule(rule.id, { field: v })}
                        />
                        <Select
                          style={{ flex: "1 1 120px", minWidth: 100 }}
                          placeholder="Operator"
                          value={rule.operator || undefined}
                          options={[...getOperators(rule.field)]}
                          onChange={(v: string) => updateRule(rule.id, { operator: v })}
                          disabled={!rule.field}
                        />
                        <div style={{ flex: "2 1 160px", minWidth: 0 }}>
                          {renderRuleValue(rule)}
                        </div>
                      </Flex>
                    </div>
                  ))
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    No conditions yet — add one below.
                  </Text>
                )}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={addRule}>
                  Add condition
                </Button>
              </Flex>
            ),
          },
        ]
      : [];

  const popoverContent = (
    <Flex vertical gap="middle" style={{ width: "100%", maxHeight: "70vh", overflowY: "auto" }}>
      {/* Match mode */}
      <Flex align="center" gap="middle">
        <Text type="secondary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          Match mode:
        </Text>
        <Segmented
          value={matchMode}
          onChange={(v) => setMatchMode(v as "all" | "any")}
          options={[
            { label: "Match all (AND)", value: "all" },
            { label: "Match any (OR)", value: "any" },
          ]}
        />
      </Flex>

      <Divider style={{ margin: 0 }} />

      {/* Quick filter sections */}
      {quickFields.map((field, i) => (
        <div key={field.key}>
          <Flex justify="space-between" align="center" style={{ marginBottom: token.marginXS }}>
            <Text strong style={{ fontSize: 13 }}>
              {field.label}
            </Text>
            {fieldHasValue(quickValues[field.key], field.type) && (
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto" }}
                onClick={() => resetQuickValue(field.key)}
              >
                Reset
              </Button>
            )}
          </Flex>
          {renderQuickControl(field)}
          {i < quickFields.length - 1 && (
            <Divider style={{ marginBottom: 0, marginTop: token.marginMD }} />
          )}
        </div>
      ))}

      {/* Advanced rules (collapsible) */}
      {ruleFields.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <Collapse ghost size="small" items={collapseItems} />
        </>
      )}

      {/* Footer */}
      <Divider style={{ margin: 0 }} />
      <Flex justify="space-between" align="center">
        <Button type="text" danger size="small" onClick={handleResetAll}>
          Reset all
        </Button>
        <Button type="primary" size="small" onClick={handleApply}>
          Apply
        </Button>
      </Flex>
    </Flex>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={title}
      content={popoverContent}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      styles={{ root: { width: 380 } }}
    >
      {children}
    </Popover>
  );
}
