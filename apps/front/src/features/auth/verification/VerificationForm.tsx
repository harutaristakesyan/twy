import { CheckOutlined } from '@ant-design/icons'
import { Button, Flex, Form, Input, message, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ApiClient from '@/shared/api/ApiClient.ts'
import { maskEmail } from '@/shared/utils/email.ts'
import ResendCode from '@/features/auth/components/ResendCode.tsx'
import { getErrorMessage } from '@/shared/utils/errorUtils'

const { Text, Title, Paragraph } = Typography

interface VerificationFormValues {
  code: string
}

const VerificationForm = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email
  const isSignUpFlow = location.state?.signUp === true
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!email) {
      navigate('/register')
    }
  }, [email, navigate])

  const onFinish = async (values: VerificationFormValues) => {
    const code = values.code
    setLoading(true)
    try {
      await ApiClient.post<{ userSub: string; message: string }>('/verify', { email, code }, true)
      if (isSignUpFlow) {
        navigate('/login', { state: { email } })
      } else {
        navigate('/create-password', { state: { email, code } })
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form form={form} onFinish={onFinish}>
      <Title level={3}>Enter Verification Code</Title>
      <Paragraph type="secondary">
        We&apos;ve sent a 6-digit code to <Text strong>{maskEmail(email || '')}</Text>
      </Paragraph>

      <Form.Item name="code" rules={[{ required: true, message: 'Please enter the 6-digit code' }]}>
        <Flex vertical>
          <Input.OTP length={6} size="large" />
        </Flex>
      </Form.Item>

      <Form.Item>
        <Button block htmlType="submit" variant="solid" color="default" iconPosition="end" icon={<CheckOutlined />} loading={loading}>
          Verify Code
        </Button>
      </Form.Item>

      <ResendCode />
    </Form>
  )
}

export default VerificationForm
