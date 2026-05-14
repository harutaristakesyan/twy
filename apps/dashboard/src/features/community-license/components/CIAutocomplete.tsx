import { useDebounceFn, useRequest } from "ahooks";
import type { AutoCompleteProps } from "antd";
import { AutoComplete, Spin } from "antd";
import { useState } from "react";
import { LabeledOption } from "@/components/LabeledOption";
import { getCommunityLicenses } from "../api/ciApi";

type CIAutocompleteProps = Pick<
  AutoCompleteProps,
  "value" | "onChange" | "placeholder" | "size" | "disabled" | "id"
>;

const CIAutocomplete: React.FC<CIAutocompleteProps> = (props) => {
  const [query, setQuery] = useState("");

  const { run: onSearch } = useDebounceFn(setQuery, { wait: 300 });

  const { data: result, loading } = useRequest(
    async () => getCommunityLicenses({ query: query || undefined, limit: 10, page: 0 }),
    { refreshDeps: [query] },
  );

  const options = (result?.communityLicenses ?? []).map((ci) => ({
    value: ci.id,
    label: (
      <LabeledOption
        label={ci.ciNumber}
        description={`${ci.validFrom} – ${ci.validTo ?? "open-ended"}`}
      />
    ),
  }));

  return (
    <AutoComplete
      {...props}
      options={options}
      showSearch={{ onSearch, filterOption: false }}
      notFoundContent={loading ? <Spin size="small" /> : undefined}
    />
  );
};

export default CIAutocomplete;
