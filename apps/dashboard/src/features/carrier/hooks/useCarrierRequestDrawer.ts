import { useState } from "react";
import type { CarrierRequest } from "../types/carrierRequest";

export function useCarrierRequestDrawer() {
  const [record, setRecord] = useState<CarrierRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const openView = (r: CarrierRequest) => {
    setRecord(r);
    setShowRejectInput(false);
    setRejectReason("");
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
    setRecord(null);
    setShowRejectInput(false);
    setRejectReason("");
  };

  return {
    record,
    open,
    showRejectInput,
    rejectReason,
    openView,
    closeDrawer,
    setShowRejectInput,
    setRejectReason,
  };
}
