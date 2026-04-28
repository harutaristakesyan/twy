import { ArrowRightOutlined, CheckOutlined, CloseOutlined, LockOutlined } from '@ant-design/icons'
import { App as AntdApp, Button, Col, Divider, Form, Input, List, Row, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import React from 'react'
import { mapErrorToModalProps } from '@/shared/utils/errorUtils.ts'
import ApiClient from '@/shared/api/ApiClient.ts'
import { useRequest } from 'ahooks'

const { Text } = Typography

interface RegistrationFormValues {
  email: string
  password: string
  firstName: string
  lastName: string
}

function validatePassword(value = '') {
  const checks = [
    { key: 'length', label: 'At least 8 characters', valid: value.length >= 8 },
    { key: 'uppercase', label: 'One uppercase letter', valid: /[A-Z]/.test(value) },
    { key: 'number', label: 'One number', valid: /[0-9]/.test(value) },
    { key: 'special', label: 'One special character (!@#$%^&*)', valid: /[!@#$%^&*]/.test(value) },
  ]
  const errors = checks.filter((r) => !r.valid).map((r) => r.label)
  const isValid = errors.length === 0
  return { isValid, errors, results: checks }
}

const RegistrationForm = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { modal } = AntdApp.useApp()
  const { run, loading } = useRequest(
    async (values: RegistrationFormValues) => {
      return ApiClient.post<{ userSub: string; message: string }>('/signup', values, true)
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        const [values] = params
        navigate('/verification', {
          state: {
            email: values.email,
            signUp: true,
          },
        })
      },
      onError: (error) => {
        modal.error(mapErrorToModalProps(error))
      },
    }
  )

  // Watchers for form values and password specifically
  const passwordValue = Form.useWatch('password', form)
  const formValues = Form.useWatch([], form)
  const [submittable, setSubmittable] = React.useState(false)

  // Check form validity for enabling submit button
  React.useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false))
  }, [form, formValues])

  const passwordResult = validatePassword(passwordValue || '')
  const isPasswordValid = passwordResult.isValid

  const passwordValidationUI = passwordValue ? (
    <List
      size="small"
      dataSource={passwordResult.results}
      renderItem={(item) => (
        <List.Item>
          <Space>
            {item.valid ? <CheckOutlined style={{ color: 'green' }} /> : <CloseOutlined style={{ color: 'red' }} />}
            <Text style={{ color: item.valid ? 'green' : undefined }}>{item.label}</Text>
          </Space>
        </List.Item>
      )}
    />
  ) : null

  return (
    <Form layout="vertical" form={form} onFinish={run}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="First Name" name="firstName" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Enter your first name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Last Name" name="lastName" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Enter your last name" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="Email Address"
        name="email"
        rules={[
          {
            required: true,
            type: 'email',
            message: 'Valid email required',
          },
        ]}
      >
        <Input placeholder="Enter your email address" />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[
          {
            required: true,
            validator: (_, value) => {
              const { isValid, errors } = validatePassword(value || '')
              return isValid ? Promise.resolve() : Promise.reject(errors[0] || 'Password does not meet complexity requirements')
            },
          },
        ]}
        hasFeedback
        help={!isPasswordValid && passwordValidationUI}
        validateTrigger={['onChange', 'onBlur']}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Enter password" />
      </Form.Item>

      <Form.Item>
        <Button block htmlType="submit" iconPosition="end" disabled={!submittable} icon={<ArrowRightOutlined />} loading={loading} type="primary">
          Create Account
        </Button>
      </Form.Item>

      <Divider plain>Or continue with</Divider>
    </Form>
  )
}

export default RegistrationForm
