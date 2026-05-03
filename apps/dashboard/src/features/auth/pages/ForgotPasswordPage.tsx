import { Card, Flex, Typography } from "antd";
import CardHeader from "@/features/auth/components/CardHeader.tsx";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm.tsx";

const { Title, Paragraph } = Typography;

const ForgotPasswordPage = () => {
  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #f3f4f6, #e5e7eb)",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 500, borderRadius: 16 }}>
        <CardHeader />
        <Title level={3} style={{ textAlign: "center" }}>
          Password Recovery
        </Title>
        <Paragraph type="secondary" style={{ textAlign: "center" }}>
          Enter your email address. We&apos;ll send you a link to reset your password.
        </Paragraph>
        <ForgotPasswordForm />
      </Card>
    </Flex>
  );
};

export default ForgotPasswordPage;
