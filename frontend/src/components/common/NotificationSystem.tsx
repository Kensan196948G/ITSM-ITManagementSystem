import React, { useState, useEffect, useCallback } from 'react'
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
} from '@mui/material'
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Notifications as NotificationIcon,
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
}

interface NotificationSystemProps {
  maxNotifications?: number
  defaultDuration?: number
  position?: {
    vertical: 'top' | 'bottom'
    horizontal: 'left' | 'center' | 'right'
  }
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 3,
  defaultDuration = 6000,
  position = { vertical: 'top', horizontal: 'right' },
}) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: NotificationMessage = {
      id,
      duration: defaultDuration,
      ...notification,
    }

    setNotifications(prev => {
      const updated = [newNotification, ...prev]
      return updated.slice(0, maxNotifications)
    })

    // Auto-remove after duration (unless persistent)
    if (!newNotification.persistent) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
  }, [defaultDuration, maxNotifications])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Expose methods globally for use throughout the app
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

  return (
    <Box
      sx={{
        position: 'fixed',
        top: position.vertical === 'top' ? 24 : 'auto',
        bottom: position.vertical === 'bottom' ? 24 : 'auto',
        left: position.horizontal === 'left' ? 24 : 'auto',
        right: position.horizontal === 'right' ? 24 : 'auto',
        ...(position.horizontal === 'center' && {
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
      {notifications.map((notification, index) => {
        const TransitionComponent = getTransition(index)
        
        return (
          <TransitionComponent
            key={notification.id}
            in={true}
            timeout={300}
            style={{
              transformOrigin: position.vertical === 'top' ? 'top' : 'bottom',
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

// TypeScript declarations for global notifications
declare global {
  interface Window {
    notifications?: {
      success: (message: string, options?: Partial<NotificationMessage>) => void
      error: (message: string, options?: Partial<NotificationMessage>) => void
      warning: (message: string, options?: Partial<NotificationMessage>) => void
      info: (message: string, options?: Partial<NotificationMessage>) => void
      custom: (notification: Omit<NotificationMessage, 'id'>) => void
      remove: (id: string) => void
      clear: () => void
    }
  }
}

export default NotificationSystem