import { Button, FieldError, Input, Label, TextField, toast } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import PasswordRequirements from "@/features/auth/components/PasswordRequirements";
import { validatePassword } from "@/features/auth/utils/password";
import ApiClient from "@/libs/ApiClient";
import { getErrorMessage } from "@/utils/errorUtils";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .refine((v) => validatePassword(v).isValid, "Password does not meet complexity requirements"),
});

type RegistrationFormValues = z.infer<typeof schema>;

const RegistrationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const passwordValue = watch("password") ?? "";

  const onSubmit = async (values: RegistrationFormValues) => {
    setLoading(true);
    try {
      await ApiClient.post<{ userSub: string; message: string }>("/signup", values, true);
      navigate("/verification", { state: { email: values.email, signUp: true } });
    } catch (error) {
      toast.danger(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField isInvalid={!!errors.firstName}>
          <Label>First Name</Label>
          <Input placeholder="Enter your first name" {...register("firstName")} />
          <FieldError>{errors.firstName?.message}</FieldError>
        </TextField>
        <TextField isInvalid={!!errors.lastName}>
          <Label>Last Name</Label>
          <Input placeholder="Enter your last name" {...register("lastName")} />
          <FieldError>{errors.lastName?.message}</FieldError>
        </TextField>
      </div>

      <TextField isInvalid={!!errors.email}>
        <Label>Email Address</Label>
        <Input type="email" placeholder="Enter your email address" {...register("email")} />
        <FieldError>{errors.email?.message}</FieldError>
      </TextField>

      <TextField isInvalid={!!errors.password}>
        <Label>Password</Label>
        <Input type="password" placeholder="Enter password" {...register("password")} />
        <FieldError>{errors.password?.message}</FieldError>
      </TextField>

      <PasswordRequirements password={passwordValue} />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        isDisabled={!isValid || loading}
        isPending={loading}
      >
        Create Account
      </Button>
    </form>
  );
};

export default RegistrationForm;
