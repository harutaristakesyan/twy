import { DeleteOutlined, EditOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TWY_TEAM_ID } from "../constants";
import { useTeamModal } from "../providers/TeamModalProvider";
import type { Team } from "../types/team";

const { Text } = Typography;

export function useTeamColumns(
  refresh: () => void,
  runDelete: (id: string) => void,
): ColumnsType<Team> {
  const { permissions } = useCurrentUser();
  const { openTeamEdit } = useTeamModal();
  const canEdit = permissions.teams.edit;

  return useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        render: (name: string) => (
          <Space>
            <TeamOutlined />
            <Text strong>{name}</Text>
          </Space>
        ),
        sorter: true,
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (desc: string | null) =>
          desc ? <Text>{desc}</Text> : <Tag color="default">No description</Tag>,
      },
      {
        title: "Scope",
        key: "scope",
        render: (_, record) => (
          <Space>
            {record.branchRestricted && <Tag color="orange">Branch-restricted</Tag>}
            {record.onlyOwnData && <Tag color="purple">Own data only</Tag>}
            {!record.branchRestricted && !record.onlyOwnData && (
              <Tag color="green">Unrestricted</Tag>
            )}
          </Space>
        ),
      },
      {
        title: "Members",
        dataIndex: "memberCount",
        key: "memberCount",
        render: (count: number) => (
          <Tag>
            {count} member{count !== 1 ? "s" : ""}
          </Tag>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (date: string) => (date ? new Date(date).toLocaleDateString() : "—"),
        sorter: true,
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => {
          const isSystemTeam = record.id === TWY_TEAM_ID;
          return (
            <Space>
              {canEdit && (
                <Tooltip title="Edit Team">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => openTeamEdit(record, refresh)}
                  />
                </Tooltip>
              )}
              {canEdit && !isSystemTeam && (
                <Popconfirm
                  title="Delete team?"
                  description={
                    record.memberCount > 0
                      ? `This team has ${record.memberCount} member(s). Remove them first.`
                      : "This action cannot be undone."
                  }
                  onConfirm={() => runDelete(record.id)}
                  okText="Yes"
                  cancelText="No"
                  disabled={record.memberCount > 0}
                >
                  <Tooltip
                    title={
                      record.memberCount > 0 ? "Remove all members before deleting" : "Delete Team"
                    }
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={record.memberCount > 0}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          );
        },
      },
    ],
    [canEdit, openTeamEdit, refresh, runDelete],
  );
}
