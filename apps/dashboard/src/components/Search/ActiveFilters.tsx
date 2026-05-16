import { Xmark } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { useMemo } from "react";
import type { Filter, FilterField } from "./types.js";

interface Props {
  filter: Filter | undefined;
  fields?: FilterField[];
  onChange: (next: Filter | undefined) => void;
}

interface ChipItem {
  id: string;
  label: string;
  onRemove: () => void;
}

function removeKeys(filter: Filter, keys: string[]): Filter | undefined {
  const next = { ...filter };
  for (const k of keys) delete next[k];
  return Object.keys(next).length > 0 ? next : undefined;
}

export function ActiveFilters({ filter, fields = [], onChange }: Props) {
  const chips = useMemo((): ChipItem[] => {
    if (!filter) return [];
    const result: ChipItem[] = [];

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
        const valueStr = gte && lte ? `${gte}–${lte}` : gte ? `≥ ${gte}` : `≤ ${lte ?? ""}`;
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
  }, [filter, fields, onChange]);

  if (!chips.length) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="whitespace-nowrap text-xs text-default-500">Active filters:</span>
      {chips.map((chip) => (
        <Chip key={chip.id} color="accent" size="sm" variant="soft">
          <span className="inline-flex items-center gap-1">
            {chip.label}
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label="Remove filter"
              className="rounded p-0.5 hover:bg-accent-200"
            >
              <Xmark className="h-3 w-3" />
            </button>
          </span>
        </Chip>
      ))}
      <Button size="sm" variant="tertiary" onPress={() => onChange(undefined)}>
        Clear all
      </Button>
    </div>
  );
}
