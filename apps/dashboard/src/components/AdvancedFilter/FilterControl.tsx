import { DatePicker, InputNumber, Select, Space } from "antd";
import type dayjs from "dayjs";
import type { FilterField } from "./types.js";

interface Props {
  field: FilterField;
  value: unknown;
  onChange: (val: unknown) => void;
  onReset: () => void;
}

export function FilterControl({ field, value, onChange, onReset }: Props) {
  if (field.type === "select") {
    return (
      <Select
        allowClear
        style={{ width: "100%" }}
        placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
        value={(value as string | undefined) ?? undefined}
        options={field.options}
        onChange={(v: string | undefined) => (v ? onChange(v) : onReset())}
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
        value={(value as string[] | undefined) ?? []}
        options={field.options}
        onChange={(v: string[]) => (v.length > 0 ? onChange(v) : onReset())}
      />
    );
  }

  if (field.type === "dateRange") {
    type DayjsPair = [dayjs.Dayjs | null, dayjs.Dayjs | null];
    return (
      <DatePicker.RangePicker
        style={{ width: "100%" }}
        value={(value as DayjsPair | null | undefined) ?? null}
        onChange={(dates) => (dates && (dates[0] || dates[1]) ? onChange(dates) : onReset())}
      />
    );
  }

  if (field.type === "numberRange") {
    const range = (value as { min: number | null; max: number | null } | undefined) ?? {
      min: null,
      max: null,
    };
    const updateRange = (patch: Partial<typeof range>) => {
      const next = { ...range, ...patch };
      if (next.min === null && next.max === null) onReset();
      else onChange(next);
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
}
