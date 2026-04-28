import React from 'react'
import { Button } from 'antd'
import { useMockData } from '@/shared/hooks/useMockData'

/**
 * Mock Data Toggle Button
 * Allows users to enable/disable mock data at runtime
 */
const MockDataToggleButton: React.FC = () => {
  const { isEnabled, toggle } = useMockData()

  return (
    <Button
      type={isEnabled ? 'primary' : 'default'}
      danger={isEnabled}
      onClick={toggle}
      style={{
        fontWeight: 500,
      }}
    >
      {isEnabled ? '🎭 MOCK DATA ON' : 'MOCK DATA OFF'}
    </Button>
  )
}

export default MockDataToggleButton
