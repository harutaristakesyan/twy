import { useRequest } from "ahooks";
import { App, Button, Form, Input, Modal, Select, Space } from "antd";
import type React from "react";
import { LabeledOption } from "@/components/LabeledOption";
import CIAutocomplete from "@/features/community-license/components/CIAutocomplete";
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
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const { loading, run: submit } = useRequest(
    async (values: BranchFormData) => {
      await createBranch(values);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("Branch created successfully");
        onSuccess();
      },
      onError: (error) => {
        message.error(getErrorMessage(error));
      },
    },
  );

  return (
    <Modal
      title="Create New Branch"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={submit} id="branchCreateForm">
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
          rules={[{ max: 500, message: "Contact information cannot exceed 500 characters" }]}
        >
          <TextArea
            placeholder="Enter contact information (phone, email, address, etc.)"
            rows={3}
            id="create-contact"
          />
        </Form.Item>

        <Form.Item name="ciId" label="Community License">
          <CIAutocomplete placeholder="Search by CI number" id="create-ciId" />
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
              <LabeledOption label={option.label} description={option.data.email} />
            )}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
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
