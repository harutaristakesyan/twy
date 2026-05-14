import { useDebounceFn, useRequest } from "ahooks";
import type { AutoCompleteProps } from "antd";
import { AutoComplete, Spin } from "antd";
import { useEffect, useState } from "react";
import { LabeledOption } from "@/components/LabeledOption";
import type { BranchCI } from "@/features/branch/types/branch";
import { getCommunityLicenses } from "../api/ciApi";

type CIAutocompleteProps = Pick<
  AutoCompleteProps,
  "value" | "onChange" | "placeholder" | "size" | "disabled" | "id"
> & {
  existingCI?: BranchCI | null;
};

const CIAutocomplete: React.FC<CIAutocompleteProps> = ({
  value,
  onChange,
  existingCI,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(existingCI?.ciNumber ?? "");
  const [query, setQuery] = useState("");

  // Reset display when the form clears the field
  useEffect(() => {
    if (value == null || value === "") setDisplayValue("");
  }, [value]);

  const { run: onSearch } = useDebounceFn(setQuery, { wait: 300 });

  const { data: result, loading } = useRequest(
    async () => getCommunityLicenses({ query: query || undefined, limit: 10, page: 0 }),
    { refreshDeps: [query] },
  );

  const options = (result?.communityLicenses ?? []).map((ci) => ({
    value: ci.id,
    label: ci.ciNumber,
    description: `${ci.validFrom} – ${ci.validTo ?? "open-ended"}`,
  }));

  return (
    <AutoComplete
      {...props}
      value={displayValue}
      options={options}
      onSelect={(ciId, option) => {
        setDisplayValue(String(option.label ?? ""));
        onChange?.(ciId, option as never);
      }}
      onChange={(text, option) => {
        if (!text) onChange?.(text, option as never);
      }}
      showSearch={{
        filterOption: () => true,
        onSearch: (text) => {
          setDisplayValue(text);
          onSearch(text);
        },
      }}
      notFoundContent={loading ? <Spin size="small" /> : undefined}
      optionRender={(option) => (
        <LabeledOption
          label={String(option.data.label)}
          description={String(option.data.description)}
        />
      )}
    />
  );
};

export default CIAutocomplete;
