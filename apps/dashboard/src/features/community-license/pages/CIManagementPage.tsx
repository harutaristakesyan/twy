import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useAntdTable, useRequest } from "ahooks";
import { App, Button, Card, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { deleteCommunityLicense, getCommunityLicenses } from "../api/ciApi";
import { CIModalProvider, useCIModal } from "../providers/CIModalProvider";
import type { CommunityLicense } from "../types/communityLicense";

const { Title } = Typography;

type SortField = "ciNumber" | "validFrom" | "createdAt" | undefined;

const CIManagementTable: React.FC = () => {
  const { message } = App.useApp();
  const { openCICreate, openCIEdit } = useCIModal();
  const { permissions } = useCurrentUser();
  const canAdd = permissions.settings.add;
  const canEdit = permissions.settings.edit;

  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize, sorter }) => {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      const result = await getCommunityLicenses({
        page: current - 1,
        limit: pageSize,
        sortField: s?.field as SortField,
        sortOrder: (s?.order ?? undefined) as "ascend" | "descend" | undefined,
      });
      return { total: result.total, list: result.communityLicenses };
    },
    { defaultPageSize: 10 },
  );

  const { run: runDelete } = useRequest(deleteCommunityLicense, {
    manual: true,
    onSuccess: () => {
      message.success("Community license deleted successfully");
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: ColumnsType<CommunityLicense> = [
    {
      title: "CI Number",
      dataIndex: "ciNumber",
      key: "ciNumber",
      sorter: true,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: "Valid From",
      dataIndex: "validFrom",
      key: "validFrom",
      sorter: true,
      render: (v: string) => v ?? "—",
    },
    {
      title: "Valid To",
      dataIndex: "validTo",
      key: "validTo",
      render: (v: string | null) => (v ? v : <Tag color="blue">Open-ended</Tag>),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleDateString(),
      sorter: true,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => openCIEdit(record, () => refresh())}
              />
            </Tooltip>
          )}
          {canEdit && (
            <Popconfirm
              title="Delete this community license?"
              description="This action cannot be undone. Branches using this CI must be updated first."
              onConfirm={() => runDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Flex justify="space-between" align="middle" gap="large" wrap style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Community Licenses ({tableProps.pagination.total ?? 0})
        </Title>
        {canAdd && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCICreate(() => refresh())}
          >
            Add Community License
          </Button>
        )}
      </Flex>
      <Table columns={columns} rowKey="id" scroll={{ x: 700 }} {...tableProps} />
    </Card>
  );
};

const CIManagementPage: React.FC = () => (
  <CIModalProvider>
    <CIManagementTable />
  </CIModalProvider>
);

export default CIManagementPage;
