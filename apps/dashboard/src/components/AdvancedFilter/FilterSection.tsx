import { Button, Divider, Flex, Typography, theme } from "antd";
import { Fragment, useCallback } from "react";
import { FilterControl } from "./FilterControl.js";
import type { FilterValues } from "./filterTransform.js";
import type { FilterField } from "./types.js";
import { fieldHasValue } from "./types.js";

const { Text } = Typography;

interface FieldRowProps {
  field: FilterField;
  value: unknown;
  setValue: (key: string, val: unknown) => void;
  resetValue: (key: string) => void;
}

function FieldRow({ field, value, setValue, resetValue }: FieldRowProps) {
  const { token } = theme.useToken();
  const onChange = useCallback((val: unknown) => setValue(field.key, val), [field.key, setValue]);
  const onReset = useCallback(() => resetValue(field.key), [field.key, resetValue]);

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: token.marginXS }}>
        <Text strong style={{ fontSize: 13 }}>
          {field.label}
        </Text>
        {fieldHasValue(value, field.type) && (
          <Button type="link" size="small" style={{ padding: 0, height: "auto" }} onClick={onReset}>
            Reset
          </Button>
        )}
      </Flex>
      <FilterControl field={field} value={value} onChange={onChange} onReset={onReset} />
    </div>
  );
}

interface Props {
  fields: FilterField[];
  filterValues: FilterValues;
  setValue: (key: string, val: unknown) => void;
  resetValue: (key: string) => void;
}

export function FilterSection({ fields, filterValues, setValue, resetValue }: Props) {
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map((field) => (
        <Fragment key={field.key}>
          <Divider style={{ margin: 0 }} />
          <FieldRow
            field={field}
            value={filterValues[field.key]}
            setValue={setValue}
            resetValue={resetValue}
          />
        </Fragment>
      ))}
    </>
  );
}
