import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Table, Button, Space, Popconfirm, message, Card, Row, Col, Statistic, Typography, Input, Tooltip, Tag, Empty } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  CarOutlined,
  PhoneOutlined,
  MailOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { OutsideCarrier } from '@/entities/outside-carrier/types'
import { CarrierStatus, InsuranceStatus } from '@/entities/outside-carrier/types'
import { getOutsideCarriers, deleteOutsideCarrier } from '@/entities/outside-carrier/api'
import OutsideCarrierEditModal from './OutsideCarrierEditModal'
import OutsideCarrierCreateModal from './OutsideCarrierCreateModal'
import { getErrorMessage } from '@/shared/utils/errorUtils'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { hasOutsideCarrierPermission, ActionPermission } from '@/shared/utils/permissions'

const { Title, Text } = Typography
const { Search } = Input

const OutsideCarriersManagementTable: React.FC = () => {
  const location = useLocation()
  const { user: currentUser } = useCurrentUser()
  const [carriers, setCarriers] = useState<OutsideCarrier[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [editingCarrier, setEditingCarrier] = useState<OutsideCarrier | null>(null)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0) // zero-indexed
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState<'carrierName' | 'mcDotNumber' | 'status' | 'insuranceStatus' | 'createdAt' | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(undefined)

  const hasMountedRef = useRef(false)
  const isFetchingRef = useRef(false)
  const locationRef = useRef(location.pathname)

  // Check permissions
  const canCreate = currentUser ? hasOutsideCarrierPermission(currentUser.role, ActionPermission.CREATE) : false
  const canUpdate = currentUser ? hasOutsideCarrierPermission(currentUser.role, ActionPermission.UPDATE) : false
  const canDelete = currentUser ? hasOutsideCarrierPermission(currentUser.role, ActionPermission.DELETE) : false

  // Reset fetch guard when route changes and abort any in-flight fetches
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      locationRef.current = location.pathname
      isFetchingRef.current = false
      // Reset mounted flag so we can fetch when coming back to this page
      if (location.pathname === '/outside-carriers') {
        hasMountedRef.current = false
      } else {
        // Reset loading state if we navigated away
        setLoading(false)
      }
    }
  }, [location.pathname])

  const fetchCarriers = async (overridePage?: number) => {
    // CRITICAL: Only fetch if we're on the outside-carriers page - check first!
    if (location.pathname !== '/outside-carriers') {
      return
    }

    // Double-check location before proceeding (component might be stale)
    if (locationRef.current !== '/outside-carriers') {
      return
    }

    // Skip if already fetching (prevents double calls in StrictMode)
    if (isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true
    setLoading(true)
    try {
      const pageToFetch = overridePage !== undefined ? overridePage : currentPage
      const response = await getOutsideCarriers({
        page: pageToFetch,
        limit: pageSize,
        sortField,
        sortOrder,
        query: searchText || undefined,
      })

      // Final safety check - only update if still on outside-carriers page
      if (location.pathname !== '/outside-carriers' || locationRef.current !== '/outside-carriers') {
        return
      }

      // Response should be PaginatedOutsideCarriersResponse: { carriers: [], total: number }
      setCarriers(response?.carriers || [])
      setTotal(response?.total || 0)
    } catch (error) {
      // Only show error if still on outside-carriers page
      if (location.pathname === '/outside-carriers' && locationRef.current === '/outside-carriers') {
        message.error(getErrorMessage(error))
      }
    } finally {
      // Only update loading state if still on outside-carriers page
      if (location.pathname === '/outside-carriers' && locationRef.current === '/outside-carriers') {
        setLoading(false)
      }
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    // Only fetch if we're on the outside-carriers page
    if (location.pathname !== '/outside-carriers') {
      return
    }

    let cancelled = false

    const doFetch = async () => {
      if (cancelled) return
      await fetchCarriers()
    }

    doFetch()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentPage, pageSize, sortField, sortOrder, searchText])

  const handleDelete = async (id: string) => {
    try {
      await deleteOutsideCarrier(id)
      message.success('Outside carrier deleted successfully')

      // If deleting the last item on the current page (and not on page 0), go to previous page
      if (carriers.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1)
      } else {
        // Otherwise just refresh the current page
        fetchCarriers()
      }
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const handleEdit = (carrier: OutsideCarrier) => {
    setEditingCarrier(carrier)
    setIsEditModalVisible(true)
  }

  const handleEditSuccess = () => {
    setIsEditModalVisible(false)
    setEditingCarrier(null)
    fetchCarriers()
  }

  const handleCreateSuccess = () => {
    setIsCreateModalVisible(false)
    // Reset to first page to see the newly created carrier (if sorted by createdAt desc)
    setCurrentPage(0)
    // Fetch page 0 immediately to show the new carrier
    fetchCarriers(0)
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

  const getStatusColor = (status: CarrierStatus) => {
    switch (status) {
      case CarrierStatus.APPROVED:
        return 'success'
      case CarrierStatus.DENIED:
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: CarrierStatus) => {
    switch (status) {
      case CarrierStatus.APPROVED:
        return 'Approved'
      case CarrierStatus.DENIED:
        return 'Denied'
      default:
        return status
    }
  }

  const getInsuranceStatusColor = (status: InsuranceStatus) => {
    switch (status) {
      case InsuranceStatus.VALID:
        return 'success'
      case InsuranceStatus.EXPIRED:
        return 'error'
      case InsuranceStatus.PENDING:
        return 'warning'
      default:
        return 'default'
    }
  }

  const getInsuranceStatusLabel = (status: InsuranceStatus) => {
    switch (status) {
      case InsuranceStatus.VALID:
        return 'Valid'
      case InsuranceStatus.EXPIRED:
        return 'Expired'
      case InsuranceStatus.PENDING:
        return 'Pending'
      default:
        return status
    }
  }

  const filteredCarriers = carriers || []

  const columns: ColumnsType<OutsideCarrier> = [
    {
      title: 'Carrier Name',
      dataIndex: 'carrierName',
      key: 'carrierName',
      render: (name: string) => (
        <Space>
          <CarOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
      sorter: true,
      sortOrder: sortField === 'carrierName' ? sortOrder : undefined,
    },
    {
      title: 'MC / DOT Number',
      dataIndex: 'mcDotNumber',
      key: 'mcDotNumber',
      render: (mcDotNumber: string) => <Text code>{mcDotNumber}</Text>,
      sorter: true,
      sortOrder: sortField === 'mcDotNumber' ? sortOrder : undefined,
    },
    {
      title: 'Equipment Type',
      dataIndex: 'equipmentType',
      key: 'equipmentType',
      render: (equipmentType: string | null) => (equipmentType ? <Text>{equipmentType}</Text> : <Tag color="default">Not Specified</Tag>),
    },
    {
      title: 'Insurance Status',
      dataIndex: 'insuranceStatus',
      key: 'insuranceStatus',
      render: (status: InsuranceStatus) => (
        <Tag color={getInsuranceStatusColor(status)}>
          <SafetyOutlined style={{ marginRight: 4 }} />
          {getInsuranceStatusLabel(status)}
        </Tag>
      ),
      sorter: true,
      sortOrder: sortField === 'insuranceStatus' ? sortOrder : undefined,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: CarrierStatus) => <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>,
      sorter: true,
      sortOrder: sortField === 'status' ? sortOrder : undefined,
    },
    {
      title: 'Contact Info',
      key: 'contact',
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
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.email}
              </Text>
            </Space>
          )}
          {!record.phone && !record.email && <Tag color="default">No Contact Info</Tag>}
        </Space>
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
          {canUpdate && (
            <Tooltip title="Edit Carrier">
              <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Are you sure you want to delete this carrier?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete Carrier">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
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
            <Statistic title="Total Carriers" value={total} prefix={<CarOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Outside Carriers Management
              </Title>
              <Text type="secondary">Manage outside carriers and their status. System uses this data to control load assignments.</Text>
            </Col>
            <Col>
              <Space>
                {canCreate && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>
                    Add Carrier
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={() => fetchCarriers()} loading={loading}>
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
              placeholder="Search by carrier name or MC/DOT number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSearch={(value) => {
                setSearchText(value)
                setCurrentPage(0)
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
                Showing results for: <Text strong>"{searchText}"</Text>{' '}
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setSearchInput('')
                    setSearchText('')
                    setCurrentPage(0)
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
          dataSource={filteredCarriers}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: currentPage + 1, // Convert from zero-indexed to one-indexed
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} carriers`,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: searchText ? (
              <Empty
                description={
                  <span>
                    No carriers found matching <Text strong>"{searchText}"</Text>
                  </span>
                }
              />
            ) : (
              <Empty description="No outside carriers found" />
            ),
          }}
        />
      </Card>

      {/* Modals */}
      {editingCarrier && (
        <OutsideCarrierEditModal
          carrier={editingCarrier}
          visible={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false)
            setEditingCarrier(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      <OutsideCarrierCreateModal visible={isCreateModalVisible} onCancel={() => setIsCreateModalVisible(false)} onSuccess={handleCreateSuccess} />
    </div>
  )
}

export default OutsideCarriersManagementTable
