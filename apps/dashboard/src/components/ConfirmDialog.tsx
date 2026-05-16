import { AlertDialog, Button } from "@heroui/react";
import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";

type ConfirmStatus = "danger" | "warning" | "accent" | "success";

type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  status?: ConfirmStatus;
};

const confirmVariantFor = (status: ConfirmStatus): "primary" | "danger" =>
  status === "danger" ? "danger" : "primary";

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  status = "danger",
}) => (
  <AlertDialog>
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-105">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status={status} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          {description ? (
            <AlertDialog.Body>
              {typeof description === "string" ? <p>{description}</p> : description}
            </AlertDialog.Body>
          ) : null}
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary">
              {cancelLabel}
            </Button>
            <Button slot="close" variant={confirmVariantFor(status)} onPress={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </AlertDialog>
);

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  status?: ConfirmStatus;
  onConfirm: () => void;
};

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = (next: ConfirmOptions) => setOptions(next);

  const handleOpenChange = (open: boolean) => {
    if (!open) setOptions(null);
  };

  const handleConfirm = () => {
    options?.onConfirm();
    setOptions(null);
  };

  const dialog = (
    <ConfirmDialog
      isOpen={options !== null}
      onOpenChange={handleOpenChange}
      onConfirm={handleConfirm}
      title={options?.title ?? ""}
      description={options?.description}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      status={options?.status}
    />
  );

  return { confirm, dialog };
}

export default ConfirmDialog;
