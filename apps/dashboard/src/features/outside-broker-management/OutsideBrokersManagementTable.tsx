import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
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
import { getBranches } from "@/entities/branch/api";
import type { Branch } from "@/entities/branch/types";
import { deleteOutsideBroker, getOutsideBrokers } from "@/entities/outside-broker/api";
import type { OutsideBroker } from "@/entities/outside-broker/types";
import { BrokerStatus } from "@/entities/outside-broker/types";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { getErrorMessage } from "@/shared/utils/errorUtils";
import { ActionPermission, hasOutsideBrokerPermission } from "@/shared/utils/permissions";
import OutsideBrokerCreateModal from "./OutsideBrokerCreateModal";
import OutsideBrokerEditModal from "./OutsideBrokerEditModal";

const { Title, Text } = Typography;
const { Search } = Input;

const OutsideBrokersManagementTable: React.FC = () => {
  const location = useLocation();
  const { user: currentUser } = useCurrentUser();
  const [brokers, setBrokers] = useState<OutsideBroker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [editingBroker, setEditingBroker] = useState<OutsideBroker | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0); // zero-indexed
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<
    "brokerName" | "mcNumber" | "status" | "createdAt" | "branch" | undefined
  >(undefined);
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>(undefined);

  // Branches list (fetched once and shared with modals)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const hasMountedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const locationRef = useRef(location.pathname);

  // Check permissions
  const canCreate = currentUser
    ? hasOutsideBrokerPermission(currentUser.role, ActionPermission.CREATE)
    : false;
  const canUpdate = currentUser
    ? hasOutsideBrokerPermission(currentUser.role, ActionPermission.UPDATE)
    : false;
  const canDelete = currentUser
    ? hasOutsideBrokerPermission(currentUser.role, ActionPermission.DELETE)
    : false;

  // Reset fetch guard when route changes and abort any in-flight fetches
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      locationRef.current = location.pathname;
      isFetchingRef.current = false;
      // Reset mounted flag so we can fetch when coming back to this page
      if (location.pathname === "/outside-brokers") {
        hasMountedRef.current = false;
      } else {
        // Reset loading state if we navigated away
        setLoading(false);
      }
    }
  }, [location.pathname]);

  const fetchBrokers = useCallback(
    async (overridePage?: number) => {
      // CRITICAL: Only fetch if we're on the outside-brokers page - check first!
      if (location.pathname !== "/outside-brokers") {
        return;
      }

      // Double-check location before proceeding (component might be stale)
      if (locationRef.current !== "/outside-brokers") {
        return;
      }

      // Skip if already fetching (prevents double calls in StrictMode)
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      try {
        const pageToFetch = overridePage !== undefined ? overridePage : currentPage;
        const response = await getOutsideBrokers({
          page: pageToFetch,
          limit: pageSize,
          sortField,
          sortOrder,
          query: searchText || undefined,
        });

        // Final safety check - only update if still on outside-brokers page
        if (
          location.pathname !== "/outside-brokers" ||
          locationRef.current !== "/outside-brokers"
        ) {
          return;
        }

        // Response should be PaginatedOutsideBrokersResponse: { brokers: [], total: number }
        setBrokers(response?.brokers || []);
        setTotal(response?.total || 0);
      } catch (error) {
        // Only show error if still on outside-brokers page
        if (
          location.pathname === "/outside-brokers" &&
          locationRef.current === "/outside-brokers"
        ) {
          message.error(getErrorMessage(error));
        }
      } finally {
        // Only update loading state if still on outside-brokers page
        if (
          location.pathname === "/outside-brokers" &&
          locationRef.current === "/outside-brokers"
        ) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [location.pathname, currentPage, pageSize, sortField, sortOrder, searchText],
  );

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const response = await getBranches({ limit: 100 });
      setBranches(response.branches || []);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if we're on the outside-brokers page
    if (location.pathname !== "/outside-brokers") {
      return;
    }

    let cancelled = false;

    const doFetch = async () => {
      if (cancelled) return;
      await fetchBrokers();
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchBrokers, location.pathname]);

  // Fetch branches once when component mounts (only on outside-brokers page)
  useEffect(() => {
    if (location.pathname !== "/outside-brokers") return;
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    fetchBranches();
  }, [location.pathname, fetchBranches]);

  const handleDelete = async (id: string) => {
    try {
      await deleteOutsideBroker(id);
      message.success("Outside broker deleted successfully");

      // If deleting the last item on the current page (and not on page 0), go to previous page
      if (brokers.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else {
        // Otherwise just refresh the current page
        fetchBrokers();
      }
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleEdit = (broker: OutsideBroker) => {
    setEditingBroker(broker);
    setIsEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalVisible(false);
    setEditingBroker(null);
    fetchBrokers();
  };

  const handleCreateSuccess = () => {
    setIsCreateModalVisible(false);
    // Reset to first page to see the newly created broker (if sorted by createdAt desc)
    setCurrentPage(0);
    // Fetch page 0 immediately to show the new broker
    fetchBrokers(0);
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
    sorter: SorterResult<OutsideBroker> | SorterResult<OutsideBroker>[],
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

  const getStatusColor = (status: BrokerStatus) => {
    switch (status) {
      case BrokerStatus.APPROVED:
        return "success";
      case BrokerStatus.PENDING:
        return "warning";
      case BrokerStatus.DENIED:
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: BrokerStatus) => {
    switch (status) {
      case BrokerStatus.APPROVED:
        return "Approved";
      case BrokerStatus.PENDING:
        return "Pending";
      case BrokerStatus.DENIED:
        return "Denied";
      default:
        return status;
    }
  };

  const filteredBrokers = brokers || [];

  const columns: ColumnsType<OutsideBroker> = [
    {
      title: "Broker Name",
      dataIndex: "brokerName",
      key: "brokerName",
      render: (name: string) => (
        <Space>
          <TeamOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
      sorter: true,
      sortOrder: sortField === "brokerName" ? sortOrder : undefined,
    },
    {
      title: "MC Number",
      dataIndex: "mcNumber",
      key: "mcNumber",
      render: (mcNumber: string) => <Text code>{mcNumber}</Text>,
      sorter: true,
      sortOrder: sortField === "mcNumber" ? sortOrder : undefined,
    },
    {
      title: "Contact Name",
      dataIndex: "contactName",
      key: "contactName",
      render: (contactName: string | null) =>
        contactName ? <Text>{contactName}</Text> : <Tag color="default">No Contact</Tag>,
    },
    {
      title: "Phone / Email",
      key: "contact",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.phone && (
            <Space size="small">
              <PhoneOutlined />
              <Text>{record.phone}</Text>
            </Space>
          )}
          {record.email && (
            <Space size="small">
              <MailOutlined />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.email}
              </Text>
            </Space>
          )}
          {!record.phone && !record.email && <Tag color="default">No Contact Info</Tag>}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: BrokerStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
      sorter: true,
      sortOrder: sortField === "status" ? sortOrder : undefined,
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      render: (branch) =>
        branch ? (
          <Space>
            <BankOutlined />
            <Text>{branch.name}</Text>
          </Space>
        ) : (
          <Tag color="default">No Branch</Tag>
        ),
      sorter: true,
      sortOrder: sortField === "branch" ? sortOrder : undefined,
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : "N/A"),
      sorter: true,
      sortOrder: sortField === "createdAt" ? sortOrder : undefined,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Edit Broker">
              <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Are you sure you want to delete this broker?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete Broker">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Statistics Card */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Brokers" value={total} prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Outside Brokers Management
              </Title>
              <Text type="secondary">Manage outside brokers and their status</Text>
            </Col>
            <Col>
              <Space>
                {canCreate && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreateModalVisible(true)}
                  >
                    Add Broker
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={fetchBrokers} loading={loading}>
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
              placeholder="Search by broker name, MC number, contact, email, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSearch={(value) => {
                setSearchText(value);
                setCurrentPage(0);
              }}
              prefix={<SearchOutlined />}
              allowClear
              enterButton
              loading={loading}
            />
          </Col>
          {searchText && (
            <Col xs={24} sm={12} md={16}>
              <Text type="secondary">
                Showing results for: <Text strong>"{searchText}"</Text>{" "}
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setSearchInput("");
                    setSearchText("");
                    setCurrentPage(0);
                  }}
                >
                  Clear
                </Button>
              </Text>
            </Col>
          )}
        </Row>

        <Table
          columns={columns}
          dataSource={filteredBrokers}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: currentPage + 1, // Convert from zero-indexed to one-indexed
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} brokers`,
            pageSizeOptions: ["5", "10", "20", "50", "100"],
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: searchText ? (
              <Empty
                description={
                  <span>
                    No brokers found matching <Text strong>"{searchText}"</Text>
                  </span>
                }
              />
            ) : (
              <Empty description="No outside brokers found" />
            ),
          }}
        />
      </Card>

      {/* Modals */}
      {editingBroker && (
        <OutsideBrokerEditModal
          broker={editingBroker}
          visible={isEditModalVisible}
          branches={branches}
          loadingBranches={loadingBranches}
          onCancel={() => {
            setIsEditModalVisible(false);
            setEditingBroker(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      <OutsideBrokerCreateModal
        visible={isCreateModalVisible}
        branches={branches}
        loadingBranches={loadingBranches}
        onCancel={() => setIsCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default OutsideBrokersManagementTable;
