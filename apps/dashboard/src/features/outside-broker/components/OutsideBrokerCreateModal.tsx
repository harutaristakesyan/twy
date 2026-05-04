import { Button, Checkbox, Col, Form, Input, InputNumber, Modal, message, Row, Space } from "antd";
import type React from "react";
import { useState } from "react";
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
};

const OutsideBrokerCreateModal: React.FC<OutsideBrokerCreateModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [creditLimitUnlimited, setCreditLimitUnlimited] = useState(true);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);

  const handleSubmit = async (values: CreateFormValues) => {
    if (!creditLimitUnlimited && (creditLimit === null || creditLimit <= 0)) {
      message.error("Please enter a valid credit limit amount");
      return;
    }
    setLoading(true);
    try {
      const payload: SubmitBrokerRequestBody = {
        brokerName: values.brokerName,
        mcNumber: values.mcNumber,
        contactName: values.contactName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        notes: values.notes,
        creditLimitUnlimited,
        creditLimit: creditLimitUnlimited ? null : creditLimit,
      };

      await submitBrokerRequest(payload);
      message.success("Broker request submitted for review");
      form.resetFields();
      onSuccess();
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      if (errorMessage.includes("duplicate") || errorMessage.includes("unique constraint")) {
        message.error(
          `MC Number "${values.mcNumber}" already exists. Please use a different MC number.`,
        );
      } else {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCreditLimitUnlimited(true);
    setCreditLimit(null);
    onCancel();
  };

  return (
    <Modal
      title="Request outside broker"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} id="outsideBrokerCreateForm">
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
          <Checkbox
            checked={creditLimitUnlimited}
            onChange={(e) => {
              setCreditLimitUnlimited(e.target.checked);
              if (e.target.checked) setCreditLimit(null);
            }}
          >
            Unlimited
          </Checkbox>
          {!creditLimitUnlimited && (
            <InputNumber
              value={creditLimit}
              onChange={setCreditLimit}
              min={0.01}
              precision={2}
              prefix="$"
              style={{ width: "100%", marginTop: 8 }}
              placeholder="Enter credit limit"
            />
          )}
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={2} />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
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
