import { Label, SearchField } from "@heroui/react";
import { FilterPopover } from "./FilterPopover.js";
import type { Filter, FilterField } from "./types.js";

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  name?: string;
  className?: string;
  fields?: FilterField[];
  filter?: Filter;
  onFilterChange?: (filter: Filter | undefined) => void;
}

export function Search({
  query,
  onQueryChange,
  placeholder = "Search...",
  name = "search",
  className,
  fields,
  filter,
  onFilterChange,
}: Props) {
  const hasFilters = !!fields && fields.length > 0 && !!onFilterChange;

  return (
    <div className="flex items-center gap-2">
      <SearchField name={name} value={query} onChange={onQueryChange}>
        <Label className="sr-only">{placeholder}</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className={className ?? "w-65"} placeholder={placeholder} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {hasFilters && <FilterPopover fields={fields} filter={filter} onChange={onFilterChange} />}
    </div>
  );
}
