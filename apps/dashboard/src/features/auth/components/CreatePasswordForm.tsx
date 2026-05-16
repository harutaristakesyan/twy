import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import ResendCode from "@/features/auth/components/ResendCode";
import ApiClient from "@/libs/ApiClient";
import { maskEmail } from "@/utils/email";

const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;

const schema = z
  .object({
    code: z.string().min(6, "Please enter the 6-digit code").max(6),
    newPassword: z.string().regex(passwordRegex, "Password does not meet requirements"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CreatePasswordFormValues = z.infer<typeof schema>;

const CreatePasswordForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email as string | undefined;
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePasswordFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ newPassword, code }: CreatePasswordFormValues) => {
    setLoading(true);
    try {
      await ApiClient.post<{ userSub: string; message: string }>(
        "/create-password",
        { email, code, newPassword },
        true,
      );
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <TextField isInvalid={!!errors.code}>
          <Label>Verification Code</Label>
          <Input placeholder="Enter 6-digit code" maxLength={6} {...register("code")} />
          <FieldError>{errors.code?.message}</FieldError>
        </TextField>
        <p className="text-xs text-gray-500">
          We&apos;ve sent a 6-digit code to <strong>{maskEmail(email ?? "")}</strong>
        </p>
      </div>

      <TextField isInvalid={!!errors.newPassword}>
        <Label>New Password</Label>
        <Input type="password" placeholder="Enter new password" {...register("newPassword")} />
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

      <div className="rounded-lg bg-gray-50 p-4 text-sm">
        <p className="font-semibold mb-2">Password must contain:</p>
        <div className="grid grid-cols-2 gap-1">
          <span>✓ At least 8 characters</span>
          <span>✓ One uppercase letter</span>
          <span>✓ One number</span>
          <span>✓ One special character</span>
        </div>
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        isPending={loading}
        isDisabled={loading}
      >
        Create Password
      </Button>

      <ResendCode />
    </form>
  );
};

export default CreatePasswordForm;
