import { Card } from "@heroui/react";
import CardHeader from "@/features/auth/components/CardHeader";
import CreatePasswordForm from "@/features/auth/components/CreatePasswordForm";

const CreatePasswordPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-lg">
        <Card>
          <Card.Content className="p-8">
            <CardHeader />
            <h1 className="text-2xl font-semibold mb-1">Create Password</h1>
            <p className="text-gray-500 text-sm mb-6">
              Create a new password that is at least 8 characters long.
            </p>
            <CreatePasswordForm />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default CreatePasswordPage;
