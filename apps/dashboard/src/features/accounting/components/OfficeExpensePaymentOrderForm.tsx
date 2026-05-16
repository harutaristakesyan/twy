import type React from "react";
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

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface Props {
  values: OfficeExpenseFormValues;
  onChange: (values: OfficeExpenseFormValues) => void;
  order: OfficeExpensePaymentOrder;
  readOnly: boolean;
  onFilesChanged: () => void;
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
      <label className={labelClass}>
        Service Name
        <select
          value={values.serviceName}
          onChange={(e) => set("serviceName", e.target.value as OfficeExpenseService)}
          disabled={readOnly}
          className={fieldClass}
        >
          {OFFICE_EXPENSE_SERVICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Payment Purpose
        <textarea
          rows={3}
          className={fieldClass}
          value={values.paymentPurpose}
          onChange={(e) => set("paymentPurpose", e.target.value)}
          disabled={readOnly}
        />
      </label>

      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className={`${labelClass} mb-0`}>Date</span>
          {!readOnly && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={values.isRange}
                onChange={(e) => set("isRange", e.target.checked)}
              />
              Date range
            </label>
          )}
        </div>
        {values.isRange ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className={fieldClass}
              value={values.dateStart}
              onChange={(e) => set("dateStart", e.target.value)}
              disabled={readOnly}
            />
            <input
              type="date"
              className={fieldClass}
              value={values.dateEnd}
              onChange={(e) => set("dateEnd", e.target.value)}
              disabled={readOnly}
            />
          </div>
        ) : (
          <input
            type="date"
            className={fieldClass}
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
            disabled={readOnly}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelClass}>
          Currency
          <select
            value={values.currency}
            onChange={(e) => set("currency", e.target.value as Currency)}
            disabled={readOnly}
            className={fieldClass}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Amount ({currencySymbol})
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={fieldClass}
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            disabled={readOnly}
            placeholder="0.00"
          />
        </label>
      </div>

      <label className={labelClass}>
        Payment Status
        <select
          value={values.paymentStatus}
          onChange={(e) => set("paymentStatus", e.target.value as OfficeExpensePaymentStatus)}
          disabled={readOnly}
          className={fieldClass}
        >
          {OFFICE_EXPENSE_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className={labelClass}>Documents</span>
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
