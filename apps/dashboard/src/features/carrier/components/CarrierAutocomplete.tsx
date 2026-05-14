import { useDebounceFn, useRequest } from "ahooks";
import type { AutoCompleteProps } from "antd";
import { AutoComplete, Spin } from "antd";
import { useState } from "react";
import { LabeledOption } from "@/components/LabeledOption";
import { getCarriers } from "../api/carrierApi";

type CarrierAutocompleteProps = Pick<
  AutoCompleteProps,
  "value" | "onChange" | "placeholder" | "size" | "disabled" | "id"
>;

const CarrierAutocomplete: React.FC<CarrierAutocompleteProps> = (props) => {
  const [query, setQuery] = useState("");

  const { run: onSearch } = useDebounceFn(setQuery, { wait: 300 });

  const { data: carriers = [], loading } = useRequest(
    async () => {
      const [{ carriers: twy }, { carriers: outside }] = await Promise.all([
        getCarriers({ kind: "twy", query: query || undefined, limit: 5, page: 0 }),
        getCarriers({ kind: "outside", query: query || undefined, limit: 5, page: 0 }),
      ]);
      return [...twy, ...outside];
    },
    { refreshDeps: [query] },
  );

  const options = carriers.map((c) => ({
    value: c.carrierName,
    label: c.carrierName,
    description: c.mcDotNumber,
  }));

  return (
    <AutoComplete
      {...props}
      options={options}
      showSearch={{ onSearch, filterOption: () => true }}
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

export default CarrierAutocomplete;
