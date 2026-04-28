import { useState, useEffect } from 'react'
import { Modal, Steps, Form, Input, Button, Space, Switch, Upload, App } from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { loadApi, type Load, type UpdateLoadDto, type LoadFile } from '@/entities/load'
import { fileApi } from '@/shared/api/fileApi'
import { getErrorMessage } from '@/shared/utils/errorUtils'

interface LoadEditModalProps {
  open: boolean
  load: Load | null
  onClose: () => void
  onSuccess: () => void
}

export const LoadEditModal: React.FC<LoadEditModalProps> = ({ open, load, onClose, onSuccess }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<LoadFile[]>([])

  const steps = [
    { title: 'Customer', description: 'Customer Information' },
    { title: 'Carrier', description: 'Carrier Information' },
    { title: 'Service', description: 'Service Information' },
    { title: 'Booking', description: 'Booking Information' },
    { title: 'Pick-up', description: 'Pick-up Location' },
    { title: 'Drop-off', description: 'Drop-off Location' },
    { title: 'Files', description: 'Additional Files' },
  ]

  useEffect(() => {
    if (open && load) {
      const { files = [], branchId, status, statusChangedBy, createdAt, updatedAt, ...formValues } = load

      form.setFieldsValue({
        ...formValues,
        customerRate: load.customerRate != null ? String(load.customerRate) : undefined,
        carrierRate: load.carrierRate != null ? String(load.carrierRate) : undefined,
        temperature: load.temperature ?? undefined,
      })

      setUploadedFiles(files)
      const fileItems: UploadFile[] = files.map((file) => ({
        uid: file.id,
        name: file.fileName,
        status: 'done',
      }))
      setFileList(fileItems)
    }

    if (!open) {
      form.resetFields()
      setCurrentStep(0)
      setFileList([])
      setUploadedFiles([])
    }
  }, [open, load, form])

  const handleNext = async () => {
    try {
      await form.validateFields(getFieldsForStep(currentStep))
      setCurrentStep(currentStep + 1)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    if (!load) return

    try {
      setLoading(true)
      await form.validateFields()

      const values = form.getFieldsValue(true)
      const pickup = values.pickup || {}
      const dropoff = values.dropoff || {}

      const toNumberOrNull = (value?: string, fieldName?: string): number | null | undefined => {
        if (value === undefined) return undefined
        // For required fields (customerRate, carrierRate), don't allow null/empty
        if (fieldName === 'customerRate' || fieldName === 'carrierRate') {
          if (value === null || value === '') {
            throw new Error(`${fieldName === 'customerRate' ? 'Customer Rate' : 'Carrier Rate'} is required`)
          }
        } else {
          if (value === null || value === '') return null
        }
        const parsed = Number(value)
        if (Number.isNaN(parsed)) {
          if (fieldName === 'customerRate' || fieldName === 'carrierRate') {
            throw new Error(`${fieldName === 'customerRate' ? 'Customer Rate' : 'Carrier Rate'} must be a valid number`)
          }
          return null
        }
        if ((fieldName === 'customerRate' || fieldName === 'carrierRate') && parsed <= 0) {
          throw new Error(`${fieldName === 'customerRate' ? 'Customer Rate' : 'Carrier Rate'} must be greater than 0`)
        }
        return parsed
      }

      const toNullableString = (value?: string): string | null | undefined => {
        if (value === undefined) return undefined
        if (value === null) return null
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
      }

      const payload: UpdateLoadDto = {
        customer: values.customer,
        referenceNumber: values.referenceNumber,
        customerRate: toNumberOrNull(values.customerRate, 'customerRate'),
        contactName: values.contactName,
        carrier: toNullableString(values.carrier),
        carrierPaymentMethod: toNullableString(values.carrierPaymentMethod),
        carrierRate: toNumberOrNull(values.carrierRate, 'carrierRate'),
        chargeServiceFeeToOffice: values.chargeServiceFeeToOffice ?? false,
        loadType: values.loadType,
        serviceType: values.serviceType,
        serviceGivenAs: values.serviceGivenAs,
        commodity: values.commodity,
        bookedAs: values.bookedAs,
        soldAs: values.soldAs,
        weight: values.weight,
        temperature: toNullableString(values.temperature),
        pickup: {
          cityZipCode: toNullableString(pickup.cityZipCode),
          phone: toNullableString(pickup.phone),
          carrier: pickup.carrier,
          name: pickup.name,
          address: pickup.address,
        },
        dropoff: {
          cityZipCode: toNullableString(dropoff.cityZipCode),
          phone: toNullableString(dropoff.phone),
          carrier: dropoff.carrier,
          name: dropoff.name,
          address: dropoff.address,
        },
        files: uploadedFiles,
      }

      await loadApi.update(load.id, payload)
      message.success('Load updated successfully')
      handleClose()
      onSuccess()
    } catch (error) {
      console.error('Failed to update load:', error)
      message.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    form.resetFields()
    setCurrentStep(0)
    setFileList([])
    setUploadedFiles([])
    onClose()
  }

  const handleFileUpload = async (file: File): Promise<UploadFile | null> => {
    try {
      message.loading({ content: 'Uploading file...', key: 'upload' })
      const fileId = await fileApi.uploadFile(file)
      const fileEntry: LoadFile = { id: fileId, fileName: file.name }
      setUploadedFiles((prev) => [...prev, fileEntry])
      message.success({ content: 'File uploaded successfully', key: 'upload' })
      return {
        uid: fileId,
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
      }
    } catch (error) {
      console.error('File upload failed:', error)
      message.error({ content: getErrorMessage(error), key: 'upload' })
      return null
    }
  }

  const handleFileRemove = (file: UploadFile) => {
    setUploadedFiles((prev) => prev.filter((item) => item.id !== file.uid))
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid))
    message.success('File removed')
    return true
  }

  const getFieldsForStep = (step: number): (string | string[])[] => {
    switch (step) {
      case 0: // Customer Information
        return ['customer', 'referenceNumber', 'contactName', 'customerRate']
      case 1: // Carrier Information
        return ['carrierRate']
      case 2: // Service Information
        return ['loadType', 'serviceType', 'serviceGivenAs', 'commodity']
      case 3: // Booking Information
        return ['bookedAs', 'soldAs', 'weight']
      case 4: // Pick-up Location
        return [
          ['pickup', 'carrier'],
          ['pickup', 'name'],
          ['pickup', 'address'],
        ]
      case 5: // Drop-off Location
        return [
          ['dropoff', 'carrier'],
          ['dropoff', 'name'],
          ['dropoff', 'address'],
        ]
      case 6: // Files
        return []
      default:
        return []
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Customer Information
        return (
          <>
            <Form.Item label="Customer" name="customer" rules={[{ required: true, message: 'Please enter customer name' }]}>
              <Input placeholder="Enter customer name" />
            </Form.Item>
            <Form.Item label="Reference Number" name="referenceNumber" rules={[{ required: true, message: 'Please enter reference number' }]}>
              <Input placeholder="Enter reference number" />
            </Form.Item>
            <Form.Item
              label="Customer Rate"
              name="customerRate"
              rules={[
                { required: true, message: 'Please enter customer rate' },
                {
                  validator: (_, value) => {
                    const numValue = value === '' || value === null || value === undefined ? null : Number(value)
                    if (numValue === null || isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(new Error('Please enter a valid customer rate greater than 0'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input placeholder="Enter customer rate" type="number" min="0" step="0.01" />
            </Form.Item>
            <Form.Item label="Contact Name" name="contactName" rules={[{ required: true, message: 'Please enter contact name' }]}>
              <Input placeholder="Enter contact name" />
            </Form.Item>
          </>
        )

      case 1: // Carrier Information
        return (
          <>
            <Form.Item label="Carrier" name="carrier">
              <Input placeholder="Enter carrier" />
            </Form.Item>
            <Form.Item label="Carrier Payment Method" name="carrierPaymentMethod">
              <Input placeholder="Enter payment method" />
            </Form.Item>
            <Form.Item
              label="Carrier Rate"
              name="carrierRate"
              rules={[
                { required: true, message: 'Please enter carrier rate' },
                {
                  validator: (_, value) => {
                    const numValue = value === '' || value === null || value === undefined ? null : Number(value)
                    if (numValue === null || isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(new Error('Please enter a valid carrier rate greater than 0'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input placeholder="Enter carrier rate" type="number" min="0" step="0.01" />
            </Form.Item>
          </>
        )

      case 2: // Service Information
        return (
          <>
            <Form.Item label="Charge Service Fee to Office" name="chargeServiceFeeToOffice" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Load Type" name="loadType" rules={[{ required: true, message: 'Please enter load type' }]}>
              <Input placeholder="Enter load type" />
            </Form.Item>
            <Form.Item label="Service Type" name="serviceType" rules={[{ required: true, message: 'Please enter service type' }]}>
              <Input placeholder="Enter service type" />
            </Form.Item>
            <Form.Item label="Service Given As" name="serviceGivenAs" rules={[{ required: true, message: 'Please enter service given as' }]}>
              <Input placeholder="Enter service given as" />
            </Form.Item>
            <Form.Item label="Commodity" name="commodity" rules={[{ required: true, message: 'Please enter commodity' }]}>
              <Input placeholder="Enter commodity" />
            </Form.Item>
          </>
        )

      case 3: // Booking Information
        return (
          <>
            <Form.Item label="Booked As" name="bookedAs" rules={[{ required: true, message: 'Please enter booked as' }]}>
              <Input placeholder="Enter booked as" />
            </Form.Item>
            <Form.Item label="Sold As" name="soldAs" rules={[{ required: true, message: 'Please enter sold as' }]}>
              <Input placeholder="Enter sold as" />
            </Form.Item>
            <Form.Item label="Weight" name="weight" rules={[{ required: true, message: 'Please enter weight' }]}>
              <Input placeholder="Enter weight" />
            </Form.Item>
            <Form.Item label="Temperature" name="temperature">
              <Input placeholder="Enter temperature" />
            </Form.Item>
          </>
        )

      case 4: // Pick-up Location
        return (
          <>
            <Form.Item label="City / Zipcode" name={['pickup', 'cityZipCode']}>
              <Input placeholder="Enter city or zipcode" />
            </Form.Item>
            <Form.Item label="Phone Number" name={['pickup', 'phone']}>
              <Input placeholder="Enter phone number" />
            </Form.Item>
            <Form.Item label="Select Carrier" name={['pickup', 'carrier']} rules={[{ required: true, message: 'Please enter carrier' }]}>
              <Input placeholder="Enter carrier" />
            </Form.Item>
            <Form.Item label="Name" name={['pickup', 'name']} rules={[{ required: true, message: 'Please enter name' }]}>
              <Input placeholder="Enter name" />
            </Form.Item>
            <Form.Item label="Address" name={['pickup', 'address']} rules={[{ required: true, message: 'Please enter address' }]}>
              <Input.TextArea placeholder="Enter address" rows={3} />
            </Form.Item>
          </>
        )

      case 5: // Drop-off Location
        return (
          <>
            <Form.Item label="City / Zipcode" name={['dropoff', 'cityZipCode']}>
              <Input placeholder="Enter city or zipcode" />
            </Form.Item>
            <Form.Item label="Phone Number" name={['dropoff', 'phone']}>
              <Input placeholder="Enter phone number" />
            </Form.Item>
            <Form.Item label="Select Carrier" name={['dropoff', 'carrier']} rules={[{ required: true, message: 'Please enter carrier' }]}>
              <Input placeholder="Enter carrier" />
            </Form.Item>
            <Form.Item label="Name" name={['dropoff', 'name']} rules={[{ required: true, message: 'Please enter name' }]}>
              <Input placeholder="Enter name" />
            </Form.Item>
            <Form.Item label="Address" name={['dropoff', 'address']} rules={[{ required: true, message: 'Please enter address' }]}>
              <Input.TextArea placeholder="Enter address" rows={3} />
            </Form.Item>
          </>
        )

      case 6: // Files
        return (
          <Form.Item label="Upload Files">
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={(file) => {
                handleFileUpload(file).then((uploaded) => {
                  if (uploaded) {
                    setFileList((prev) => [...prev, uploaded])
                  }
                })
                return false // Prevent auto upload
              }}
              onRemove={handleFileRemove}
              iconRender={() => <DeleteOutlined />}
            >
              <Button icon={<UploadOutlined />}>Select Files</Button>
            </Upload>
            <div style={{ marginTop: 8, color: '#666' }}>Upload documents related to this load (multiple files allowed)</div>
          </Form.Item>
        )

      default:
        return null
    }
  }

  return (
    <Modal title="Edit Load" open={open} onCancel={handleClose} width={1000} footer={null} destroyOnClose>
      {load ? (
        <>
          <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              chargeServiceFeeToOffice: false,
            }}
          >
            {renderStepContent()}
          </Form>

          <Space style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            {currentStep > 0 && <Button onClick={handlePrev}>Previous</Button>}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext}>
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button type="primary" onClick={handleSubmit} loading={loading}>
                Update Load
              </Button>
            )}
            <Button onClick={handleClose}>Cancel</Button>
          </Space>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>Unable to load record. Please close and try again.</div>
      )}
    </Modal>
  )
}
