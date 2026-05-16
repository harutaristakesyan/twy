import { Button, Modal, Spinner, toast } from "@heroui/react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormTextField } from "@/components/form";
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
  const { control, handleSubmit, reset } = useZodForm(schema, {
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
      <FormTextField
        control={control}
        name="currentPassword"
        type="password"
        label="Current Password"
      />
      <FormTextField control={control} name="newPassword" type="password" label="New Password" />
      <FormTextField
        control={control}
        name="confirmPassword"
        type="password"
        label="Confirm New Password"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onPress={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isDisabled={mutation.isPending}>
          {mutation.isPending ? <Spinner size="sm" /> : "Save"}
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
