import { track } from "@amplitude/analytics-browser";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Col, Form, Input, Row } from "antd";
import { useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const [form] = Form.useForm();

  const loginRequest = useCallback(
    async (values: { email: string; password: string }) => {
      const challenge = await login(values.email, values.password);
      if (challenge?.challengeName === "NEW_PASSWORD_REQUIRED") {
        navigate("/set-password", { state: challenge });
        return;
      }
      navigate(from, { replace: true });
    },
    [navigate, from, login],
  );

  const { run, loading } = useRequest(loginRequest, {
    manual: true,
    onError: (err) => {
      const errorMsg = err?.message || "Login failed";
      if (errorMsg.includes("User does not exist")) {
        form.setFields([{ name: "email", errors: ["User does not exist."] }]);
      } else {
        form.setFields([{ name: "password", errors: [errorMsg] }]);
      }
    },
  });

  return (
    <Form form={form} layout="vertical" onFinish={run} autoComplete="on">
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: "Please enter your email" },
          { type: "email", message: "Enter a valid email address" },
        ]}
      >
        <Input prefix={<UserOutlined />} placeholder="you@example.com" />
      </Form.Item>

      <Form.Item
        name="password"
        label="Password"
        hasFeedback
        rules={[{ required: true, message: "Please enter your password" }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
      </Form.Item>

      <Row justify="end" style={{ marginBottom: 8 }}>
        <Col>
          <Link to="/forgot-password">Forgot password?</Link>
        </Col>
      </Row>

      <Form.Item>
        <Button
          block
          type="primary"
          htmlType="submit"
          loading={loading}
          onClick={() => track("Login Button Clicked")}
        >
          Log In
        </Button>
      </Form.Item>
    </Form>
  );
};

export default LoginForm;
