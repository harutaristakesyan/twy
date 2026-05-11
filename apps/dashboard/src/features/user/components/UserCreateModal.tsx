import { useRequest } from "ahooks";
import { App, Button, Col, Form, Input, Modal, Row, Space, Switch } from "antd";
import type React from "react";
import BranchSelect from "@/features/branch/components/BranchSelect";
import TeamSelect from "@/features/team/components/TeamSelect";
import { getErrorMessage } from "@/utils/errorUtils";
import { createUser } from "../api/userApi";
import type { UserFormData } from "../types/user";

interface UserCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const UserCreateModal: React.FC<UserCreateModalProps> = ({ open, onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const { loading, run: submit } = useRequest(
    async (values: UserFormData) => {
      await createUser(values);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success("User created successfully");
        onSuccess();
      },
      onError: (error) => {
        message.error(getErrorMessage(error));
      },
    },
  );

  return (
    <Modal
      title="Create New User"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={submit} id="userCreateForm">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[
                { required: true, message: "Please enter first name" },
                { min: 2, message: "First name must be at least 2 characters" },
              ]}
            >
              <Input placeholder="Enter first name" id="create-firstName" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[
                { required: true, message: "Please enter last name" },
                { min: 2, message: "Last name must be at least 2 characters" },
              ]}
            >
              <Input placeholder="Enter last name" id="create-lastName" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please enter email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input placeholder="Enter email address" id="create-email" />
        </Form.Item>

        <Form.Item name="branch" label="Branch">
          <BranchSelect />
        </Form.Item>

        <Form.Item name="teamId" label="Team">
          <TeamSelect />
        </Form.Item>

        <Form.Item name="isActive" label="Status" valuePropName="checked" initialValue={true}>
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create User
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserCreateModal;
