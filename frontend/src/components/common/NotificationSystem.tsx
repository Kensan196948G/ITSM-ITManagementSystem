import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Typography,
  Slide,
  Grow,
  Fade,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Divider,
  Button,
  Chip,
  Avatar,
  Fab,
} from '@mui/material'
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Notifications as NotificationIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  MarkAsUnread as UnreadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  VolumeOff as MuteIcon,
  VolumeUp as UnmuteIcon,
} from '@mui/icons-material'

export interface NotificationMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
  persistent?: boolean
  timestamp: Date
  read?: boolean
  category?: 'system' | 'user' | 'ticket' | 'security'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  source?: string
  metadata?: Record<string, any>
}

export interface NotificationSettings {
  enabled: boolean
  soundEnabled: boolean
  position: {
    vertical: 'top' | 'bottom'
    horizontal: 'left' | 'center' | 'right'
  }
  categoriesEnabled: {
    system: boolean
    user: boolean
    ticket: boolean
    security: boolean
  }
  priorityThreshold: 'low' | 'medium' | 'high' | 'critical'
}

interface NotificationContextType {
  notifications: NotificationMessage[]
  unreadCount: number
  settings: NotificationSettings
  addNotification: (notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  updateSettings: (settings: Partial<NotificationSettings>) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationSystemProps {
  maxNotifications?: number
  defaultDuration?: number
  maxHistorySize?: number
  children?: React.ReactNode
}

interface NotificationCenterProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  notifications: NotificationMessage[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClearAll: () => void
  onDeleteNotification: (id: string) => void
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  anchorEl,
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDeleteNotification,
}) => {
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'たった今'
    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    return `${days}日前`
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      system: 'info',
      user: 'primary',
      ticket: 'warning',
      security: 'error',
    }
    return colors[category as keyof typeof colors] || 'default'
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Paper sx={{ width: 400, maxHeight: 600 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">通知</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={onMarkAllAsRead}>
                すべて既読
              </Button>
              <Button size="small" onClick={onClearAll} color="error">
                すべて削除
              </Button>
            </Box>
          </Box>
        </Box>
        
        <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="通知はありません"
                secondary="新しい通知があるとここに表示されます"
              />
            </ListItem>
          ) : (
            notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                  onClick={() => !notification.read && onMarkAsRead(notification.id)}
                >
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: `${notification.type}.light`,
                        color: `${notification.type}.main`,
                      }}
                    >
                      {notification.type === 'success' && <SuccessIcon sx={{ fontSize: 16 }} />}
                      {notification.type === 'error' && <ErrorIcon sx={{ fontSize: 16 }} />}
                      {notification.type === 'warning' && <WarningIcon sx={{ fontSize: 16 }} />}
                      {notification.type === 'info' && <InfoIcon sx={{ fontSize: 16 }} />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                          {notification.title || notification.message}
                        </Typography>
                        {notification.category && (
                          <Chip
                            label={notification.category}
                            size="small"
                            color={getCategoryColor(notification.category) as any}
                            variant="outlined"
                          />
                        )}
                        {notification.priority === 'critical' && (
                          <Chip label="緊急" size="small" color="error" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {notification.title && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {notification.message}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(notification.timestamp)}
                          {notification.source && ` • ${notification.source}`}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteNotification(notification.id)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>
    </Popover>
  )
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 3,
  defaultDuration = 6000,
  maxHistorySize = 100,
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
    position: { vertical: 'top', horizontal: 'right' },
    categoriesEnabled: {
      system: true,
      user: true,
      ticket: true,
      security: true,
    },
    priorityThreshold: 'low',
  })
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [displayNotifications, setDisplayNotifications] = useState<NotificationMessage[]>([])

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: NotificationMessage = {
      id,
      duration: defaultDuration,
      timestamp: new Date(),
      read: false,
      category: 'system',
      priority: 'medium',
      ...notification,
    }

    // Check if notification should be shown based on settings
    if (!settings.enabled) return
    if (!settings.categoriesEnabled[newNotification.category!]) return
    
    const priorityLevels = ['low', 'medium', 'high', 'critical']
    const notificationPriorityIndex = priorityLevels.indexOf(newNotification.priority!)
    const thresholdIndex = priorityLevels.indexOf(settings.priorityThreshold)
    if (notificationPriorityIndex < thresholdIndex) return

    // Add to full notifications list (for history)
    setNotifications(prev => {
      const updated = [newNotification, ...prev]
      return updated.slice(0, maxHistorySize)
    })

    // Add to display notifications (for toasts)
    setDisplayNotifications(prev => {
      const updated = [newNotification, ...prev]
      return updated.slice(0, maxNotifications)
    })

    // Play notification sound
    if (settings.soundEnabled && newNotification.priority !== 'low') {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+')
        audio.volume = 0.3
        audio.play().catch(() => {}) // Ignore errors
      } catch (e) {
        // Ignore audio errors
      }
    }

    // Auto-remove from display after duration (unless persistent)
    if (!newNotification.persistent) {
      setTimeout(() => {
        setDisplayNotifications(prev => prev.filter(n => n.id !== id))
      }, newNotification.duration)
    }
  }, [defaultDuration, maxNotifications, maxHistorySize, settings])

  const removeNotification = useCallback((id: string) => {
    setDisplayNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
    setDisplayNotifications([])
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    setDisplayNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationCenterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    setNotificationCenterOpen(true)
  }

  const handleNotificationCenterClose = () => {
    setNotificationCenterOpen(false)
    setAnchorEl(null)
  }

  // Context value
  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    settings,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll: clearAllNotifications,
    updateSettings,
  }

  // Expose methods globally for backward compatibility
  useEffect(() => {
    const notificationSystem = {
      success: (message: string, options?: Partial<NotificationMessage>) =>
        addNotification({ type: 'success', message, ...options }),
      error: (message: string, options?: Partial<NotificationMessage>) =>
        addNotification({ type: 'error', message, ...options }),
      warning: (message: string, options?: Partial<NotificationMessage>) =>
        addNotification({ type: 'warning', message, ...options }),
      info: (message: string, options?: Partial<NotificationMessage>) =>
        addNotification({ type: 'info', message, ...options }),
      custom: addNotification,
      remove: removeNotification,
      clear: clearAllNotifications,
    }

    // Attach to window for global access
    ;(window as any).notifications = notificationSystem

    return () => {
      delete (window as any).notifications
    }
  }, [addNotification, removeNotification, clearAllNotifications])

  const getIcon = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return <SuccessIcon />
      case 'error':
        return <ErrorIcon />
      case 'warning':
        return <WarningIcon />
      case 'info':
        return <InfoIcon />
      default:
        return <NotificationIcon />
    }
  }

  const getTransition = (index: number) => {
    const transitions = [Slide, Grow, Fade]
    return transitions[index % transitions.length]
  }

  if (children) {
    return (
      <NotificationContext.Provider value={contextValue}>
        {children}
        {renderNotificationToasts()}
        {renderNotificationCenter()}
        {renderNotificationFab()}
      </NotificationContext.Provider>
    )
  }

  return (
    <>
      {renderNotificationToasts()}
      {renderNotificationCenter()}
      {renderNotificationFab()}
    </>
  )

  function renderNotificationToasts() {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: settings.position.vertical === 'top' ? 24 : 'auto',
          bottom: settings.position.vertical === 'bottom' ? 24 : 'auto',
          left: settings.position.horizontal === 'left' ? 24 : 'auto',
          right: settings.position.horizontal === 'right' ? 24 : 'auto',
          ...(settings.position.horizontal === 'center' && {
            left: '50%',
            transform: 'translateX(-50%)',
          }),
          zIndex: 9999,
          maxWidth: 480,
          width: '100%',
          '@media (max-width: 600px)': {
            left: 16,
            right: 16,
            maxWidth: 'none',
            transform: 'none',
          },
        }}
      >
        {displayNotifications.map((notification, index) => {
          const TransitionComponent = getTransition(index)
          
          return (
            <TransitionComponent
              key={notification.id}
              in={true}
              timeout={300}
              style={{
                transformOrigin: settings.position.vertical === 'top' ? 'top' : 'bottom',
              }}
            >
              <Box sx={{ mb: 1 }}>
                <Alert
                  severity={notification.type}
                  icon={getIcon(notification.type)}
                  action={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {notification.action && (
                        <Typography
                          variant="button"
                          sx={{
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            mr: 1,
                          }}
                          onClick={notification.action.handler}
                        >
                          {notification.action.label}
                        </Typography>
                      )}
                      <IconButton
                        aria-label="通知を閉じる"
                        color="inherit"
                        size="small"
                        onClick={() => removeNotification(notification.id)}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  }
                  sx={{
                    boxShadow: 3,
                    '& .MuiAlert-message': {
                      width: '100%',
                    },
                  }}
                >
                  {notification.title && (
                    <AlertTitle sx={{ mb: notification.message ? 1 : 0 }}>
                      {notification.title}
                    </AlertTitle>
                  )}
                  {notification.message && (
                    <Typography variant="body2">
                      {notification.message}
                    </Typography>
                  )}
                </Alert>
              </Box>
            </TransitionComponent>
          )
        })}
      </Box>
    )
  }

  function renderNotificationCenter() {
    return (
      <NotificationCenter
        anchorEl={anchorEl}
        open={notificationCenterOpen}
        onClose={handleNotificationCenterClose}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAllNotifications}
        onDeleteNotification={deleteNotification}
      />
    )
  }

  function renderNotificationFab() {
    return (
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          '@media (max-width: 600px)': {
            bottom: 16,
            right: 16,
          },
        }}
        onClick={handleNotificationCenterClick}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          {settings.enabled ? (
            unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationIcon />
          ) : (
            <NotificationsOffIcon />
          )}
        </Badge>
      </Fab>
    )
  }
}

// TypeScript declarations for global notifications
declare global {
  interface Window {
    notifications?: {
      success: (message: string, options?: Partial<NotificationMessage>) => void
      error: (message: string, options?: Partial<NotificationMessage>) => void
      warning: (message: string, options?: Partial<NotificationMessage>) => void
      info: (message: string, options?: Partial<NotificationMessage>) => void
      custom: (notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => void
      remove: (id: string) => void
      clear: () => void
    }
  }
}

export { NotificationContext }
export default NotificationSystem