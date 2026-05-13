import { useRequest } from "ahooks";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
} from "antd";
import type dayjs from "dayjs";
import { useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { officeExpenseApi } from "../api/officeExpensePaymentOrderApi";
import {
  type CreateOfficeExpenseDto,
  CURRENCY_OPTIONS,
  type Currency,
  OFFICE_EXPENSE_SERVICE_OPTIONS,
  type OfficeExpenseService,
} from "../types/officeExpensePaymentOrder";

const { TextArea } = Input;

interface FormValues {
  serviceName: OfficeExpenseService;
  paymentPurpose: string;
  date: dayjs.Dayjs | null;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  currency: Currency;
  amount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOfficeExpenseModal({ open, onClose, onSuccess }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [isRange, setIsRange] = useState(false);

  const { loading, run: submit } = useRequest(
    async (values: FormValues) => {
      let periodStart: string;
      let periodEnd: string;

      if (isRange) {
        periodStart = values.dateRange[0].format("YYYY-MM-DD");
        periodEnd = values.dateRange[1].format("YYYY-MM-DD");
      } else {
        periodStart = values.date.format("YYYY-MM-DD");
        periodEnd = periodStart;
      }

      const dto: CreateOfficeExpenseDto = {
        serviceName: values.serviceName,
        paymentPurpose: values.paymentPurpose,
        periodStart,
        periodEnd,
        amount: values.amount,
        currency: values.currency,
      };

      await officeExpenseApi.create(dto);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Office expense payment order created");
        form.resetFields();
        setIsRange(false);
        onSuccess();
        onClose();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const handleCancel = () => {
    form.resetFields();
    setIsRange(false);
    onClose();
  };

  return (
    <Modal
      title="Create Office Expense Payment Order"
      open={open}
      onCancel={handleCancel}
      width={560}
      footer={
        <Space>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            Create
          </Button>
        </Space>
      }
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ currency: "USD" }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="serviceName"
          label="Service Name"
          rules={[{ required: true, message: "Service name is required" }]}
        >
          <Select options={OFFICE_EXPENSE_SERVICE_OPTIONS} placeholder="Select service" />
        </Form.Item>

        <Form.Item
          name="paymentPurpose"
          label="Payment Purpose"
          rules={[{ required: true, message: "Payment purpose is required" }]}
        >
          <TextArea rows={3} placeholder="What is this expense for?" />
        </Form.Item>

        <Form.Item label="Date">
          <Space align="center" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>Single date</span>
            <Switch
              size="small"
              checked={isRange}
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
              <DatePicker.RangePicker style={{ width: "100%" }} />
            </Form.Item>
          ) : (
            <Form.Item
              name="date"
              noStyle
              rules={[{ required: true, message: "Date is required" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          )}
        </Form.Item>

        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
          <Select options={CURRENCY_OPTIONS} style={{ width: 100 }} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[
            { required: true, message: "Amount is required" },
            { type: "number", min: 0.01, message: "Amount must be greater than 0" },
          ]}
        >
          <InputNumber style={{ width: "100%" }} min={0.01} precision={2} placeholder="0.00" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
