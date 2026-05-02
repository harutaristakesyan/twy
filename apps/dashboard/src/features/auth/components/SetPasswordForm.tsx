import { LockOutlined } from "@ant-design/icons";
import { Button, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { applyLogin } from "@/features/auth/api/authActions";
import ApiClient from "@/libs/ApiClient.ts";
import type { ApiResponse } from "@/libs/api-types.ts";

const { Text } = Typography;

interface SetPasswordFormProps {
  session: string;
  email: string;
  onSuccess: () => void;
}

interface SetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

interface TokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

const SetPasswordForm = ({ session, email, onSuccess }: SetPasswordFormProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const onFinish = async ({ newPassword, confirmPassword }: SetPasswordFormValues) => {
    if (newPassword !== confirmPassword) {
      form.setFields([{ name: "confirmPassword", errors: ["Passwords do not match"] }]);
      return;
    }

    setLoading(true);
    try {
      const res = await ApiClient.post<ApiResponse<TokenResponse>>(
        "/respond-to-challenge",
        { challengeName: "NEW_PASSWORD_REQUIRED", session, email, newPassword },
        true,
      );
      applyLogin(res.data, "local");
      onSuccess();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setSessionExpired(true);
      } else {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to set password";
        form.setFields([{ name: "newPassword", errors: [message] }]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sessionExpired) {
    return (
      <Text>
        Your session has expired. Please <Link to="/login">log in again</Link>.
      </Text>
    );
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item
        name="newPassword"
        label="New Password"
        rules={[
          { required: true, message: "Please enter a new password" },
          { min: 8, message: "Password must be at least 8 characters" },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="New password" />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="Confirm Password"
        rules={[{ required: true, message: "Please confirm your password" }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
      </Form.Item>

      <Form.Item>
        <Button block type="primary" htmlType="submit" loading={loading}>
          Set Password
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SetPasswordForm;
