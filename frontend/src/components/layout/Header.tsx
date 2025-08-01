import React from 'react'
import {
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onMenuClick: () => void
  showMenuButton: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton }) => {
  const { authState, logout } = useAuth()
  const navigate = useNavigate()
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [notificationAnchor, setNotificationAnchor] = React.useState<null | HTMLElement>(null)
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false)
  const [loggingOut, setLoggingOut] = React.useState(false)

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget)
  }

  const handleNotificationClose = () => {
    setNotificationAnchor(null)
  }

  const handleLogoutClick = () => {
    setAnchorEl(null)
    setLogoutDialogOpen(true)
  }

  const handleLogoutConfirm = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoggingOut(false)
      setLogoutDialogOpen(false)
    }
  }

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false)
  }

  const getRoleDisplayName = (role: string | undefined): string => {
    if (!role) return ''
    const roleMap: Record<string, string> = {
      admin: 'システム管理者',
      ADMIN: 'システム管理者',
      manager: 'マネージャー', 
      MANAGER: 'マネージャー',
      operator: 'オペレーター',
      OPERATOR: 'オペレーター',
      viewer: 'ビューアー',
      VIEWER: 'ビューアー',
    }
    return roleMap[role] || role
  }

  const getUserDisplayName = (): string => {
    if (authState.user) {
      // Check display_name
      if (authState.user.display_name && typeof authState.user.display_name === 'string' && authState.user.display_name.trim()) {
        return authState.user.display_name
      }
      // Check full_name
      if (authState.user.full_name && typeof authState.user.full_name === 'string' && authState.user.full_name.trim()) {
        return authState.user.full_name
      }
      // Check lastName and firstName
      if (authState.user.lastName && authState.user.firstName && 
          typeof authState.user.lastName === 'string' && typeof authState.user.firstName === 'string' &&
          authState.user.lastName.trim() && authState.user.firstName.trim()) {
        return `${authState.user.lastName} ${authState.user.firstName}`
      }
      // Check name
      if (authState.user.name && typeof authState.user.name === 'string' && authState.user.name.trim()) {
        return authState.user.name
      }
      // Check username
      if (authState.user.username && typeof authState.user.username === 'string' && authState.user.username.trim()) {
        return authState.user.username
      }
      // Check email
      if (authState.user.email && typeof authState.user.email === 'string' && authState.user.email.trim()) {
        return authState.user.email
      }
      return 'ユーザー'
    }
    return 'ユーザー'
  }

  const getUserInitial = (): string => {
    if (authState.user) {
      // Check lastName and ensure it's a string with length > 0
      if (authState.user.lastName && typeof authState.user.lastName === 'string' && authState.user.lastName.length > 0) {
        return authState.user.lastName.charAt(0).toUpperCase()
      }
      // Check display_name and ensure it's a string with length > 0
      if (authState.user.display_name && typeof authState.user.display_name === 'string' && authState.user.display_name.length > 0) {
        return authState.user.display_name.charAt(0).toUpperCase()
      }
      // Check full_name and ensure it's a string with length > 0
      if (authState.user.full_name && typeof authState.user.full_name === 'string' && authState.user.full_name.length > 0) {
        return authState.user.full_name.charAt(0).toUpperCase()
      }
      // Check username and ensure it's a string with length > 0
      if (authState.user.username && typeof authState.user.username === 'string' && authState.user.username.length > 0) {
        return authState.user.username.charAt(0).toUpperCase()
      }
      // Check email and ensure it's a string with length > 0
      if (authState.user.email && typeof authState.user.email === 'string' && authState.user.email.length > 0) {
        return authState.user.email.charAt(0).toUpperCase()
      }
    }
    return 'U'
  }

  const mockNotifications = [
    { id: 1, title: '新しいインシデント', message: 'サーバー障害が報告されました', time: '5分前' },
    { id: 2, title: 'SLA警告', message: 'チケット#12345の期限が近づいています', time: '15分前' },
    { id: 3, title: '承認待ち', message: '変更要求の承認が必要です', time: '1時間前' },
  ]

  return (
    <Toolbar>
      {/* Mobile menu button */}
      {showMenuButton && (
        <IconButton
          color="inherit"
          aria-label="メニューを開く"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Application title */}
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={{ flexGrow: 1, fontWeight: 600 }}
      >
        ITSM Management System
      </Typography>

      {/* Header actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Notifications */}
        <Tooltip title="通知">
          <IconButton
            color="inherit"
            aria-label="通知を表示"
            onClick={handleNotificationOpen}
          >
            <Badge badgeContent={mockNotifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Settings */}
        <Tooltip title="設定">
          <IconButton color="inherit" aria-label="設定">
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* User profile */}
        <Tooltip title="プロフィール">
          <IconButton
            onClick={handleProfileMenuOpen}
            color="inherit"
            aria-label="ユーザープロフィール"
          >
            <Avatar 
              sx={{ width: 32, height: 32 }}
              alt={(() => {
                try {
                  return getUserDisplayName()
                } catch (error) {
                  console.error('Error getting user display name for alt:', error)
                  return 'ユーザー'
                }
              })()}
            >
              {(() => {
                try {
                  return authState.user ? getUserInitial() : 'U'
                } catch (error) {
                  console.error('Error getting user initial:', error)
                  return 'U'
                }
              })()}
            </Avatar>
          </IconButton>
        </Tooltip>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {(() => {
              try {
                return getUserDisplayName()
              } catch (error) {
                console.error('Error getting user display name:', error)
                return 'ユーザー'
              }
            })()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {authState.user?.email || ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {(() => {
              try {
                return authState.user ? getRoleDisplayName(authState.user.role) : ''
              } catch (error) {
                console.error('Error getting role display name:', error)
                return ''
              }
            })()}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleProfileMenuClose}>
          <PersonIcon sx={{ mr: 2 }} />
          プロフィール
        </MenuItem>
        <MenuItem onClick={handleProfileMenuClose}>
          <SettingsIcon sx={{ mr: 2 }} />
          設定
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogoutClick}>
          <LogoutIcon sx={{ mr: 2 }} />
          ログアウト
        </MenuItem>
      </Menu>

      {/* Notification Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            通知
          </Typography>
        </Box>
        <Divider />
        {mockNotifications.map((notification) => (
          <MenuItem key={notification.id} onClick={handleNotificationClose}>
            <Box sx={{ maxWidth: 300 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {notification.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {notification.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {notification.time}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleNotificationClose} sx={{ justifyContent: 'center' }}>
          <Typography variant="body2" color="primary">
            すべての通知を表示
          </Typography>
        </MenuItem>
      </Menu>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">
          ログアウト確認
        </DialogTitle>
        <DialogContent>
          <Typography>
            本当にログアウトしますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleLogoutCancel}
            disabled={loggingOut}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            variant="contained"
            color="primary"
            disabled={loggingOut}
            startIcon={loggingOut ? <CircularProgress size={16} /> : <LogoutIcon />}
          >
            {loggingOut ? 'ログアウト中...' : 'ログアウト'}
          </Button>
        </DialogActions>
      </Dialog>
    </Toolbar>
  )
}

export default Header