import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, createContext, useContext } from 'react';
import { Box, Drawer, AppBar, Toolbar, Typography, IconButton, useTheme, useMediaQuery, } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import Header from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';
import DetailPanel from '../common/DetailPanel';
import { useDetailPanel } from '../../hooks/useDetailPanel';
const DRAWER_WIDTH = 280;
const DetailPanelContext = createContext(null);
export const useDetailPanelContext = () => {
    const context = useContext(DetailPanelContext);
    if (!context) {
        throw new Error('useDetailPanelContext must be used within a Layout');
    }
    return context;
};
const Layout = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    // 詳細パネルの状態管理
    const { detailPanelState, openDetailPanel, closeDetailPanel, updateDetailPanelItem, isDetailPanelOpen, currentItem, } = useDetailPanel();
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    // レスポンシブ対応：詳細パネルの幅を考慮したメインコンテンツの幅調整
    const getMainContentWidth = () => {
        if (isMobile || !isDetailPanelOpen) {
            return { md: `calc(100% - ${DRAWER_WIDTH}px)` };
        }
        const detailPanelWidth = detailPanelState.width || 480;
        return { md: `calc(100% - ${DRAWER_WIDTH + detailPanelWidth}px)` };
    };
    return (_jsx(DetailPanelContext.Provider, { value: {
            openDetailPanel,
            closeDetailPanel,
            updateDetailPanelItem,
            isDetailPanelOpen,
            currentItem,
        }, children: _jsxs(Box, { sx: { display: 'flex' }, children: [_jsx(AppBar, { position: "fixed", sx: {
                        width: getMainContentWidth(),
                        ml: { md: `${DRAWER_WIDTH}px` },
                        zIndex: theme.zIndex.drawer + 1,
                    }, children: _jsx(ErrorBoundary, { fallback: ({ error, resetError }) => (_jsxs(Toolbar, { children: [_jsx(Typography, { variant: "h6", color: "inherit", sx: { flexGrow: 1 }, children: "ITSM Management System" }), _jsxs(Typography, { variant: "body2", color: "inherit", sx: { mr: 2 }, children: ["Header Error: ", error.message] }), _jsx(IconButton, { color: "inherit", onClick: resetError, children: _jsx(MenuIcon, {}) })] })), children: _jsx(Header, { onMenuClick: handleDrawerToggle, showMenuButton: isMobile }) }) }), _jsxs(Box, { component: "nav", sx: { width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }, "aria-label": "\u30E1\u30A4\u30F3\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3", children: [_jsx(Drawer, { variant: "temporary", open: mobileOpen, onClose: handleDrawerToggle, ModalProps: {
                                keepMounted: true, // Better open performance on mobile
                            }, sx: {
                                display: { xs: 'block', md: 'none' },
                                '& .MuiDrawer-paper': {
                                    boxSizing: 'border-box',
                                    width: DRAWER_WIDTH,
                                },
                            }, children: _jsx(Sidebar, { onItemClick: () => setMobileOpen(false) }) }), _jsx(Drawer, { variant: "permanent", sx: {
                                display: { xs: 'none', md: 'block' },
                                '& .MuiDrawer-paper': {
                                    boxSizing: 'border-box',
                                    width: DRAWER_WIDTH,
                                },
                            }, open: true, children: _jsx(Sidebar, {}) })] }), _jsxs(Box, { component: "main", sx: {
                        flexGrow: 1,
                        p: 3,
                        width: getMainContentWidth(),
                        minHeight: '100vh',
                        backgroundColor: theme.palette.background.default,
                        transition: theme.transitions.create(['width'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    }, children: [_jsx(Toolbar, {}), " ", children] }), _jsx(DetailPanel, { isOpen: isDetailPanelOpen, item: currentItem, onClose: closeDetailPanel, position: detailPanelState.position, width: detailPanelState.width })] }) }));
};
export default Layout;
