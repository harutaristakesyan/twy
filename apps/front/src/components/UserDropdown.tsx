import { Dropdown, Flex, type MenuProps } from 'antd'
import { DownOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '@/auth/AuthContext.tsx'
import { decodeIdTokenToken } from '@/shared/utils/jwt.ts'
import { UserAvatar } from '@/shared/ui/UserAvatar.tsx'
import { useNavigate } from 'react-router-dom'

const UserDropdown = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const user = decodeIdTokenToken()

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      onClick: () => navigate('/profile'),
      icon: <UserOutlined />,
      label: 'My Profile',
    },
    { type: 'divider' },
    {
      key: 'logout',
      onClick: () => logout(),
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Log Out',
    },
  ]

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Flex justify="space-between" align="center" style={{ cursor: 'pointer' }}>
        <UserAvatar firstName={user.given_name} lastName={user.family_name} />
        <DownOutlined style={{ marginLeft: 6, fontSize: 12 }} />
      </Flex>
    </Dropdown>
  )
}

export default UserDropdown
