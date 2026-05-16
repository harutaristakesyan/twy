import { Button, FieldError, Input, Label, TextField, toast } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import ApiClient from "@/libs/ApiClient";
import { getErrorMessage } from "@/utils/errorUtils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ForgotPasswordFormValues = z.infer<typeof schema>;

const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await ApiClient.post("/forgot-password", { email });
      toast.success("Verification code sent");
      navigate("/create-password", { state: { email, signUp: false } });
    } catch (error) {
      toast.danger(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField isInvalid={!!errors.email}>
        <Label>Email Address</Label>
        <Input type="email" placeholder="you@example.com" {...register("email")} />
        <FieldError>{errors.email?.message}</FieldError>
      </TextField>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isPending={loading}
        isDisabled={loading}
      >
        Send Recovery Code
      </Button>
    </form>
  );
};

export default ForgotPasswordForm;
