import { useRequest } from "ahooks";
import { App, Button, Form, Input, Modal, Select, Space } from "antd";
import type React from "react";
import { SelectOption } from "@/components/SelectOption";
import type { User } from "@/features/user/types/user";
import { getErrorMessage } from "@/utils/errorUtils";
import { updateBranch } from "../api/branchApi";
import type { Branch, BranchFormData } from "../types/branch";

const { TextArea } = Input;

interface BranchEditModalProps {
  open: boolean;
  branch: Branch;
  owners: User[];
  loadingOwners: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const BranchEditModal: React.FC<BranchEditModalProps> = ({
  open,
  branch,
  owners,
  loadingOwners,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const { loading, run: submit } = useRequest(
    async (values: BranchFormData) => {
      await updateBranch({
        id: branch.id,
        name: values.name,
        contact: values.contact || undefined,
        owner: values.owner,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Branch updated successfully");
        onSuccess();
      },
      onError: (error) => {
        message.error(getErrorMessage(error));
      },
    },
  );

  return (
    <Modal
      title="Edit Branch"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{
          name: branch.name,
          contact: branch.contact || undefined,
          owner: branch.owner?.id,
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
          rules={[{ max: 500, message: "Contact information cannot exceed 500 characters" }]}
        >
          <TextArea
            placeholder="Enter contact information (phone, email, address, etc.)"
            rows={3}
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
              <SelectOption label={option.label} description={option.data.email} />
            )}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
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
