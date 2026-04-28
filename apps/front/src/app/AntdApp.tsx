import React, { type FC, type PropsWithChildren } from 'react'
import { App, ConfigProvider, Empty, type ThemeConfig } from 'antd'
import GlobalErrorBoundary from '@components/GlobalErrorBoundary.tsx'

export const themeConfig: ThemeConfig = {
  components: {
    Layout: {
      headerBg: '#ffffff',
    },
  },
}

const AntdApp: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider renderEmpty={() => <Empty description={false} />} theme={themeConfig}>
      <App>
        <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
      </App>
    </ConfigProvider>
  )
}

export default AntdApp
