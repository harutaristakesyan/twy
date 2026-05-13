import { Tag } from "antd";
import {
  OFFICE_EXPENSE_STATUS_LABELS,
  type OfficeExpensePaymentStatus,
} from "../types/officeExpensePaymentOrder";

const STATUS_COLOR: Record<OfficeExpensePaymentStatus, string> = {
  Pending: "default",
  Approved: "blue",
  Paid: "green",
  PartialPaid: "orange",
  Hold: "gold",
  Declined: "red",
};

interface Props {
  status: OfficeExpensePaymentStatus;
}

export default function OfficeExpenseStatusTag({ status }: Props) {
  return <Tag color={STATUS_COLOR[status]}>{OFFICE_EXPENSE_STATUS_LABELS[status]}</Tag>;
}
