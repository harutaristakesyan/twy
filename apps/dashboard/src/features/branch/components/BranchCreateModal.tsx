import { Button, Form, Input, Modal, message, Select, Space } from "antd";
import type React from "react";
import { useState } from "react";
import type { User } from "@/features/user/types/user";
import { getErrorMessage } from "@/utils/errorUtils";
import { createBranch } from "../api/branchApi";
import type { BranchFormData } from "../types/branch";

const { TextArea } = Input;

interface BranchCreateModalProps {
  open: boolean;
  owners: User[];
  loadingOwners: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const BranchCreateModal: React.FC<BranchCreateModalProps> = ({
  open,
  owners,
  loadingOwners,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: BranchFormData) => {
    setLoading(true);
    try {
      await createBranch(values);
      message.success("Branch created successfully");
      form.resetFields();
      onSuccess();
    } catch (error) {
      // Handle duplicate branch name error
      const errorMessage = getErrorMessage(error);

      if (
        errorMessage.includes('duplicate key value violates unique constraint "branch_name_key"') ||
        errorMessage.includes("branch_name_key")
      ) {
        message.error(`Branch name "${values.name}" already exists. Please use a different name.`);
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
      title="Create New Branch"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} id="branchCreateForm">
        <Form.Item
          name="name"
          label="Branch Name"
          rules={[
            { required: true, message: "Please enter branch name" },
            { min: 2, message: "Branch name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter branch name" id="create-name" />
        </Form.Item>

        <Form.Item
          name="contact"
          label="Contact Information"
          rules={[
            {
              max: 500,
              message: "Contact information cannot exceed 500 characters",
            },
          ]}
        >
          <TextArea
            placeholder="Enter contact information (phone, email, address, etc.)"
            rows={3}
            id="create-contact"
          />
        </Form.Item>

        <Form.Item name="owner" label="Branch Owner">
          <Select
            placeholder="Select branch owner"
            loading={loadingOwners}
            allowClear
            showSearch={{
              filterOption: (input, option) => {
                const label = String(option?.label ?? "");
                const email = String(option?.email ?? "");
                return (
                  label.toLowerCase().includes(input.toLowerCase()) ||
                  email.toLowerCase().includes(input.toLowerCase())
                );
              },
            }}
            options={owners.map((o) => ({
              value: o.id,
              label: `${o.firstName} ${o.lastName}`,
              email: o.email,
            }))}
            optionRender={(option) => (
              <div>
                <div style={{ fontWeight: 500 }}>{option.label}</div>
                <div style={{ fontSize: "12px", color: "#888" }}>{option.data.email}</div>
              </div>
            )}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Branch
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BranchCreateModal;
