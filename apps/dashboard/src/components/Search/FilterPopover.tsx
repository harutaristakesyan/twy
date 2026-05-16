import { Funnel } from "@gravity-ui/icons";
import { Button, Chip, Popover, Separator } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";
import { FilterSection } from "./FilterSection.js";
import type { FilterValues } from "./filterTransform.js";
import { splitToFilterValues, valuesToFilter } from "./filterTransform.js";
import type { Filter, FilterField } from "./types.js";

interface Props {
  fields: FilterField[];
  filter: Filter | undefined;
  onChange: (filter: Filter | undefined) => void;
}

export function FilterPopover({ fields, filter, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const isActive = !!filter && Object.keys(filter).length > 0;

  const [filterValues, setFilterValues] = useState<FilterValues>({});

  useEffect(() => {
    if (!open) return;
    setFilterValues(splitToFilterValues(filter, fields));
  }, [open, filter, fields]);

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
    setFilterValues({});
  }, []);

  const handleApply = useCallback(() => {
    onChange(valuesToFilter(filterValues, fields));
    setOpen(false);
  }, [filterValues, fields, onChange]);

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button variant={isActive ? "secondary" : "tertiary"} size="md">
        <Funnel className="h-4 w-4" />
        Filter
        {isActive && (
          <Chip color="accent" size="sm" variant="soft">
            Active
          </Chip>
        )}
      </Button>
      <Popover.Content>
        <Popover.Dialog className="w-96 max-h-[70vh] overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            <FilterSection
              fields={fields}
              filterValues={filterValues}
              setValue={setValue}
              resetValue={resetValue}
            />

            <Separator />

            <div className="flex items-center justify-between">
              <Button size="sm" variant="danger-soft" onPress={handleResetAll}>
                Reset all
              </Button>
              <Button size="sm" variant="primary" onPress={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
