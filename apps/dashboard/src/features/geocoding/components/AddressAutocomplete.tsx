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
import { useAddressSearch } from "../hooks/useAddressSearch.ts";
import type { AddressSuggestion } from "../types/geocoding.ts";

interface AddressAutocompleteProps {
  value: AddressSuggestion | null;
  onChange: (suggestion: AddressSuggestion | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  isInvalid?: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  label = "Address",
  placeholder = "Search address…",
  disabled,
  variant,
  isInvalid,
}) => {
  const [inputValue, setInputValue] = useState("");
  const debounced = useDebouncedValue(inputValue, 250);
  const { data, isFetching } = useAddressSearch(debounced, 5);

  const fetched: AddressSuggestion[] = data ?? [];
  const items: AddressSuggestion[] =
    value && !fetched.find((s) => s.placeId === value.placeId) ? [value, ...fetched] : fetched;

  return (
    <Autocomplete
      allowsEmptyCollection
      selectionMode="single"
      isDisabled={disabled}
      isInvalid={isInvalid}
      variant={variant}
      placeholder={placeholder}
      value={value?.placeId ?? null}
      onChange={(key: Key | Key[] | null) => {
        if (key === null || Array.isArray(key)) {
          onChange(null);
          return;
        }
        const id = String(key);
        const item = items.find((s) => s.placeId === id);
        onChange(item ?? null);
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
              <SearchField.Input placeholder="Start typing an address…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => (
              <EmptyState>
                {debounced.trim().length < 3
                  ? "Type at least 3 characters"
                  : isFetching
                    ? "Searching…"
                    : "No addresses found"}
              </EmptyState>
            )}
          >
            {items.map((suggestion) => (
              <ListBox.Item
                key={suggestion.placeId}
                id={suggestion.placeId}
                textValue={suggestion.displayName}
              >
                <div className="flex flex-col">
                  <Label>{suggestion.address || suggestion.displayName}</Label>
                  {(suggestion.cityZipCode || suggestion.country) && (
                    <Description>
                      {[suggestion.cityZipCode, suggestion.country].filter(Boolean).join(", ")}
                    </Description>
                  )}
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

export default AddressAutocomplete;
