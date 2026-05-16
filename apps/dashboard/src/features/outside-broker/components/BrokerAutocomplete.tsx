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
import { getOutsideBrokers } from "../api/brokerApi";

interface BrokerAutocompleteProps {
  value?: string | null;
  onChange?: (id: string | null, name: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  initialOption?: { value: string; label: string };
  variant?: "primary" | "secondary";
  isInvalid?: boolean;
}

const BrokerAutocomplete: React.FC<BrokerAutocompleteProps> = ({
  value,
  onChange,
  label = "Broker",
  placeholder = "Select broker",
  disabled,
  initialOption,
  variant,
  isInvalid,
}) => {
  const [inputValue, setInputValue] = useState("");
  const debounced = useDebouncedValue(inputValue, 250);

  const { data } = useApiQuery(["brokers-select", debounced], () =>
    getOutsideBrokers({ query: debounced || undefined, limit: 50, page: 0 }),
  );

  const fetched = data?.brokers ?? [];
  const items =
    initialOption && !fetched.find((b) => b.id === initialOption.value)
      ? [{ id: initialOption.value, brokerName: initialOption.label, mcNumber: "" }, ...fetched]
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
        const item = items.find((b) => b.id === id);
        onChange?.(id, item?.brokerName ?? null);
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
              <SearchField.Input placeholder="Search broker…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No brokers found</EmptyState>}>
            {items.map((broker) => (
              <ListBox.Item key={broker.id} id={broker.id} textValue={broker.brokerName}>
                <div className="flex flex-col">
                  <Label>{broker.brokerName}</Label>
                  {broker.mcNumber && <Description>{broker.mcNumber}</Description>}
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

export default BrokerAutocomplete;
