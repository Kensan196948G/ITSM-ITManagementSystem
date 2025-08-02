import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { Fab, Menu, MenuItem, ListItemIcon, ListItemText, Zoom, Box, Typography, IconButton, Divider, Slider, Switch, FormControlLabel, Alert, AlertTitle, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip, } from '@mui/material';
import { Accessibility as AccessibilityIcon, Close as CloseIcon, Help as HelpIcon, } from '@mui/icons-material';
const AccessibilityContext = createContext(null);
export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within AccessibilityProvider');
    }
    return context;
};
export const AccessibilityProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        fontSize: 1,
        lineHeight: 1.5,
        highContrast: false,
        soundEnabled: false,
        keyboardNavigation: true,
        reduceMotion: false,
        screenReaderOptimized: false,
        focusIndicators: true,
        colorBlindSupport: 'none',
        readingMode: false,
        animationSpeed: 1,
        cursorSize: 1,
    });
    const [announceElement, setAnnounceElement] = useState(null);
    useEffect(() => {
        // Create ARIA live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
        setAnnounceElement(liveRegion);
        return () => {
            if (liveRegion.parentNode) {
                liveRegion.parentNode.removeChild(liveRegion);
            }
        };
    }, []);
    const announce = useCallback((message, priority = 'polite') => {
        if (announceElement) {
            announceElement.setAttribute('aria-live', priority);
            announceElement.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                announceElement.textContent = '';
            }, 1000);
        }
    }, [announceElement]);
    const updateSetting = useCallback((key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        applySettings(newSettings);
        localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
        // Announce change
        const settingNames = {
            fontSize: '文字サイズ',
            lineHeight: '行間',
            highContrast: 'ハイコントラスト',
            soundEnabled: '音声フィードバック',
            keyboardNavigation: 'キーボードナビゲーション',
            reduceMotion: 'アニメーション減少',
            screenReaderOptimized: 'スクリーンリーダー最適化',
            focusIndicators: 'フォーカス表示',
            colorBlindSupport: '色覚サポート',
            readingMode: '読み取りモード',
            animationSpeed: 'アニメーション速度',
            cursorSize: 'カーソルサイズ',
        };
        announce(`${settingNames[key]}が変更されました`);
    }, [settings, announce]);
    const contextValue = {
        settings,
        updateSetting,
        announce,
        isAccessibilityEnabled: Object.values(settings).some(value => value !== false && value !== 'none' && value !== 1),
    };
    // Load saved settings
    useEffect(() => {
        const savedSettings = localStorage.getItem('accessibility-settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(prev => ({ ...prev, ...parsed }));
                applySettings({ ...settings, ...parsed });
            }
            catch (error) {
                console.warn('Failed to load accessibility settings:', error);
            }
        }
    }, []);
    return (_jsx(AccessibilityContext.Provider, { value: contextValue, children: children }));
};
const AccessibilityHelper = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const { settings, updateSetting, announce } = useAccessibility();
    const open = Boolean(anchorEl);
    useEffect(() => {
        // Load accessibility settings from localStorage
        const savedSettings = localStorage.getItem('accessibility-settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                // Apply each setting individually using updateSetting
                Object.entries(parsed).forEach(([key, value]) => {
                    updateSetting(key, value);
                });
            }
            catch (error) {
                console.warn('Failed to parse accessibility settings:', error);
            }
        }
        // Show accessibility helper after a delay
        const timer = setTimeout(() => setIsVisible(true), 2000);
        return () => clearTimeout(timer);
    }, []);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const increaseFontSize = () => {
        if (settings.fontSize < 1.5) {
            updateSetting('fontSize', Math.min(settings.fontSize + 0.1, 1.5));
        }
    };
    const decreaseFontSize = () => {
        if (settings.fontSize > 0.8) {
            updateSetting('fontSize', Math.max(settings.fontSize - 0.1, 0.8));
        }
    };
    const toggleHighContrast = () => {
        updateSetting('highContrast', !settings.highContrast);
    };
    const toggleSound = () => {
        updateSetting('soundEnabled', !settings.soundEnabled);
    };
    const toggleKeyboardNav = () => {
        updateSetting('keyboardNavigation', !settings.keyboardNavigation);
    };
    const resetSettings = () => {
        const defaultSettings = {
            fontSize: 1,
            lineHeight: 1.5,
            highContrast: false,
            soundEnabled: false,
            keyboardNavigation: true,
            reduceMotion: false,
            screenReaderOptimized: false,
            focusIndicators: true,
            colorBlindSupport: 'none',
            readingMode: false,
            animationSpeed: 1,
            cursorSize: 1,
        };
        Object.entries(defaultSettings).forEach(([key, value]) => {
            updateSetting(key, value);
        });
        announce('アクセシビリティ設定がリセットされました');
        handleClose();
    };
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.altKey) {
                switch (event.key) {
                    case '+':
                    case '=':
                        event.preventDefault();
                        increaseFontSize();
                        break;
                    case '-':
                        event.preventDefault();
                        decreaseFontSize();
                        break;
                    case 'c':
                        event.preventDefault();
                        toggleHighContrast();
                        break;
                    case 'a':
                        event.preventDefault();
                        setAnchorEl(document.querySelector('[data-accessibility-btn]'));
                        break;
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [settings]);
    return (_jsxs(_Fragment, { children: [_jsx(AccessibilityStyles, { settings: settings }), _jsx(Zoom, { in: isVisible, children: _jsx(Fab, { color: "primary", size: "medium", onClick: handleClick, "data-accessibility-btn": true, sx: {
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 1300,
                    }, "aria-label": "\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u8A2D\u5B9A\u3092\u958B\u304F", children: _jsx(AccessibilityIcon, {}) }) }), _jsxs(Menu, { anchorEl: anchorEl, open: open, onClose: handleClose, transformOrigin: { horizontal: 'right', vertical: 'bottom' }, anchorOrigin: { horizontal: 'right', vertical: 'top' }, PaperProps: {
                    sx: { minWidth: 280 },
                }, children: [_jsx(Box, { sx: { px: 2, py: 1, bgcolor: 'primary.main', color: 'primary.contrastText' }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600 }, children: "\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u8A2D\u5B9A" }), _jsx(IconButton, { size: "small", onClick: handleClose, sx: { color: 'inherit' }, children: _jsx(CloseIcon, {}) })] }) }), _jsxs(Box, { sx: { px: 2, py: 2 }, children: [_jsxs(Typography, { variant: "subtitle2", gutterBottom: true, children: ["\u6587\u5B57\u30B5\u30A4\u30BA: ", Math.round(settings.fontSize * 100), "%"] }), _jsx(Slider, { value: settings.fontSize, onChange: (_, value) => updateSetting('fontSize', value), min: 0.8, max: 1.5, step: 0.1, marks: true, valueLabelDisplay: "auto", valueLabelFormat: (value) => `${Math.round(value * 100)}%`, "aria-label": "\u6587\u5B57\u30B5\u30A4\u30BA" })] }), _jsxs(Box, { sx: { px: 2, py: 2 }, children: [_jsxs(Typography, { variant: "subtitle2", gutterBottom: true, children: ["\u884C\u9593: ", settings.lineHeight] }), _jsx(Slider, { value: settings.lineHeight, onChange: (_, value) => updateSetting('lineHeight', value), min: 1.2, max: 2.0, step: 0.1, marks: true, valueLabelDisplay: "auto", "aria-label": "\u884C\u9593" })] }), _jsx(Divider, {}), _jsx(Box, { sx: { px: 2 }, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.highContrast, onChange: (e) => updateSetting('highContrast', e.target.checked) }), label: "\u30CF\u30A4\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8" }) }), _jsx(Box, { sx: { px: 2 }, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.reduceMotion, onChange: (e) => updateSetting('reduceMotion', e.target.checked) }), label: "\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u524A\u6E1B" }) }), _jsx(Box, { sx: { px: 2 }, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.screenReaderOptimized, onChange: (e) => updateSetting('screenReaderOptimized', e.target.checked) }), label: "\u30B9\u30AF\u30EA\u30FC\u30F3\u30EA\u30FC\u30C0\u30FC\u6700\u9069\u5316" }) }), _jsx(Box, { sx: { px: 2 }, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.focusIndicators, onChange: (e) => updateSetting('focusIndicators', e.target.checked) }), label: "\u30D5\u30A9\u30FC\u30AB\u30B9\u8868\u793A\u5F37\u5316" }) }), _jsx(Box, { sx: { px: 2 }, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.readingMode, onChange: (e) => updateSetting('readingMode', e.target.checked) }), label: "\u8AAD\u307F\u53D6\u308A\u30E2\u30FC\u30C9" }) }), _jsx(Divider, {}), _jsx(MenuItem, { onClick: resetSettings, children: _jsx(ListItemText, { primary: "\u8A2D\u5B9A\u3092\u30EA\u30BB\u30C3\u30C8", sx: { textAlign: 'center', color: 'text.secondary' } }) }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: () => setHelpDialogOpen(true), children: [_jsx(ListItemIcon, { children: _jsx(HelpIcon, {}) }), _jsx(ListItemText, { primary: "\u30D8\u30EB\u30D7\u3068\u30AD\u30FC\u30DC\u30FC\u30C9\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8" })] }), _jsxs(Box, { sx: { px: 2, py: 1, bgcolor: 'grey.50' }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u6A5F\u80FD\u304C\u6709\u52B9\u3067\u3059" }), _jsxs(Box, { sx: { display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }, children: [settings.highContrast && _jsx(Chip, { label: "\u30CF\u30A4\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8", size: "small" }), settings.reduceMotion && _jsx(Chip, { label: "\u30E2\u30FC\u30B7\u30E7\u30F3\u524A\u6E1B", size: "small" }), settings.screenReaderOptimized && _jsx(Chip, { label: "\u30B9\u30AF\u30EA\u30FC\u30F3\u30EA\u30FC\u30C0\u30FC", size: "small" }), settings.fontSize !== 1 && _jsx(Chip, { label: `文字サイズ ${Math.round(settings.fontSize * 100)}%`, size: "small" })] })] })] }), _jsxs(Dialog, { open: helpDialogOpen, onClose: () => setHelpDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u30D8\u30EB\u30D7" }), _jsxs(DialogContent, { children: [_jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [_jsx(AlertTitle, { children: "WCAG 2.1 AA\u6E96\u62E0" }), "\u3053\u306E\u30B7\u30B9\u30C6\u30E0\u306FWeb\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3 WCAG 2.1 AA\u30EC\u30D9\u30EB\u306B\u6E96\u62E0\u3057\u3066\u3044\u307E\u3059\u3002"] }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30AD\u30FC\u30DC\u30FC\u30C9\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8" }), _jsxs(Box, { component: "ul", sx: { pl: 2 }, children: [_jsx("li", { children: "Alt + A: \u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u30E1\u30CB\u30E5\u30FC\u3092\u958B\u304F" }), _jsx("li", { children: "Alt + +: \u6587\u5B57\u30B5\u30A4\u30BA\u3092\u5927\u304D\u304F\u3059\u308B" }), _jsx("li", { children: "Alt + -: \u6587\u5B57\u30B5\u30A4\u30BA\u3092\u5C0F\u3055\u304F\u3059\u308B" }), _jsx("li", { children: "Alt + C: \u30CF\u30A4\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u30E2\u30FC\u30C9\u3092\u5207\u308A\u66FF\u3048" }), _jsx("li", { children: "Tab: \u6B21\u306E\u8981\u7D20\u306B\u30D5\u30A9\u30FC\u30AB\u30B9" }), _jsx("li", { children: "Shift + Tab: \u524D\u306E\u8981\u7D20\u306B\u30D5\u30A9\u30FC\u30AB\u30B9" }), _jsx("li", { children: "Enter / Space: \u9078\u629E\u3057\u305F\u8981\u7D20\u3092\u5B9F\u884C" }), _jsx("li", { children: "Escape: \u30C0\u30A4\u30A2\u30ED\u30B0\u3084\u30E1\u30CB\u30E5\u30FC\u3092\u9589\u3058\u308B" })] }), _jsx(Typography, { variant: "h6", gutterBottom: true, sx: { mt: 2 }, children: "\u6A5F\u80FD\u8AAC\u660E" }), _jsxs(Box, { component: "ul", sx: { pl: 2 }, children: [_jsxs("li", { children: [_jsx("strong", { children: "\u6587\u5B57\u30B5\u30A4\u30BA\u8ABF\u6574" }), ": 80%\u304B\u3089150%\u307E\u3067\u8ABF\u6574\u53EF\u80FD"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u30CF\u30A4\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8" }), ": \u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4\u3092\u9AD8\u3081\u3066\u8996\u8A8D\u6027\u3092\u5411\u4E0A"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u524A\u6E1B" }), ": \u524D\u5EAD\u969C\u5BB3\u306E\u65B9\u5411\u3051\u306B\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u3092\u524A\u6E1B"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u30B9\u30AF\u30EA\u30FC\u30F3\u30EA\u30FC\u30C0\u30FC\u6700\u9069\u5316" }), ": NVDA\u3001JAWS\u7B49\u306B\u6700\u9069\u5316"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u30D5\u30A9\u30FC\u30AB\u30B9\u8868\u793A\u5F37\u5316" }), ": \u30AD\u30FC\u30DC\u30FC\u30C9\u64CD\u4F5C\u6642\u306E\u8996\u8A8D\u6027\u5411\u4E0A"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u8AAD\u307F\u53D6\u308A\u30E2\u30FC\u30C9" }), ": \u4E0D\u8981\u306A\u8981\u7D20\u3092\u975E\u8868\u793A\u306B\u3057\u3066\u96C6\u4E2D\u529B\u5411\u4E0A"] })] })] }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setHelpDialogOpen(false), children: "\u9589\u3058\u308B" }) })] })] }));
};
// CSS-in-JS for accessibility styles
const AccessibilityStyles = ({ settings }) => {
    const styles = `
    ${settings.fontSize !== 1 ? `
      html { font-size: ${settings.fontSize}rem !important; }
    ` : ''}
    
    ${settings.lineHeight !== 1.5 ? `
      body, p, div { line-height: ${settings.lineHeight} !important; }
    ` : ''}
    
    ${settings.highContrast ? `
      .high-contrast,
      .high-contrast * {
        filter: contrast(150%) brightness(1.2) !important;
      }
      .high-contrast .MuiPaper-root {
        border: 2px solid #000 !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5) !important;
      }
      .high-contrast .MuiButton-root {
        border: 2px solid currentColor !important;
      }
    ` : ''}
    
    ${settings.focusIndicators ? `
      .accessibility-focus *:focus,
      .accessibility-focus *:focus-visible {
        outline: 3px solid #0066cc !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.3) !important;
      }
      .accessibility-focus button:focus,
      .accessibility-focus [role="button"]:focus {
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5) !important;
      }
    ` : ''}
    
    ${settings.reduceMotion ? `
      .reduce-motion,
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    ` : ''}
    
    ${settings.readingMode ? `
      .reading-mode .MuiAppBar-root,
      .reading-mode .MuiFab-root:not([data-accessibility-btn]),
      .reading-mode .MuiSpeedDial-root,
      .reading-mode [role="banner"],
      .reading-mode [role="complementary"] {
        display: none !important;
      }
      .reading-mode {
        background: #f5f5f5 !important;
      }
      .reading-mode .MuiContainer-root {
        background: white !important;
        box-shadow: 0 0 20px rgba(0,0,0,0.1) !important;
        margin: 20px auto !important;
        padding: 40px !important;
        border-radius: 8px !important;
      }
    ` : ''}
    
    ${settings.screenReaderOptimized ? `
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      .sr-only:focus {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: 0.5rem !important;
        margin: 0 !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
        background: #000 !important;
        color: #fff !important;
        text-decoration: none !important;
        border-radius: 4px !important;
      }
    ` : ''}
    
    ${settings.cursorSize !== 1 ? `
      * {
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${16 * settings.cursorSize}" height="${16 * settings.cursorSize}" viewBox="0 0 16 16"><path d="M0,0 L0,16 L6,10 L10,16 L16,0 Z" fill="black"/></svg>') 0 0, auto !important;
      }
    ` : ''}
    
    ${settings.colorBlindSupport !== 'none' ? `
      .color-blind-filter {
        filter: ${settings.colorBlindSupport === 'protanopia' ? 'url(#protanopia)' :
        settings.colorBlindSupport === 'deuteranopia' ? 'url(#deuteranopia)' :
            settings.colorBlindSupport === 'tritanopia' ? 'url(#tritanopia)' : 'none'} !important;
      }
    ` : ''}
  `;
    useEffect(() => {
        // Apply body classes
        const body = document.body;
        const classes = [
            settings.highContrast && 'high-contrast',
            settings.focusIndicators && 'accessibility-focus',
            settings.reduceMotion && 'reduce-motion',
            settings.readingMode && 'reading-mode',
            settings.screenReaderOptimized && 'screen-reader-optimized',
            settings.colorBlindSupport !== 'none' && 'color-blind-filter',
        ].filter(Boolean);
        classes.forEach(className => body.classList.add(className));
        return () => {
            classes.forEach(className => body.classList.remove(className));
        };
    }, [settings]);
    return _jsx("style", { dangerouslySetInnerHTML: { __html: styles } });
};
// Apply accessibility settings globally
const applySettings = (newSettings) => {
    // Apply settings that need immediate DOM manipulation
    if (newSettings.fontSize !== 1) {
        document.documentElement.style.fontSize = `${newSettings.fontSize}rem`;
    }
    else {
        document.documentElement.style.fontSize = '';
    }
};
export default AccessibilityHelper;
