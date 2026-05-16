import { Button } from "@heroui/react";
import { Fragment, useCallback } from "react";
import { FilterControl } from "./FilterControl.js";
import type { FilterValues } from "./filterTransform.js";
import type { FilterField } from "./types.js";
import { fieldHasValue } from "./types.js";

interface FieldRowProps {
  field: FilterField;
  value: unknown;
  setValue: (key: string, val: unknown) => void;
  resetValue: (key: string) => void;
}

function FieldRow({ field, value, setValue, resetValue }: FieldRowProps) {
  const onChange = useCallback((val: unknown) => setValue(field.key, val), [field.key, setValue]);
  const onReset = useCallback(() => resetValue(field.key), [field.key, resetValue]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-default-700">{field.label}</span>
        {fieldHasValue(value, field.type) && (
          <Button size="sm" variant="tertiary" onPress={onReset}>
            Reset
          </Button>
        )}
      </div>
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
          <hr className="border-default-100" />
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
