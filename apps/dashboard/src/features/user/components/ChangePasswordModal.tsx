import { Button, Form, Input, Modal, message } from "antd";
import type React from "react";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { changePassword } from "../api/userApi";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordModal: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  const handleClose = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      setSaving(true);
      try {
        await changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        message.success("Password changed successfully");
        handleClose();
      } catch (error) {
        message.error(getErrorMessage(error));
      } finally {
        setSaving(false);
      }
    },
    [handleClose],
  );

  return (
    <Modal title="Change Password" open={open} onCancel={handleClose} footer={null} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: "Please enter your current password" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[{ required: true, message: "Please enter a new password" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Please confirm your new password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords do not match"));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={handleClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
