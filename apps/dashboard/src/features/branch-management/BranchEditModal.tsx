import { Alert, Button, Form, Input, Modal, message, Select, Space } from "antd";
import type React from "react";
import { useEffect, useState } from "react";
import { updateBranch } from "@/entities/branch/api";
import type { Branch, BranchFormData, UpdateBranchRequest } from "@/entities/branch/types";
import type { User } from "@/entities/user/types";
import { getErrorMessage } from "@/shared/utils/errorUtils";

const { Option } = Select;
const { TextArea } = Input;

interface BranchEditModalProps {
  branch: Branch;
  visible: boolean;
  owners: User[];
  loadingOwners: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const BranchEditModal: React.FC<BranchEditModalProps> = ({
  branch,
  visible,
  owners,
  loadingOwners,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Set form values when modal opens or branch changes
  useEffect(() => {
    if (visible && branch) {
      form.setFieldsValue({
        name: branch.name,
        contact: branch.contact || "",
        owner: branch.owner?.id,
      });
    }
  }, [visible, branch, form]);

  const handleSubmit = async (values: BranchFormData) => {
    setLoading(true);
    try {
      const updateData: UpdateBranchRequest = {
        id: branch.id,
        name: values.name,
        contact: values.contact,
        owner: values.owner,
      };

      await updateBranch(updateData);
      message.success("Branch updated successfully");
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
    <Modal title="Edit Branch" open={visible} onCancel={handleCancel} footer={null} width={600}>
      <Alert
        message="Branch Information"
        description="Update branch details. Branch name and owner are required."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: branch?.name,
          contact: branch?.contact || "",
          owner: branch?.owner?.id,
        }}
      >
        <Form.Item
          name="name"
          label="Branch Name"
          rules={[
            { required: true, message: "Please enter branch name" },
            { min: 2, message: "Branch name must be at least 2 characters" },
          ]}
        >
          <Input placeholder="Enter branch name" />
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
          />
        </Form.Item>

        <Form.Item
          name="owner"
          label="Branch Owner"
          rules={[{ required: true, message: "Please select a branch owner" }]}
        >
          <Select
            placeholder="Select branch owner"
            loading={loadingOwners}
            showSearch
            optionLabelProp="label"
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase()) ||
              (option?.email ?? "").toLowerCase().includes(input.toLowerCase())
            }
          >
            {owners.map((owner) => (
              <Option
                key={owner.id}
                value={owner.id}
                label={`${owner.firstName} ${owner.lastName}`}
                email={owner.email}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {owner.firstName} {owner.lastName}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    {owner.email} - {owner.role}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Branch
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BranchEditModal;
