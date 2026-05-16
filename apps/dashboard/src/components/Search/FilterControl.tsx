import { Checkbox, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { DateInputBlock } from "@/components/form/DateFieldBlock";
import type { FilterField } from "./types.js";

interface Props {
  field: FilterField;
  value: unknown;
  onChange: (val: unknown) => void;
  onReset: () => void;
}

export function FilterControl({ field, value, onChange, onReset }: Props) {
  if (field.type === "select") {
    const current = (value as string | undefined) ?? "";
    return (
      <Select
        value={current || undefined}
        onChange={(key) => {
          const v = key === null || key === undefined ? "" : String(key);
          if (v) onChange(v);
          else onReset();
        }}
      >
        <Select.Trigger>
          <Select.Value>
            {({ defaultChildren, isPlaceholder }) =>
              isPlaceholder
                ? (field.placeholder ?? `Select ${field.label.toLowerCase()}`)
                : defaultChildren
            }
          </Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {field.options?.map((opt) => (
              <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    );
  }

  if (field.type === "multiSelect") {
    const selected = (value as string[] | undefined) ?? [];
    return (
      <div className="flex flex-wrap gap-2">
        {field.options?.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <Checkbox
              key={opt.value}
              isSelected={checked}
              onChange={(isSelected) => {
                const next = isSelected
                  ? [...selected, opt.value]
                  : selected.filter((v) => v !== opt.value);
                if (next.length > 0) onChange(next);
                else onReset();
              }}
            >
              {opt.label}
            </Checkbox>
          );
        })}
      </div>
    );
  }

  if (field.type === "dateRange") {
    const pair = (value as [string | null, string | null] | undefined) ?? [null, null];
    return (
      <div className="grid grid-cols-2 gap-2">
        <DateInputBlock
          ariaLabel="From"
          value={pair[0]}
          onChange={(v) => {
            const next: [string | null, string | null] = [v || null, pair[1]];
            if (next[0] || next[1]) onChange(next);
            else onReset();
          }}
        />
        <DateInputBlock
          ariaLabel="To"
          value={pair[1]}
          onChange={(v) => {
            const next: [string | null, string | null] = [pair[0], v || null];
            if (next[0] || next[1]) onChange(next);
            else onReset();
          }}
        />
      </div>
    );
  }

  if (field.type === "numberRange") {
    const range = (value as { min: number | null; max: number | null } | undefined) ?? {
      min: null,
      max: null,
    };
    const update = (patch: Partial<typeof range>) => {
      const next = { ...range, ...patch };
      if (next.min === null && next.max === null) onReset();
      else onChange(next);
    };
    return (
      <div className="grid grid-cols-2 gap-2">
        <TextField value={range.min == null ? "" : String(range.min)} fullWidth>
          <Label className="sr-only">Min</Label>
          <Input
            type="number"
            placeholder="Min"
            onChange={(e) => update({ min: e.target.value !== "" ? Number(e.target.value) : null })}
          />
        </TextField>
        <TextField value={range.max == null ? "" : String(range.max)} fullWidth>
          <Label className="sr-only">Max</Label>
          <Input
            type="number"
            placeholder="Max"
            onChange={(e) => update({ max: e.target.value !== "" ? Number(e.target.value) : null })}
          />
        </TextField>
      </div>
    );
  }

  return null;
}
