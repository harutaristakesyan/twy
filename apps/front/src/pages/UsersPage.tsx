import React from 'react'
import { Flex, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import UserManagementTable from '@/features/user-management/UserManagementTable'

const { Title, Text } = Typography

const UsersPage: React.FC = () => {
  return (
    <Flex vertical gap={24}>
      <div>
        <Title level={2} style={{ margin: 0 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          User Management
        </Title>
        <Text type="secondary">Manage users, roles, and permissions across your organization</Text>
      </div>

      <UserManagementTable />
    </Flex>
  )
}

export default UsersPage
