import { useDebounceFn, useRequest } from "ahooks";
import type { AutoCompleteProps } from "antd";
import { AutoComplete, Spin } from "antd";
import { useState } from "react";
import { LabeledOption } from "@/components/LabeledOption";
import { getOutsideBrokers } from "../api/brokerApi";

type BrokerAutocompleteProps = Pick<
  AutoCompleteProps,
  "value" | "onChange" | "placeholder" | "size" | "disabled" | "id"
>;

const BrokerAutocomplete: React.FC<BrokerAutocompleteProps> = (props) => {
  const [query, setQuery] = useState("");

  const { run: onSearch } = useDebounceFn(setQuery, { wait: 300 });

  const { data: brokers = [], loading } = useRequest(
    async () => {
      const { brokers: list } = await getOutsideBrokers({
        query: query || undefined,
        limit: 10,
        page: 0,
      });
      return list;
    },
    { refreshDeps: [query] },
  );

  const options = brokers.map((b) => ({
    value: b.brokerName,
    label: b.brokerName,
    description: b.mcNumber,
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

export default BrokerAutocomplete;
