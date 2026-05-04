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
import { useCallback, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fileApi } from "@/libs/fileApi";
import { getErrorMessage } from "@/utils/errorUtils";
import { useLoadModal } from "../providers/LoadModalProvider";
import type { Load } from "../types/load";

const statusColorMap: Record<string, string> = {
  Pending: "gold",
  Approved: "green",
  Denied: "red",
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function useLoadColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
): ColumnsType<Load> {
  const { message, modal } = App.useApp();
  const { openLoadEdit, openStatusUpdate } = useLoadModal();
  const { permissions } = useCurrentUser();
  const canEdit = permissions.loads.edit;

  const handleFileDownload = useCallback(
    async (fileId: string, fileName: string) => {
      try {
        message.loading({ content: "Downloading file...", key: "download" });
        await fileApi.downloadFile(fileId, fileName);
        message.success({ content: "File downloaded successfully", key: "download" });
      } catch (error) {
        message.error({ content: getErrorMessage(error), key: "download" });
      }
    },
    [message],
  );

  return useMemo(
    () => [
      {
        title: "Reference #",
        dataIndex: "referenceNumber",
        key: "referenceNumber",
        width: 130,
        fixed: "left",
        render: (text) => <strong>{text}</strong>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        sorter: true,
        render: (status: Load["status"]) => (
          <Tag color={statusColorMap[status] || "default"} style={{ textTransform: "capitalize" }}>
            {status}
          </Tag>
        ),
      },
      { title: "Customer", dataIndex: "customer", key: "customer", width: 150 },
      { title: "Contact", dataIndex: "contactName", key: "contactName", width: 130 },
      {
        title: "Carrier",
        dataIndex: "carrier",
        key: "carrier",
        width: 130,
        render: (text) => text || "-",
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
      { title: "Booked As", dataIndex: "bookedAs", key: "bookedAs", width: 110 },
      {
        title: "Pickup",
        key: "pickup",
        width: 150,
        render: (_, record) => (
          <div>
            <div>{record.pickup.name}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              {record.pickup.cityZipCode || "N/A"}
            </div>
          </div>
        ),
      },
      {
        title: "Dropoff",
        key: "dropoff",
        width: 150,
        render: (_, record) => (
          <div>
            <div>{record.dropoff.name}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              {record.dropoff.cityZipCode || "N/A"}
            </div>
          </div>
        ),
      },
      {
        title: "Carrier Rate",
        dataIndex: "carrierRate",
        key: "carrierRate",
        width: 120,
        render: (value: number | null | undefined) =>
          value != null ? (
            <strong style={{ color: "#52c41a" }}>{formatCurrency(value)}</strong>
          ) : (
            "-"
          ),
      },
      {
        title: "Customer Rate",
        dataIndex: "customerRate",
        key: "customerRate",
        width: 130,
        render: (value: number | null | undefined) =>
          value != null ? (
            <strong style={{ color: "#1890ff" }}>{formatCurrency(value)}</strong>
          ) : (
            "-"
          ),
      },
      {
        title: "Files",
        dataIndex: "files",
        key: "files",
        width: 120,
        align: "center",
        render: (files: Load["files"]) => {
          if (!files || files.length === 0) return <Tag color="default">0</Tag>;
          const menuItems: MenuProps["items"] = files.map((file) => ({
            key: file.id,
            label: (
              <Space>
                <DownloadOutlined />
                {file.fileName}
              </Space>
            ),
            onClick: () => handleFileDownload(file.id, file.fileName),
          }));
          return (
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Tag color="green" style={{ cursor: "pointer" }}>
                {files.length} file{files.length > 1 ? "s" : ""}
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
    ],
    [canEdit, handleFileDownload, modal, openLoadEdit, openStatusUpdate, refresh, runDelete],
  );
}
