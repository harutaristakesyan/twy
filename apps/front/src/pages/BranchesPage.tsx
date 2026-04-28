import React from 'react'
import { Flex, Typography } from 'antd'
import { BankOutlined } from '@ant-design/icons'
import BranchManagementTable from '@/features/branch-management/BranchManagementTable'

const { Title, Text } = Typography

const BranchesPage: React.FC = () => {
  return (
    <Flex vertical gap={24}>
      <div>
        <Title level={2} style={{ margin: 0 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          Branch Management
        </Title>
        <Text type="secondary">Manage branches and their owners across your organization</Text>
      </div>

      <BranchManagementTable />
    </Flex>
  )
}

export default BranchesPage
