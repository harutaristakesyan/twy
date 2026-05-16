import { Calendar, DateField, DatePicker, Label } from "@heroui/react";
import type { CalendarDate } from "@internationalized/date";

interface Props {
  value: CalendarDate | null;
  onChange: (value: CalendarDate) => void;
  label: string;
}

/**
 * HeroUI date picker wrapped in the compound markup we use everywhere.
 * Single source of truth so each form doesn't re-inline 35 lines of
 * Calendar / DatePicker / DateField markup.
 */
export function DateFieldBlock({ value, onChange, label }: Props) {
  return (
    <DatePicker value={value} onChange={(v) => v && onChange(v)} className="w-full">
      <Label>{label}</Label>
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={label}>
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
    </DatePicker>
  );
}
