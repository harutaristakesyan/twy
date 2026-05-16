import { Funnel } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FilterSection } from "./FilterSection.js";
import type { FilterValues } from "./filterTransform.js";
import { splitToFilterValues, valuesToFilter } from "./filterTransform.js";
import type { AdvancedFilter, FilterField } from "./types.js";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive =
    !!(initialFilter && Object.keys(initialFilter).length > 0) || !!initialQuery?.trim();

  const [keyword, setKeyword] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  useEffect(() => {
    if (!open) return;
    setKeyword(initialQuery ?? "");
    setFilterValues(splitToFilterValues(initialFilter, fields));
  }, [open, initialFilter, initialQuery, fields]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant={isActive ? "secondary" : "tertiary"}
        size="md"
        onPress={() => setOpen((v) => !v)}
      >
        <Funnel className="h-4 w-4" />
        Filter
        {isActive && (
          <Chip color="accent" size="sm" variant="soft">
            Active
          </Chip>
        )}
      </Button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-50 mt-1 w-96 rounded-xl border border-default-200 bg-white p-4 shadow-lg"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-default-700">
              Keyword search
              <input
                type="text"
                className="w-full rounded-lg border border-default-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Search…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>

            <FilterSection
              fields={fields}
              filterValues={filterValues}
              setValue={setValue}
              resetValue={resetValue}
            />

            <hr className="border-default-100" />

            <div className="flex items-center justify-between">
              <Button size="sm" variant="danger-soft" onPress={handleResetAll}>
                Reset all
              </Button>
              <Button size="sm" variant="primary" onPress={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
