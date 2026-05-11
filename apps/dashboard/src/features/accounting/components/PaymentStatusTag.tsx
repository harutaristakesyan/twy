import { Tag } from "antd";
import type { PaymentStatus } from "../types/paymentOrder";

const STATUS_COLOR: Record<PaymentStatus, string> = {
  Pending: "default",
  Approved: "blue",
  Paid: "green",
  PartialPaid: "orange",
  Hold: "gold",
  Declined: "red",
  ReadyForInvoice: "cyan",
};

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  PartialPaid: "Partial Paid",
  Paid: "Paid",
  Hold: "Hold",
  Declined: "Declined",
  ReadyForInvoice: "Ready for Invoice",
};

interface PaymentStatusTagProps {
  status: PaymentStatus;
}

export default function PaymentStatusTag({ status }: PaymentStatusTagProps) {
  return <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>;
}
