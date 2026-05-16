import { Checkbox, Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";
import type React from "react";
import { DateInputBlock } from "@/components/form/DateFieldBlock";
import { AttachedFilesField } from "@/features/files";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  CURRENCY_OPTIONS,
  type Currency,
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  OFFICE_EXPENSE_STATUS_OPTIONS,
  type OfficeExpensePaymentOrder,
  type OfficeExpensePaymentStatus,
  type OfficeExpenseService,
} from "../types/officeExpensePaymentOrder";

export interface OfficeExpenseFormValues {
  serviceName: OfficeExpenseService | "";
  paymentPurpose: string;
  isRange: boolean;
  date: string;
  dateStart: string;
  dateEnd: string;
  currency: Currency;
  amount: string;
  paymentStatus: OfficeExpensePaymentStatus;
}

export function buildInitialValues(order: OfficeExpensePaymentOrder): OfficeExpenseFormValues {
  const sameDay = order.periodStart === order.periodEnd;
  return {
    serviceName: order.serviceName,
    paymentPurpose: order.paymentPurpose,
    isRange: !sameDay,
    date: sameDay ? order.periodStart : "",
    dateStart: sameDay ? "" : order.periodStart,
    dateEnd: sameDay ? "" : order.periodEnd,
    currency: order.currency,
    amount: String(order.amount),
    paymentStatus: order.paymentStatus,
  };
}

export interface UpdateOfficeExpensePeriod {
  periodStart: string;
  periodEnd: string;
}

export function formValuesToPeriod(
  values: OfficeExpenseFormValues,
): UpdateOfficeExpensePeriod | null {
  if (values.isRange) {
    if (!values.dateStart || !values.dateEnd) return null;
    return { periodStart: values.dateStart, periodEnd: values.dateEnd };
  }
  if (!values.date) return null;
  return { periodStart: values.date, periodEnd: values.date };
}

interface Props {
  values: OfficeExpenseFormValues;
  onChange: (values: OfficeExpenseFormValues) => void;
  order: OfficeExpensePaymentOrder;
  readOnly: boolean;
  onFilesChanged: () => void | Promise<void>;
  onUploadingChange: (uploading: boolean) => void;
}

const OfficeExpensePaymentOrderForm: React.FC<Props> = ({
  values,
  onChange,
  order,
  readOnly,
  onFilesChanged,
  onUploadingChange,
}) => {
  const set = <K extends keyof OfficeExpenseFormValues>(key: K, val: OfficeExpenseFormValues[K]) =>
    onChange({ ...values, [key]: val });

  const currencySymbol = values.currency === "EUR" ? "€" : "$";

  return (
    <div className="mt-2 flex flex-col gap-4">
      <Select
        value={values.serviceName}
        onChange={(key) => set("serviceName", key as OfficeExpenseService)}
        isDisabled={readOnly}
        fullWidth
      >
        <Label>Service Name</Label>
        <Select.Trigger />
        <Select.Popover>
          <ListBox>
            {OFFICE_EXPENSE_SERVICE_OPTIONS.map((opt) => (
              <ListBox.Item key={opt.value} id={opt.value}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <TextField isDisabled={readOnly} fullWidth>
        <Label>Payment Purpose</Label>
        <TextArea
          rows={3}
          value={values.paymentPurpose}
          onChange={(e) => set("paymentPurpose", e.target.value)}
        />
      </TextField>

      <div>
        <div className="mb-2 flex items-center gap-3">
          <Label>Date</Label>
          {!readOnly && (
            <Checkbox isSelected={values.isRange} onChange={(checked) => set("isRange", checked)}>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>Date range</Label>
              </Checkbox.Content>
            </Checkbox>
          )}
        </div>
        {values.isRange ? (
          <div className="grid grid-cols-2 gap-2">
            <DateInputBlock
              ariaLabel="Date start"
              value={values.dateStart}
              onChange={(v) => set("dateStart", v)}
              isDisabled={readOnly}
            />
            <DateInputBlock
              ariaLabel="Date end"
              value={values.dateEnd}
              onChange={(v) => set("dateEnd", v)}
              isDisabled={readOnly}
            />
          </div>
        ) : (
          <DateInputBlock
            ariaLabel="Date"
            value={values.date}
            onChange={(v) => set("date", v)}
            isDisabled={readOnly}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          value={values.currency}
          onChange={(key) => set("currency", key as Currency)}
          isDisabled={readOnly}
          fullWidth
        >
          <Label>Currency</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              {CURRENCY_OPTIONS.map((opt) => (
                <ListBox.Item key={opt.value} id={opt.value}>
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <TextField isDisabled={readOnly} fullWidth>
          <Label>Amount ({currencySymbol})</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
          />
        </TextField>
      </div>

      <Select
        value={values.paymentStatus}
        onChange={(key) => set("paymentStatus", key as OfficeExpensePaymentStatus)}
        isDisabled={readOnly}
        fullWidth
      >
        <Label>Payment Status</Label>
        <Select.Trigger />
        <Select.Popover>
          <ListBox>
            {OFFICE_EXPENSE_STATUS_OPTIONS.map((opt) => (
              <ListBox.Item key={opt.value} id={opt.value}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <div>
        <Label>Documents</Label>
        <AttachedFilesField
          files={order.files.map((f) => ({ fileId: f.fileId, fileName: f.fileName }))}
          onAdd={(file) => officeExpenseApi.addFile(order.id, file)}
          onRemove={(fileId) => officeExpenseApi.removeFile(order.id, fileId)}
          onChanged={onFilesChanged}
          onUploadingChange={onUploadingChange}
          readOnly={readOnly}
          buttonLabel="Upload file"
        />
      </div>
    </div>
  );
};

export default OfficeExpensePaymentOrderForm;
