import React, { useState, useEffect, useRef } from 'react'
import { Card, Form, Input, Button, Space, message, Typography, Divider, Alert, Row, Col, Avatar } from 'antd'
import { UserOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import type { CurrentUser, SelfUpdateRequest } from '@/entities/user/types'
import { getCurrentUser, selfUpdateUser } from '@/entities/user/api'
import { getErrorMessage } from '@/shared/utils/errorUtils'

const { Title, Text } = Typography

const UserSelfUpdate: React.FC = () => {
  const [form] = Form.useForm()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const hasFetchedRef = useRef(false)

  const fetchCurrentUser = async () => {
    setLoading(true)
    try {
      const userData = await getCurrentUser()
      console.log('👤 Fetched current user:', userData)
      setUser(userData)
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error)
      message.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    fetchCurrentUser()
  }, [])

  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
      })
    }
  }, [user, form])

  const handleSubmit = async (values: SelfUpdateRequest) => {
    setLoading(true)
    try {
      await selfUpdateUser(values)
      message.success('Profile updated successfully')
      setIsEditing(false)
      fetchCurrentUser()
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setIsEditing(false)
  }

  if (!user) {
    return <Card loading={loading} />
  }

  return (
    <Card>
      <Row gutter={24} align="middle">
        <Col>
          <Avatar size={64} icon={<UserOutlined />} />
        </Col>
        <Col flex={1}>
          <Title level={4} style={{ margin: 0 }}>
            {user.firstName} {user.lastName}
          </Title>
          <Text type="secondary">{user.email}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {user.branch?.name || 'No Branch'} • {user.role}
          </Text>
        </Col>
        <Col>
          {!isEditing ? (
            <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <Space>
              <Button icon={<CloseOutlined />} onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()} loading={loading}>
                Save Changes
              </Button>
            </Space>
          )}
        </Col>
      </Row>

      <Divider />

      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={!isEditing} id="userSelfUpdateForm">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[
                { required: true, message: 'Please enter first name' },
                { min: 2, message: 'First name must be at least 2 characters' },
              ]}
            >
              <Input placeholder="Enter first name" id="profile-firstName" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[
                { required: true, message: 'Please enter last name' },
                { min: 2, message: 'Last name must be at least 2 characters' },
              ]}
            >
              <Input placeholder="Enter last name" id="profile-lastName" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Email">
          <Input value={user.email} disabled />
        </Form.Item>

        <Form.Item label="Role">
          <Input value={user.role} disabled style={{ textTransform: 'capitalize' }} />
        </Form.Item>

        <Form.Item label="Branch">
          <Input value={user.branch?.name || 'No Branch'} disabled />
        </Form.Item>
      </Form>

      {isEditing && (
        <Alert
          message="Profile Update"
          description="You can only update your first name and last name. For email, role, or branch changes, contact your administrator."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  )
}

export default UserSelfUpdate
