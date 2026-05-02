import { Card, Flex, Typography } from "antd";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CardHeader from "@/features/auth/components/CardHeader.tsx";
import SetPasswordForm from "@/features/auth/components/SetPasswordForm.tsx";

const { Title, Paragraph } = Typography;

const SetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as
    | { challengeName: string; session: string; email: string }
    | null
    | undefined;

  useEffect(() => {
    if (!state || state.challengeName !== "NEW_PASSWORD_REQUIRED") {
      navigate("/login", { replace: true });
    }
  }, [state, navigate]);

  if (!state || state.challengeName !== "NEW_PASSWORD_REQUIRED") {
    return null;
  }

  return (
    <Flex
      justify="center"
      align="center"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #f3f4f6, #e5e7eb)",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 500, borderRadius: 16 }}>
        <CardHeader />
        <Title level={3}>Set Your Password</Title>
        <Paragraph type="secondary">
          Choose a permanent password for your account. It must be at least 8 characters.
        </Paragraph>
        <SetPasswordForm
          session={state.session}
          email={state.email}
          onSuccess={() => {
            window.location.replace("/");
          }}
        />
      </Card>
    </Flex>
  );
};

export default SetPasswordPage;
