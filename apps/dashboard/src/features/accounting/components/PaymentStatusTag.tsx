import { Tag } from "antd";
import type { PaymentStatus } from "../types/paymentOrder";

const STATUS_COLOR: Record<PaymentStatus, string> = {
  Pending: "default",
  Approved: "blue",
  ApprovedPaid: "green",
  DeclinedHold: "red",
  PartialPaid: "orange",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  ApprovedPaid: "Approved & Paid",
  DeclinedHold: "Declined / Hold",
  PartialPaid: "Partial Paid",
};

interface PaymentStatusTagProps {
  status: PaymentStatus;
}

export default function PaymentStatusTag({ status }: PaymentStatusTagProps) {
  return <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>;
}
