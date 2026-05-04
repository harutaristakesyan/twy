import { Card, Flex, Typography } from "antd";
import { useLocation } from "react-router-dom";
import CardHeader from "@/features/auth/components/CardHeader.tsx";
import VerificationForm from "@/features/auth/components/VerificationForm.tsx";
import { maskEmail } from "@/utils/email.ts";

const { Title, Paragraph, Text } = Typography;

const VerificationPage = () => {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <Flex
      justify="center"
      align="center"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #f3f4f6, #e5e7eb)",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 420, borderRadius: 16 }}>
        <CardHeader />
        <Title level={3} style={{ textAlign: "center" }}>
          Enter Verification Code
        </Title>
        <Paragraph type="secondary" style={{ textAlign: "center" }}>
          We&apos;ve sent a 6-digit code to <Text strong>{maskEmail(email || "")}</Text>
        </Paragraph>
        <VerificationForm />
      </Card>
    </Flex>
  );
};

export default VerificationPage;
