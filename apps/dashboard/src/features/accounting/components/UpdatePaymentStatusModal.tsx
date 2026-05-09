import { UploadOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import type { UploadFile, UploadProps } from "antd";
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
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { paymentOrderApi } from "../api/paymentOrderApi";
import type { PaymentOrder, PaymentStatus } from "../types/paymentOrder";

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

const getFileId = (file: UploadFile): string => (file.response as string | undefined) ?? file.uid;

export default function UpdatePaymentStatusModal({
  paymentOrder,
  open,
  onClose,
  onSuccess,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

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
    setFileList(
      (paymentOrder.invoices ?? []).map((inv) => ({
        uid: inv.fileId,
        name: inv.fileName,
        status: "done" as const,
      })),
    );
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

  const handleUpload: NonNullable<UploadProps["customRequest"]> = useCallback(
    async ({ file, onSuccess: onUploadSuccess, onError }) => {
      if (!paymentOrder) return;
      try {
        const fileId = await paymentOrderApi.addInvoice(paymentOrder.id, file as File);
        onUploadSuccess?.(fileId);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [paymentOrder],
  );

  const handleChange: UploadProps["onChange"] = useCallback(
    ({ file, fileList: newList }) => {
      setFileList(newList);
      if (file.status === "done") {
        message.success(`${file.name} uploaded`);
        onSuccess();
      } else if (file.status === "error") {
        message.error(`${file.name} failed to upload`);
      }
    },
    [message, onSuccess],
  );

  const handleRemove = useCallback(
    async (file: UploadFile): Promise<boolean> => {
      if (!paymentOrder) return false;
      try {
        await paymentOrderApi.removeInvoice(paymentOrder.id, getFileId(file));
        message.success(`${file.name} removed`);
        onSuccess();
        return true;
      } catch (err) {
        message.error(getErrorMessage(err));
        return false;
      }
    },
    [paymentOrder, message, onSuccess],
  );

  const handleDownload = useCallback(
    (file: UploadFile) => {
      paymentOrderApi.downloadInvoice(getFileId(file), file.name).catch((err) => {
        message.error(getErrorMessage(err));
      });
    },
    [message],
  );

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
          <Upload
            multiple
            fileList={fileList}
            customRequest={handleUpload}
            onChange={handleChange}
            onRemove={handleRemove}
            onDownload={handleDownload}
            showUploadList={{
              showDownloadIcon: true,
              showRemoveIcon: true,
            }}
          >
            <Button icon={<UploadOutlined />}>Upload Invoice</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
