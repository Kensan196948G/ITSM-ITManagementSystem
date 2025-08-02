import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Collapse, Avatar, TextField, InputAdornment, Badge, Chip, IconButton, Tooltip, Paper, Fade, alpha, } from '@mui/material';
import { 
// Dashboard & Analytics
Dashboard, Analytics, Timeline, MonitorHeart, BarChart, ShowChart, TrendingUp, PieChart, Assessment, 
// Incident & Problem Management
BugReport, ErrorOutline, PauseCircleOutline, CheckCircleOutline, SearchOff, FolderOpen, FindInPage, FolderOff, Psychology, BookmarkBorder, Shield, 
// Change & Release Management
ChangeCircle, Add, EditNote, Approval, Schedule, DoneAll, Groups, CalendarMonth, ReportProblem as Emergency, RocketLaunch, Upcoming, PlayArrow, CheckCircle, Event, Undo, Science, 
// Configuration Management
Inventory, Computer, Apps, Hub, CloudQueue, AccountTree, Layers, FactCheck, 
// Service Catalog
ViewList, Archive, Speed, RequestPage, LibraryBooks, 
// Capacity & Availability
Storage, Accessibility, 
// User & Organization
People, List as ListIcon, PersonAdd, Group, Security, CorporateFare, VpnKey, 
// System Management
Settings, Tune, Email, Timer, AccountTree as WorkFlow, Notifications, 
// Knowledge Management
MenuBook, Article, CreateNewFolder, Category, Quiz, Assignment, School, 
// UI Controls
ExpandLess, ExpandMore, Search, Star, StarBorder, Build as ConfigIcon, FileDownload, 
// CI/CD & Automation
AutoFixHigh, Build, GitHub, History, Link, Description, } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { itsmMenuStructure, getQuickAccessItems, filterMenuByPermissions, getFlatMenuItems } from './MenuStructure';
const Sidebar = ({ onItemClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { authState } = useAuth();
    // 状態管理
    const [openSections, setOpenSections] = useState(['dashboard', 'incident-management']);
    const [openItems, setOpenItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    // ローカルストレージからお気に入りを復元
    useEffect(() => {
        const savedFavorites = localStorage.getItem('itsm-sidebar-favorites');
        if (savedFavorites) {
            setFavorites(JSON.parse(savedFavorites));
        }
        const savedOpenSections = localStorage.getItem('itsm-sidebar-open-sections');
        if (savedOpenSections) {
            setOpenSections(JSON.parse(savedOpenSections));
        }
    }, []);
    // お気に入りの保存
    useEffect(() => {
        localStorage.setItem('itsm-sidebar-favorites', JSON.stringify(favorites));
    }, [favorites]);
    // 開いているセクションの保存
    useEffect(() => {
        localStorage.setItem('itsm-sidebar-open-sections', JSON.stringify(openSections));
    }, [openSections]);
    // ユーザー権限に基づいてフィルタリングされたメニュー
    const filteredMenuStructure = useMemo(() => {
        const userRoles = authState.user?.roles || [];
        return itsmMenuStructure.map(section => ({
            ...section,
            items: filterMenuByPermissions(section.items, userRoles)
        })).filter(section => section.items.length > 0);
    }, [authState.user?.roles]);
    // 検索結果
    const searchResults = useMemo(() => {
        if (!searchQuery.trim())
            return [];
        const flatItems = getFlatMenuItems();
        return flatItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);
    }, [searchQuery]);
    // ナビゲーション処理
    const handleItemClick = (path, hasChildren = false, sectionId) => {
        if (hasChildren) {
            if (sectionId) {
                // セクションの開閉
                setOpenSections(prev => prev.includes(sectionId)
                    ? prev.filter(id => id !== sectionId)
                    : [...prev, sectionId]);
            }
            else {
                // アイテムの開閉
                setOpenItems(prev => prev.includes(path)
                    ? prev.filter(item => item !== path)
                    : [...prev, path]);
            }
        }
        else {
            navigate(path);
            setSearchQuery('');
            setShowSearch(false);
            onItemClick?.();
        }
    };
    // アクティブ状態の判定
    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };
    // お気に入りの切り替え
    const toggleFavorite = (itemId, event) => {
        event.stopPropagation();
        setFavorites(prev => prev.includes(itemId)
            ? prev.filter(id => id !== itemId)
            : [...prev, itemId]);
    };
    // アイコンマッピング
    const getIcon = (iconName, color) => {
        const iconMap = {
            // Dashboard & Analytics
            Dashboard,
            Analytics,
            Timeline,
            MonitorHeart,
            BarChart,
            ShowChart,
            TrendingUp,
            PieChart,
            Assessment,
            // Incident & Problem Management
            BugReport,
            ErrorOutline,
            PauseCircleOutline,
            CheckCircleOutline,
            SearchOff,
            FolderOpen,
            FindInPage,
            FolderOff,
            Psychology,
            BookmarkBorder,
            Shield,
            // Change & Release Management
            ChangeCircle,
            Add,
            EditNote,
            Approval,
            Schedule,
            DoneAll,
            Groups,
            CalendarMonth,
            Emergency,
            RocketLaunch,
            Upcoming,
            PlayArrow,
            CheckCircle,
            Event,
            Undo,
            Science,
            // Configuration Management
            Inventory,
            Computer,
            Apps,
            Hub,
            CloudQueue,
            AccountTree,
            Layers,
            FactCheck,
            // Service Catalog
            ViewList,
            Archive,
            Speed,
            RequestPage,
            LibraryBooks,
            // Capacity & Availability
            Storage,
            Accessibility,
            // User & Organization
            People,
            List: ListIcon,
            PersonAdd,
            Group,
            Security,
            CorporateFare,
            VpnKey,
            // System Management
            Settings,
            Tune,
            Email,
            Timer,
            WorkFlow,
            Notifications,
            // Knowledge Management
            MenuBook,
            Article,
            CreateNewFolder,
            Category,
            Quiz,
            Assignment,
            School,
            // UI Controls
            ConfigIcon,
            FileDownload,
            // CI/CD & Automation
            AutoFixHigh,
            Build,
            GitHub,
            Timeline,
            History,
            Link,
            Description,
        };
        const IconComponent = iconMap[iconName] || Dashboard;
        return _jsx(IconComponent, { color: color });
    };
    // メニューアイテムのレンダリング
    const renderMenuItem = (item, depth = 0) => {
        const hasChildren = Boolean(item.children?.length);
        const isOpen = openItems.includes(item.id);
        const itemIsActive = hasChildren ? false : isActive(item.path);
        const isFavorite = favorites.includes(item.id);
        return (_jsxs(React.Fragment, { children: [_jsxs(ListItemButton, { onClick: () => handleItemClick(item.path, hasChildren), selected: itemIsActive, sx: {
                        pl: 2 + depth * 1.5,
                        pr: 1,
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                        minHeight: 44,
                        '&.Mui-selected': {
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                            '& .MuiListItemIcon-root': {
                                color: 'primary.contrastText',
                            },
                            '&:hover': {
                                backgroundColor: 'primary.dark',
                            },
                        },
                        '&:hover': {
                            backgroundColor: alpha('#000', 0.04),
                        },
                    }, children: [_jsx(ListItemIcon, { sx: { minWidth: 36 }, children: item.badge ? (_jsx(Badge, { badgeContent: item.badge.count || item.badge.text, color: item.badge.color || 'error', max: 99, variant: item.badge.text ? 'standard' : 'standard', children: getIcon(item.icon.name, item.icon.color) })) : (getIcon(item.icon.name, item.icon.color)) }), _jsx(ListItemText, { primary: item.label, secondary: depth === 0 && item.description ? item.description : undefined, primaryTypographyProps: {
                                fontSize: depth > 0 ? '0.875rem' : '1rem',
                                fontWeight: itemIsActive ? 600 : 500,
                                noWrap: true,
                            }, secondaryTypographyProps: {
                                fontSize: '0.75rem',
                                noWrap: true,
                            } }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [!hasChildren && (_jsx(Tooltip, { title: isFavorite ? 'お気に入りから削除' : 'お気に入りに追加', children: _jsx(IconButton, { size: "small", onClick: (e) => toggleFavorite(item.id, e), sx: {
                                            opacity: 0.7,
                                            '&:hover': { opacity: 1 }
                                        }, children: isFavorite ? _jsx(Star, { fontSize: "small" }) : _jsx(StarBorder, { fontSize: "small" }) }) })), hasChildren && (isOpen ? _jsx(ExpandLess, {}) : _jsx(ExpandMore, {}))] })] }), hasChildren && (_jsx(Collapse, { in: isOpen, timeout: "auto", unmountOnExit: true, children: _jsx(List, { component: "div", disablePadding: true, children: item.children?.map(child => renderMenuItem(child, depth + 1)) }) })), item.dividerAfter && _jsx(Divider, { sx: { mx: 2, my: 1 } })] }, item.id));
    };
    // セクションのレンダリング
    const renderSection = (section) => {
        const isOpen = openSections.includes(section.id);
        return (_jsxs(Box, { sx: { mb: 1 }, children: [_jsxs(ListItemButton, { onClick: () => handleItemClick('', true, section.id), sx: {
                        pl: 2,
                        pr: 1,
                        py: 1,
                        mx: 1,
                        borderRadius: 1,
                        backgroundColor: alpha('#000', 0.02),
                        '&:hover': {
                            backgroundColor: alpha('#000', 0.06),
                        },
                    }, children: [_jsx(ListItemText, { primary: section.title, primaryTypographyProps: {
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            } }), isOpen ? _jsx(ExpandLess, {}) : _jsx(ExpandMore, {})] }), _jsx(Collapse, { in: isOpen, timeout: "auto", unmountOnExit: true, children: _jsx(List, { component: "div", disablePadding: true, children: section.items.map(item => renderMenuItem(item)) }) })] }, section.id));
    };
    return (_jsxs(Box, { sx: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs(Toolbar, { sx: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Avatar, { sx: {
                                    bgcolor: 'primary.main',
                                    width: 40,
                                    height: 40,
                                    mr: 2,
                                }, children: _jsx(ConfigIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, lineHeight: 1.2 }, children: "ITSM" }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "Management System" })] })] }), _jsx(Tooltip, { title: "\u691C\u7D22", children: _jsx(IconButton, { size: "small", onClick: () => setShowSearch(!showSearch), sx: {
                                color: showSearch ? 'primary.main' : 'text.secondary'
                            }, children: _jsx(Search, {}) }) })] }), _jsx(Fade, { in: showSearch, children: _jsxs(Box, { sx: { p: 2, borderBottom: '1px solid', borderColor: 'divider' }, children: [_jsx(TextField, { fullWidth: true, size: "small", placeholder: "\u30E1\u30CB\u30E5\u30FC\u3092\u691C\u7D22...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(Search, { fontSize: "small" }) })),
                            }, autoFocus: true }), searchResults.length > 0 && (_jsx(Paper, { elevation: 4, sx: {
                                mt: 1,
                                maxHeight: 200,
                                overflow: 'auto',
                                border: '1px solid',
                                borderColor: 'divider'
                            }, children: _jsx(List, { dense: true, children: searchResults.map((item) => (_jsxs(ListItemButton, { onClick: () => handleItemClick(item.path), sx: { py: 0.5 }, children: [_jsx(ListItemIcon, { sx: { minWidth: 32 }, children: getIcon(item.icon.name, item.icon.color) }), _jsx(ListItemText, { primary: item.label, secondary: item.description, primaryTypographyProps: { fontSize: '0.875rem' }, secondaryTypographyProps: { fontSize: '0.75rem' } })] }, item.id))) }) }))] }) }), _jsxs(Box, { sx: { flexGrow: 1, overflow: 'auto', py: 1 }, children: [favorites.length > 0 && (_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Box, { sx: { px: 2, py: 1 }, children: _jsxs(Typography, { variant: "overline", color: "text.secondary", sx: { fontWeight: 600, letterSpacing: 1, fontSize: '0.75rem' }, children: [_jsx(Star, { fontSize: "inherit", sx: { mr: 0.5, verticalAlign: 'middle' } }), "\u304A\u6C17\u306B\u5165\u308A"] }) }), _jsx(List, { dense: true, sx: { px: 1 }, children: favorites.map(favoriteId => {
                                    const flatItems = getFlatMenuItems();
                                    const favoriteItem = flatItems.find(item => item.id === favoriteId);
                                    if (!favoriteItem)
                                        return null;
                                    return (_jsxs(ListItemButton, { onClick: () => handleItemClick(favoriteItem.path), selected: isActive(favoriteItem.path), sx: {
                                            borderRadius: 1,
                                            mx: 1,
                                            mb: 0.5,
                                            pl: 2,
                                            minHeight: 36,
                                            '&.Mui-selected': {
                                                backgroundColor: 'primary.main',
                                                color: 'primary.contrastText',
                                                '& .MuiListItemIcon-root': {
                                                    color: 'primary.contrastText',
                                                },
                                            },
                                        }, children: [_jsx(ListItemIcon, { sx: { minWidth: 32 }, children: getIcon(favoriteItem.icon.name, favoriteItem.icon.color) }), _jsx(ListItemText, { primary: favoriteItem.label.split(' > ').pop(), primaryTypographyProps: { fontSize: '0.875rem', noWrap: true } })] }, favoriteId));
                                }) }), _jsx(Divider, { sx: { mx: 2, my: 1 } })] })), _jsx(List, { component: "nav", sx: { px: 0 }, children: filteredMenuStructure.map(section => renderSection(section)) }), getQuickAccessItems().length > 0 && (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Divider, { sx: { mx: 2, mb: 2 } }), _jsx(Box, { sx: { px: 2, py: 1 }, children: _jsx(Typography, { variant: "overline", color: "text.secondary", sx: { fontWeight: 600, letterSpacing: 1, fontSize: '0.75rem' }, children: "\u30AF\u30A4\u30C3\u30AF\u30A2\u30AF\u30BB\u30B9" }) }), _jsx(List, { dense: true, sx: { px: 1 }, children: getQuickAccessItems().map(item => (_jsxs(ListItemButton, { onClick: () => handleItemClick(item.path), sx: {
                                        borderRadius: 1,
                                        mx: 1,
                                        mb: 0.5,
                                        pl: 2,
                                        minHeight: 36,
                                    }, children: [_jsx(ListItemIcon, { sx: { minWidth: 32 }, children: getIcon(item.icon.name, item.icon.color) }), _jsx(ListItemText, { primary: item.label, primaryTypographyProps: { fontSize: '0.875rem', noWrap: true } })] }, item.id))) })] }))] }), _jsxs(Box, { sx: {
                    px: 2,
                    py: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "ITSM v1.0.0" }), _jsx(Chip, { label: authState.user?.name || 'User', size: "small", variant: "outlined", sx: { fontSize: '0.75rem' } })] })] }));
};
export default Sidebar;
