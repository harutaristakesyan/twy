import { Button, FieldError, Input, Label, TextField, toast } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import ApiClient from "@/libs/ApiClient";
import { getErrorMessage } from "@/utils/errorUtils";

const passwordChecks = [
  { key: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { key: "number", label: "One number", test: (v: string) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character (!@#$%^&*)",
    test: (v: string) => /[!@#$%^&*]/.test(v),
  },
];

function validatePassword(value = "") {
  const results = passwordChecks.map((c) => ({ ...c, valid: c.test(value) }));
  const isValid = results.every((r) => r.valid);
  return { isValid, results };
}

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
  const passwordResult = validatePassword(passwordValue);

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

      {passwordValue ? (
        <ul className="text-sm space-y-1 px-1">
          {passwordResult.results.map((item) => (
            <li key={item.key} className={item.valid ? "text-green-600" : "text-red-500"}>
              {item.valid ? "✓" : "✗"} {item.label}
            </li>
          ))}
        </ul>
      ) : null}

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
