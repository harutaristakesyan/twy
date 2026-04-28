import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Table, Button, Space, Popconfirm, message, Card, Row, Col, Statistic, Typography, Input, Tooltip, Tag } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ReloadOutlined, BankOutlined, UserOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Branch } from '@/entities/branch/types'
import { getBranches, deleteBranch } from '@/entities/branch/api'
import { getUsers } from '@/entities/user/api'
import type { User } from '@/entities/user/types'
import { UserRole } from '@/entities/user/types'
import BranchEditModal from './BranchEditModal'
import BranchCreateModal from './BranchCreateModal'
import { getErrorMessage } from '@/shared/utils/errorUtils'

const { Title, Text } = Typography
const { Search } = Input

const BranchManagementTable: React.FC = () => {
  const location = useLocation()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0) // zero-indexed
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState<'name' | 'owner' | 'createdAt' | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(undefined)

  // Owners list (fetched once and shared with modals)
  const [owners, setOwners] = useState<User[]>([])
  const [loadingOwners, setLoadingOwners] = useState(false)
  const hasMountedRef = useRef(false)
  const isFetchingRef = useRef(false)
  const locationRef = useRef(location.pathname)

  // Reset fetch guard when route changes and abort any in-flight fetches
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      locationRef.current = location.pathname
      isFetchingRef.current = false
      // Reset mounted flag so we can fetch when coming back to this page
      if (location.pathname === '/branches') {
        hasMountedRef.current = false
      } else {
        // Reset loading state if we navigated away
        setLoading(false)
      }
    }
  }, [location.pathname])

  const fetchBranches = async () => {
    // CRITICAL: Only fetch if we're on the branches page - check first!
    if (location.pathname !== '/branches') {
      return
    }

    // Double-check location before proceeding (component might be stale)
    if (locationRef.current !== '/branches') {
      return
    }

    // Skip if already fetching (prevents double calls in StrictMode)
    if (isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true
    setLoading(true)
    try {
      const response = await getBranches({
        page: currentPage,
        limit: pageSize,
        sortField,
        sortOrder,
        query: searchText || undefined,
      })

      // Final safety check - only update if still on branches page
      if (location.pathname !== '/branches' || locationRef.current !== '/branches') {
        return
      }

      setBranches(response.branches || [])
      setTotal(response.total || 0)
    } catch (error) {
      // Only show error if still on branches page
      if (location.pathname === '/branches' && locationRef.current === '/branches') {
        message.error(getErrorMessage(error))
      }
    } finally {
      // Only update loading state if still on branches page
      if (location.pathname === '/branches' && locationRef.current === '/branches') {
        setLoading(false)
      }
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    // Only fetch if we're on the branches page
    if (location.pathname !== '/branches') {
      return
    }

    let cancelled = false

    const doFetch = async () => {
      if (cancelled) return
      await fetchBranches()
    }

    doFetch()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentPage, pageSize, sortField, sortOrder, searchText])

  // Fetch owners once when component mounts (only on branches page)
  useEffect(() => {
    if (location.pathname !== '/branches') return
    if (hasMountedRef.current) return
    hasMountedRef.current = true
    fetchOwners()
  }, [location.pathname])

  const fetchOwners = async () => {
    setLoadingOwners(true)
    try {
      const response = await getUsers({ limit: 100 })
      // Filter users who can be owners (OWNER, HEAD_OWNER roles)
      const eligibleOwners = response.users.filter((user) => user.role === UserRole.OWNER || user.role === UserRole.HEAD_OWNER)
      setOwners(eligibleOwners)
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoadingOwners(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteBranch(id)
      message.success('Branch deleted successfully')

      // If deleting the last item on the current page (and not on page 0), go to previous page
      if (branches.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1)
      } else {
        // Otherwise just refresh the current page
        fetchBranches()
      }
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setIsEditModalVisible(true)
  }

  const handleEditSuccess = () => {
    setIsEditModalVisible(false)
    setEditingBranch(null)
    fetchBranches()
  }

  const handleCreateSuccess = () => {
    setIsCreateModalVisible(false)
    fetchBranches()
  }

  // Handle search with debouncing
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(searchInput)
      setCurrentPage(0) // Reset to first page on search
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchInput])

  // Handle table changes (pagination, sorting, filters)
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    // Handle page size change (only if it actually changed)
    if (pagination.pageSize !== undefined && pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize)
      setCurrentPage(0) // Reset to first page when page size changes
    }
    // Handle page change (only if page size didn't change)
    else if (pagination.current !== undefined) {
      setCurrentPage(pagination.current - 1) // Convert to zero-indexed
    }

    // Handle sorting (always update, even if cleared)
    if (sorter.field !== undefined) {
      setSortField(sorter.field)
      setSortOrder(sorter.order)
    } else if (sorter.order === undefined) {
      // Sort was cleared
      setSortField(undefined)
      setSortOrder(undefined)
    }
  }

  const filteredBranches = branches || []

  const columns: ColumnsType<Branch> = [
    {
      title: 'Branch Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <BankOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
      sorter: true,
      sortOrder: sortField === 'name' ? sortOrder : undefined,
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      render: (owner) =>
        owner ? (
          <Space>
            <UserOutlined />
            <div>
              <div style={{ fontWeight: 500 }}>
                {owner.firstName} {owner.lastName}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {owner.email}
              </Text>
            </div>
          </Space>
        ) : (
          <Tag color="default">No Owner</Tag>
        ),
      sorter: true,
      sortOrder: sortField === 'owner' ? sortOrder : undefined,
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
      render: (contact: string | null) =>
        contact ? (
          <Tooltip title={contact}>
            <Text ellipsis style={{ maxWidth: 200, display: 'block' }}>
              {contact}
            </Text>
          </Tooltip>
        ) : (
          <Tag color="default">No Contact</Tag>
        ),
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : 'N/A'),
      sorter: true,
      sortOrder: sortField === 'createdAt' ? sortOrder : undefined,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Branch">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this branch?"
            description="This action cannot be undone. All associated data may be affected."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Branch">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Statistics Card */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Branches" value={total} prefix={<BankOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Branch Management
              </Title>
              <Text type="secondary">Manage branches and their owners</Text>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>
                  Add Branch
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchBranches} loading={loading}>
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
              placeholder="Search branches..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredBranches}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: currentPage + 1, // Convert from zero-indexed to one-indexed
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} branches`,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Modals */}
      {editingBranch && (
        <BranchEditModal
          branch={editingBranch}
          visible={isEditModalVisible}
          owners={owners}
          loadingOwners={loadingOwners}
          onCancel={() => {
            setIsEditModalVisible(false)
            setEditingBranch(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      <BranchCreateModal
        visible={isCreateModalVisible}
        owners={owners}
        loadingOwners={loadingOwners}
        onCancel={() => setIsCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}

export default BranchManagementTable
