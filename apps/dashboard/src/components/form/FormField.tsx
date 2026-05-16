import { Check, Power } from "@gravity-ui/icons";
import {
  Checkbox,
  FieldError,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import { DateInputBlock } from "./DateFieldBlock";

interface FormTextFieldProps<T extends FieldValues>
  extends Omit<ComponentProps<typeof Input>, "name"> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField isInvalid={!!fieldState.error} fullWidth>
          {label && <Label>{label}</Label>}
          <Input {...field} value={field.value ?? ""} {...inputProps} />
          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
        </TextField>
      )}
    />
  );
}

interface FormTextAreaProps<T extends FieldValues>
  extends Omit<ComponentProps<typeof TextArea>, "name"> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

export function FormTextArea<T extends FieldValues>({
  control,
  name,
  label,
  ...textareaProps
}: FormTextAreaProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField isInvalid={!!fieldState.error} fullWidth>
          {label && <Label>{label}</Label>}
          <TextArea {...field} value={field.value ?? ""} {...textareaProps} />
          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
        </TextField>
      )}
    />
  );
}

interface FormNumberFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
  variant?: "primary" | "secondary";
}

export function FormNumberField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  variant,
  ...numberProps
}: FormNumberFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <NumberField
          isInvalid={!!fieldState.error}
          value={field.value}
          onChange={field.onChange}
          variant={variant}
          {...numberProps}
        >
          {label && <Label>{label}</Label>}
          <NumberField.Group>
            <NumberField.Input placeholder={placeholder} />
          </NumberField.Group>
          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
        </NumberField>
      )}
    />
  );
}

/* -- Plain number input (for quantities, etc.) --------------------- */

interface FormNumberInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  rules?: RegisterOptions<T, Path<T>>;
  helperText?: ReactNode;
  min?: string;
  step?: string;
  placeholder?: string;
  variant?: "primary" | "secondary";
  isDisabled?: boolean;
}

export function FormNumberInput<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  helperText,
  min,
  step,
  placeholder,
  variant,
  isDisabled,
}: FormNumberInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <TextField isInvalid={!!fieldState.error} isDisabled={isDisabled} fullWidth>
          {label && <Label>{label}</Label>}
          <Input
            type="number"
            inputMode="decimal"
            variant={variant}
            value={field.value == null ? "" : String(field.value)}
            onChange={(e) => {
              const raw = e.target.value;
              field.onChange(raw === "" ? null : Number(raw));
            }}
            onBlur={field.onBlur}
            min={min}
            step={step}
            placeholder={placeholder}
          />
          {fieldState.error ? (
            <FieldError>{fieldState.error.message}</FieldError>
          ) : helperText ? (
            <p className="text-muted mt-1 text-xs">{helperText}</p>
          ) : null}
        </TextField>
      )}
    />
  );
}

/* -- Amount field (calculator-style: digits shift in/out from right) - */

interface FormAmountFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  rules?: RegisterOptions<T, Path<T>>;
  helperText?: ReactNode;
  allowNegative?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  variant?: "primary" | "secondary";
}

function formatAmount(value: number): string {
  const sign = value < 0 ? "-" : "";
  return (
    sign +
    Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function FormAmountField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  helperText,
  allowNegative = false,
  autoFocus = false,
  onFocus,
  onBlur,
  variant,
}: FormAmountFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const cents = Math.round((field.value ?? 0) * 100);
        const absCents = Math.abs(cents);
        const isNeg = cents < 0;

        const moveCursorToEnd = (input: HTMLInputElement) => {
          requestAnimationFrame(() => {
            const len = input.value.length;
            input.setSelectionRange(len, len);
          });
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          const input = e.currentTarget;

          // Allow select-all, copy, paste shortcuts
          if (e.metaKey || e.ctrlKey) return;
          if (e.key === "Tab") return;

          e.preventDefault();

          const hasSelection = (input.selectionStart ?? 0) !== (input.selectionEnd ?? 0);

          if (e.key >= "0" && e.key <= "9") {
            // If text is selected, clear first then type
            const base = hasSelection ? 0 : absCents;
            const next = base * 10 + Number(e.key);
            field.onChange((isNeg && !hasSelection ? -next : next) / 100);
          } else if (e.key === "Backspace") {
            if (hasSelection) {
              field.onChange(0);
            } else {
              const next = Math.floor(absCents / 10);
              field.onChange(next === 0 && isNeg ? 0 : (isNeg ? -next : next) / 100);
            }
          } else if (e.key === "Delete") {
            field.onChange(0);
          } else if (e.key === "-" && allowNegative) {
            field.onChange(-(field.value ?? 0));
          }

          moveCursorToEnd(input);
        };

        const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
          e.preventDefault();
          const cleaned = e.clipboardData.getData("text").replace(/[^0-9.-]/g, "");
          const parsed = Number.parseFloat(cleaned);
          if (Number.isFinite(parsed)) {
            const sign = parsed < 0 && allowNegative ? -1 : 1;
            field.onChange((sign * Math.abs(Math.round(parsed * 100))) / 100);
          }
          moveCursorToEnd(e.currentTarget);
        };

        return (
          <TextField isInvalid={!!fieldState.error} fullWidth>
            {label && <Label>{label}</Label>}
            <Input
              variant={variant}
              value={formatAmount(field.value ?? 0)}
              autoFocus={autoFocus}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onClick={(e) => moveCursorToEnd(e.currentTarget)}
              onChange={() => {}}
              onFocus={(e) => {
                e.currentTarget.select();
                onFocus?.();
              }}
              onBlur={onBlur}
              inputMode="numeric"
            />
            {fieldState.error ? (
              <FieldError>{fieldState.error.message}</FieldError>
            ) : helperText ? (
              <p className="text-muted mt-1 text-xs">{helperText}</p>
            ) : null}
          </TextField>
        );
      }}
    />
  );
}

/* -- Select field -------------------------------------------------- */

export interface SelectItem {
  id: string;
  label: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  items: SelectItem[];
  variant?: "primary" | "secondary";
  isDisabled?: boolean;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  items,
  variant,
  isDisabled,
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Select
          variant={variant}
          value={field.value}
          onChange={(key) => field.onChange(String(key))}
          isInvalid={!!fieldState.error}
          isDisabled={isDisabled}
        >
          {label && <Label>{label}</Label>}
          <Select.Trigger>
            <Select.Value>
              {({ defaultChildren, isPlaceholder }) =>
                isPlaceholder ? (placeholder ?? defaultChildren) : defaultChildren
              }
            </Select.Value>
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {items.map((item) => (
                <ListBox.Item key={item.id} id={item.id} textValue={item.label}>
                  {item.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
        </Select>
      )}
    />
  );
}

/* -- Checkbox field ------------------------------------------------ */

interface FormCheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: ReactNode;
}

export function FormCheckbox<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: FormCheckboxProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Checkbox isSelected={!!field.value} onChange={field.onChange}>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>{label}</Label>
            {description && <p className="text-xs text-default-500">{description}</p>}
          </Checkbox.Content>
        </Checkbox>
      )}
    />
  );
}

/* -- Switch field -------------------------------------------------- */

interface FormSwitchProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  /** Label shown when on / off. If a single string, used for both states. */
  label?: string | { on: string; off: string };
  /** Adds the green track + Check/Power icons (good for Active/Inactive). */
  iconVariant?: boolean;
  size?: "sm" | "md" | "lg";
}

export function FormSwitch<T extends FieldValues>({
  control,
  name,
  label,
  iconVariant,
  size = "lg",
}: FormSwitchProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Switch isSelected={!!field.value} onChange={field.onChange} size={size}>
          {({ isSelected }) => {
            const text =
              typeof label === "string"
                ? label
                : label
                  ? isSelected
                    ? label.on
                    : label.off
                  : undefined;
            return (
              <>
                <Switch.Control className={iconVariant && isSelected ? "bg-green-500/80" : ""}>
                  <Switch.Thumb>
                    {iconVariant && (
                      <Switch.Icon>
                        {isSelected ? (
                          <Check className="size-3 text-inherit opacity-100" />
                        ) : (
                          <Power className="size-3 text-inherit opacity-70" />
                        )}
                      </Switch.Icon>
                    )}
                  </Switch.Thumb>
                </Switch.Control>
                {text !== undefined && (
                  <Switch.Content>
                    <Label>{text}</Label>
                  </Switch.Content>
                )}
              </>
            );
          }}
        </Switch>
      )}
    />
  );
}

/* -- Date input (YYYY-MM-DD string) ------------------------------- */

interface FormDateInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  isDisabled?: boolean;
}

export function FormDateInput<T extends FieldValues>({
  control,
  name,
  label,
  isDisabled,
}: FormDateInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <DateInputBlock
          value={field.value}
          onChange={field.onChange}
          label={label}
          isDisabled={isDisabled}
          isInvalid={!!fieldState.error}
          errorMessage={fieldState.error?.message}
        />
      )}
    />
  );
}
