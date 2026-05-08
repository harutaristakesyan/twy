import { UploadOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import type { UploadFile } from "antd";
import { App, Button, Form, InputNumber, Modal, Select, Space, Upload } from "antd";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { fileApi } from "@/libs/fileApi.ts";
import { getErrorMessage } from "@/utils/errorUtils.ts";
import { invoiceApi } from "../api/invoiceApi.ts";
import type { InvoiceType } from "../types/index.ts";

interface InvoiceUploadModalProps {
  open: boolean;
  loadId: string | null;
  defaultType?: InvoiceType;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  type: InvoiceType;
  amount: number;
  paymentTermDays: number;
}

const TYPE_OPTIONS = [
  { value: "carrier" as const, label: "Carrier Invoice" },
  { value: "broker" as const, label: "Broker Invoice" },
];

const DEFAULT_TERM_DAYS: Record<InvoiceType, number> = { carrier: 7, broker: 40 };

const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({
  open,
  loadId,
  defaultType,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (open && defaultType !== undefined) {
      form.setFieldsValue({ type: defaultType, paymentTermDays: DEFAULT_TERM_DAYS[defaultType] });
    }
  }, [open, defaultType, form]);

  const handleTypeChange = useCallback(
    (type: InvoiceType) => {
      form.setFieldValue("paymentTermDays", DEFAULT_TERM_DAYS[type]);
    },
    [form],
  );

  const handleClose = useCallback(() => {
    form.resetFields();
    setFileList([]);
    onClose();
  }, [form, onClose]);

  const { run: runCreate, loading } = useRequest(
    async (values: FormValues) => {
      if (loadId === null) throw new Error("No load selected");

      let fileId: string | undefined;
      const file = fileList[0]?.originFileObj;
      if (file !== undefined) {
        fileId = await fileApi.uploadFile(file);
      }

      return invoiceApi.createInvoice({
        loadId,
        type: values.type,
        amount: values.amount,
        paymentTermDays: values.paymentTermDays,
        fileId,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Invoice created");
        form.resetFields();
        setFileList([]);
        onSuccess();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const handleFinish = useCallback(
    (values: FormValues) => {
      runCreate(values);
    },
    [runCreate],
  );

  return (
    <Modal
      title="Upload Invoice"
      open={open}
      onCancel={handleClose}
      width={480}
      destroyOnHidden
      footer={
        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" onClick={() => form.submit()} loading={loading}>
            Create Invoice
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ type: "carrier", paymentTermDays: DEFAULT_TERM_DAYS.carrier }}
      >
        <Form.Item
          name="type"
          label="Invoice Type"
          rules={[{ required: true, message: "Select invoice type" }]}
        >
          <Select options={TYPE_OPTIONS} onChange={handleTypeChange} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount (EUR)"
          rules={[
            { required: true, message: "Enter amount" },
            { type: "number", min: 0.01, message: "Must be greater than 0" },
          ]}
        >
          <InputNumber style={{ width: "100%" }} min={0.01} precision={2} prefix="€" />
        </Form.Item>

        <Form.Item
          name="paymentTermDays"
          label="Payment Term (days)"
          rules={[
            { required: true, message: "Enter payment term" },
            { type: "number", min: 1, message: "Must be at least 1 day" },
          ]}
        >
          <InputNumber style={{ width: "100%" }} min={1} precision={0} />
        </Form.Item>

        <Form.Item label="Invoice File (optional)">
          <Upload
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: next }) => setFileList(next)}
            maxCount={1}
            accept=".pdf,.jpg,.jpeg,.png"
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InvoiceUploadModal;
