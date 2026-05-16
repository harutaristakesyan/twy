import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { applyLogin } from "@/features/auth/api/authActions";
import ApiClient from "@/libs/ApiClient";
import type { ApiResponse } from "@/libs/api-types";

interface SetPasswordFormProps {
  session: string;
  email: string;
  onSuccess: () => void;
}

interface TokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SetPasswordFormValues = z.infer<typeof schema>;

const SetPasswordForm = ({ session, email, onSuccess }: SetPasswordFormProps) => {
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ newPassword }: SetPasswordFormValues) => {
    setLoading(true);
    try {
      const res = await ApiClient.post<ApiResponse<TokenResponse>>(
        "/respond-to-challenge",
        { challengeName: "NEW_PASSWORD_REQUIRED", session, email, newPassword },
        true,
      );
      applyLogin(res.data, "local");
      onSuccess();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setSessionExpired(true);
      } else {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to set password";
        setError("newPassword", { message });
      }
    } finally {
      setLoading(false);
    }
  };

  if (sessionExpired) {
    return (
      <p className="text-sm text-gray-700">
        Your session has expired. Please <Link to="/login">log in again</Link>.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField isInvalid={!!errors.newPassword}>
        <Label>New Password</Label>
        <Input type="password" placeholder="New password" {...register("newPassword")} />
        <FieldError>{errors.newPassword?.message}</FieldError>
      </TextField>

      <TextField isInvalid={!!errors.confirmPassword}>
        <Label>Confirm Password</Label>
        <Input
          type="password"
          placeholder="Confirm new password"
          {...register("confirmPassword")}
        />
        <FieldError>{errors.confirmPassword?.message}</FieldError>
      </TextField>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isPending={loading}
        isDisabled={loading}
      >
        Set Password
      </Button>
    </form>
  );
};

export default SetPasswordForm;
