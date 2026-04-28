import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, Space, message, Alert } from 'antd'
import type { OutsideBroker, UpdateOutsideBrokerRequest } from '@/entities/outside-broker/types'
import { BrokerStatus } from '@/entities/outside-broker/types'
import { updateOutsideBroker } from '@/entities/outside-broker/api'
import type { Branch } from '@/entities/branch/types'
import { getErrorMessage } from '@/shared/utils/errorUtils'

const { Option } = Select
const { TextArea } = Input

interface OutsideBrokerEditModalProps {
  broker: OutsideBroker
  visible: boolean
  branches: Branch[]
  loadingBranches: boolean
  onCancel: () => void
  onSuccess: () => void
}

const OutsideBrokerEditModal: React.FC<OutsideBrokerEditModalProps> = ({ broker, visible, branches, loadingBranches, onCancel, onSuccess }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // Set form values when modal opens or broker changes
  useEffect(() => {
    if (visible && broker) {
      form.setFieldsValue({
        brokerName: broker.brokerName,
        mcNumber: broker.mcNumber,
        contactName: broker.contactName || '',
        phone: broker.phone || '',
        email: broker.email || '',
        address: broker.address || '',
        notes: broker.notes || '',
        status: broker.status,
        branch: broker.branch?.id,
      })
    }
  }, [visible, broker, form])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const updateData: UpdateOutsideBrokerRequest = {
        id: broker.id,
        brokerName: values.brokerName,
        mcNumber: values.mcNumber,
        contactName: values.contactName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        notes: values.notes,
        status: values.status,
        branch: values.branch,
      }

      await updateOutsideBroker(updateData)
      message.success('Outside broker updated successfully')
      onSuccess()
    } catch (error: any) {
      const errorMessage = getErrorMessage(error)

      if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint')) {
        message.error(`MC Number "${values.mcNumber}" already exists. Please use a different MC number.`)
      } else {
        message.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal title="Edit Outside Broker" open={visible} onCancel={handleCancel} footer={null} width={600}>
      <Alert
        message="Broker Information"
        description="Update outside broker details. Broker name and MC number are required."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          brokerName: broker?.brokerName,
          mcNumber: broker?.mcNumber,
          contactName: broker?.contactName || '',
          phone: broker?.phone || '',
          email: broker?.email || '',
          address: broker?.address || '',
          notes: broker?.notes || '',
          status: broker?.status,
          branch: broker?.branch?.id,
        }}
      >
        <Form.Item
          name="brokerName"
          label="Broker Name"
          rules={[
            { required: true, message: 'Please enter broker name' },
            { min: 2, message: 'Broker name must be at least 2 characters' },
          ]}
        >
          <Input placeholder="Enter broker name" />
        </Form.Item>

        <Form.Item
          name="mcNumber"
          label="MC Number"
          rules={[
            { required: true, message: 'Please enter MC number' },
            { min: 1, message: 'MC number is required' },
          ]}
        >
          <Input placeholder="Enter MC number" />
        </Form.Item>

        <Form.Item name="contactName" label="Contact Name">
          <Input placeholder="Enter contact name" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="Enter phone number" />
        </Form.Item>

        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Please enter a valid email address' }]}>
          <Input placeholder="Enter email address" />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <TextArea placeholder="Enter address" rows={3} />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={3} />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status' }]}>
          <Select placeholder="Select status">
            <Option value={BrokerStatus.APPROVED}>Approved</Option>
            <Option value={BrokerStatus.PENDING}>Pending</Option>
            <Option value={BrokerStatus.DENIED}>Denied</Option>
          </Select>
        </Form.Item>

        <Form.Item name="branch" label="Branch (Optional)">
          <Select
            placeholder="Select branch (optional)"
            loading={loadingBranches}
            showSearch
            allowClear
            optionLabelProp="label"
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          >
            {branches.map((branch) => (
              <Option key={branch.id} value={branch.id} label={branch.name}>
                {branch.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Broker
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default OutsideBrokerEditModal
