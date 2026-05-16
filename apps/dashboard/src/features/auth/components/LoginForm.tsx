import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/providers/AuthProvider";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});

type LoginFormValues = z.infer<typeof schema>;

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const challenge = await login(values.email, values.password);
      if (challenge?.challengeName === "NEW_PASSWORD_REQUIRED") {
        navigate("/set-password", { state: challenge });
        return;
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const errorMsg = (err instanceof Error ? err.message : null) ?? "Login failed";
      if (errorMsg.includes("User does not exist")) {
        setError("email", { message: "User does not exist." });
      } else {
        setError("password", { message: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="on" className="flex flex-col gap-4">
      <TextField isInvalid={!!errors.email}>
        <Label>Email</Label>
        <Input
          type="email"
          variant="secondary"
          placeholder="you@example.com"
          {...register("email")}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </TextField>

      <TextField isInvalid={!!errors.password}>
        <Label>Password</Label>
        <Input
          type="password"
          variant="secondary"
          placeholder="••••••••"
          {...register("password")}
        />
        <FieldError>{errors.password?.message}</FieldError>
      </TextField>

      <div className="flex justify-end">
        <Link to="/forgot-password" className="link">
          Forgot password ?
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isPending={loading}
        isDisabled={loading}
      >
        Log In
      </Button>
    </form>
  );
};

export default LoginForm;
