import { useRequest } from "ahooks";
import { App, Button, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Space } from "antd";
import type React from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { submitBrokerRequest } from "../api/brokerRequestApi";
import type { SubmitBrokerRequestBody } from "../types/brokerRequest";

const { TextArea } = Input;

interface OutsideBrokerCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

type CreateFormValues = {
  brokerName: string;
  mcNumber: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
};

const OutsideBrokerCreateModal: React.FC<OutsideBrokerCreateModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateFormValues>();
  const creditLimitUnlimited = Form.useWatch("creditLimitUnlimited", form) ?? true;

  const { loading, run: submit } = useRequest(
    async (payload: SubmitBrokerRequestBody) => submitBrokerRequest(payload),
    {
      manual: true,
      onSuccess: () => {
        message.success("Broker request submitted for review");
        onSuccess();
      },
      onError: (error) => message.error(getErrorMessage(error)),
    },
  );

  const handleFinish = (values: CreateFormValues) => {
    if (!values.creditLimitUnlimited && (values.creditLimit === null || values.creditLimit <= 0)) {
      message.error("Please enter a valid credit limit amount");
      return;
    }
    submit({
      brokerName: values.brokerName,
      mcNumber: values.mcNumber,
      contactName: values.contactName,
      phone: values.phone,
      email: values.email,
      address: values.address,
      notes: values.notes,
      creditLimitUnlimited: values.creditLimitUnlimited,
      creditLimit: values.creditLimitUnlimited ? null : values.creditLimit,
    });
  };

  return (
    <Modal
      title="Request outside broker"
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
        initialValues={{ creditLimitUnlimited: true, creditLimit: null }}
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
          <Col span={24}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: "email", message: "Please enter a valid email" }]}
            >
              <Input placeholder="Enter email address" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="Address">
          <TextArea placeholder="Enter address" rows={2} />
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

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={2} />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit request
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default OutsideBrokerCreateModal;
