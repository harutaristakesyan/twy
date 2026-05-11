import { useRequest } from "ahooks";
import {
  App,
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
} from "antd";
import type React from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { updateOutsideBroker } from "../api/brokerApi";
import type { OutsideBroker, UpdateOutsideBrokerRequest } from "../types/broker";
import { BrokerStatus } from "../types/broker";

const { TextArea } = Input;

interface OutsideBrokerEditModalProps {
  open: boolean;
  broker: OutsideBroker;
  onCancel: () => void;
  onSuccess: () => void;
}

type EditFormValues = {
  brokerName: string;
  mcNumber: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status: BrokerStatus;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
};

const STATUS_OPTIONS = [
  { value: BrokerStatus.APPROVED, label: "Approved" },
  { value: BrokerStatus.PENDING, label: "Pending" },
  { value: BrokerStatus.DENIED, label: "Denied" },
];

const OutsideBrokerEditModal: React.FC<OutsideBrokerEditModalProps> = ({
  open,
  broker,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<EditFormValues>();
  const creditLimitUnlimited =
    Form.useWatch("creditLimitUnlimited", form) ?? broker.creditLimitUnlimited;

  const { loading, run: update } = useRequest(
    async (payload: UpdateOutsideBrokerRequest) => updateOutsideBroker(payload),
    {
      manual: true,
      onSuccess: () => {
        message.success("Outside broker updated successfully");
        onSuccess();
      },
      onError: (error) => message.error(getErrorMessage(error)),
    },
  );

  const handleFinish = (values: EditFormValues) => {
    if (!values.creditLimitUnlimited && (values.creditLimit === null || values.creditLimit <= 0)) {
      message.error("Please enter a valid credit limit amount");
      return;
    }
    update({
      id: broker.id,
      brokerName: values.brokerName,
      mcNumber: values.mcNumber,
      contactName: values.contactName,
      phone: values.phone,
      email: values.email,
      address: values.address,
      notes: values.notes,
      status: values.status,
      creditLimitUnlimited: values.creditLimitUnlimited,
      creditLimit: values.creditLimitUnlimited ? null : values.creditLimit,
    });
  };

  return (
    <Modal
      title="Edit Outside Broker"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          brokerName: broker.brokerName,
          mcNumber: broker.mcNumber,
          contactName: broker.contactName ?? "",
          phone: broker.phone ?? "",
          email: broker.email ?? "",
          address: broker.address ?? "",
          notes: broker.notes ?? "",
          status: broker.status,
          creditLimitUnlimited: broker.creditLimitUnlimited ?? true,
          creditLimit: broker.creditLimit ?? null,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="brokerName"
              label="Broker Name"
              rules={[
                { required: true, message: "Please enter broker name" },
                { min: 2, message: "At least 2 characters" },
              ]}
            >
              <Input placeholder="Enter broker name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="mcNumber"
              label="MC Number"
              rules={[{ required: true, message: "Please enter MC number" }]}
            >
              <Input placeholder="Enter MC number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="contactName" label="Contact Name">
              <Input placeholder="Enter contact name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Enter phone number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: "email", message: "Please enter a valid email" }]}
            >
              <Input placeholder="Enter email address" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: "Please select a status" }]}
            >
              <Select placeholder="Select status" options={STATUS_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="Address">
          <TextArea placeholder="Enter address" rows={2} />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={2} />
        </Form.Item>

        <Form.Item label="Credit Limit">
          <Form.Item name="creditLimitUnlimited" valuePropName="checked" noStyle>
            <Checkbox>Unlimited</Checkbox>
          </Form.Item>
          {!creditLimitUnlimited && (
            <Form.Item name="creditLimit" noStyle>
              <InputNumber
                min={0.01}
                precision={2}
                prefix="€"
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Enter credit limit"
              />
            </Form.Item>
          )}
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Broker
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default OutsideBrokerEditModal;
