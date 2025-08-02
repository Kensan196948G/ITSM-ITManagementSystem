import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemIcon, ListItemText, Divider, Avatar, Badge, BottomNavigation, BottomNavigationAction, Paper, useTheme, SwipeableDrawer, ListItemButton, Collapse, Chip, } from '@mui/material';
import { Menu as MenuIcon, Dashboard as DashboardIcon, Assignment as TicketIcon, People as UsersIcon, Settings as SettingsIcon, Notifications as NotificationsIcon, AccountCircle as ProfileIcon, ExpandLess, ExpandMore, BugReport as IncidentIcon, Build as ChangeIcon, Help as ProblemIcon, Assessment as ReportsIcon, Book as KnowledgeIcon, ExitToApp as LogoutIcon, Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon, } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useResponsive } from '../common/ResponsiveContainer';
const navigationItems = [
    {
        id: 'dashboard',
        label: 'ダッシュボード',
        icon: _jsx(DashboardIcon, {}),
        path: '/dashboard',
    },
    {
        id: 'tickets',
        label: 'チケット管理',
        icon: _jsx(TicketIcon, {}),
        path: '/tickets',
        badge: 5,
        children: [
            {
                id: 'incidents',
                label: 'インシデント',
                icon: _jsx(IncidentIcon, {}),
                path: '/tickets/incidents',
                badge: 3,
            },
            {
                id: 'changes',
                label: '変更管理',
                icon: _jsx(ChangeIcon, {}),
                path: '/tickets/changes',
                badge: 1,
            },
            {
                id: 'problems',
                label: '問題管理',
                icon: _jsx(ProblemIcon, {}),
                path: '/tickets/problems',
                badge: 1,
            },
        ],
    },
    {
        id: 'users',
        label: 'ユーザー管理',
        icon: _jsx(UsersIcon, {}),
        path: '/users',
    },
    {
        id: 'reports',
        label: 'レポート',
        icon: _jsx(ReportsIcon, {}),
        path: '/reports',
    },
    {
        id: 'knowledge',
        label: 'ナレッジベース',
        icon: _jsx(KnowledgeIcon, {}),
        path: '/knowledge',
    },
    {
        id: 'settings',
        label: '設定',
        icon: _jsx(SettingsIcon, {}),
        path: '/settings',
    },
];
const MobileLayout = ({ children, user, notifications = 0, onThemeToggle, isDarkMode = false, }) => {
    const { isMobile, isTablet } = useResponsive();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState({});
    const [bottomNavValue, setBottomNavValue] = useState(0);
    // Update bottom navigation value based on current path
    useEffect(() => {
        const currentPath = location.pathname;
        const mainItems = navigationItems.filter(item => !item.children);
        const currentIndex = mainItems.findIndex(item => currentPath.startsWith(item.path));
        if (currentIndex !== -1) {
            setBottomNavValue(currentIndex);
        }
    }, [location.pathname]);
    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };
    const handleItemClick = (item) => {
        if (item.children) {
            setExpandedItems(prev => ({
                ...prev,
                [item.id]: !prev[item.id]
            }));
        }
        else {
            navigate(item.path);
            setDrawerOpen(false);
        }
    };
    const handleBottomNavChange = (_, newValue) => {
        setBottomNavValue(newValue);
        const mainItems = navigationItems.filter(item => !item.children);
        if (mainItems[newValue]) {
            navigate(mainItems[newValue].path);
        }
    };
    const renderNavigationItem = (item, level = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems[item.id];
        const isActive = location.pathname === item.path ||
            (hasChildren && item.children?.some(child => location.pathname === child.path));
        return (_jsxs(Box, { children: [_jsxs(ListItemButton, { onClick: () => handleItemClick(item), sx: {
                        pl: 2 + level * 2,
                        bgcolor: isActive ? 'action.selected' : 'transparent',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                    }, children: [_jsx(ListItemIcon, { children: _jsx(Badge, { badgeContent: item.badge, color: "error", children: item.icon }) }), _jsx(ListItemText, { primary: item.label, primaryTypographyProps: {
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'primary.main' : 'text.primary',
                            } }), hasChildren && (isExpanded ? _jsx(ExpandLess, {}) : _jsx(ExpandMore, {}))] }), hasChildren && (_jsx(Collapse, { in: isExpanded, timeout: "auto", unmountOnExit: true, children: _jsx(List, { component: "div", disablePadding: true, children: item.children?.map(child => renderNavigationItem(child, level + 1)) }) }))] }, item.id));
    };
    const drawerContent = (_jsxs(Box, { sx: { width: 280 }, children: [user && (_jsx(Box, { sx: { p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { src: user.avatar, sx: { width: 48, height: 48 }, children: user.name.charAt(0) }), _jsxs(Box, { sx: { flexGrow: 1 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600 }, children: user.name }), _jsx(Chip, { label: user.role, size: "small", sx: {
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        color: 'inherit',
                                        fontSize: '0.75rem',
                                    } })] })] }) })), _jsx(Divider, {}), _jsx(List, { sx: { py: 1 }, children: navigationItems.map(item => renderNavigationItem(item)) }), _jsx(Divider, {}), _jsxs(List, { children: [_jsxs(ListItemButton, { onClick: onThemeToggle, children: [_jsx(ListItemIcon, { children: isDarkMode ? _jsx(LightModeIcon, {}) : _jsx(DarkModeIcon, {}) }), _jsx(ListItemText, { primary: isDarkMode ? 'ライトモード' : 'ダークモード' })] }), _jsxs(ListItemButton, { onClick: () => navigate('/profile'), children: [_jsx(ListItemIcon, { children: _jsx(ProfileIcon, {}) }), _jsx(ListItemText, { primary: "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB" })] }), _jsxs(ListItemButton, { onClick: () => console.log('Logout'), children: [_jsx(ListItemIcon, { children: _jsx(LogoutIcon, {}) }), _jsx(ListItemText, { primary: "\u30ED\u30B0\u30A2\u30A6\u30C8" })] })] })] }));
    // Main navigation items for bottom navigation (mobile only)
    const bottomNavItems = navigationItems
        .filter(item => ['dashboard', 'tickets', 'users', 'reports'].includes(item.id))
        .slice(0, 4);
    if (isMobile) {
        return (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', minHeight: '100vh' }, children: [_jsx(AppBar, { position: "sticky", elevation: 1, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { variant: "h6", noWrap: true, sx: { flexGrow: 1 }, children: "ITSM Manager" }), _jsx(IconButton, { color: "inherit", onClick: () => navigate('/notifications'), children: _jsx(Badge, { badgeContent: notifications, color: "error", children: _jsx(NotificationsIcon, {}) }) })] }) }), _jsx(SwipeableDrawer, { anchor: "left", open: drawerOpen, onClose: () => setDrawerOpen(false), onOpen: () => setDrawerOpen(true), children: drawerContent }), _jsx(Box, { sx: {
                        flexGrow: 1,
                        pb: 7, // Space for bottom navigation
                        overflow: 'auto',
                    }, children: children }), _jsx(Paper, { sx: {
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                    }, elevation: 8, children: _jsx(BottomNavigation, { value: bottomNavValue, onChange: handleBottomNavChange, showLabels: true, sx: { height: 64 }, children: bottomNavItems.map((item, index) => (_jsx(BottomNavigationAction, { label: item.label, icon: _jsx(Badge, { badgeContent: item.badge, color: "error", children: item.icon }), sx: {
                                minWidth: 64,
                                fontSize: '0.75rem',
                            } }, item.id))) }) })] }));
    }
    // Tablet and Desktop Layout
    return (_jsxs(Box, { sx: { display: 'flex', minHeight: '100vh' }, children: [_jsxs(Drawer, { variant: "persistent", anchor: "left", open: !isTablet || drawerOpen, sx: {
                    width: 280,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 280,
                        boxSizing: 'border-box',
                    },
                }, children: [_jsxs(Box, { sx: { p: 2, display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: "ITSM Manager" }), isTablet && (_jsx(IconButton, { onClick: handleDrawerToggle, sx: { ml: 'auto' }, children: _jsx(MenuIcon, {}) }))] }), _jsx(Divider, {}), drawerContent] }), _jsxs(Box, { sx: { flexGrow: 1, display: 'flex', flexDirection: 'column' }, children: [isTablet && (_jsx(AppBar, { position: "sticky", color: "default", elevation: 1, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, sx: { mr: 2 }, children: _jsx(MenuIcon, {}) }), _jsx(Typography, { variant: "h6", noWrap: true, sx: { flexGrow: 1 }, children: "ITSM Manager" }), _jsx(IconButton, { color: "inherit", onClick: () => navigate('/notifications'), children: _jsx(Badge, { badgeContent: notifications, color: "error", children: _jsx(NotificationsIcon, {}) }) })] }) })), _jsx(Box, { sx: { flexGrow: 1, p: isTablet ? 2 : 3, overflow: 'auto' }, children: children })] })] }));
};
export default MobileLayout;
