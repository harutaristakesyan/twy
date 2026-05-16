import { ComboBox, Input, type Key, Label, ListBox } from "@heroui/react";
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
  placeholder = "Search carrier…",
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
    <ComboBox
      allowsEmptyCollection
      isDisabled={disabled}
      isInvalid={isInvalid}
      value={value ?? null}
      onChange={(key: Key | null) => {
        if (!key) {
          onChange?.(null, null);
          return;
        }
        const id = String(key);
        const item = items.find((c) => c.id === id);
        onChange?.(id, item?.carrierName ?? null);
      }}
      inputValue={inputValue}
      onInputChange={setInputValue}
    >
      <Label>{label}</Label>
      <ComboBox.InputGroup>
        <Input variant={variant} placeholder={placeholder} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox>
          {items.map((carrier) => (
            <ListBox.Item key={carrier.id} id={carrier.id} textValue={carrier.carrierName}>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{carrier.carrierName}</span>
                {carrier.mcDotNumber && (
                  <span className="text-xs text-default-500">{carrier.mcDotNumber}</span>
                )}
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
};

export default CarrierAutocomplete;
