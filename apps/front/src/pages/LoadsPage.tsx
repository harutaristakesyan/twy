import React from 'react'
import { Flex, Typography } from 'antd'
import { LoadManagementTable } from '@/features/load-management'
import { BankOutlined, TruckOutlined } from '@ant-design/icons'

const { Title } = Typography

const LoadsPage: React.FC = () => {
  return (
    <Flex vertical gap={24}>
      <Title level={2}>
        <TruckOutlined style={{ marginRight: 8 }} />
        Loads Management
      </Title>
      <LoadManagementTable />
    </Flex>
  )
}

export default LoadsPage
