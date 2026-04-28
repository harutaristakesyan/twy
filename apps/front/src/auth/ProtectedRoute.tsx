import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getIdToken } from '@/shared/utils/jwt.ts'

const ProtectedRoute = () => {
  const location = useLocation()

  if (!getIdToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
