import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { App, Button, Dropdown, Space, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fileApi } from "@/libs/fileApi";
import { getErrorMessage } from "@/utils/errorUtils";
import { formatCurrency } from "@/utils/formatters";
import { useLoadModal } from "../providers/LoadModalProvider";
import type { Load, Location } from "../types/load";

/** API list row during transition if cached JSON still has singular `pickup` / `dropoff`. */
type LoadListRow = Load & { pickup?: Location; dropoff?: Location };

const statusColorMap: Record<string, string> = {
  Pending: "gold",
  Approved: "green",
  Delivered: "cyan",
  Declined: "red",
  Hold: "orange",
};

const CATEGORY_LABELS: Record<string, string> = {
  rate_confirmation: "RateCon",
  pod: "POD",
  carrier_invoice: "Carrier Inv",
  broker_invoice: "Broker Inv",
  other: "Other",
};

/** Handles undefined arrays, stale cached list rows, or legacy single `pickup` / `dropoff` objects. */
const resolveStops = (
  record: LoadListRow,
  key: "pickups" | "dropoffs",
  legacyKey: "pickup" | "dropoff",
): Load["pickups"] => {
  const list = record[key];
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  const legacy = record[legacyKey];
  if (legacy && typeof legacy === "object") {
    return [legacy];
  }
  return [];
};

export function useLoadColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
): ColumnsType<Load> {
  const { message, modal } = App.useApp();
  const { openLoadEdit, openStatusUpdate } = useLoadModal();
  const { permissions } = useCurrentUser();
  const canEdit = permissions.loads.edit;

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      message.loading({ content: "Downloading file...", key: "download" });
      await fileApi.downloadFile(fileId, fileName);
      message.success({ content: "File downloaded successfully", key: "download" });
    } catch (error) {
      message.error({ content: getErrorMessage(error), key: "download" });
    }
  };

  return [
    {
      title: "Reference #",
      dataIndex: "referenceNumber",
      key: "referenceNumber",
      width: 130,
      fixed: "left",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Branch",
      dataIndex: "branchName",
      key: "branchName",
      width: 130,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      sorter: true,
      render: (status: Load["status"]) => (
        <Tag color={statusColorMap[status] || "default"} style={{ textTransform: "capitalize" }}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Broker",
      dataIndex: "customer",
      key: "customer",
      width: 150,
      sorter: true,
    },
    { title: "Contact", dataIndex: "contactName", key: "contactName", width: 130 },
    {
      title: "Carrier",
      dataIndex: "carrier",
      key: "carrier",
      width: 130,
      render: (text) => text || "—",
    },
    {
      title: "Broker Receivable",
      dataIndex: "customerRate",
      key: "customerRate",
      width: 150,
      render: (value: number | null | undefined) =>
        value != null ? <strong style={{ color: "#1890ff" }}>{formatCurrency(value)}</strong> : "—",
    },
    {
      title: "Carrier Payable",
      dataIndex: "carrierRate",
      key: "carrierRate",
      width: 140,
      render: (value: number | null | undefined) =>
        value != null ? <strong style={{ color: "#52c41a" }}>{formatCurrency(value)}</strong> : "—",
    },
    {
      title: "Charges",
      dataIndex: "chargeAmount",
      key: "chargeAmount",
      width: 110,
      render: (value: number | null, record: Load) =>
        record.isChargable && value != null ? formatCurrency(value) : "—",
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 140,
      render: (text) => text || "—",
    },
    {
      title: "Payment Terms",
      dataIndex: "paymentTerms",
      key: "paymentTerms",
      width: 140,
      render: (text) => text || "—",
    },
    {
      title: "Load Type",
      dataIndex: "loadType",
      key: "loadType",
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    { title: "Service Type", dataIndex: "serviceType", key: "serviceType", width: 120 },
    { title: "Commodity", dataIndex: "commodity", key: "commodity", width: 130 },
    { title: "Weight", dataIndex: "weight", key: "weight", width: 100 },
    {
      title: "Pickup",
      key: "pickups",
      width: 150,
      render: (_, record) => {
        const pickups = resolveStops(record, "pickups", "pickup");
        const first = pickups[0];
        const extra = pickups.length - 1;
        if (!first) return "—";
        return (
          <div>
            <div>{first.name}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>{first.cityZipCode || "N/A"}</div>
            {extra > 0 && <div style={{ fontSize: "12px", color: "#888" }}>+{extra} more</div>}
          </div>
        );
      },
    },
    {
      title: "Dropoff",
      key: "dropoffs",
      width: 150,
      render: (_, record) => {
        const dropoffs = resolveStops(record, "dropoffs", "dropoff");
        const first = dropoffs[0];
        const extra = dropoffs.length - 1;
        if (!first) return "—";
        return (
          <div>
            <div>{first.name}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>{first.cityZipCode || "N/A"}</div>
            {extra > 0 && <div style={{ fontSize: "12px", color: "#888" }}>+{extra} more</div>}
          </div>
        );
      },
    },
    {
      title: "Documents",
      dataIndex: "files",
      key: "files",
      width: 130,
      align: "center",
      render: (files: Load["files"]) => {
        if (!files || files.length === 0) return <Tag color="default">None</Tag>;
        const menuItems: MenuProps["items"] = files.map((f) => ({
          key: f.id,
          label: (
            <Space>
              <DownloadOutlined />
              <span>
                {f.documentCategory
                  ? (CATEGORY_LABELS[f.documentCategory] ?? f.documentCategory)
                  : f.fileName}
              </span>
            </Space>
          ),
          onClick: () => handleFileDownload(f.id, f.fileName),
        }));
        return (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Tag color="green" style={{ cursor: "pointer" }}>
              {files.length} doc{files.length > 1 ? "s" : ""}
            </Tag>
          </Dropdown>
        );
      },
    },
    ...(canEdit
      ? [
          {
            title: "Actions",
            key: "actions",
            fixed: "end" as const,
            width: 100,
            align: "center" as const,
            render: (_: unknown, record: Load) => {
              const items: MenuProps["items"] = [
                {
                  key: "approve",
                  icon: <CheckCircleOutlined />,
                  label: "Approve",
                  onClick: () => openStatusUpdate({ load: record }, () => refresh()),
                },
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "Edit",
                  onClick: () => openLoadEdit({ load: record }, () => refresh()),
                },
                { type: "divider" },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    modal.confirm({
                      title: "Delete Load",
                      content: "Are you sure you want to delete this load?",
                      okText: "Delete",
                      okType: "danger",
                      cancelText: "Cancel",
                      onOk: () => runDelete(record.id),
                    }),
                },
              ];
              return (
                <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
                  <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
              );
            },
          },
        ]
      : []),
  ];
}
