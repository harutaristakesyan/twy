import { Button, FieldError, Label, Modal, TextField, toast } from "@heroui/react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
import { changePassword } from "../api/userApi";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password"),
    newPassword: z.string().min(1, "Please enter a new password"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export type ChangePasswordFormProps = {
  onClose: () => void;
};

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onClose }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm(schema, {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const mutation = useApiMutation(changePassword, {
    onSuccess: () => {
      toast.success("Password changed successfully");
      reset();
      onClose();
    },
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    mutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <form id="change-password-form" onSubmit={onSubmit} className="flex flex-col gap-4">
      <TextField name="currentPassword" type="password" isInvalid={!!errors.currentPassword}>
        <Label>Current Password</Label>
        <input
          type="password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("currentPassword")}
        />
        <FieldError>{errors.currentPassword?.message}</FieldError>
      </TextField>
      <TextField name="newPassword" type="password" isInvalid={!!errors.newPassword}>
        <Label>New Password</Label>
        <input
          type="password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("newPassword")}
        />
        <FieldError>{errors.newPassword?.message}</FieldError>
      </TextField>
      <TextField name="confirmPassword" type="password" isInvalid={!!errors.confirmPassword}>
        <Label>Confirm New Password</Label>
        <input
          type="password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("confirmPassword")}
        />
        <FieldError>{errors.confirmPassword?.message}</FieldError>
      </TextField>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onPress={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isPending={mutation.isPending}>
          {({ isPending }) => (isPending ? "Saving..." : "Save")}
        </Button>
      </div>
    </form>
  );
};

const ChangePasswordModal = () => {
  const navigate = useNavigate();
  const close = () => navigate("..");

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Change Password</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <ChangePasswordForm onClose={close} />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default ChangePasswordModal;
