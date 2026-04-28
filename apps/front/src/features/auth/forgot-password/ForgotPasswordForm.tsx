import { ArrowRightOutlined } from '@ant-design/icons'
import { Button, Form, Input, message } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ApiClient from '@/shared/api/ApiClient.ts'
import { getErrorMessage } from '@/shared/utils/errorUtils'

const ForgotPasswordForm = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async ({ email }: { email: string }) => {
    setLoading(true)
    try {
      await ApiClient.post('/forgot-password', { email })
      message.success('Verification code sent')
      navigate('/create-password', {
        state: { email, signUp: false },
      })
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Form.Item
        label="Email Address"
        name="email"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Enter a valid email' },
        ]}
      >
        <Input placeholder="you@example.com" />
      </Form.Item>

      <Form.Item>
        <Button block type="primary" htmlType="submit" iconPosition="end" icon={<ArrowRightOutlined />} loading={loading}>
          Send Recovery Code
        </Button>
      </Form.Item>
    </Form>
  )
}

export default ForgotPasswordForm
