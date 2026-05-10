import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Flex, message, Popconfirm, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import { getTeamMembers, removeTeamMember } from "../api/teamApi";
import type { TeamMember } from "../types/team";
import AddMemberPicker from "./AddMemberPicker";

const { Text } = Typography;

interface TeamMembersSectionProps {
  teamId: string;
}

type OptimisticAction = { type: "remove"; id: string };

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ teamId }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [page, setPage] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pageSize = 10;

  const [optimisticMembers, applyOptimistic] = useOptimistic(
    members,
    (state: TeamMember[], action: OptimisticAction) => {
      if (action.type === "remove") return state.filter((m) => m.id !== action.id);
      return state;
    },
  );

  const fetchMembers = useCallback(
    async (p: number) => {
      setLoadingMembers(true);
      try {
        const result = await getTeamMembers(teamId, { page: p, limit: pageSize });
        setMembers(result.items);
        setTotal(result.total);
      } catch (error) {
        message.error(getErrorMessage(error));
      } finally {
        setLoadingMembers(false);
      }
    },
    [teamId],
  );

  useEffect(() => {
    fetchMembers(0);
  }, [fetchMembers]);

  const handleRemove = useCallback(
    (memberId: string) => {
      startTransition(async () => {
        applyOptimistic({ type: "remove", id: memberId });
        try {
          await removeTeamMember(teamId, memberId);
          message.success("Member removed");
          const newPage = members.length === 1 && page > 0 ? page - 1 : page;
          setPage(newPage);
          await fetchMembers(newPage);
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      });
    },
    [applyOptimistic, fetchMembers, members.length, page, teamId],
  );

  const handleAdded = useCallback(async () => {
    setShowPicker(false);
    setPage(0);
    await fetchMembers(0);
  }, [fetchMembers]);

  const columns: ColumnsType<TeamMember> = [
    {
      title: "Name",
      key: "name",
      render: (_, r) => (
        <Text>
          {r.firstName} {r.lastName}
        </Text>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, r) => (
        <Popconfirm
          title="Remove member?"
          description="This will unassign the user from this team."
          onConfirm={() => handleRemove(r.id)}
          okText="Remove"
          cancelText="Cancel"
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between">
        <Text>
          Members <Tag>{total}</Tag>
        </Text>
        {!showPicker && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setShowPicker(true)}>
            Add member
          </Button>
        )}
      </Flex>
      {showPicker && (
        <AddMemberPicker
          teamId={teamId}
          onAdded={handleAdded}
          onCancel={() => setShowPicker(false)}
        />
      )}
      <Table<TeamMember>
        dataSource={optimisticMembers}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loadingMembers || isPending}
        pagination={{
          current: page + 1,
          pageSize,
          total,
          onChange: (p) => {
            startTransition(() => {
              const newPage = p - 1;
              setPage(newPage);
              fetchMembers(newPage);
            });
          },
          showSizeChanger: false,
        }}
      />
    </>
  );
};

export default TeamMembersSection;
