import { DeleteOutlined, DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import type { GetProp, UploadProps } from "antd";
import {
  App,
  Button,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { paymentOrderApi } from "../api/paymentOrderApi";
import type { PaymentOrder, PaymentOrderInvoice, PaymentStatus } from "../types/paymentOrder";

const { Text } = Typography;
const { Dragger } = Upload;

const STATUS_OPTIONS: { label: string; value: PaymentStatus }[] = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Approved Paid", value: "ApprovedPaid" },
  { label: "Declined / Hold", value: "DeclinedHold" },
  { label: "Partial Paid", value: "PartialPaid" },
];

interface FormValues {
  paymentStatus: PaymentStatus;
  carrierPaidAmount: number | null;
  carrierPaidDate: dayjs.Dayjs | null;
  brokerReceivedAmount: number | null;
  brokerReceivedDate: dayjs.Dayjs | null;
}

interface Props {
  paymentOrder: PaymentOrder | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdatePaymentStatusModal({
  paymentOrder,
  open,
  onClose,
  onSuccess,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [uploading, setUploading] = useState(false);
  const [invoices, setInvoices] = useState<PaymentOrderInvoice[]>([]);

  useEffect(() => {
    if (!paymentOrder || !open) return;
    form.setFieldsValue({
      paymentStatus: paymentOrder.paymentStatus,
      carrierPaidAmount: paymentOrder.carrierPaidAmount,
      carrierPaidDate: paymentOrder.carrierPaidDate ? dayjs(paymentOrder.carrierPaidDate) : null,
      brokerReceivedAmount: paymentOrder.brokerReceivedAmount,
      brokerReceivedDate: paymentOrder.brokerReceivedDate
        ? dayjs(paymentOrder.brokerReceivedDate)
        : null,
    });
    setInvoices(paymentOrder.invoices ?? []);
  }, [paymentOrder, open, form]);

  const { loading, run: save } = useRequest(
    async (values: FormValues) => {
      if (!paymentOrder) return;
      await paymentOrderApi.update(paymentOrder.id, {
        paymentStatus: values.paymentStatus,
        carrierPaidAmount: values.carrierPaidAmount,
        carrierPaidDate: values.carrierPaidDate?.format("YYYY-MM-DD") ?? null,
        brokerReceivedAmount: values.brokerReceivedAmount,
        brokerReceivedDate: values.brokerReceivedDate?.format("YYYY-MM-DD") ?? null,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Payment order updated");
        onSuccess();
        onClose();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  const handleUpload = useCallback(
    async (file: FileType) => {
      if (!paymentOrder) return false;
      setUploading(true);
      try {
        const fileId = await paymentOrderApi.addInvoice(paymentOrder.id, file);
        setInvoices((prev) => [...prev, { fileId, fileName: file.name }]);
        message.success(`${file.name} uploaded`);
        onSuccess();
      } catch (err) {
        message.error(getErrorMessage(err));
      } finally {
        setUploading(false);
      }
      return false;
    },
    [paymentOrder, message, onSuccess],
  );

  const handleRemoveInvoice = useCallback(
    async (fileId: string, fileName: string) => {
      if (!paymentOrder) return;
      try {
        await paymentOrderApi.removeInvoice(paymentOrder.id, fileId);
        setInvoices((prev) => prev.filter((i) => i.fileId !== fileId));
        message.success(`${fileName} removed`);
        onSuccess();
      } catch (err) {
        message.error(getErrorMessage(err));
      }
    },
    [paymentOrder, message, onSuccess],
  );

  const invoiceColumns: ColumnsType<PaymentOrderInvoice> = [
    { title: "File", dataIndex: "fileName", key: "fileName", ellipsis: true },
    {
      key: "actions",
      width: 80,
      align: "right",
      render: (_: unknown, row: PaymentOrderInvoice) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => paymentOrderApi.downloadInvoice(row.fileId, row.fileName)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveInvoice(row.fileId, row.fileName)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={`Edit Payment Order — ${paymentOrder?.referenceNumber ?? ""}`}
      open={open}
      onCancel={onClose}
      width={640}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            Save
          </Button>
        </Space>
      }
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 16 }}>
        <Form.Item name="paymentStatus" label="Payment Status" rules={[{ required: true }]}>
          <Select options={STATUS_OPTIONS} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="carrierPaidAmount" label="Carrier Paid">
              <InputNumber style={{ width: "100%" }} min={0} precision={2} prefix="€" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="carrierPaidDate" label="Carrier Paid Date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="brokerReceivedAmount" label="Broker Received">
              <InputNumber style={{ width: "100%" }} min={0} precision={2} prefix="€" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="brokerReceivedDate" label="Broker Received Date">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Invoices">
          <Dragger
            multiple
            showUploadList={false}
            beforeUpload={handleUpload}
            disabled={uploading}
            style={{ marginBottom: 8 }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag files to upload invoices</p>
          </Dragger>
          {invoices.length > 0 ? (
            <Table<PaymentOrderInvoice>
              size="small"
              dataSource={invoices}
              columns={invoiceColumns}
              rowKey="fileId"
              pagination={false}
              style={{ marginTop: 8 }}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No invoices attached
            </Text>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
