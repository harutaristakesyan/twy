import React from 'react'
import { Avatar, Space, Typography } from 'antd'

const { Text } = Typography

type UserAvatarProps = {
  fullName?: string
  firstName?: string
  lastName?: string
  showName?: boolean // optional flag to show full name next to avatar
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ fullName, firstName, lastName, showName = true }) => {
  const name = fullName || `${firstName ?? ''} ${lastName ?? ''}`.trim()

  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.split(' ').filter(Boolean)
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <Space>
      <Avatar style={{ backgroundColor: '#1677ff', verticalAlign: 'middle' }}>{getInitials(name)}</Avatar>
      {showName && <Text>{name}</Text>}
    </Space>
  )
}
