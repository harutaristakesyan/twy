import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react'
import { Table, Button, Space, Popconfirm, Input, Tag, App, Card, Row, Col, Typography, Statistic, Dropdown, type MenuProps, Tooltip } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { loadApi, type Load, type GetLoadsParams } from '@/entities/load'
import { LoadEditModal } from './LoadEditModal'
import { StatusUpdateModal } from './StatusUpdateModal'
import { fileApi } from '@/shared/api/fileApi'
import { getErrorMessage } from '@/shared/utils/errorUtils'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

const { Search } = Input
const { Title, Text } = Typography

export const LoadManagementTable: React.FC = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useCurrentUser()
  const [loads, setLoads] = useState<Load[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [sortState, setSortState] = useState<{ field?: GetLoadsParams['sortField']; order?: GetLoadsParams['sortOrder'] }>({})
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [loadForStatusUpdate, setLoadForStatusUpdate] = useState<Load | null>(null)
  const hasMountedRef = useRef(false)
  const locationRef = useRef(location.pathname)

  // Check if user is assigned to a branch
  const isBranchAssigned = user?.branch?.id !== undefined && user?.branch?.id !== null

  // Reset fetch guard when route changes
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      locationRef.current = location.pathname
      // Reset mounted flag so we can fetch when coming back to this page
      if (location.pathname === '/loads') {
        hasMountedRef.current = false
      }
    }
  }, [location.pathname])

  const fetchLoads = useCallback(
    async (
      page: number = pagination.current,
      pageSize: number = pagination.pageSize,
      search: string = searchText,
      sortField: GetLoadsParams['sortField'] = sortState.field,
      sortOrder: GetLoadsParams['sortOrder'] = sortState.order
    ) => {
      // Only fetch if we're on the loads page
      if (location.pathname !== '/loads') {
        return
      }

      try {
        setLoading(true)
        const response = await loadApi.getAll({
          page: page - 1,
          limit: pageSize,
          query: search ? search : undefined,
          sortField,
          sortOrder,
        })

        // Final safety check - only update if still on loads page
        if (location.pathname !== '/loads' || locationRef.current !== '/loads') {
          return
        }

        setLoads(response.loads)
        setPagination({ current: page, pageSize, total: response.total })
      } catch (error) {
        // Only show error if still on loads page
        if (location.pathname === '/loads' && locationRef.current === '/loads') {
          console.error('Failed to fetch loads:', error)
          message.error(getErrorMessage(error))
        }
      } finally {
        // Only update loading state if still on loads page
        if (location.pathname === '/loads' && locationRef.current === '/loads') {
          setLoading(false)
        }
      }
    },
    [message, pagination.current, pagination.pageSize, searchText, sortState.field, sortState.order, location.pathname]
  )

  useEffect(() => {
    // Only fetch if we're on the loads page
    if (location.pathname !== '/loads') {
      return
    }

    let cancelled = false

    const doFetch = async () => {
      if (cancelled) return
      if (hasMountedRef.current) return
      hasMountedRef.current = true
      await fetchLoads(1, pagination.pageSize)
    }

    doFetch()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const handleDelete = async (id: string) => {
    try {
      await loadApi.delete(id)
      message.success('Load deleted successfully')
      fetchLoads(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('Failed to delete load:', error)
      message.error(getErrorMessage(error))
    }
  }

  const handleEdit = (record: Load) => {
    setSelectedLoad(record)
    setEditModalOpen(true)
  }

  const handleCreateNew = () => {
    navigate('/loads/create')
  }

  const handleEditSuccess = () => {
    fetchLoads(pagination.current, pagination.pageSize)
    setEditModalOpen(false)
    setSelectedLoad(null)
  }

  const handleStatusUpdate = (record: Load) => {
    setLoadForStatusUpdate(record)
    setStatusModalOpen(true)
  }

  const handleStatusUpdateSuccess = () => {
    fetchLoads(pagination.current, pagination.pageSize)
  }

  const handleStatusModalClose = () => {
    setStatusModalOpen(false)
    setLoadForStatusUpdate(null)
  }

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      message.loading({ content: 'Downloading file...', key: 'download' })
      await fileApi.downloadFile(fileId, fileName)
      message.success({ content: 'File downloaded successfully', key: 'download' })
    } catch (error) {
      console.error('Failed to download file:', error)
      message.error({ content: getErrorMessage(error), key: 'download' })
    }
  }

  const handleTableChange = (tablePagination: any, _filters: any, sorter: any) => {
    let field: GetLoadsParams['sortField']
    let order: GetLoadsParams['sortOrder']

    if (!Array.isArray(sorter) && sorter?.field && sorter?.order) {
      const validFields: GetLoadsParams['sortField'][] = ['referenceNumber', 'status', 'createdAt', 'customer']
      if (validFields.includes(sorter.field)) {
        field = sorter.field
        order = sorter.order
      }
    }

    setSortState({ field, order })
    fetchLoads(tablePagination.current, tablePagination.pageSize, searchText, field, order)
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    fetchLoads(1, pagination.pageSize, value, sortState.field, sortState.order)
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchText(value)
    if (value === '') {
      fetchLoads(1, pagination.pageSize, '', sortState.field, sortState.order)
    }
  }

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) {
      return '-'
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const statusColorMap: Record<string, string> = {
    Pending: 'gold',
    Approved: 'green',
    Denied: 'red',
  }

  const columns: ColumnsType<Load> = [
    {
      title: 'Reference #',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 130,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      sorter: true,
      render: (status: Load['status']) => (
        <Tag color={statusColorMap[status] || 'default'} style={{ textTransform: 'capitalize' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      width: 150,
    },
    {
      title: 'Contact',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 130,
    },
    {
      title: 'Carrier',
      dataIndex: 'carrier',
      key: 'carrier',
      width: 130,
      render: (text) => text || '-',
    },
    {
      title: 'Load Type',
      dataIndex: 'loadType',
      key: 'loadType',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Service Type',
      dataIndex: 'serviceType',
      key: 'serviceType',
      width: 120,
    },
    {
      title: 'Commodity',
      dataIndex: 'commodity',
      key: 'commodity',
      width: 130,
    },
    {
      title: 'Weight',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
    },
    {
      title: 'Booked As',
      dataIndex: 'bookedAs',
      key: 'bookedAs',
      width: 110,
    },
    {
      title: 'Pickup',
      key: 'pickup',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.pickup.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.pickup.cityZipCode || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Dropoff',
      key: 'dropoff',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.dropoff.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.dropoff.cityZipCode || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Carrier Rate',
      dataIndex: 'carrierRate',
      key: 'carrierRate',
      width: 120,
      render: (value: number | null | undefined) => (value != null ? <strong style={{ color: '#52c41a' }}>{formatCurrency(value)}</strong> : '-'),
    },
    {
      title: 'Customer Rate',
      dataIndex: 'customerRate',
      key: 'customerRate',
      width: 130,
      render: (value: number | null | undefined) => (value != null ? <strong style={{ color: '#1890ff' }}>{formatCurrency(value)}</strong> : '-'),
    },
    {
      title: 'Files',
      dataIndex: 'files',
      key: 'files',
      width: 120,
      align: 'center',
      render: (files: Load['files']) => {
        const hasFiles = files && files.length > 0

        if (!hasFiles) {
          return <Tag color="default">0</Tag>
        }

        const menuItems: MenuProps['items'] = files.map((file) => ({
          key: file.id,
          label: (
            <Space>
              <DownloadOutlined />
              {file.fileName}
            </Space>
          ),
          onClick: () => handleFileDownload(file.id, file.fileName),
        }))

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Tag color="green" style={{ cursor: 'pointer' }}>
              {files.length} file{files.length > 1 ? 's' : ''}
            </Tag>
          </Dropdown>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 240,
      align: 'right',
      render: (_, record) => (
        <Space size="small" wrap={false}>
          <Button
            type="link"
            icon={<CheckCircleOutlined />}
            onClick={() => handleStatusUpdate(record)}
            style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}
          >
            Status
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
            Edit
          </Button>
          <Popconfirm
            title="Delete Load"
            description="Are you sure you want to delete this load?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
              Delete
            </Button>
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
            <Statistic title="Total Loads" value={pagination.total} prefix={<TruckOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Load Management
              </Title>
              <Text type="secondary">Manage loads and shipments</Text>
            </Col>
            <Col>
              <Space>
                <Tooltip
                  title={
                    !isBranchAssigned ? 'You must be assigned to a branch before creating a load. Please contact your administrator.' : undefined
                  }
                  placement="top"
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew} disabled={!isBranchAssigned}>
                    Create New Load
                  </Button>
                </Tooltip>
                <Button icon={<ReloadOutlined />} onClick={() => fetchLoads(pagination.current, pagination.pageSize)} loading={loading}>
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
              placeholder="Search loads..."
              value={searchText}
              onChange={handleSearchChange}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={loads}
          rowKey="id"
          loading={loading}
          scroll={{ x: 2000 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} loads`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <LoadEditModal
        open={editModalOpen}
        load={selectedLoad}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedLoad(null)
        }}
        onSuccess={handleEditSuccess}
      />

      <StatusUpdateModal open={statusModalOpen} load={loadForStatusUpdate} onClose={handleStatusModalClose} onSuccess={handleStatusUpdateSuccess} />
    </div>
  )
}
