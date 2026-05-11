import { UploadOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";

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

import { getErrorMessage } from "@/utils/errorUtils";
import { paymentOrderApi } from "../api/paymentOrderApi";
import { useInvoiceHandlers } from "../hooks/useInvoiceHandlers";
import type { PaymentOrder, PaymentStatus } from "../types/paymentOrder";
import { STATUS_LABEL } from "./PaymentStatusTag";

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as PaymentStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

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
  mode?: "edit" | "view";
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdatePaymentStatusModal({
  paymentOrder,
  open,
  mode = "edit",
  onClose,
  onSuccess,
}: Props) {
  const readOnly = mode === "view";
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const { fileList, handleUpload, handleChange, handleRemove, handleDownload } = useInvoiceHandlers(
    paymentOrder,
    onSuccess,
  );

  const initialValues: Partial<FormValues> = paymentOrder
    ? {
        paymentStatus: paymentOrder.paymentStatus,
        carrierPaidAmount: paymentOrder.carrierPaidAmount,
        carrierPaidDate: paymentOrder.carrierPaidDate ? dayjs(paymentOrder.carrierPaidDate) : null,
        brokerReceivedAmount: paymentOrder.brokerReceivedAmount,
        brokerReceivedDate: paymentOrder.brokerReceivedDate
          ? dayjs(paymentOrder.brokerReceivedDate)
          : null,
      }
    : {};

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

  return (
    <Modal
      title={`${readOnly ? "View" : "Edit"} Payment Order — ${paymentOrder?.referenceNumber ?? ""}`}
      open={open}
      onCancel={onClose}
      width={640}
      footer={
        readOnly ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={loading} onClick={() => form.submit()}>
              Save
            </Button>
          </Space>
        )
      }
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={save}
        initialValues={initialValues}
        style={{ marginTop: 16 }}
      >
        <Form.Item name="paymentStatus" label="Payment Status" rules={[{ required: true }]}>
          <Select options={STATUS_OPTIONS} disabled={readOnly} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="carrierPaidAmount" label="Carrier Paid">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                precision={2}
                prefix="€"
                disabled={readOnly}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="carrierPaidDate" label="Carrier Paid Date">
              <DatePicker style={{ width: "100%" }} disabled={readOnly} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="brokerReceivedAmount" label="Broker Received">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                precision={2}
                prefix="€"
                disabled={readOnly}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="brokerReceivedDate" label="Broker Received Date">
              <DatePicker style={{ width: "100%" }} disabled={readOnly} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Invoices">
          <Upload
            multiple
            fileList={fileList}
            customRequest={handleUpload}
            onChange={handleChange}
            onRemove={readOnly ? undefined : handleRemove}
            onDownload={handleDownload}
            showUploadList={{ showDownloadIcon: true, showRemoveIcon: !readOnly }}
          >
            {!readOnly && <Button icon={<UploadOutlined />}>Upload Invoice</Button>}
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
