import {
  Autocomplete,
  Description,
  EmptyState,
  type Key,
  Label,
  ListBox,
  SearchField,
} from "@heroui/react";
import type React from "react";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useApiQuery } from "@/libs/query";
import { getCarriers } from "../api/carrierApi";

interface CarrierAutocompleteProps {
  value?: string | null;
  onChange?: (id: string | null, name: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  initialOption?: { value: string; label: string };
  variant?: "primary" | "secondary";
  isInvalid?: boolean;
}

const CarrierAutocomplete: React.FC<CarrierAutocompleteProps> = ({
  value,
  onChange,
  label = "Carrier",
  placeholder = "Select carrier",
  disabled,
  initialOption,
  variant,
  isInvalid,
}) => {
  const [inputValue, setInputValue] = useState("");
  const debounced = useDebouncedValue(inputValue, 250);

  const { data } = useApiQuery(["carriers-select", debounced], async () => {
    const [twy, outside] = await Promise.all([
      getCarriers({ kind: "twy", query: debounced || undefined, limit: 25, page: 0 }),
      getCarriers({ kind: "outside", query: debounced || undefined, limit: 25, page: 0 }),
    ]);
    return [...twy.carriers, ...outside.carriers];
  });

  const fetched = data ?? [];
  const items =
    initialOption && !fetched.find((c) => c.id === initialOption.value)
      ? [{ id: initialOption.value, carrierName: initialOption.label, mcDotNumber: "" }, ...fetched]
      : fetched;

  return (
    <Autocomplete
      selectionMode="single"
      isDisabled={disabled}
      isInvalid={isInvalid}
      variant={variant}
      placeholder={placeholder}
      value={value ?? null}
      onChange={(key: Key | Key[] | null) => {
        if (key === null || Array.isArray(key)) {
          onChange?.(null, null);
          return;
        }
        const id = String(key);
        const item = items.find((c) => c.id === id);
        onChange?.(id, item?.carrierName ?? null);
      }}
    >
      <Label>{label}</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter
          filter={() => true}
          inputValue={inputValue}
          onInputChange={setInputValue}
        >
          <SearchField autoFocus variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search carrier…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No carriers found</EmptyState>}>
            {items.map((carrier) => (
              <ListBox.Item key={carrier.id} id={carrier.id} textValue={carrier.carrierName}>
                <div className="flex flex-col">
                  <Label>{carrier.carrierName}</Label>
                  {carrier.mcDotNumber && <Description>{carrier.mcDotNumber}</Description>}
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
};

export default CarrierAutocomplete;
