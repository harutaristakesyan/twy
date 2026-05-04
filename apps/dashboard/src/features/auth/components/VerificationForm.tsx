import { CheckOutlined } from "@ant-design/icons";
import { Button, Form, Input, message } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ResendCode from "@/features/auth/components/ResendCode.tsx";
import ApiClient from "@/libs/ApiClient.ts";
import { getErrorMessage } from "@/utils/errorUtils";

interface VerificationFormValues {
  code: string;
}

const VerificationForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const isSignUpFlow = location.state?.signUp === true;
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: VerificationFormValues) => {
    const code = values.code;
    setLoading(true);
    try {
      await ApiClient.post<{ userSub: string; message: string }>("/verify", { email, code }, true);
      if (isSignUpFlow) {
        navigate("/login", { state: { email } });
      } else {
        navigate("/create-password", { state: { email, code } });
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Form.Item
        name="code"
        rules={[{ required: true, message: "Please enter the 6-digit code" }]}
        style={{ textAlign: "center" }}
      >
        <Input.OTP length={6} size="large" />
      </Form.Item>

      <Form.Item>
        <Button block type="primary" htmlType="submit" icon={<CheckOutlined />} loading={loading}>
          Verify Code
        </Button>
      </Form.Item>

      <ResendCode />
    </Form>
  );
};

export default VerificationForm;
