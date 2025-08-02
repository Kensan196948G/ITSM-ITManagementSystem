import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Box, Container, IconButton, Fab, useTheme, useMediaQuery, AppBar, Toolbar, Typography, Collapse, Card, CardContent, Stack, Chip, Dialog, DialogContent, Slide, SwipeableDrawer, } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon, KeyboardArrowUp as ScrollTopIcon, FilterList as FilterIcon, Search as SearchIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, } from '@mui/icons-material';
// Responsive breakpoints configuration
export const breakpoints = {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
};
// Mobile-specific transition components
const SlideTransition = React.forwardRef((props, ref) => _jsx(Slide, { direction: "up", ref: ref, ...props }));
SlideTransition.displayName = 'SlideTransition';
// Hook for responsive behavior
export const useResponsive = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
    const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
    const isXsScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    return {
        isMobile,
        isTablet,
        isDesktop,
        isXsScreen,
        isSmallScreen,
        currentBreakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    };
};
// Responsive grid configuration
export const getResponsiveGridProps = (mobile = 12, tablet = 6, desktop = 4) => ({
    xs: mobile,
    sm: tablet,
    md: desktop,
});
// Responsive spacing utility
export const getResponsiveSpacing = (mobile = 1, tablet = 2, desktop = 3) => ({
    xs: mobile,
    sm: tablet,
    md: desktop,
});
export const ResponsiveContainer = ({ children, maxWidth = 'lg', padding = 3, mobilePadding = 1, className, }) => {
    const { isMobile } = useResponsive();
    return (_jsx(Container, { maxWidth: maxWidth, className: className, sx: {
            px: isMobile ? mobilePadding : padding,
            py: isMobile ? 1 : 2,
        }, children: children }));
};
export const MobileCard = ({ children, title, collapsible = false, defaultExpanded = true, actions, dense = false, }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const { isMobile } = useResponsive();
    return (_jsxs(Card, { sx: {
            mb: isMobile ? 1 : 2,
            boxShadow: isMobile ? 1 : 3,
        }, children: [title && (_jsxs(Box, { sx: {
                    p: dense ? 1 : 2,
                    pb: collapsible && !expanded ? (dense ? 1 : 2) : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: collapsible ? 'pointer' : 'default',
                }, onClick: collapsible ? () => setExpanded(!expanded) : undefined, children: [_jsx(Typography, { variant: isMobile ? 'h6' : 'h5', sx: {
                            fontWeight: 600,
                            fontSize: isMobile ? '1.1rem' : '1.25rem',
                        }, children: title }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [actions, collapsible && (_jsx(IconButton, { size: "small", children: expanded ? _jsx(ExpandLessIcon, {}) : _jsx(ExpandMoreIcon, {}) }))] })] })), _jsx(Collapse, { in: !collapsible || expanded, children: _jsx(CardContent, { sx: {
                        p: dense ? 1 : 2,
                        pt: title ? (dense ? 1 : 2) : (dense ? 1 : 2),
                        '&:last-child': {
                            pb: dense ? 1 : 2,
                        },
                    }, children: children }) })] }));
};
export const MobileDrawer = ({ open, onOpen, onClose, title, children, width = 280, }) => {
    const { isMobile } = useResponsive();
    return (_jsxs(SwipeableDrawer, { anchor: "left", open: open, onOpen: onOpen, onClose: onClose, variant: isMobile ? 'temporary' : 'temporary', sx: {
            '& .MuiDrawer-paper': {
                width,
                boxSizing: 'border-box',
            },
        }, children: [title && (_jsx(AppBar, { position: "static", color: "default", elevation: 0, children: _jsxs(Toolbar, { children: [_jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: title }), _jsx(IconButton, { onClick: onClose, children: _jsx(CloseIcon, {}) })] }) })), _jsx(Box, { sx: { p: 2 }, children: children })] }));
};
export const MobileFilterDialog = ({ open, onClose, title = 'フィルター', children, onApply, onReset, }) => {
    const { isMobile } = useResponsive();
    return (_jsxs(Dialog, { fullScreen: isMobile, open: open, onClose: onClose, maxWidth: "sm", fullWidth: !isMobile, TransitionComponent: isMobile ? SlideTransition : undefined, children: [_jsx(AppBar, { position: "relative", color: "default", elevation: 0, children: _jsxs(Toolbar, { children: [_jsx(IconButton, { edge: "start", color: "inherit", onClick: onClose, "aria-label": "close", children: _jsx(CloseIcon, {}) }), _jsx(Typography, { sx: { ml: 2, flex: 1 }, variant: "h6", component: "div", children: title }), onReset && (_jsx(IconButton, { color: "inherit", onClick: onReset, children: _jsx(Typography, { variant: "button", children: "\u30EA\u30BB\u30C3\u30C8" }) })), onApply && (_jsx(IconButton, { color: "inherit", onClick: onApply, children: _jsx(Typography, { variant: "button", children: "\u9069\u7528" }) }))] }) }), _jsx(DialogContent, { sx: { p: isMobile ? 2 : 3 }, children: children })] }));
};
// Scroll to top component
export const ScrollToTop = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };
    if (!showScrollTop)
        return null;
    return (_jsx(Fab, { color: "primary", size: "medium", onClick: scrollToTop, sx: {
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
        }, children: _jsx(ScrollTopIcon, {}) }));
};
export const MobileToolbar = ({ title, searchPlaceholder, onSearch, showFilter = false, onFilterClick, filterCount = 0, actions, onMenuClick, }) => {
    const { isMobile } = useResponsive();
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const handleSearchSubmit = () => {
        if (onSearch) {
            onSearch(searchQuery);
        }
        setSearchExpanded(false);
    };
    if (!isMobile)
        return null;
    return (_jsx(AppBar, { position: "sticky", color: "default", elevation: 1, children: _jsxs(Toolbar, { variant: "dense", children: [onMenuClick && (_jsx(IconButton, { edge: "start", color: "inherit", "aria-label": "menu", onClick: onMenuClick, sx: { mr: 1 }, children: _jsx(MenuIcon, {}) })), !searchExpanded && title && (_jsx(Typography, { variant: "h6", sx: { flexGrow: 1 }, children: title })), searchExpanded && (_jsx(Box, { sx: { flexGrow: 1, mx: 1 }, children: _jsx("input", { type: "text", placeholder: searchPlaceholder, value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleSearchSubmit(), style: {
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                        }, autoFocus: true }) })), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [onSearch && (_jsx(IconButton, { color: "inherit", onClick: () => {
                                if (searchExpanded) {
                                    handleSearchSubmit();
                                }
                                else {
                                    setSearchExpanded(true);
                                }
                            }, children: _jsx(SearchIcon, {}) })), showFilter && onFilterClick && (_jsx(IconButton, { color: "inherit", onClick: onFilterClick, children: _jsxs(Box, { sx: { position: 'relative' }, children: [_jsx(FilterIcon, {}), filterCount > 0 && (_jsx(Chip, { label: filterCount, size: "small", color: "primary", sx: {
                                            position: 'absolute',
                                            top: -8,
                                            right: -8,
                                            minWidth: 16,
                                            height: 16,
                                            fontSize: '0.6rem',
                                        } }))] }) })), actions, searchExpanded && (_jsx(IconButton, { color: "inherit", onClick: () => {
                                setSearchExpanded(false);
                                setSearchQuery('');
                            }, children: _jsx(CloseIcon, {}) }))] })] }) }));
};
export const ResponsiveStack = ({ children, spacing = 2, mobileSpacing = 1, direction = 'row', mobileDirection = 'column', alignItems = 'center', justifyContent = 'flex-start', }) => {
    const { isMobile } = useResponsive();
    return (_jsx(Stack, { direction: isMobile ? mobileDirection : direction, spacing: isMobile ? mobileSpacing : spacing, alignItems: alignItems, justifyContent: justifyContent, sx: {
            width: '100%',
            flexWrap: isMobile ? 'nowrap' : 'wrap',
        }, children: children }));
};
export const TouchButton = ({ children, onClick, variant = 'contained', color = 'primary', size = 'medium', fullWidth = false, disabled = false, startIcon, endIcon, }) => {
    const { isMobile } = useResponsive();
    return (_jsxs("button", { onClick: onClick, disabled: disabled, style: {
            minHeight: isMobile ? '48px' : '36px', // Touch-friendly height
            minWidth: isMobile ? '48px' : 'auto',
            padding: isMobile ? '12px 16px' : '8px 16px',
            border: variant === 'outlined' ? '1px solid #ccc' : 'none',
            borderRadius: '4px',
            backgroundColor: variant === 'contained' ? '#1976d2' : 'transparent',
            color: variant === 'contained' ? 'white' : '#1976d2',
            fontSize: isMobile ? '16px' : '14px', // Prevent zoom on iOS
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            width: fullWidth ? '100%' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'inherit',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.02857em',
        }, children: [startIcon, children, endIcon] }));
};
export default ResponsiveContainer;
