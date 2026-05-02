import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  message,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { deleteUser, getUsers } from "@/entities/user/api";
import type { User } from "@/entities/user/types";
import { USER_ROLE_LABELS, UserRole } from "@/entities/user/types";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { getErrorMessage } from "@/shared/utils/errorUtils";
import UserCreateModal from "./UserCreateModal";
import UserEditModal from "./UserEditModal";

const { Title, Text } = Typography;
const { Search } = Input;

const UserManagementTable: React.FC = () => {
  const location = useLocation();
  const { user: currentUser } = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  // const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  // const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0); // zero-indexed
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<
    "firstName" | "lastName" | "email" | "role" | "isActive" | "createdAt" | "branch" | undefined
  >(undefined);
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>(undefined);
  const isFetchingRef = useRef(false);
  const locationRef = useRef(location.pathname);

  // Reset fetch guard when route changes and abort any in-flight fetches
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      locationRef.current = location.pathname;
      isFetchingRef.current = false;
      // Reset loading state if we navigated away
      if (location.pathname !== "/") {
        setLoading(false);
      }
    }
  }, [location.pathname]);

  const fetchUsers = useCallback(async () => {
    // CRITICAL: Only fetch if we're on the users page - check first!
    if (location.pathname !== "/") {
      return;
    }

    // Double-check location before proceeding (component might be stale)
    if (locationRef.current !== "/") {
      return;
    }

    // Skip if already fetching (prevents double calls in StrictMode)
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    try {
      const response = await getUsers({
        page: currentPage,
        limit: pageSize,
        sortField,
        sortOrder,
        query: searchText || undefined,
      });

      // Final safety check - only update if still on users page
      if (location.pathname !== "/" || locationRef.current !== "/") {
        return;
      }

      setUsers(response.users);
      setTotal(response.total);
    } catch (error) {
      // Only show error if still on users page
      if (location.pathname === "/" && locationRef.current === "/") {
        message.error(getErrorMessage(error));
      }
    } finally {
      // Only update loading state if still on users page
      if (location.pathname === "/" && locationRef.current === "/") {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [location.pathname, currentPage, pageSize, sortField, sortOrder, searchText]);

  useEffect(() => {
    // Only fetch if we're on the users page
    if (location.pathname !== "/") {
      return;
    }

    let cancelled = false;

    const doFetch = async () => {
      if (cancelled) return;
      await fetchUsers();
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchUsers, location.pathname]);

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      message.success("User deleted successfully");

      // If deleting the last item on the current page (and not on page 0), go to previous page
      if (users.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else {
        // Otherwise just refresh the current page
        fetchUsers();
      }
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalVisible(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleCreateSuccess = () => {
    setIsCreateModalVisible(false);
    fetchUsers();
  };

  // Handle search with debouncing
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(searchInput);
      setCurrentPage(0); // Reset to first page on search
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle table changes (pagination, sorting, filters)
  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<User> | SorterResult<User>[],
  ) => {
    // Handle page size change (only if it actually changed)
    if (pagination.pageSize !== undefined && pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize);
      setCurrentPage(0); // Reset to first page when page size changes
    }
    // Handle page change (only if page size didn't change)
    else if (pagination.current !== undefined) {
      setCurrentPage(pagination.current - 1); // Convert to zero-indexed
    }

    // Handle sorting (always update, even if cleared)
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.field !== undefined) {
      setSortField(single.field as typeof sortField);
      setSortOrder(single.order ?? undefined);
    } else if (single?.order === undefined) {
      // Sort was cleared
      setSortField(undefined);
      setSortOrder(undefined);
    }
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      [UserRole.OWNER]: "red",
      [UserRole.HEAD_OWNER]: "magenta",
      [UserRole.HEAD_ACCOUNTANT]: "purple",
      [UserRole.ACCOUNTANT]: "blue",
      [UserRole.AGENT]: "green",
      [UserRole.CARRIER]: "orange",
    };
    return colors[role];
  };

  // No client-side filtering - using server-side search instead
  const filteredUsers = users || [];

  const columns: ColumnsType<User> = [
    {
      title: "Name",
      dataIndex: "firstName",
      key: "firstName",
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.firstName} {record.lastName}
            </div>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
      sorter: true,
      sortOrder: sortField === "firstName" ? sortOrder : undefined,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: UserRole) => <Tag color={getRoleColor(role)}>{USER_ROLE_LABELS[role]}</Tag>,
      sorter: true,
      sortOrder: sortField === "role" ? sortOrder : undefined,
    },
    {
      title: "Branch",
      dataIndex: "branchName",
      key: "branch",
      render: (branchName, record) => {
        // Support both formats: branch.name or branchName
        const displayName = record.branch?.name || branchName || "N/A";
        return displayName;
      },
      sorter: true,
      sortOrder: sortField === "branch" ? sortOrder : undefined,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Badge status={isActive ? "success" : "error"} text={isActive ? "Active" : "Inactive"} />
      ),
      sorter: true,
      sortOrder: sortField === "isActive" ? sortOrder : undefined,
    },
    {
      title: "Registered Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string, record) => {
        const dateToShow = date || record.registeredDate;
        return dateToShow ? new Date(dateToShow).toLocaleDateString() : "N/A";
      },
      sorter: true,
      sortOrder: sortField === "createdAt" ? sortOrder : undefined,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const isCurrentUser = currentUser?.email === record.email;
        const tooltipMessage = isCurrentUser ? "You cannot edit or delete your own account" : "";

        return (
          <Space>
            <Tooltip title={isCurrentUser ? tooltipMessage : undefined}>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={isCurrentUser}
              />
            </Tooltip>
            <Tooltip title={isCurrentUser ? tooltipMessage : undefined}>
              <Popconfirm
                title="Are you sure you want to delete this user?"
                description="This action cannot be undone."
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="text" danger icon={<DeleteOutlined />} disabled={isCurrentUser} />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* Statistics Card */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Users" value={total} prefix={<UserOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                User Management
              </Title>
              <Text type="secondary">Manage users, roles, and permissions</Text>
            </Col>
            <Col>
              <Space>
                {/* <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setIsCreateModalVisible(true)}
                >
                  Add User
                </Button> */}
                <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Search */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: currentPage + 1, // Convert from zero-indexed to one-indexed
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
            pageSizeOptions: ["5", "10", "20", "50", "100"],
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Modals */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          visible={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setEditingUser(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      <UserCreateModal
        visible={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default UserManagementTable;
