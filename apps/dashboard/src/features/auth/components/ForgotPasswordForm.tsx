import { ArrowRightOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { App, Button, Form, Input } from "antd";
import { useNavigate } from "react-router-dom";
import ApiClient from "@/libs/ApiClient.ts";
import { getErrorMessage } from "@/utils/errorUtils";

const ForgotPasswordForm = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const { loading, run: submit } = useRequest(
    async ({ email }: { email: string }) => {
      await ApiClient.post("/forgot-password", { email });
      return email;
    },
    {
      manual: true,
      onSuccess: (email: string) => {
        message.success("Verification code sent");
        navigate("/create-password", { state: { email, signUp: false } });
      },
      onError: (error) => message.error(getErrorMessage(error)),
    },
  );

  return (
    <Form layout="vertical" form={form} onFinish={submit}>
      <Form.Item
        label="Email Address"
        name="email"
        rules={[
          { required: true, message: "Please enter your email" },
          { type: "email", message: "Enter a valid email" },
        ]}
      >
        <Input placeholder="you@example.com" />
      </Form.Item>

      <Form.Item>
        <Button
          block
          type="primary"
          htmlType="submit"
          iconPosition="end"
          icon={<ArrowRightOutlined />}
          loading={loading}
        >
          Send Recovery Code
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ForgotPasswordForm;
