import { Card } from "@heroui/react";
import CardHeader from "@/features/auth/components/CardHeader";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

const ForgotPasswordPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-lg">
        <Card>
          <Card.Content className="p-8">
            <CardHeader />
            <h1 className="text-2xl font-semibold text-center mb-2">Password Recovery</h1>
            <p className="text-gray-500 text-center text-sm mb-6">
              Enter your email address. We&apos;ll send you a link to reset your password.
            </p>
            <ForgotPasswordForm />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
