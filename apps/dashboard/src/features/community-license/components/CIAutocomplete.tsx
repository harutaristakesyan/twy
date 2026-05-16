import { ComboBox, Input, type Key, Label, ListBox } from "@heroui/react";
import type React from "react";
import { useMemo, useState } from "react";
import type { BranchCI } from "@/features/branch/types/branch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useApiQuery } from "@/libs/query";
import { getCommunityLicenses } from "../api/ciApi";

type CIAutocompleteProps = {
  value?: string | null;
  onChange?: (uuid: string | null, ciNumber: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  existingCI?: BranchCI | null;
  variant?: "primary" | "secondary";
  isInvalid?: boolean;
};

const CIAutocomplete: React.FC<CIAutocompleteProps> = ({
  value,
  onChange,
  label = "Community License",
  placeholder = "Search by CI number",
  disabled,
  existingCI,
  variant,
  isInvalid,
}) => {
  const [inputValue, setInputValue] = useState("");
  const debounced = useDebouncedValue(inputValue, 250);

  const { data } = useApiQuery(["ci-search", debounced], () =>
    getCommunityLicenses({ query: debounced || undefined, limit: 25, page: 0 }),
  );

  const items = useMemo(() => {
    const fetched = data?.communityLicenses ?? [];
    if (existingCI && !fetched.find((c) => c.id === existingCI.id)) {
      return [
        {
          id: existingCI.id,
          ciNumber: existingCI.ciNumber,
          validFrom: existingCI.validFrom,
          validTo: existingCI.validTo,
          createdAt: "",
        },
        ...fetched,
      ];
    }
    return fetched;
  }, [data?.communityLicenses, existingCI]);

  return (
    <ComboBox
      allowsEmptyCollection
      isDisabled={disabled}
      isInvalid={isInvalid}
      value={value ?? null}
      onChange={(key: Key | null) => {
        if (!key) {
          onChange?.(null, "");
          return;
        }
        const id = String(key);
        const item = items.find((c) => c.id === id);
        onChange?.(id, item?.ciNumber ?? "");
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
          {items.map((ci) => (
            <ListBox.Item key={ci.id} id={ci.id} textValue={ci.ciNumber}>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{ci.ciNumber}</span>
                <span className="text-xs text-default-500">
                  {ci.validFrom} – {ci.validTo ?? "open-ended"}
                </span>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
};

export default CIAutocomplete;
