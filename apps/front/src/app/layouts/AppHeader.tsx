import React, { useState } from 'react'
import { Button, Flex, Layout, Typography } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import UserDropdown from '@components/UserDropdown.tsx'
import MockDataToggleButton from '@components/MockDataToggleButton.tsx'
import { emitEvent, EventType } from '@/shared/lib/EventBus.ts'
import { useLocation } from 'react-router-dom'
import { navigationLabelMap } from '@/shared/constants/navigationMap.ts'

const { Header } = Layout
const { Title } = Typography

const AppHeader: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const label = navigationLabelMap[location.pathname]

  const toggleCollapse = (collapsed: boolean) => {
    setCollapsed(collapsed)
    emitEvent(EventType.SidebarCollapsed, collapsed)
  }

  return (
    <Header
      style={{
        position: 'sticky',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        rowGap: 10,
        top: 0,
        zIndex: 1,
      }}
    >
      <Flex align="center" gap={20}>
        <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => toggleCollapse(!collapsed)} />
        <Title level={4} style={{ margin: 0 }}>
          {label}
        </Title>
      </Flex>

      <Flex align="center" gap={20}>
        <MockDataToggleButton />
        <UserDropdown />
      </Flex>
    </Header>
  )
}

export default AppHeader
