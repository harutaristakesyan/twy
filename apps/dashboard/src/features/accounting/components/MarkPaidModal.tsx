import { useRequest } from "ahooks";
import { App, Button, Descriptions, Form, Input, InputNumber, Modal, Space } from "antd";
import type React from "react";
import { useCallback, useEffect } from "react";
import { getErrorMessage } from "@/utils/errorUtils.ts";
import { formatCurrency } from "@/utils/formatters.ts";
import { paymentApi } from "../api/paymentApi.ts";
import type { BillingInvoiceSummary } from "../types/index.ts";

interface MarkPaidModalProps {
  open: boolean;
  invoice: BillingInvoiceSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  amount: number;
  method: string;
  reference: string;
}

const MarkPaidModal: React.FC<MarkPaidModalProps> = ({ open, invoice, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (open && invoice !== null) {
      form.setFieldsValue({ amount: invoice.amount });
    } else {
      form.resetFields();
    }
  }, [open, invoice, form]);

  const handleClose = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  const { run: runRecord, loading } = useRequest(
    async (values: FormValues) => {
      if (invoice === null) throw new Error("No invoice selected");
      return paymentApi.recordPayment({
        invoiceId: invoice.id,
        amount: values.amount,
        method: values.method || undefined,
        reference: values.reference || undefined,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Payment recorded");
        form.resetFields();
        onSuccess();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const handleFinish = useCallback(
    (values: FormValues) => {
      runRecord(values);
    },
    [runRecord],
  );

  if (invoice === null) return null;

  return (
    <Modal
      title="Record Payment"
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" onClick={() => form.submit()} loading={loading}>
            Record Payment
          </Button>
        </Space>
      }
      width={520}
    >
      <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Type" style={{ textTransform: "capitalize" }}>
          {invoice.type}
        </Descriptions.Item>
        <Descriptions.Item label="Amount">{formatCurrency(invoice.amount)}</Descriptions.Item>
        <Descriptions.Item label="Due Date">
          {new Date(invoice.dueAt).toLocaleDateString()}
        </Descriptions.Item>
        <Descriptions.Item label="Status" style={{ textTransform: "capitalize" }}>
          {invoice.status}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="amount"
          label="Payment Amount (EUR)"
          rules={[
            { required: true, message: "Enter payment amount" },
            { type: "number", min: 0.01, message: "Must be greater than 0" },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0.01}
            max={invoice.amount}
            precision={2}
            prefix="€"
          />
        </Form.Item>

        <Form.Item name="method" label="Payment Method (optional)">
          <Input placeholder="e.g. Bank Transfer" />
        </Form.Item>

        <Form.Item name="reference" label="Reference (optional)">
          <Input placeholder="e.g. Transaction ID" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MarkPaidModal;
