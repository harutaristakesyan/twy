import React from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { hasMenuAccess, MenuFeature } from '@/shared/utils/permissions'
import { Spin } from 'antd'

interface RoleBasedRouteProps {
  children: React.ReactNode
  requiredFeature: MenuFeature
}

/**
 * Role-based route protection component
 * Only allows access if user's role has permission for the required feature
 */
const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, requiredFeature }) => {
  const { user, loading } = useCurrentUser()

  // Show loading spinner while fetching user
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  // If no user or user doesn't have access, redirect to home
  if (!user || !hasMenuAccess(user.role, requiredFeature)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RoleBasedRoute
