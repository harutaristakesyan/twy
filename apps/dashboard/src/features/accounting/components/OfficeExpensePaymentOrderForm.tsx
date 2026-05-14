import {
  Col,
  DatePicker,
  Form,
  type FormInstance,
  type FormProps,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from "react";
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

const { TextArea } = Input;

const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", EUR: "€" };

export interface OfficeExpenseFormValues {
  serviceName: OfficeExpenseService;
  paymentPurpose: string;
  date: Dayjs | null;
  dateRange: [Dayjs, Dayjs] | null;
  currency: Currency;
  amount: number;
  paymentStatus: OfficeExpensePaymentStatus;
}

interface Props {
  form: FormInstance<OfficeExpenseFormValues>;
  order: OfficeExpensePaymentOrder;
  readOnly: boolean;
  onFinish: (values: OfficeExpenseFormValues) => void;
  onFilesChanged: () => void;
  onUploadingChange: (uploading: boolean) => void;
  onValuesChange?: FormProps<OfficeExpenseFormValues>["onValuesChange"];
}

const buildInitialValues = (order: OfficeExpensePaymentOrder): OfficeExpenseFormValues => {
  const sameDay = order.periodStart === order.periodEnd;
  return {
    serviceName: order.serviceName,
    paymentPurpose: order.paymentPurpose,
    date: sameDay ? dayjs(order.periodStart) : null,
    dateRange: sameDay ? null : [dayjs(order.periodStart), dayjs(order.periodEnd)],
    currency: order.currency,
    amount: order.amount,
    paymentStatus: order.paymentStatus,
  };
};

export default function OfficeExpensePaymentOrderForm({
  form,
  order,
  readOnly,
  onFinish,
  onFilesChanged,
  onUploadingChange,
  onValuesChange,
}: Props) {
  const [isRange, setIsRange] = useState(() => order.periodStart !== order.periodEnd);

  const watchedCurrency = Form.useWatch("currency", form);
  const amountPrefix = CURRENCY_SYMBOL[(watchedCurrency ?? order.currency) as Currency];

  return (
    <Form
      form={form}
      layout="vertical"
      disabled={readOnly}
      initialValues={buildInitialValues(order)}
      onFinish={(values: OfficeExpenseFormValues) => {
        if (readOnly) return;
        onFinish(values);
      }}
      onValuesChange={onValuesChange}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        name="serviceName"
        label="Service name"
        rules={[{ required: true, message: "Service name is required" }]}
      >
        <Select
          options={OFFICE_EXPENSE_SERVICE_OPTIONS}
          placeholder="Select service"
          disabled={readOnly}
        />
      </Form.Item>

      <Form.Item
        name="paymentPurpose"
        label="Payment purpose"
        rules={[{ required: true, message: "Payment purpose is required" }]}
      >
        <TextArea rows={3} disabled={readOnly} />
      </Form.Item>

      <Form.Item label="Date">
        <Space align="center" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>Single date</span>
          <Switch
            size="small"
            checked={isRange}
            disabled={readOnly}
            onChange={(checked) => {
              setIsRange(checked);
              form.setFieldsValue({ date: null, dateRange: null });
            }}
          />
          <span style={{ fontSize: 13 }}>Date range</span>
        </Space>
        {isRange ? (
          <Form.Item
            name="dateRange"
            noStyle
            rules={[{ required: true, message: "Date range is required" }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} disabled={readOnly} />
          </Form.Item>
        ) : (
          <Form.Item name="date" noStyle rules={[{ required: true, message: "Date is required" }]}>
            <DatePicker style={{ width: "100%" }} disabled={readOnly} />
          </Form.Item>
        )}
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
            <Select options={CURRENCY_OPTIONS} style={{ width: "100%" }} disabled={readOnly} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: "Amount is required" },
              { type: "number", min: 0.01, message: "Amount must be greater than 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              precision={2}
              prefix={amountPrefix}
              disabled={readOnly}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="paymentStatus"
        label="Payment status"
        rules={[{ required: true, message: "Status is required" }]}
      >
        <Select options={OFFICE_EXPENSE_STATUS_OPTIONS} disabled={readOnly} />
      </Form.Item>

      <Form.Item label="Documents">
        <AttachedFilesField
          files={order.files.map((f) => ({ fileId: f.fileId, fileName: f.fileName }))}
          onAdd={(file) => officeExpenseApi.addFile(order.id, file)}
          onRemove={(fileId) => officeExpenseApi.removeFile(order.id, fileId)}
          onChanged={onFilesChanged}
          onUploadingChange={onUploadingChange}
          readOnly={readOnly}
          buttonLabel="Upload file"
        />
      </Form.Item>
    </Form>
  );
}
