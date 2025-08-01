import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
  fallback?: React.ReactNode
}

const LoadingScreen: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      bgcolor: 'background.default',
    }}
  >
    <CircularProgress size={48} sx={{ mb: 2 }} />
    <Typography variant="h6" color="textSecondary">
      認証情報を確認しています...
    </Typography>
  </Box>
)

const UnauthorizedScreen: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      bgcolor: 'background.default',
      textAlign: 'center',
    }}
  >
    <Typography variant="h4" color="error" gutterBottom>
      アクセス権限がありません
    </Typography>
    <Typography variant="body1" color="textSecondary">
      このページにアクセスする権限がありません。
    </Typography>
  </Box>
)

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
  fallback,
}) => {
  const { authState } = useAuth()
  const location = useLocation()

  // Show loading screen while authentication is being checked
  if (authState.loading) {
    return fallback || <LoadingScreen />
  }

  // Redirect to login if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  // Check role-based access if roles are specified
  if (roles && roles.length > 0) {
    const userRole = authState.user?.role
    
    if (!userRole || !roles.includes(userRole)) {
      return <UnauthorizedScreen />
    }
  }

  // User is authenticated and authorized
  return <>{children}</>
}

export default ProtectedRoute