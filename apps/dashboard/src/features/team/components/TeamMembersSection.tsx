import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, message, Popconfirm, Select, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/utils/errorUtils";
import {
  addTeamMember,
  getTeamMembers,
  getUnassignedUsers,
  removeTeamMember,
} from "../api/teamApi";
import type { TeamMember } from "../types/team";

const { Text } = Typography;

interface TeamMembersSectionProps {
  teamId: string;
}

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ teamId }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [showPicker, setShowPicker] = useState(false);
  const [unassigned, setUnassigned] = useState<TeamMember[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [unassignedPage, setUnassignedPage] = useState(0);
  const [hasMoreUnassigned, setHasMoreUnassigned] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

  const fetchUnassigned = async (p: number, q: string, append = false) => {
    setLoadingUnassigned(true);
    try {
      const result = await getUnassignedUsers({ page: p, limit: 20, query: q || undefined });
      if (append) {
        setUnassigned((prev) => [...prev, ...result.items]);
      } else {
        setUnassigned(result.items);
      }
      setHasMoreUnassigned((p + 1) * 20 < result.total);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleOpenPicker = () => {
    setShowPicker(true);
    setUnassignedSearch("");
    setUnassignedPage(0);
    setSelectedUserId(undefined);
    fetchUnassigned(0, "");
  };

  const handleUnassignedSearch = (val: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setUnassignedSearch(val);
      setUnassignedPage(0);
      fetchUnassigned(0, val, false);
    }, 300);
  };

  const handleUnassignedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10;
    if (isBottom && !loadingUnassigned && hasMoreUnassigned) {
      const nextPage = unassignedPage + 1;
      setUnassignedPage(nextPage);
      fetchUnassigned(nextPage, unassignedSearch, true);
    }
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      await addTeamMember(teamId, selectedUserId);
      message.success("Member added");
      setShowPicker(false);
      setSelectedUserId(undefined);
      setPage(0);
      await fetchMembers(0);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeTeamMember(teamId, memberId);
      message.success("Member removed");
      const newPage = members.length === 1 && page > 0 ? page - 1 : page;
      setPage(newPage);
      await fetchMembers(newPage);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

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
    <div style={{ marginTop: 8 }}>
      <Space style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <Text strong>Members ({total})</Text>
        {!showPicker && (
          <Button size="small" icon={<PlusOutlined />} onClick={handleOpenPicker}>
            Add member
          </Button>
        )}
      </Space>

      {showPicker && (
        <Space style={{ marginBottom: 12, width: "100%" }}>
          <Select
            style={{ width: 300 }}
            placeholder="Search unassigned users"
            showSearch={{ filterOption: false, onSearch: handleUnassignedSearch }}
            onPopupScroll={handleUnassignedScroll}
            loading={loadingUnassigned}
            notFoundContent={loadingUnassigned ? <Spin size="small" /> : "No unassigned users"}
            value={selectedUserId}
            onChange={setSelectedUserId}
            options={unassigned.map((u) => ({
              value: u.id,
              label: `${u.firstName ?? ""} ${u.lastName ?? ""}`,
              email: u.email,
            }))}
            optionRender={(option) => (
              <>
                {option.label}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {option.data.email}
                </Text>
              </>
            )}
            popupRender={(menu) => (
              <>
                {menu}
                {loadingUnassigned && hasMoreUnassigned && (
                  <div style={{ textAlign: "center" }}>
                    <Spin size="small" /> Loading...
                  </div>
                )}
              </>
            )}
          />
          <Button
            type="primary"
            size="small"
            onClick={handleAdd}
            loading={adding}
            disabled={!selectedUserId}
          >
            Add
          </Button>
          <Button size="small" onClick={() => setShowPicker(false)}>
            Cancel
          </Button>
        </Space>
      )}

      <Table<TeamMember>
        dataSource={members}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loadingMembers}
        pagination={{
          current: page + 1,
          pageSize,
          total,
          onChange: (p) => {
            const newPage = p - 1;
            setPage(newPage);
            fetchMembers(newPage);
          },
          showSizeChanger: false,
        }}
      />
    </div>
  );
};

export default TeamMembersSection;
