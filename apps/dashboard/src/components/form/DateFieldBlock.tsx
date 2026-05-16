import { Calendar, DateField, DatePicker, FieldError, Label } from "@heroui/react";
import { type CalendarDate, parseDate } from "@internationalized/date";

/**
 * HeroUI date picker wrapped in the compound markup we use everywhere.
 * Single source of truth so each form doesn't re-inline 35 lines of
 * Calendar / DatePicker / DateField markup.
 */

function isoToYmd(value: string | null | undefined): string {
  if (!value) return "";
  const tIdx = value.indexOf("T");
  return tIdx > 0 ? value.slice(0, tIdx) : value;
}

export function parseDateValue(value: string | null | undefined): CalendarDate | null {
  const ymd = isoToYmd(value);
  if (!ymd) return null;
  try {
    return parseDate(ymd);
  } catch {
    return null;
  }
}

interface CalendarDateBlockProps {
  value: CalendarDate | null;
  onChange: (value: CalendarDate) => void;
  label: string;
}

export function DateFieldBlock({ value, onChange, label }: CalendarDateBlockProps) {
  return (
    <DatePicker value={value} onChange={(v) => v && onChange(v)} className="w-full">
      <Label>{label}</Label>
      <DatePickerBody />
    </DatePicker>
  );
}

interface DateInputBlockProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}

/**
 * Plain (non-RHF) string-based wrapper around the HeroUI DatePicker.
 * Accepts either YYYY-MM-DD or full ISO datetime; emits YYYY-MM-DD.
 */
export function DateInputBlock({
  value,
  onChange,
  label,
  ariaLabel,
  isDisabled,
  isInvalid,
  errorMessage,
}: DateInputBlockProps) {
  return (
    <DatePicker
      value={parseDateValue(value)}
      onChange={(v) => onChange(v ? v.toString() : "")}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      className="w-full"
      aria-label={!label ? ariaLabel : undefined}
    >
      {label && <Label>{label}</Label>}
      <DatePickerBody />
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </DatePicker>
  );
}

function DatePickerBody() {
  return (
    <>
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(d) => <Calendar.Cell date={d} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </>
  );
}
