import React, { useState } from 'react'
import { Modal, Select, Button, Space, message, App } from 'antd'
import { loadApi } from '@/entities/load'
import type { Load, LoadStatus } from '@/entities/load'
import { getErrorMessage } from '@/shared/utils/errorUtils'

const { Option } = Select

interface StatusUpdateModalProps {
  load: Load | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ load, open, onClose, onSuccess }) => {
  const { message: antMessage } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<LoadStatus | null>(null)

  // Reset selected status when modal opens/closes or load changes
  React.useEffect(() => {
    if (open && load) {
      setSelectedStatus(load.status)
    } else {
      setSelectedStatus(null)
    }
  }, [open, load])

  const handleSubmit = async () => {
    if (!load || !selectedStatus) return

    // Don't submit if status hasn't changed
    if (selectedStatus === load.status) {
      onClose()
      return
    }

    setLoading(true)
    try {
      await loadApi.changeStatus(load.id, { status: selectedStatus })
      antMessage.success('Load status updated successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to update load status:', error)
      antMessage.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedStatus(null)
    onClose()
  }

  const getStatusColor = (status: LoadStatus) => {
    const colors: Record<LoadStatus, string> = {
      Pending: 'gold',
      Approved: 'green',
      Denied: 'red',
    }
    return colors[status]
  }

  if (!load) return null

  return (
    <Modal
      title="Update Load Status"
      open={open}
      onCancel={handleCancel}
      footer={
        <Space>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading} disabled={selectedStatus === load.status}>
            Update Status
          </Button>
        </Space>
      }
      width={500}
    >
      <div style={{ padding: '16px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <strong>Reference Number:</strong> {load.referenceNumber}
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong>Current Status:</strong>
          <span style={{ marginLeft: 8 }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                backgroundColor: `var(--ant-${getStatusColor(load.status)}-1)`,
                color: `var(--ant-${getStatusColor(load.status)}-7)`,
                textTransform: 'capitalize',
              }}
            >
              {load.status}
            </span>
          </span>
        </div>
        <div>
          <strong style={{ display: 'block', marginBottom: 8 }}>New Status:</strong>
          <Select value={selectedStatus} onChange={setSelectedStatus} style={{ width: '100%' }} size="large">
            <Option value="Pending">
              <span style={{ textTransform: 'capitalize' }}>Pending</span>
            </Option>
            <Option value="Approved">
              <span style={{ textTransform: 'capitalize' }}>Approved</span>
            </Option>
            <Option value="Denied">
              <span style={{ textTransform: 'capitalize' }}>Denied</span>
            </Option>
          </Select>
        </div>
      </div>
    </Modal>
  )
}
