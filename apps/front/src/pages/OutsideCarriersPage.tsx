import React from 'react'
import { Flex, Typography } from 'antd'
import { CarOutlined } from '@ant-design/icons'
import OutsideCarriersManagementTable from '@/features/outside-carrier-management/OutsideCarriersManagementTable'

const { Title, Text } = Typography

const OutsideCarriersPage: React.FC = () => {
  return (
    <Flex vertical gap={24}>
      <div>
        <Title level={2} style={{ margin: 0 }}>
          <CarOutlined style={{ marginRight: 8 }} />
          OutSide Carriers
        </Title>
        <Text type="secondary">Manage outside carriers and their status. System uses this data to control load assignments.</Text>
      </div>

      <OutsideCarriersManagementTable />
    </Flex>
  )
}

export default OutsideCarriersPage
