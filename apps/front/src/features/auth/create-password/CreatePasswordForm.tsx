import { CheckOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons'
import { Button, Card, Col, Flex, Form, Input, Row, Typography } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import ApiClient from '@/shared/api/ApiClient.ts'
import { useState } from 'react'
import { maskEmail } from '@/shared/utils/email.ts'
import ResendCode from '@/features/auth/components/ResendCode.tsx'

const { Text } = Typography

interface CreatePasswordFormValues {
  newPassword: string
  confirmPassword: string
  code: string
}

const CreatePasswordForm = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email

  const [loading, setLoading] = useState(false)

  const onFinish = async ({ newPassword, confirmPassword, code }: CreatePasswordFormValues) => {
    if (newPassword !== confirmPassword) {
      form.setFields([
        {
          name: 'confirmPassword',
          errors: ['Passwords do not match'],
        },
      ])
      return
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/
    if (!passwordRegex.test(newPassword)) {
      form.setFields([
        {
          name: 'newPassword',
          errors: ['Password does not meet requirements'],
        },
      ])
      return
    }

    setLoading(true)
    try {
      await ApiClient.post<{ userSub: string; message: string }>('/create-password', { email, code, newPassword }, true)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Form.Item label="Verification Code" name="code" rules={[{ required: true, message: 'Please enter the 6-digit code' }]}>
        <Flex vertical>
          <Input.OTP length={6} size="large" />
          <Text type="secondary">
            We&apos;ve sent a 6-digit code to <Text strong>{maskEmail(email || '')}</Text>
          </Text>
        </Flex>
      </Form.Item>

      <Form.Item label="New Password" name="newPassword" rules={[{ required: true, message: 'Please enter a new password' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" />
      </Form.Item>

      <Form.Item label="Confirm Password" name="confirmPassword" rules={[{ required: true, message: 'Please confirm your password' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
      </Form.Item>

      <Card style={{ backgroundColor: '#f9fafb', marginBottom: 24 }}>
        <Text strong>Password must contain:</Text>
        <Row gutter={[12, 8]} style={{ marginTop: 12 }}>
          <Col xs={24} sm={12}>
            <CheckOutlined style={{ color: 'green', marginRight: 8 }} />
            <Text>At least 8 characters</Text>
          </Col>
          <Col xs={24} sm={12}>
            <CheckOutlined style={{ color: 'green', marginRight: 8 }} />
            <Text>One uppercase letter</Text>
          </Col>
          <Col xs={24} sm={12}>
            <CheckOutlined style={{ color: 'green', marginRight: 8 }} />
            <Text>One number</Text>
          </Col>
          <Col xs={24} sm={12}>
            <CheckOutlined style={{ color: 'green', marginRight: 8 }} />
            <Text>One special character</Text>
          </Col>
        </Row>
      </Card>

      <Form.Item>
        <Button htmlType="submit" variant="solid" color="default" iconPosition={'end'} block icon={<KeyOutlined />} loading={loading}>
          Create Password
        </Button>
      </Form.Item>

      <ResendCode />
    </Form>
  )
}

export default CreatePasswordForm
