import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, Space, message, Alert, DatePicker } from 'antd'
import type { OutsideCarrier, UpdateOutsideCarrierRequest, CarrierStatus } from '@/entities/outside-carrier/types'
import { updateOutsideCarrier } from '@/entities/outside-carrier/api'
import { getErrorMessage } from '@/shared/utils/errorUtils'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface OutsideCarrierEditModalProps {
  carrier: OutsideCarrier
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
}

const OutsideCarrierEditModal: React.FC<OutsideCarrierEditModalProps> = ({ carrier, visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // Set form values when modal opens or carrier changes
  useEffect(() => {
    if (visible && carrier) {
      form.setFieldsValue({
        carrierName: carrier.carrierName,
        mcDotNumber: carrier.mcDotNumber,
        equipmentType: carrier.equipmentType || '',
        insuranceExpiry: carrier.insuranceExpiry ? dayjs(carrier.insuranceExpiry) : null,
        phone: carrier.phone || '',
        email: carrier.email || '',
        notes: carrier.notes || '',
        status: carrier.status,
      })
    }
  }, [visible, carrier, form])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const updateData: UpdateOutsideCarrierRequest = {
        id: carrier.id,
        carrierName: values.carrierName,
        mcDotNumber: values.mcDotNumber,
        equipmentType: values.equipmentType,
        insuranceExpiry: values.insuranceExpiry ? dayjs(values.insuranceExpiry).toISOString() : undefined,
        phone: values.phone,
        email: values.email,
        notes: values.notes,
        status: values.status,
      }

      await updateOutsideCarrier(updateData)
      message.success('Outside carrier updated successfully')
      onSuccess()
    } catch (error: any) {
      const errorMessage = getErrorMessage(error)

      if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint')) {
        message.error(`MC/DOT Number "${values.mcDotNumber}" already exists. Please use a different number.`)
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
    <Modal title="Edit Outside Carrier" open={visible} onCancel={handleCancel} footer={null} width={600}>
      <Alert
        message="Carrier Information"
        description="Update outside carrier details. Carrier name and MC/DOT number are required."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          carrierName: carrier?.carrierName,
          mcDotNumber: carrier?.mcDotNumber,
          equipmentType: carrier?.equipmentType || '',
          insuranceExpiry: carrier?.insuranceExpiry ? dayjs(carrier.insuranceExpiry) : null,
          phone: carrier?.phone || '',
          email: carrier?.email || '',
          notes: carrier?.notes || '',
          status: carrier?.status,
        }}
      >
        <Form.Item
          name="carrierName"
          label="Carrier Name"
          rules={[
            { required: true, message: 'Please enter carrier name' },
            { min: 2, message: 'Carrier name must be at least 2 characters' },
          ]}
        >
          <Input placeholder="Enter carrier name" />
        </Form.Item>

        <Form.Item
          name="mcDotNumber"
          label="MC / DOT Number"
          rules={[
            { required: true, message: 'Please enter MC/DOT number' },
            { min: 1, message: 'MC/DOT number is required' },
          ]}
        >
          <Input placeholder="Enter MC/DOT number" />
        </Form.Item>

        <Form.Item name="equipmentType" label="Equipment Type">
          <Input placeholder="Enter equipment type (e.g., Flatbed, Dry Van, Refrigerated)" />
        </Form.Item>

        <Form.Item name="insuranceExpiry" label="Insurance Expiry">
          <DatePicker style={{ width: '100%' }} placeholder="Select insurance expiry date" format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="Enter phone number" />
        </Form.Item>

        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Please enter a valid email address' }]}>
          <Input placeholder="Enter email address" />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Enter notes" rows={3} />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status' }]}>
          <Select placeholder="Select status">
            <Option value={CarrierStatus.APPROVED}>Approved</Option>
            <Option value={CarrierStatus.DENIED}>Denied</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Carrier
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default OutsideCarrierEditModal
