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
} from '@mui/material'
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material'

interface HeaderProps {
  onMenuClick: () => void
  showMenuButton: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [notificationAnchor, setNotificationAnchor] = React.useState<null | HTMLElement>(null)

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

  const mockUser = {
    name: '山田 太郎',
    email: 'yamada@example.com',
    role: 'システム管理者',
    avatar: '/avatars/user1.jpg', // プレースホルダー
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
              alt={mockUser.name}
            >
              {mockUser.name.charAt(0)}
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
            {mockUser.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mockUser.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {mockUser.role}
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
        <MenuItem onClick={handleProfileMenuClose}>
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
    </Toolbar>
  )
}

export default Header