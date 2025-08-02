import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem, Badge, Tooltip, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, } from '@mui/material';
import { Menu as MenuIcon, Notifications as NotificationsIcon, Settings as SettingsIcon, Logout as LogoutIcon, Person as PersonIcon, } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
const Header = ({ onMenuClick, showMenuButton }) => {
    const { authState, logout } = useAuth();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notificationAnchor, setNotificationAnchor] = React.useState(null);
    const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
    const [loggingOut, setLoggingOut] = React.useState(false);
    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };
    const handleNotificationOpen = (event) => {
        setNotificationAnchor(event.currentTarget);
    };
    const handleNotificationClose = () => {
        setNotificationAnchor(null);
    };
    const handleLogoutClick = () => {
        setAnchorEl(null);
        setLogoutDialogOpen(true);
    };
    const handleLogoutConfirm = async () => {
        setLoggingOut(true);
        try {
            await logout();
            navigate('/login', { replace: true });
        }
        catch (error) {
            console.error('Logout error:', error);
        }
        finally {
            setLoggingOut(false);
            setLogoutDialogOpen(false);
        }
    };
    const handleLogoutCancel = () => {
        setLogoutDialogOpen(false);
    };
    const getRoleDisplayName = (role) => {
        if (!role)
            return '';
        const roleMap = {
            admin: 'システム管理者',
            ADMIN: 'システム管理者',
            manager: 'マネージャー',
            MANAGER: 'マネージャー',
            operator: 'オペレーター',
            OPERATOR: 'オペレーター',
            viewer: 'ビューアー',
            VIEWER: 'ビューアー',
        };
        return roleMap[role] || role;
    };
    const getUserDisplayName = () => {
        if (authState.user) {
            // Check display_name
            if (authState.user.display_name && typeof authState.user.display_name === 'string' && authState.user.display_name.trim()) {
                return authState.user.display_name;
            }
            // Check full_name
            if (authState.user.full_name && typeof authState.user.full_name === 'string' && authState.user.full_name.trim()) {
                return authState.user.full_name;
            }
            // Check lastName and firstName
            if (authState.user.lastName && authState.user.firstName &&
                typeof authState.user.lastName === 'string' && typeof authState.user.firstName === 'string' &&
                authState.user.lastName.trim() && authState.user.firstName.trim()) {
                return `${authState.user.lastName} ${authState.user.firstName}`;
            }
            // Check name
            if (authState.user.name && typeof authState.user.name === 'string' && authState.user.name.trim()) {
                return authState.user.name;
            }
            // Check username
            if (authState.user.username && typeof authState.user.username === 'string' && authState.user.username.trim()) {
                return authState.user.username;
            }
            // Check email
            if (authState.user.email && typeof authState.user.email === 'string' && authState.user.email.trim()) {
                return authState.user.email;
            }
            return 'ユーザー';
        }
        return 'ユーザー';
    };
    const getUserInitial = () => {
        if (authState.user) {
            // Check lastName and ensure it's a string with length > 0
            if (authState.user.lastName && typeof authState.user.lastName === 'string' && authState.user.lastName.length > 0) {
                return authState.user.lastName.charAt(0).toUpperCase();
            }
            // Check display_name and ensure it's a string with length > 0
            if (authState.user.display_name && typeof authState.user.display_name === 'string' && authState.user.display_name.length > 0) {
                return authState.user.display_name.charAt(0).toUpperCase();
            }
            // Check full_name and ensure it's a string with length > 0
            if (authState.user.full_name && typeof authState.user.full_name === 'string' && authState.user.full_name.length > 0) {
                return authState.user.full_name.charAt(0).toUpperCase();
            }
            // Check username and ensure it's a string with length > 0
            if (authState.user.username && typeof authState.user.username === 'string' && authState.user.username.length > 0) {
                return authState.user.username.charAt(0).toUpperCase();
            }
            // Check email and ensure it's a string with length > 0
            if (authState.user.email && typeof authState.user.email === 'string' && authState.user.email.length > 0) {
                return authState.user.email.charAt(0).toUpperCase();
            }
        }
        return 'U';
    };
    const mockNotifications = [
        { id: 1, title: '新しいインシデント', message: 'サーバー障害が報告されました', time: '5分前' },
        { id: 2, title: 'SLA警告', message: 'チケット#12345の期限が近づいています', time: '15分前' },
        { id: 3, title: '承認待ち', message: '変更要求の承認が必要です', time: '1時間前' },
    ];
    return (_jsxs(Toolbar, { children: [showMenuButton && (_jsx(IconButton, { color: "inherit", "aria-label": "\u30E1\u30CB\u30E5\u30FC\u3092\u958B\u304F", edge: "start", onClick: onMenuClick, sx: { mr: 2 }, children: _jsx(MenuIcon, {}) })), _jsx(Typography, { variant: "h6", noWrap: true, component: "div", sx: { flexGrow: 1, fontWeight: 600 }, children: "ITSM Management System" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Tooltip, { title: "\u901A\u77E5", children: _jsx(IconButton, { color: "inherit", "aria-label": "\u901A\u77E5\u3092\u8868\u793A", onClick: handleNotificationOpen, children: _jsx(Badge, { badgeContent: mockNotifications.length, color: "error", children: _jsx(NotificationsIcon, {}) }) }) }), _jsx(Tooltip, { title: "\u8A2D\u5B9A", children: _jsx(IconButton, { color: "inherit", "aria-label": "\u8A2D\u5B9A", children: _jsx(SettingsIcon, {}) }) }), _jsx(Tooltip, { title: "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB", children: _jsx(IconButton, { onClick: handleProfileMenuOpen, color: "inherit", "aria-label": "\u30E6\u30FC\u30B6\u30FC\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB", children: _jsx(Avatar, { sx: { width: 32, height: 32 }, alt: (() => {
                                    try {
                                        return getUserDisplayName();
                                    }
                                    catch (error) {
                                        console.error('Error getting user display name for alt:', error);
                                        return 'ユーザー';
                                    }
                                })(), children: (() => {
                                    try {
                                        return authState.user ? getUserInitial() : 'U';
                                    }
                                    catch (error) {
                                        console.error('Error getting user initial:', error);
                                        return 'U';
                                    }
                                })() }) }) })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleProfileMenuClose, onClick: handleProfileMenuClose, transformOrigin: { horizontal: 'right', vertical: 'top' }, anchorOrigin: { horizontal: 'right', vertical: 'bottom' }, sx: { mt: 1 }, children: [_jsxs(Box, { sx: { px: 2, py: 1, minWidth: 200 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600 }, children: (() => {
                                    try {
                                        return getUserDisplayName();
                                    }
                                    catch (error) {
                                        console.error('Error getting user display name:', error);
                                        return 'ユーザー';
                                    }
                                })() }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: authState.user?.email || '' }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: (() => {
                                    try {
                                        return authState.user ? getRoleDisplayName(authState.user.role) : '';
                                    }
                                    catch (error) {
                                        console.error('Error getting role display name:', error);
                                        return '';
                                    }
                                })() })] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: handleProfileMenuClose, children: [_jsx(PersonIcon, { sx: { mr: 2 } }), "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB"] }), _jsxs(MenuItem, { onClick: handleProfileMenuClose, children: [_jsx(SettingsIcon, { sx: { mr: 2 } }), "\u8A2D\u5B9A"] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: handleLogoutClick, children: [_jsx(LogoutIcon, { sx: { mr: 2 } }), "\u30ED\u30B0\u30A2\u30A6\u30C8"] })] }), _jsxs(Menu, { anchorEl: notificationAnchor, open: Boolean(notificationAnchor), onClose: handleNotificationClose, transformOrigin: { horizontal: 'right', vertical: 'top' }, anchorOrigin: { horizontal: 'right', vertical: 'bottom' }, sx: { mt: 1 }, children: [_jsx(Box, { sx: { px: 2, py: 1 }, children: _jsx(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: "\u901A\u77E5" }) }), _jsx(Divider, {}), mockNotifications.map((notification) => (_jsx(MenuItem, { onClick: handleNotificationClose, children: _jsxs(Box, { sx: { maxWidth: 300 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600 }, children: notification.title }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 0.5 }, children: notification.message }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: notification.time })] }) }, notification.id))), _jsx(Divider, {}), _jsx(MenuItem, { onClick: handleNotificationClose, sx: { justifyContent: 'center' }, children: _jsx(Typography, { variant: "body2", color: "primary", children: "\u3059\u3079\u3066\u306E\u901A\u77E5\u3092\u8868\u793A" }) })] }), _jsxs(Dialog, { open: logoutDialogOpen, onClose: handleLogoutCancel, "aria-labelledby": "logout-dialog-title", "aria-describedby": "logout-dialog-description", children: [_jsx(DialogTitle, { id: "logout-dialog-title", children: "\u30ED\u30B0\u30A2\u30A6\u30C8\u78BA\u8A8D" }), _jsx(DialogContent, { children: _jsx(Typography, { children: "\u672C\u5F53\u306B\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3059\u304B\uFF1F" }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleLogoutCancel, disabled: loggingOut, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: handleLogoutConfirm, variant: "contained", color: "primary", disabled: loggingOut, startIcon: loggingOut ? _jsx(CircularProgress, { size: 16 }) : _jsx(LogoutIcon, {}), children: loggingOut ? 'ログアウト中...' : 'ログアウト' })] })] })] }));
};
export default Header;
