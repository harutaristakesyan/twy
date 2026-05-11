import { CheckOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { App, Button, Form, Input } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import ResendCode from "@/features/auth/components/ResendCode.tsx";
import ApiClient from "@/libs/ApiClient.ts";
import { getErrorMessage } from "@/utils/errorUtils";

interface VerificationFormValues {
  code: string;
}

const VerificationForm = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const isSignUpFlow = location.state?.signUp === true;

  const { loading, run: submit } = useRequest(
    async (values: VerificationFormValues) => {
      await ApiClient.post<{ userSub: string; message: string }>(
        "/verify",
        { email, code: values.code },
        true,
      );
      return values.code;
    },
    {
      manual: true,
      onSuccess: (code: string) => {
        if (isSignUpFlow) {
          navigate("/login", { state: { email } });
        } else {
          navigate("/create-password", { state: { email, code } });
        }
      },
      onError: (err) => message.error(getErrorMessage(err)),
    },
  );

  return (
    <Form layout="vertical" form={form} onFinish={submit}>
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
