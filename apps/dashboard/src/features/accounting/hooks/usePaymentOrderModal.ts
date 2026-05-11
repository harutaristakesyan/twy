import { useState } from "react";
import type { PaymentOrder } from "../types/paymentOrder";

type ModalMode = "edit" | "view";

export function usePaymentOrderModal() {
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("edit");

  const openModal = (record: PaymentOrder, modalMode: ModalMode) => {
    setSelectedOrder(record);
    setMode(modalMode);
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  return { selectedOrder, open, mode, openModal, closeModal };
}
