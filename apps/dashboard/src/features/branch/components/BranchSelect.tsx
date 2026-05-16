import { ComboBox, Input, type Key, Label, ListBox } from "@heroui/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useApiQuery } from "@/libs/query";
import { getBranches } from "../api/branchApi";

interface BranchSelectProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  initialOption?: { value: string; label: string };
  variant?: "primary" | "secondary";
  isInvalid?: boolean;
}

const BranchSelect: React.FC<BranchSelectProps> = ({
  value,
  onChange,
  label = "Branch",
  placeholder = "Search branches…",
  disabled,
  initialOption,
  variant,
  isInvalid,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(inputValue), 250);
    return () => clearTimeout(t);
  }, [inputValue]);

  const { data } = useApiQuery(["branches-select", debounced], () =>
    getBranches({ limit: 50, query: debounced || undefined }),
  );

  const items = useMemo(() => {
    const fetched = data?.branches ?? [];
    if (initialOption && !fetched.find((b) => b.id === initialOption.value)) {
      return [{ id: initialOption.value, name: initialOption.label }, ...fetched];
    }
    return fetched;
  }, [data?.branches, initialOption]);

  return (
    <ComboBox
      allowsEmptyCollection
      isDisabled={disabled}
      isInvalid={isInvalid}
      value={value ?? null}
      onChange={(key: Key | null) => onChange?.(key ? String(key) : null)}
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
          {items.map((item) => (
            <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
              {item.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
};

export default BranchSelect;
