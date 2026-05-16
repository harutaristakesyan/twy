import { Button, FieldError, Input, Label, TextField, toast } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import ResendCode from "@/features/auth/components/ResendCode";
import ApiClient from "@/libs/ApiClient";
import { getErrorMessage } from "@/utils/errorUtils";

const schema = z.object({
  code: z.string().min(6, "Please enter the 6-digit code").max(6),
});

type VerificationFormValues = z.infer<typeof schema>;

const VerificationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email as string | undefined;
  const isSignUpFlow = location.state?.signUp === true;
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: VerificationFormValues) => {
    setLoading(true);
    try {
      await ApiClient.post<{ userSub: string; message: string }>(
        "/verify",
        { email, code: values.code },
        true,
      );
      if (isSignUpFlow) {
        navigate("/login", { state: { email } });
      } else {
        navigate("/create-password", { state: { email, code: values.code } });
      }
    } catch (err) {
      toast.danger(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex justify-center">
        <TextField isInvalid={!!errors.code} className="w-full max-w-xs text-center">
          <Label>Verification Code</Label>
          <Input placeholder="6-digit code" maxLength={6} {...register("code")} />
          <FieldError>{errors.code?.message}</FieldError>
        </TextField>
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isPending={loading}
        isDisabled={loading}
      >
        Verify Code
      </Button>

      <ResendCode />
    </form>
  );
};

export default VerificationForm;
