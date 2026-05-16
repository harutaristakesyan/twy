import { ComboBox, Input, type Key, Label, ListBox } from "@heroui/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useApiQuery } from "@/libs/query";
import { getTeams } from "../api/teamApi";

interface TeamSelectProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  initialOption?: { value: string; label: string };
  variant?: "primary" | "secondary";
  isInvalid?: boolean;
}

const TeamSelect: React.FC<TeamSelectProps> = ({
  value,
  onChange,
  label = "Team",
  placeholder = "Search teams…",
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

  const { data } = useApiQuery(["teams-select", debounced], () =>
    getTeams({ page: 0, limit: 30, query: debounced || undefined }),
  );

  const items = useMemo(() => {
    const fetched = data?.teams ?? [];
    if (initialOption && !fetched.find((t) => t.id === initialOption.value)) {
      return [{ id: initialOption.value, name: initialOption.label }, ...fetched];
    }
    return fetched;
  }, [data?.teams, initialOption]);

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

export default TeamSelect;
