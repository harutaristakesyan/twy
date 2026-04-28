import React from 'react'
import { Grid, Layout } from 'antd'
import AppHeader from '@/app/layouts/AppHeader.tsx'
import Sidebar from '@/app/layouts/Sidebar.tsx'
import { Outlet } from 'react-router-dom'

const { useBreakpoint } = Grid
const { Content } = Layout

const AppLayout = () => {
  const screens = useBreakpoint()

  return (
    <Layout hasSider={!screens.xs} style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <AppHeader />
        <Content style={{ padding: 30 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
