import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { Box, Drawer, IconButton, Typography, Fade, useTheme, useMediaQuery, Backdrop, } from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon, Edit as EditIcon, FullscreenExit as CollapseIcon, Fullscreen as ExpandIcon, } from '@mui/icons-material';
import { ErrorBoundary } from './ErrorBoundary';
import DetailPanelContent from './DetailPanelContent';
const DETAIL_PANEL_WIDTH = 480;
const DETAIL_PANEL_MIN_WIDTH = 320;
const DETAIL_PANEL_MAX_WIDTH = 800;
export const DetailPanel = ({ isOpen, item, onClose, position = 'right', width = DETAIL_PANEL_WIDTH, maxWidth = DETAIL_PANEL_MAX_WIDTH, minWidth = DETAIL_PANEL_MIN_WIDTH, }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
    const contentRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // レスポンシブ対応：デバイスサイズに応じてパネル設定を調整
    const getResponsiveConfig = () => {
        if (isMobile) {
            return {
                variant: 'temporary',
                anchor: 'bottom',
                width: '100%',
                height: '85vh',
                showBackdrop: true,
            };
        }
        if (isTablet) {
            return {
                variant: 'temporary',
                anchor: position,
                width: Math.min(400, window.innerWidth - 100),
                height: '100vh',
                showBackdrop: true,
            };
        }
        return {
            variant: 'persistent',
            anchor: position,
            width: isExpanded ? maxWidth : width,
            height: '100vh',
            showBackdrop: false,
        };
    };
    const config = getResponsiveConfig();
    // キーボードナビゲーション対応
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!isOpen)
                return;
            switch (event.key) {
                case 'Escape':
                    event.preventDefault();
                    onClose();
                    break;
                case 'F5':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        handleRefresh();
                    }
                    break;
                case 'e':
                    if (event.ctrlKey && event.altKey) {
                        event.preventDefault();
                        handleEdit();
                    }
                    break;
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);
    // フォーカス管理
    useEffect(() => {
        if (isOpen && contentRef.current) {
            // パネルが開いたときに適切な要素にフォーカス
            const firstFocusable = contentRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }
        }
    }, [isOpen, item]);
    const handleRefresh = () => {
        if (!item)
            return;
        setIsLoading(true);
        // リフレッシュロジック（実際のAPI呼び出しなど）
        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    };
    const handleEdit = () => {
        if (!item)
            return;
        // 編集ロジック
        console.log('編集開始:', item);
    };
    const handleExpand = () => {
        setIsExpanded(!isExpanded);
    };
    const renderToolbar = () => (_jsxs(Box, { sx: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            position: 'sticky',
            top: 0,
            zIndex: 1,
        }, children: [_jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Typography, { variant: "h6", sx: {
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }, children: item?.title || '詳細情報' }), item?.subtitle && (_jsx(Typography, { variant: "body2", sx: {
                            color: theme.palette.text.secondary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }, children: item.subtitle }))] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(IconButton, { onClick: handleRefresh, disabled: isLoading, size: "small", "aria-label": "\u60C5\u5831\u3092\u66F4\u65B0", title: "\u60C5\u5831\u3092\u66F4\u65B0 (Ctrl+F5)", children: _jsx(RefreshIcon, {}) }), _jsx(IconButton, { onClick: handleEdit, size: "small", "aria-label": "\u7DE8\u96C6", title: "\u7DE8\u96C6 (Ctrl+Alt+E)", children: _jsx(EditIcon, {}) }), !isMobile && !isTablet && (_jsx(IconButton, { onClick: handleExpand, size: "small", "aria-label": isExpanded ? '縮小' : '展開', title: isExpanded ? '縮小' : '展開', children: isExpanded ? _jsx(CollapseIcon, {}) : _jsx(ExpandIcon, {}) })), _jsx(IconButton, { onClick: onClose, size: "small", "aria-label": "\u8A73\u7D30\u30D1\u30CD\u30EB\u3092\u9589\u3058\u308B", title: "\u9589\u3058\u308B (Esc)", children: _jsx(CloseIcon, {}) })] })] }));
    const renderContent = () => {
        if (!item) {
            return (_jsx(Box, { sx: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px',
                    color: theme.palette.text.secondary,
                }, children: _jsx(Typography, { variant: "body1", children: "\u8A73\u7D30\u60C5\u5831\u3092\u8868\u793A\u3059\u308B\u30A2\u30A4\u30C6\u30E0\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044" }) }));
        }
        return (_jsx(ErrorBoundary, { fallback: ({ error, resetError }) => (_jsxs(Box, { sx: { p: 2 }, children: [_jsx(Typography, { color: "error", gutterBottom: true, children: "\u8A73\u7D30\u60C5\u5831\u306E\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: error.message }), _jsx(IconButton, { onClick: resetError, color: "primary", children: _jsx(RefreshIcon, {}) })] })), children: _jsx(DetailPanelContent, { item: item, onEdit: (updatedItem) => {
                    console.log('編集:', updatedItem);
                    // 実際の編集処理をここに実装
                }, onDelete: (id) => {
                    console.log('削除:', id);
                    // 実際の削除処理をここに実装
                }, onRefresh: (id) => {
                    console.log('更新:', id);
                    handleRefresh();
                } }) }));
    };
    const drawerProps = {
        open: isOpen,
        onClose: onClose,
        anchor: config.anchor,
        variant: config.variant,
        ModalProps: {
            keepMounted: true, // パフォーマンス向上
            disableScrollLock: true, // スクロールロック無効化
        },
        PaperProps: {
            sx: {
                width: config.width,
                height: config.height,
                maxWidth: maxWidth,
                minWidth: minWidth,
                backgroundColor: theme.palette.background.default,
                borderLeft: config.anchor === 'right' ? `1px solid ${theme.palette.divider}` : 'none',
                borderTop: config.anchor === 'bottom' ? `1px solid ${theme.palette.divider}` : 'none',
                borderRadius: config.anchor === 'bottom' ? '16px 16px 0 0' : 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                // アニメーション設定
                transition: theme.transitions.create(['width', 'height'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
            },
            elevation: isMobile ? 16 : 4,
        },
        SlideProps: {
            direction: config.anchor === 'right' ? 'left' : 'up',
        },
    };
    return (_jsxs(_Fragment, { children: [config.showBackdrop && (_jsx(Backdrop, { open: isOpen, onClick: onClose, sx: {
                    zIndex: theme.zIndex.drawer - 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                } })), _jsx(Drawer, { ...drawerProps, children: _jsx(Fade, { in: isOpen, timeout: 300, children: _jsxs(Box, { ref: contentRef, sx: {
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }, role: "complementary", "aria-label": "\u8A73\u7D30\u60C5\u5831\u30D1\u30CD\u30EB", "aria-expanded": isOpen, children: [renderToolbar(), _jsx(Box, { sx: {
                                    flex: 1,
                                    overflow: 'auto',
                                    backgroundColor: theme.palette.background.paper,
                                }, children: renderContent() })] }) }) })] }));
};
export default DetailPanel;
