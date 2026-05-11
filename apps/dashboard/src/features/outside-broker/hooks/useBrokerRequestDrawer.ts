import { useState } from "react";
import type { BrokerRequest } from "../types/brokerRequest";

export function useBrokerRequestDrawer() {
  const [record, setRecord] = useState<BrokerRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const openView = (r: BrokerRequest) => {
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
