import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { Box, Breadcrumbs, Typography, Link, Paper, Chip, Card, CardContent, List, ListItemButton, ListItemIcon, ListItemText, Alert, Skeleton, useTheme, alpha, } from '@mui/material';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon, KeyboardArrowRight, TrendingUp, AccessTime, Star, } from '@mui/icons-material';
import useMenuNavigation from '../../hooks/useMenuNavigation';
const ContentArea = ({ children, loading = false, error = null, showRelatedItems = true, showBreadcrumbs = true, pageTitle, pageDescription, actions, }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { navigationState, generateBreadcrumbItems, getRelatedMenuItems, getFrequentlyUsedItems, hasPermission, currentPage, currentSection, } = useMenuNavigation();
    // アイコンマッピング（Sidebarと同じ）
    const getIcon = (iconName) => {
        // 簡略化したアイコンマッピング
        const iconMap = {
            Dashboard: HomeIcon,
            TrendingUp,
            AccessTime,
            Star,
        };
        const IconComponent = iconMap[iconName] || HomeIcon;
        return _jsx(IconComponent, {});
    };
    // ブレッドクラムの生成
    const breadcrumbItems = generateBreadcrumbItems();
    const relatedItems = getRelatedMenuItems(navigationState.currentMenuItem);
    const frequentItems = getFrequentlyUsedItems();
    // 権限チェック
    if (!hasPermission) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", sx: { mb: 3 }, children: "\u3053\u306E\u30DA\u30FC\u30B8\u306B\u30A2\u30AF\u30BB\u30B9\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002" }) }));
    }
    return (_jsxs(Box, { sx: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs(Paper, { elevation: 0, sx: {
                    p: 3,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                }, children: [showBreadcrumbs && breadcrumbItems.length > 0 && (_jsxs(Breadcrumbs, { separator: _jsx(NavigateNextIcon, { fontSize: "small" }), sx: { mb: 2 }, children: [_jsxs(Link, { component: "button", variant: "body2", onClick: () => navigate('/dashboard'), sx: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    textDecoration: 'none',
                                    color: 'text.secondary',
                                    '&:hover': { color: 'primary.main' },
                                }, children: [_jsx(HomeIcon, { sx: { mr: 0.5, fontSize: '1rem' } }), "\u30DB\u30FC\u30E0"] }), breadcrumbItems.map((item, index) => (item.isLast ? (_jsx(Typography, { color: "text.primary", variant: "body2", children: item.label }, index)) : (_jsx(Link, { component: "button", variant: "body2", onClick: () => item.isClickable && navigate(item.path), sx: {
                                    textDecoration: 'none',
                                    color: 'text.secondary',
                                    '&:hover': { color: 'primary.main' },
                                    cursor: item.isClickable ? 'pointer' : 'default',
                                }, children: item.label }, index))))] })), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 700, mb: 1 }, children: pageTitle || currentPage }), (pageDescription || currentSection) && (_jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mb: 2 }, children: pageDescription || `${currentSection}の管理` })), currentSection && (_jsx(Chip, { label: currentSection, size: "small", variant: "outlined", color: "primary" }))] }), actions && (_jsx(Box, { sx: { ml: 2 }, children: actions }))] })] }), _jsxs(Box, { sx: { flexGrow: 1, display: 'flex', overflow: 'hidden' }, children: [_jsxs(Box, { sx: { flexGrow: 1, overflow: 'auto', p: 3 }, children: [error && (_jsx(Alert, { severity: "error", sx: { mb: 3 }, children: error })), loading ? (_jsxs(Box, { children: [_jsx(Skeleton, { variant: "rectangular", height: 200, sx: { mb: 2 } }), _jsx(Skeleton, { variant: "text", height: 40, sx: { mb: 1 } }), _jsx(Skeleton, { variant: "text", height: 40, sx: { mb: 1 } }), _jsx(Skeleton, { variant: "text", height: 40, width: "60%" })] })) : (children)] }), showRelatedItems && (relatedItems.length > 0 || frequentItems.length > 0) && (_jsx(Box, { sx: { width: 280, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider' }, children: _jsxs(Box, { sx: { p: 2, height: '100%', overflow: 'auto' }, children: [frequentItems.length > 0 && (_jsx(Card, { sx: { mb: 2 }, children: _jsxs(CardContent, { sx: { p: 2, '&:last-child': { pb: 2 } }, children: [_jsxs(Typography, { variant: "subtitle2", sx: { mb: 1, fontWeight: 600 }, children: [_jsx(AccessTime, { sx: { fontSize: '1rem', mr: 0.5, verticalAlign: 'middle' } }), "\u6700\u8FD1\u306E\u4F7F\u7528\u9805\u76EE"] }), _jsx(List, { dense: true, children: frequentItems.map((item, index) => (_jsxs(ListItemButton, { onClick: () => navigate(item.path), sx: {
                                                        borderRadius: 1,
                                                        mb: 0.5,
                                                        '&:hover': {
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                                        },
                                                    }, children: [_jsx(ListItemIcon, { sx: { minWidth: 32 }, children: getIcon(item.icon.name) }), _jsx(ListItemText, { primary: item.label.split(' > ').pop(), primaryTypographyProps: { fontSize: '0.875rem' } }), _jsx(KeyboardArrowRight, { fontSize: "small", color: "action" })] }, index))) })] }) })), relatedItems.length > 0 && (_jsx(Card, { children: _jsxs(CardContent, { sx: { p: 2, '&:last-child': { pb: 2 } }, children: [_jsxs(Typography, { variant: "subtitle2", sx: { mb: 1, fontWeight: 600 }, children: [_jsx(TrendingUp, { sx: { fontSize: '1rem', mr: 0.5, verticalAlign: 'middle' } }), "\u95A2\u9023\u9805\u76EE"] }), _jsx(List, { dense: true, children: relatedItems.map((item, index) => (_jsxs(ListItemButton, { onClick: () => navigate(item.path), sx: {
                                                        borderRadius: 1,
                                                        mb: 0.5,
                                                        '&:hover': {
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                                        },
                                                    }, children: [_jsx(ListItemIcon, { sx: { minWidth: 32 }, children: getIcon(item.icon.name) }), _jsx(ListItemText, { primary: item.label, secondary: item.description, primaryTypographyProps: { fontSize: '0.875rem' }, secondaryTypographyProps: { fontSize: '0.75rem' } }), _jsx(KeyboardArrowRight, { fontSize: "small", color: "action" })] }, index))) })] }) })), relatedItems.length === 0 && frequentItems.length === 0 && (_jsx(Box, { sx: { textAlign: 'center', py: 4 }, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u95A2\u9023\u9805\u76EE\u306F\u3042\u308A\u307E\u305B\u3093" }) }))] }) }))] })] }));
};
export default ContentArea;
