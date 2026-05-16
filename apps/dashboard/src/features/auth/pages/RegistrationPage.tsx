import { Card } from "@heroui/react";
import { Link } from "react-router-dom";
import CardHeader from "@/features/auth/components/CardHeader";
import RegistrationForm from "@/features/auth/components/RegistrationForm";

const RegistrationPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-md">
        <Card>
          <Card.Content className="p-8">
            <CardHeader />
            <h1 className="text-2xl font-semibold text-center mb-6">Create your account</h1>
            <RegistrationForm />
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="font-semibold">Already have an account?</span>
              <Link to="/login">Log in</Link>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationPage;
