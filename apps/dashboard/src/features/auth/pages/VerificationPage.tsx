import { Card } from "@heroui/react";
import { useLocation } from "react-router-dom";
import CardHeader from "@/features/auth/components/CardHeader";
import VerificationForm from "@/features/auth/components/VerificationForm";
import { maskEmail } from "@/utils/email";

const VerificationPage = () => {
  const location = useLocation();
  const email = location.state?.email as string | undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-md">
        <Card>
          <Card.Content className="p-8">
            <CardHeader />
            <h1 className="text-2xl font-semibold text-center mb-2">Enter Verification Code</h1>
            <p className="text-gray-500 text-center text-sm mb-6">
              We&apos;ve sent a 6-digit code to <strong>{maskEmail(email ?? "")}</strong>
            </p>
            <VerificationForm />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default VerificationPage;
