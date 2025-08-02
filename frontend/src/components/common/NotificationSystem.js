import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Alert, AlertTitle, Box, IconButton, Typography, Slide, Grow, Fade, Badge, Popover, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, Paper, Divider, Button, Chip, Avatar, Fab, } from '@mui/material';
import { Close as CloseIcon, CheckCircle as SuccessIcon, Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, Notifications as NotificationIcon, NotificationsActive as NotificationsActiveIcon, NotificationsOff as NotificationsOffIcon, Delete as DeleteIcon, } from '@mui/icons-material';
const NotificationContext = createContext(null);
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
const NotificationCenter = ({ anchorEl, open, onClose, notifications, onMarkAsRead, onMarkAllAsRead, onClearAll, onDeleteNotification, }) => {
    const formatTimestamp = (timestamp) => {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1)
            return 'たった今';
        if (minutes < 60)
            return `${minutes}分前`;
        if (hours < 24)
            return `${hours}時間前`;
        return `${days}日前`;
    };
    const getCategoryColor = (category) => {
        const colors = {
            system: 'info',
            user: 'primary',
            ticket: 'warning',
            security: 'error',
        };
        return colors[category] || 'default';
    };
    return (_jsx(Popover, { open: open, anchorEl: anchorEl, onClose: onClose, anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'right',
        }, transformOrigin: {
            vertical: 'top',
            horizontal: 'right',
        }, children: _jsxs(Paper, { sx: { width: 400, maxHeight: 600 }, children: [_jsx(Box, { sx: { p: 2, borderBottom: 1, borderColor: 'divider' }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", children: "\u901A\u77E5" }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { size: "small", onClick: onMarkAllAsRead, children: "\u3059\u3079\u3066\u65E2\u8AAD" }), _jsx(Button, { size: "small", onClick: onClearAll, color: "error", children: "\u3059\u3079\u3066\u524A\u9664" })] })] }) }), _jsx(List, { sx: { maxHeight: 400, overflow: 'auto', p: 0 }, children: notifications.length === 0 ? (_jsx(ListItem, { children: _jsx(ListItemText, { primary: "\u901A\u77E5\u306F\u3042\u308A\u307E\u305B\u3093", secondary: "\u65B0\u3057\u3044\u901A\u77E5\u304C\u3042\u308B\u3068\u3053\u3053\u306B\u8868\u793A\u3055\u308C\u307E\u3059" }) })) : (notifications.map((notification, index) => (_jsxs(React.Fragment, { children: [_jsxs(ListItem, { sx: {
                                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: 'action.selected',
                                    },
                                }, onClick: () => !notification.read && onMarkAsRead(notification.id), children: [_jsx(ListItemIcon, { children: _jsxs(Avatar, { sx: {
                                                width: 32,
                                                height: 32,
                                                bgcolor: `${notification.type}.light`,
                                                color: `${notification.type}.main`,
                                            }, children: [notification.type === 'success' && _jsx(SuccessIcon, { sx: { fontSize: 16 } }), notification.type === 'error' && _jsx(ErrorIcon, { sx: { fontSize: 16 } }), notification.type === 'warning' && _jsx(WarningIcon, { sx: { fontSize: 16 } }), notification.type === 'info' && _jsx(InfoIcon, { sx: { fontSize: 16 } })] }) }), _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { fontWeight: notification.read ? 400 : 600 }, children: notification.title || notification.message }), notification.category && (_jsx(Chip, { label: notification.category, size: "small", color: getCategoryColor(notification.category), variant: "outlined" })), notification.priority === 'critical' && (_jsx(Chip, { label: "\u7DCA\u6025", size: "small", color: "error" }))] }), secondary: _jsxs(Box, { children: [notification.title && (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 0.5 }, children: notification.message })), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatTimestamp(notification.timestamp), notification.source && ` • ${notification.source}`] })] }) }), _jsx(ListItemSecondaryAction, { children: _jsx(IconButton, { size: "small", onClick: (e) => {
                                                e.stopPropagation();
                                                onDeleteNotification(notification.id);
                                            }, children: _jsx(DeleteIcon, { fontSize: "small" }) }) })] }), index < notifications.length - 1 && _jsx(Divider, {})] }, notification.id)))) })] }) }));
};
const NotificationSystem = ({ maxNotifications = 3, defaultDuration = 6000, maxHistorySize = 100, children, }) => {
    const [notifications, setNotifications] = useState([]);
    const [settings, setSettings] = useState({
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
    });
    const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [displayNotifications, setDisplayNotifications] = useState([]);
    const addNotification = useCallback((notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification = {
            id,
            duration: defaultDuration,
            timestamp: new Date(),
            read: false,
            category: 'system',
            priority: 'medium',
            ...notification,
        };
        // Check if notification should be shown based on settings
        if (!settings.enabled)
            return;
        if (!settings.categoriesEnabled[newNotification.category])
            return;
        const priorityLevels = ['low', 'medium', 'high', 'critical'];
        const notificationPriorityIndex = priorityLevels.indexOf(newNotification.priority);
        const thresholdIndex = priorityLevels.indexOf(settings.priorityThreshold);
        if (notificationPriorityIndex < thresholdIndex)
            return;
        // Add to full notifications list (for history)
        setNotifications(prev => {
            const updated = [newNotification, ...prev];
            return updated.slice(0, maxHistorySize);
        });
        // Add to display notifications (for toasts)
        setDisplayNotifications(prev => {
            const updated = [newNotification, ...prev];
            return updated.slice(0, maxNotifications);
        });
        // Play notification sound
        if (settings.soundEnabled && newNotification.priority !== 'low') {
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAkKX2/LLeSsFJHfH8N2QQAoUXrTp66hVFApGn+');
                audio.volume = 0.3;
                audio.play().catch(() => { }); // Ignore errors
            }
            catch (e) {
                // Ignore audio errors
            }
        }
        // Auto-remove from display after duration (unless persistent)
        if (!newNotification.persistent) {
            setTimeout(() => {
                setDisplayNotifications(prev => prev.filter(n => n.id !== id));
            }, newNotification.duration);
        }
    }, [defaultDuration, maxNotifications, maxHistorySize, settings]);
    const removeNotification = useCallback((id) => {
        setDisplayNotifications(prev => prev.filter(n => n.id !== id));
    }, []);
    const markAsRead = useCallback((id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);
    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
        setDisplayNotifications([]);
    }, []);
    const deleteNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setDisplayNotifications(prev => prev.filter(n => n.id !== id));
    }, []);
    const updateSettings = useCallback((newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);
    const unreadCount = notifications.filter(n => !n.read).length;
    const handleNotificationCenterClick = (event) => {
        setAnchorEl(event.currentTarget);
        setNotificationCenterOpen(true);
    };
    const handleNotificationCenterClose = () => {
        setNotificationCenterOpen(false);
        setAnchorEl(null);
    };
    // Context value
    const contextValue = {
        notifications,
        unreadCount,
        settings,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll: clearAllNotifications,
        updateSettings,
    };
    // Expose methods globally for backward compatibility
    useEffect(() => {
        const notificationSystem = {
            success: (message, options) => addNotification({ type: 'success', message, ...options }),
            error: (message, options) => addNotification({ type: 'error', message, ...options }),
            warning: (message, options) => addNotification({ type: 'warning', message, ...options }),
            info: (message, options) => addNotification({ type: 'info', message, ...options }),
            custom: addNotification,
            remove: removeNotification,
            clear: clearAllNotifications,
        };
        window.notifications = notificationSystem;
        return () => {
            delete window.notifications;
        };
    }, [addNotification, removeNotification, clearAllNotifications]);
    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return _jsx(SuccessIcon, {});
            case 'error':
                return _jsx(ErrorIcon, {});
            case 'warning':
                return _jsx(WarningIcon, {});
            case 'info':
                return _jsx(InfoIcon, {});
            default:
                return _jsx(NotificationIcon, {});
        }
    };
    const getTransition = (index) => {
        const transitions = [Slide, Grow, Fade];
        return transitions[index % transitions.length];
    };
    if (children) {
        return (_jsxs(NotificationContext.Provider, { value: contextValue, children: [children, renderNotificationToasts(), renderNotificationCenter(), renderNotificationFab()] }));
    }
    return (_jsxs(_Fragment, { children: [renderNotificationToasts(), renderNotificationCenter(), renderNotificationFab()] }));
    function renderNotificationToasts() {
        return (_jsx(Box, { sx: {
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
            }, children: displayNotifications.map((notification, index) => {
                const TransitionComponent = getTransition(index);
                return (_jsx(TransitionComponent, { in: true, timeout: 300, style: {
                        transformOrigin: settings.position.vertical === 'top' ? 'top' : 'bottom',
                    }, children: _jsx(Box, { sx: { mb: 1 }, children: _jsxs(Alert, { severity: notification.type, icon: getIcon(notification.type), action: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [notification.action && (_jsx(Typography, { variant: "button", sx: {
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            mr: 1,
                                        }, onClick: notification.action.handler, children: notification.action.label })), _jsx(IconButton, { "aria-label": "\u901A\u77E5\u3092\u9589\u3058\u308B", color: "inherit", size: "small", onClick: () => removeNotification(notification.id), children: _jsx(CloseIcon, { fontSize: "inherit" }) })] }), sx: {
                                boxShadow: 3,
                                '& .MuiAlert-message': {
                                    width: '100%',
                                },
                            }, children: [notification.title && (_jsx(AlertTitle, { sx: { mb: notification.message ? 1 : 0 }, children: notification.title })), notification.message && (_jsx(Typography, { variant: "body2", children: notification.message }))] }) }) }, notification.id));
            }) }));
    }
    function renderNotificationCenter() {
        return (_jsx(NotificationCenter, { anchorEl: anchorEl, open: notificationCenterOpen, onClose: handleNotificationCenterClose, notifications: notifications, onMarkAsRead: markAsRead, onMarkAllAsRead: markAllAsRead, onClearAll: clearAllNotifications, onDeleteNotification: deleteNotification }));
    }
    function renderNotificationFab() {
        return (_jsx(Fab, { color: "primary", sx: {
                position: 'fixed',
                bottom: 24,
                right: 24,
                '@media (max-width: 600px)': {
                    bottom: 16,
                    right: 16,
                },
            }, onClick: handleNotificationCenterClick, children: _jsx(Badge, { badgeContent: unreadCount, color: "error", max: 99, children: settings.enabled ? (unreadCount > 0 ? _jsx(NotificationsActiveIcon, {}) : _jsx(NotificationIcon, {})) : (_jsx(NotificationsOffIcon, {})) }) }));
    }
};
export { NotificationContext };
export default NotificationSystem;
