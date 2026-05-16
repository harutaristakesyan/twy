import { Card } from "@heroui/react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CardHeader from "@/features/auth/components/CardHeader";
import SetPasswordForm from "@/features/auth/components/SetPasswordForm";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-lg">
        <Card>
          <Card.Content className="p-8">
            <CardHeader />
            <h1 className="text-2xl font-semibold mb-1">Set Your Password</h1>
            <p className="text-gray-500 text-sm mb-6">
              Choose a permanent password for your account. It must be at least 8 characters.
            </p>
            <SetPasswordForm
              session={state.session}
              email={state.email}
              onSuccess={() => {
                window.location.replace("/");
              }}
            />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default SetPasswordPage;
