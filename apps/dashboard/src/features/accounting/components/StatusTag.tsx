import { Tag } from "antd";
import type React from "react";
import type { InvoiceStatus } from "../types/index.ts";

const LOAD_STATUS_COLOR: Record<string, string> = {
  Pending: "default",
  Approved: "blue",
  ApprovedPaid: "green",
  Hold: "red",
  Denied: "red",
};

const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: "default",
  sent: "processing",
  received: "blue",
  paid: "green",
  overdue: "red",
  void: "default",
};

type LoadStatusTagProps = { kind: "load"; status: string };
type InvoiceStatusTagProps = { kind: "invoice"; status: InvoiceStatus };
type StatusTagProps = LoadStatusTagProps | InvoiceStatusTagProps;

const StatusTag: React.FC<StatusTagProps> = (props) => {
  if (props.kind === "invoice") {
    return (
      <Tag color={INVOICE_STATUS_COLOR[props.status]} style={{ textTransform: "capitalize" }}>
        {props.status}
      </Tag>
    );
  }
  return (
    <Tag
      color={LOAD_STATUS_COLOR[props.status] ?? "default"}
      style={{ textTransform: "capitalize" }}
    >
      {props.status}
    </Tag>
  );
};

export default StatusTag;
