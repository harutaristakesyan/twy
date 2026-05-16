import { Card, Link as HeroLink } from "@heroui/react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import LoginForm from "@/features/auth/components/LoginForm";

const LoginPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-md">
        <Card>
          <Card.Content className="p-8">
            <div className="flex flex-col items-center mb-6">
              <Logo />
              <h1 className="text-2xl font-semibold mt-4">Log in to your account</h1>
            </div>
            <LoginForm />
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm">Don&apos;t have an account?</span>
              <Link to="/register" className="link">
                Register now
                <HeroLink.Icon className="link__icon" />
              </Link>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
