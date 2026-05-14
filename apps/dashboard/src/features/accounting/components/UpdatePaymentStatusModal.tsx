import { useRequest } from "ahooks";

import { App, Button, Col, DatePicker, Form, InputNumber, Modal, Row, Select, Space } from "antd";
import dayjs from "dayjs";
import { useCallback, useState } from "react";

import { AttachedFilesField } from "@/features/files";
import { getErrorMessage } from "@/utils/errorUtils";
import { getDirtyFields } from "@/utils/getDirtyFields";
import { paymentOrderApi } from "../api/paymentOrderApi";
import type { PaymentOrder, PaymentStatus } from "../types/paymentOrder";
import { STATUS_LABEL } from "./PaymentStatusTag";

type NormalizedPayload = {
  paymentStatus: PaymentStatus;
  carrierPaidAmount: number | null;
  carrierPaidDate: string | null;
  brokerReceivedAmount: number | null;
  brokerReceivedDate: string | null;
};

const toOriginalPayload = (po: PaymentOrder): NormalizedPayload => ({
  paymentStatus: po.paymentStatus,
  carrierPaidAmount: po.carrierPaidAmount,
  carrierPaidDate: po.carrierPaidDate,
  brokerReceivedAmount: po.brokerReceivedAmount,
  brokerReceivedDate: po.brokerReceivedDate,
});

const toCurrentPayload = (values: FormValues): NormalizedPayload => ({
  paymentStatus: values.paymentStatus,
  carrierPaidAmount: values.carrierPaidAmount,
  carrierPaidDate: values.carrierPaidDate?.format("YYYY-MM-DD") ?? null,
  brokerReceivedAmount: values.brokerReceivedAmount,
  brokerReceivedDate: values.brokerReceivedDate?.format("YYYY-MM-DD") ?? null,
});

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
  const [isDirty, setIsDirty] = useState(false);

  const handleClose = () => {
    setIsDirty(false);
    onClose();
  };

  const handleValuesChange = useCallback(() => {
    if (!paymentOrder) return;
    setIsDirty(
      Object.keys(
        getDirtyFields(toOriginalPayload(paymentOrder), toCurrentPayload(form.getFieldsValue())),
      ).length > 0,
    );
  }, [paymentOrder, form]);

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
      if (!paymentOrder) return false;
      const dirty = getDirtyFields(toOriginalPayload(paymentOrder), toCurrentPayload(values));
      if (Object.keys(dirty).length === 0) return false;
      await paymentOrderApi.update(paymentOrder.id, dirty);
      return true;
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Payment order updated");
        onSuccess();
        handleClose();
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  return (
    <Modal
      title={`${readOnly ? "View" : "Edit"} Payment Order — ${paymentOrder?.referenceNumber ?? ""}`}
      open={open}
      onCancel={handleClose}
      width={640}
      footer={
        readOnly ? (
          <Button onClick={handleClose}>Close</Button>
        ) : (
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              loading={loading}
              disabled={!isDirty}
              onClick={() => form.submit()}
            >
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
        onValuesChange={readOnly ? undefined : handleValuesChange}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Broker Receivable">
              <InputNumber
                style={{ width: "100%" }}
                value={paymentOrder?.brokerReceivable ?? undefined}
                precision={2}
                prefix="€"
                disabled
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Carrier Payable">
              <InputNumber
                style={{ width: "100%" }}
                value={paymentOrder?.carrierPayable}
                precision={2}
                prefix="€"
                disabled
              />
            </Form.Item>
          </Col>
        </Row>

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
          <AttachedFilesField
            files={(paymentOrder?.invoices ?? []).map((inv) => ({
              fileId: inv.fileId,
              fileName: inv.fileName,
            }))}
            onAdd={(file) =>
              paymentOrder
                ? paymentOrderApi.addInvoice(paymentOrder.id, file)
                : Promise.reject(new Error("Payment order missing"))
            }
            onRemove={
              paymentOrder
                ? (fileId) => paymentOrderApi.removeInvoice(paymentOrder.id, fileId)
                : undefined
            }
            onChanged={onSuccess}
            readOnly={readOnly}
            buttonLabel="Upload Invoice"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
