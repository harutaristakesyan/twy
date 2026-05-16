import { ComboBox, Input, type Key, Label, ListBox } from "@heroui/react";
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
  placeholder = "Search broker…",
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
        const item = items.find((b) => b.id === id);
        onChange?.(id, item?.brokerName ?? null);
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
          {items.map((broker) => (
            <ListBox.Item key={broker.id} id={broker.id} textValue={broker.brokerName}>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{broker.brokerName}</span>
                {broker.mcNumber && (
                  <span className="text-xs text-default-500">{broker.mcNumber}</span>
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

export default BrokerAutocomplete;
