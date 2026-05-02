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
import { useEffect, useState } from "react";
import type { Branch } from "@/features/branch/types/branch";
import { getErrorMessage } from "@/utils/errorUtils";
import { updateOutsideBroker } from "../api/brokerApi";
import type {
  OutsideBroker,
  OutsideBrokerFormData,
  UpdateOutsideBrokerRequest,
} from "../types/broker";
import { BrokerStatus } from "../types/broker";

const { Option } = Select;
const { TextArea } = Input;

interface OutsideBrokerEditModalProps {
  open: boolean;
  broker: OutsideBroker;
  branches: Branch[];
  loadingBranches: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const OutsideBrokerEditModal: React.FC<OutsideBrokerEditModalProps> = ({
  open,
  broker,
  branches,
  loadingBranches,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [creditLimitUnlimited, setCreditLimitUnlimited] = useState(true);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);

  // Set form values when modal opens or broker changes
  useEffect(() => {
    if (open && broker) {
      form.setFieldsValue({
        brokerName: broker.brokerName,
        mcNumber: broker.mcNumber,
        contactName: broker.contactName || "",
        phone: broker.phone || "",
        email: broker.email || "",
        address: broker.address || "",
        notes: broker.notes || "",
        status: broker.status,
        branch: broker.branch?.id,
      });
      setCreditLimitUnlimited(broker.creditLimitUnlimited ?? true);
      setCreditLimit(broker.creditLimit ?? null);
    }
  }, [open, broker, form]);

  const handleSubmit = async (
    values: Omit<OutsideBrokerFormData, "creditLimitUnlimited" | "creditLimit">,
  ) => {
    if (!creditLimitUnlimited && (creditLimit === null || creditLimit <= 0)) {
      message.error("Please enter a valid credit limit amount");
      return;
    }
    setLoading(true);
    try {
      const updateData: UpdateOutsideBrokerRequest = {
        id: broker.id,
        brokerName: values.brokerName,
        mcNumber: values.mcNumber,
        contactName: values.contactName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        notes: values.notes,
        status: values.status,
        branch: values.branch,
        creditLimitUnlimited,
        creditLimit: creditLimitUnlimited ? null : creditLimit,
      };

      await updateOutsideBroker(updateData);
      message.success("Outside broker updated successfully");
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
      title="Edit Outside Broker"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Alert
        message="Broker Information"
        description="Update outside broker details. Broker name and MC number are required."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          brokerName: broker?.brokerName,
          mcNumber: broker?.mcNumber,
          contactName: broker?.contactName || "",
          phone: broker?.phone || "",
          email: broker?.email || "",
          address: broker?.address || "",
          notes: broker?.notes || "",
          status: broker?.status,
          branch: broker?.branch?.id,
        }}
      >
        <Form.Item
          name="brokerName"
          label="Broker Name"
          rules={[
            { required: true, message: "Please enter broker name" },
            { min: 2, message: "Broker name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter broker name" />
        </Form.Item>

        <Form.Item
          name="mcNumber"
          label="MC Number"
          rules={[
            { required: true, message: "Please enter MC number" },
            { min: 1, message: "MC number is required" },
          ]}
        >
          <Input placeholder="Enter MC number" />
        </Form.Item>

        <Form.Item name="contactName" label="Contact Name">
          <Input placeholder="Enter contact name" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="Enter phone number" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: "email", message: "Please enter a valid email address" }]}
        >
          <Input placeholder="Enter email address" />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <TextArea placeholder="Enter address" rows={3} />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={3} />
        </Form.Item>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: "Please select a status" }]}
        >
          <Select placeholder="Select status">
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
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          >
            {branches.map((branch) => (
              <Option key={branch.id} value={branch.id} label={branch.name}>
                {branch.name}
              </Option>
            ))}
          </Select>
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
              Update Broker
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default OutsideBrokerEditModal;
