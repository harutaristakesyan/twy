import type { PaymentStatus } from "../types/paymentOrder";

const STATUS_CLASS: Record<PaymentStatus, string> = {
  Pending: "bg-gray-100 text-gray-700",
  Approved: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
  PartialPaid: "bg-orange-100 text-orange-700",
  Hold: "bg-yellow-100 text-yellow-700",
  Declined: "bg-red-100 text-red-700",
  ReadyForInvoice: "bg-cyan-100 text-cyan-700",
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
  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CLASS[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
