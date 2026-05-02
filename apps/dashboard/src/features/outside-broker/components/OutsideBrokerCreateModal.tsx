import { Alert, Button, Form, Input, Modal, message, Select, Space } from "antd";
import type React from "react";
import { useState } from "react";
import type { Branch } from "@/features/branch/types/branch";
import { getErrorMessage } from "@/utils/errorUtils";
import { createOutsideBroker } from "../api/brokerApi";
import type { OutsideBrokerFormData } from "../types/broker";
import { BrokerStatus } from "../types/broker";

const { Option } = Select;
const { TextArea } = Input;

interface OutsideBrokerCreateModalProps {
  open: boolean;
  branches: Branch[];
  loadingBranches: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const OutsideBrokerCreateModal: React.FC<OutsideBrokerCreateModalProps> = ({
  open,
  branches,
  loadingBranches,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: OutsideBrokerFormData) => {
    setLoading(true);
    try {
      await createOutsideBroker(values);
      message.success("Outside broker created successfully");
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
    onCancel();
  };

  return (
    <Modal
      title="Add New Outside Broker"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Alert
        message="Broker Information"
        description="Add a new outside broker. Broker name and MC number are required."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} id="outsideBrokerCreateForm">
        <Form.Item
          name="brokerName"
          label="Broker Name"
          rules={[
            { required: true, message: "Please enter broker name" },
            { min: 2, message: "Broker name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter broker name" id="create-brokerName" />
        </Form.Item>

        <Form.Item
          name="mcNumber"
          label="MC Number"
          rules={[
            { required: true, message: "Please enter MC number" },
            { min: 1, message: "MC number is required" },
          ]}
        >
          <Input placeholder="Enter MC number" id="create-mcNumber" />
        </Form.Item>

        <Form.Item name="contactName" label="Contact Name">
          <Input placeholder="Enter contact name" id="create-contactName" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="Enter phone number" id="create-phone" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: "email", message: "Please enter a valid email address" }]}
        >
          <Input placeholder="Enter email address" id="create-email" />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <TextArea placeholder="Enter address" rows={3} id="create-address" />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={3} id="create-notes" />
        </Form.Item>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: "Please select a status" }]}
          initialValue={BrokerStatus.PENDING}
        >
          <Select placeholder="Select status" id="create-status">
            <Option value={BrokerStatus.APPROVED}>Approved</Option>
            <Option value={BrokerStatus.PENDING}>Pending</Option>
            <Option value={BrokerStatus.DENIED}>Denied</Option>
          </Select>
        </Form.Item>

        <Form.Item name="branch" label="Branch (Optional)">
          <Select
            placeholder="Select branch (optional)"
            loading={loadingBranches}
            showSearch
            allowClear
            optionLabelProp="label"
            filterOption={(input, option) => {
              const label = String(option?.label ?? "");
              return label.toLowerCase().includes(input.toLowerCase());
            }}
          >
            {branches.map((branch) => (
              <Option key={branch.id} value={branch.id} label={branch.name}>
                {branch.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Add Broker
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default OutsideBrokerCreateModal;
