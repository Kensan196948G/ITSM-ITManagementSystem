import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Box, Container, Tabs, Tab, Paper, Typography, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch } from '@mui/material';
import { Monitor as MonitorIcon, AdminPanelSettings as AdminIcon, Assessment as ReportIcon, Security as SecurityIcon } from '@mui/icons-material';
// コンポーネントのインポート
import BrowserErrorMonitor from '../components/error-monitor/BrowserErrorMonitor';
import BrowserErrorAdminDashboard from '../components/admin/BrowserErrorAdminDashboard';
import RealtimeErrorReport from '../components/error-monitor/RealtimeErrorReport';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `monitor-tabpanel-${index}`, "aria-labelledby": `monitor-tab-${index}`, ...other, children: value === index && _jsx(Box, { children: children }) }));
}
const BrowserErrorMonitorPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [systemSettings, setSystemSettings] = useState({
        autoStart: false,
        enableNotifications: true,
        debugMode: false,
        maxConcurrentRepairs: 3,
        monitoringInterval: 5000
    });
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    const handleSystemInitialization = () => {
        setIsInitialized(true);
        console.log('ブラウザエラー監視システムを初期化しました');
    };
    const handleSettingsSave = () => {
        console.log('設定を保存しました:', systemSettings);
        setSettingsOpen(false);
    };
    return (_jsxs(Container, { maxWidth: "xl", sx: { py: 3 }, children: [_jsxs(Box, { sx: { mb: 4 }, children: [_jsxs(Typography, { variant: "h3", component: "h1", gutterBottom: true, sx: { display: 'flex', alignItems: 'center' }, "aria-label": "MCP Playwright WebUI \u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u691C\u77E5\u30FB\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0", children: [_jsx(SecurityIcon, { sx: { mr: 2, fontSize: 40 }, "aria-hidden": "true", color: "primary" }), "MCP Playwright WebUI \u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u691C\u77E5\u30FB\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0"] }), _jsx(Typography, { variant: "h6", color: "textSecondary", gutterBottom: true, "aria-label": "\u76E3\u8996\u5BFE\u8C61URL: http://192.168.3.135:3000", children: "http://192.168.3.135:3000 \u3067\u306E\u81EA\u52D5\u30A8\u30E9\u30FC\u691C\u77E5\u30FB\u4FEE\u5FA9\u30FB\u691C\u8A3C\u30B7\u30B9\u30C6\u30E0" }), !isInitialized && (_jsxs(Alert, { severity: "warning", sx: { mt: 2 }, action: _jsx(Button, { color: "inherit", size: "small", onClick: handleSystemInitialization, "aria-label": "\u30B7\u30B9\u30C6\u30E0\u3092\u521D\u671F\u5316", "aria-describedby": "init-help-text", children: "\u521D\u671F\u5316" }), role: "status", "aria-live": "polite", children: ["\u30B7\u30B9\u30C6\u30E0\u304C\u521D\u671F\u5316\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u521D\u671F\u5316\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044\u3002", _jsx(Typography, { variant: "srOnly", id: "init-help-text", children: "\u521D\u671F\u5316\u306B\u3088\u308A\u3001\u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u691C\u77E5\u30B7\u30B9\u30C6\u30E0\u3068MCP Playwright\u304C\u8D77\u52D5\u3055\u308C\u307E\u3059" })] })), isInitialized && (_jsx(Alert, { severity: "success", sx: { mt: 2 }, role: "status", "aria-live": "polite", children: "\u30B7\u30B9\u30C6\u30E0\u306F\u6B63\u5E38\u306B\u521D\u671F\u5316\u3055\u308C\u307E\u3057\u305F\u3002\u76E3\u8996\u3092\u958B\u59CB\u3067\u304D\u307E\u3059\u3002" }))] }), _jsxs(Paper, { sx: { p: 3, mb: 3 }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u30B7\u30B9\u30C6\u30E0\u6982\u8981" }), _jsx(Typography, { variant: "body1", paragraph: true, children: "\u3053\u306E\u30B7\u30B9\u30C6\u30E0\u306F\u4EE5\u4E0B\u306E\u6A5F\u80FD\u3092\u63D0\u4F9B\u3057\u307E\u3059\uFF1A" }), _jsxs(Box, { component: "ul", sx: { pl: 3 }, children: [_jsx("li", { children: "\u30D6\u30E9\u30A6\u30B6\u306E\u958B\u767A\u8005\u30B3\u30F3\u30BD\u30FC\u30EB\u30A8\u30E9\u30FC\u306E\u81EA\u52D5\u691C\u77E5" }), _jsx("li", { children: "\u691C\u77E5\u3055\u308C\u305F\u30A8\u30E9\u30FC\u306E\u81EA\u52D5\u4FEE\u5FA9\u51E6\u7406" }), _jsx("li", { children: "\u4FEE\u5FA9\u5F8C\u306E\u5185\u90E8\u691C\u8A3C\u30B7\u30B9\u30C6\u30E0" }), _jsx("li", { children: "\u30A8\u30E9\u30FC\u304C\u51FA\u529B\u3055\u308C\u306A\u304F\u306A\u308B\u307E\u3067\u306E\u7121\u9650\u30EB\u30FC\u30D7\u5B9F\u884C" }), _jsx("li", { children: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996\u3068\u30EC\u30DD\u30FC\u30C8\u751F\u6210" }), _jsx("li", { children: "\u7BA1\u7406\u8005\u5411\u3051\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u3068\u30B3\u30F3\u30C8\u30ED\u30FC\u30EB\u30D1\u30CD\u30EB" })] })] }), _jsx(Paper, { sx: { mb: 2 }, elevation: 2, children: _jsxs(Tabs, { value: tabValue, onChange: handleTabChange, "aria-label": "\u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u76E3\u8996\u30B7\u30B9\u30C6\u30E0\u306E\u30BF\u30D6", variant: "fullWidth", indicatorColor: "primary", textColor: "primary", sx: {
                        '& .MuiTab-root': {
                            minHeight: 64,
                            fontSize: '1rem',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                            },
                            '&.Mui-selected': {
                                fontWeight: 'bold',
                            },
                        },
                    }, children: [_jsx(Tab, { label: "\u30A8\u30E9\u30FC\u76E3\u8996", icon: _jsx(MonitorIcon, { "aria-hidden": "true" }), id: "monitor-tab-0", "aria-controls": "monitor-tabpanel-0", "aria-label": "\u30A8\u30E9\u30FC\u76E3\u8996\u30BF\u30D6 - \u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u3092\u76E3\u8996" }), _jsx(Tab, { label: "\u7BA1\u7406\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9", icon: _jsx(AdminIcon, { "aria-hidden": "true" }), id: "monitor-tab-1", "aria-controls": "monitor-tabpanel-1", "aria-label": "\u7BA1\u7406\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u30BF\u30D6 - \u30B7\u30B9\u30C6\u30E0\u5168\u4F53\u306E\u76E3\u8996\u3068\u5236\u5FA1" }), _jsx(Tab, { label: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u30EC\u30DD\u30FC\u30C8", icon: _jsx(ReportIcon, { "aria-hidden": "true" }), id: "monitor-tab-2", "aria-controls": "monitor-tabpanel-2", "aria-label": "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u30EC\u30DD\u30FC\u30C8\u30BF\u30D6 - \u30A8\u30E9\u30FC\u691C\u77E5\u3068\u4FEE\u5FA9\u306E\u5C65\u6B74\u8868\u793A" })] }) }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Paper, { sx: { p: { xs: 2, sm: 3 } }, elevation: 1, role: "region", "aria-labelledby": "error-monitor-heading", children: [_jsx(Typography, { variant: "h5", gutterBottom: true, id: "error-monitor-heading", component: "h2", children: "\u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u76E3\u8996\u30B7\u30B9\u30C6\u30E0" }), _jsx(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, "aria-describedby": "error-monitor-description", children: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u30D6\u30E9\u30A6\u30B6\u306E\u30B3\u30F3\u30BD\u30FC\u30EB\u30A8\u30E9\u30FC\u3092\u76E3\u8996\u3057\u3001\u81EA\u52D5\u4FEE\u5FA9\u3092\u5B9F\u884C\u3057\u307E\u3059\u3002" }), _jsx(Box, { sx: {
                                mt: 2,
                                '& > *': {
                                    width: '100%',
                                },
                            }, children: _jsx(BrowserErrorMonitor, { targetUrl: "http://192.168.3.135:3000", autoStart: systemSettings.autoStart, onErrorDetected: (error) => {
                                    console.log('エラー検知:', error);
                                    if (systemSettings.enableNotifications) {
                                        // 通知処理（実装要）
                                    }
                                }, onErrorFixed: (error) => {
                                    console.log('エラー修復:', error);
                                    if (systemSettings.enableNotifications) {
                                        // 通知処理（実装要）
                                    }
                                }, onInfiniteLoopStarted: () => {
                                    console.log('無限ループ監視開始');
                                }, onInfiniteLoopStopped: () => {
                                    console.log('無限ループ監視停止');
                                } }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u7BA1\u7406\u8005\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }), _jsx(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: "\u30B7\u30B9\u30C6\u30E0\u5168\u4F53\u306E\u76E3\u8996\u3001\u5236\u5FA1\u3001\u8A2D\u5B9A\u3092\u884C\u3044\u307E\u3059\u3002" }), _jsx(BrowserErrorAdminDashboard, {})] }) }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u30A8\u30E9\u30FC\u30EC\u30DD\u30FC\u30C8" }), _jsx(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: "\u30A8\u30E9\u30FC\u306E\u691C\u77E5\u3001\u4FEE\u5FA9\u3001\u691C\u8A3C\u306E\u5C65\u6B74\u3092\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u8868\u793A\u3057\u307E\u3059\u3002" }), _jsx(RealtimeErrorReport, {})] }) }), _jsxs(Dialog, { open: settingsOpen, onClose: () => setSettingsOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A" }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { pt: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u4E00\u822C\u8A2D\u5B9A" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: systemSettings.autoStart, onChange: (e) => setSystemSettings(prev => ({
                                            ...prev,
                                            autoStart: e.target.checked
                                        })) }), label: "\u30B7\u30B9\u30C6\u30E0\u958B\u59CB\u6642\u306B\u81EA\u52D5\u3067\u76E3\u8996\u3092\u958B\u59CB" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: systemSettings.enableNotifications, onChange: (e) => setSystemSettings(prev => ({
                                            ...prev,
                                            enableNotifications: e.target.checked
                                        })) }), label: "\u30A8\u30E9\u30FC\u691C\u77E5\u30FB\u4FEE\u5FA9\u6642\u306E\u901A\u77E5\u3092\u6709\u52B9\u306B\u3059\u308B" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: systemSettings.debugMode, onChange: (e) => setSystemSettings(prev => ({
                                            ...prev,
                                            debugMode: e.target.checked
                                        })) }), label: "\u30C7\u30D0\u30C3\u30B0\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3059\u308B" }), _jsx(Typography, { variant: "h6", gutterBottom: true, sx: { mt: 3 }, children: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u8A2D\u5B9A" }), _jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["\u6700\u5927\u540C\u6642\u4FEE\u5FA9\u6570: ", systemSettings.maxConcurrentRepairs] }), _jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["\u76E3\u8996\u9593\u9694: ", systemSettings.monitoringInterval, "ms"] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setSettingsOpen(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: handleSettingsSave, variant: "contained", children: "\u4FDD\u5B58" })] })] }), _jsx(Paper, { component: "footer", sx: {
                    p: { xs: 2, sm: 3 },
                    mt: 4,
                    backgroundColor: 'grey.50',
                    borderTop: 1,
                    borderColor: 'divider'
                }, elevation: 0, role: "contentinfo", children: _jsxs(Typography, { variant: "body2", color: "textSecondary", align: "center", component: "div", children: [_jsx(Box, { sx: { mb: 1 }, children: _jsx("strong", { children: "MCP Playwright WebUI \u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u691C\u77E5\u30FB\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0 v1.0.0" }) }), _jsxs(Box, { sx: { mb: 1, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }, children: [_jsx("span", { "aria-label": "\u76E3\u8996\u5BFE\u8C61URL", children: "\u5BFE\u8C61URL: http://192.168.3.135:3000" }), _jsx("span", { "aria-hidden": "true", children: "|" }), _jsx("span", { "aria-label": "\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9API URL", children: "\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9API: http://192.168.3.135:8000" })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }, children: [_jsx("span", { children: "React/Material-UI \u30D9\u30FC\u30B9" }), _jsx("span", { "aria-hidden": "true", children: "|" }), _jsx("span", { "aria-label": "\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u5BFE\u5FDC", children: "WAI-ARIA\u6E96\u62E0" }), _jsx("span", { "aria-hidden": "true", children: "|" }), _jsx("span", { "aria-label": "\u30C7\u30B6\u30A4\u30F3\u5BFE\u5FDC", children: "\u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u30C7\u30B6\u30A4\u30F3\u5BFE\u5FDC" })] }), _jsx(Box, { sx: { mt: 2, fontSize: '0.75rem' }, children: _jsx(Typography, { variant: "caption", component: "div", children: "\u7121\u9650\u30EB\u30FC\u30D7\u30A8\u30E9\u30FC\u691C\u77E5\u30FB\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0\u306B\u3088\u308A\u3001\u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u3092\u81EA\u52D5\u3067\u691C\u77E5\u30FB\u4FEE\u5FA9\u3057\u3001 \u30A8\u30E9\u30FC\u304C\u5B8C\u5168\u306B\u306A\u304F\u306A\u308B\u307E\u3067\u7D99\u7D9A\u7684\u306B\u76E3\u8996\u30FB\u4FEE\u5FA9\u3092\u5B9F\u884C\u3057\u307E\u3059\u3002" }) })] }) })] }));
};
export default BrowserErrorMonitorPage;
