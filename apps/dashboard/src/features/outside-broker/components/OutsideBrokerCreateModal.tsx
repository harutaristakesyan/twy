import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
} from "antd";
import type React from "react";
import { useState } from "react";
import type { Branch } from "@/features/branch/types/branch";
import { getErrorMessage } from "@/utils/errorUtils";
import { submitBrokerRequest } from "../api/brokerRequestApi";
import type { SubmitBrokerRequestBody } from "../types/brokerRequest";

const { TextArea } = Input;

interface OutsideBrokerCreateModalProps {
  open: boolean;
  branches: Branch[];
  loadingBranches: boolean;
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
  branch?: string;
};

const OutsideBrokerCreateModal: React.FC<OutsideBrokerCreateModalProps> = ({
  open,
  branches,
  loadingBranches,
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
        branchId: values.branch,
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
      <Alert
        title="Broker information"
        description="Submit a request for a new outside broker. It appears in the directory only after an admin approves it."
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

        <Form.Item name="branch" label="Branch (Optional)">
          <Select
            placeholder="Select branch (optional)"
            loading={loadingBranches}
            showSearch={{
              filterOption: (input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
            allowClear
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
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
