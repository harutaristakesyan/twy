import { Button, FieldError, Input, Label, TextField, toast } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import PasswordRequirements from "@/features/auth/components/PasswordRequirements";
import ResendCode from "@/features/auth/components/ResendCode";
import { validatePassword } from "@/features/auth/utils/password";
import ApiClient from "@/libs/ApiClient";
import { maskEmail } from "@/utils/email";
import { getErrorMessage } from "@/utils/errorUtils";

const schema = z
  .object({
    code: z.string().min(6, "Please enter the 6-digit code").max(6),
    newPassword: z
      .string()
      .refine((v) => validatePassword(v).isValid, "Password does not meet requirements"),
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
    watch,
    formState: { errors },
  } = useForm<CreatePasswordFormValues>({ resolver: zodResolver(schema) });

  const passwordValue = watch("newPassword") ?? "";

  const onSubmit = async ({ newPassword, code }: CreatePasswordFormValues) => {
    setLoading(true);
    try {
      await ApiClient.post<{ userSub: string; message: string }>(
        "/create-password",
        { email, code, newPassword },
        true,
      );
      navigate("/login");
    } catch (error) {
      toast.danger(getErrorMessage(error));
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

      <PasswordRequirements password={passwordValue} />

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
