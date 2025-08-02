import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, Switch, FormControlLabel, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, CircularProgress, List, ListItem, ListItemText, ListItemIcon, Divider } from '@mui/material';
import { Dashboard as DashboardIcon, Error as ErrorIcon, Build as BuildIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon, PlayArrow as PlayIcon, Stop as StopIcon, Refresh as RefreshIcon, Settings as SettingsIcon, Assessment as AssessmentIcon, Security as SecurityIcon, Visibility as VisibilityIcon, Download as DownloadIcon, TrendingUp as TrendingUpIcon, AutoMode as AutoModeIcon } from '@mui/icons-material';
// MCP Playwright Services
import { defaultConfig as detectorConfig } from '../../services/mcpPlaywrightErrorDetector';
import { defaultInfiniteLoopConfig } from '../../services/infiniteLoopController';
import { MCPPlaywrightMasterController, defaultMasterControllerConfig } from '../../services/mcpPlaywrightMasterController';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `admin-tabpanel-${index}`, "aria-labelledby": `admin-tab-${index}`, ...other, children: value === index && _jsx(Box, { sx: { p: 3 }, children: children }) }));
}
const BrowserErrorAdminDashboard = () => {
    const [tabValue, setTabValue] = useState(0);
    // MCP Playwright Services
    const [masterController, setMasterController] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initializationError, setInitializationError] = useState(null);
    const [systemStatus, setSystemStatus] = useState({
        errorDetection: false,
        autoRepair: false,
        infiniteLoop: false,
        validation: false,
        masterController: false
    });
    const [statistics, setStatistics] = useState({
        totalErrors: 0,
        fixedErrors: 0,
        activeMonitoring: false,
        successRate: 0,
        averageFixTime: 0,
        loopSessions: 0,
        healthScore: 100,
        systemUptime: 0,
        activeBrowsers: 0,
        currentIteration: 0
    });
    const [realtimeStats, setRealtimeStats] = useState(null);
    const [currentSession, setCurrentSession] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [alertsHistory, setAlertsHistory] = useState([]);
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    // システム初期化
    const initializeMasterController = async () => {
        if (isInitializing)
            return;
        setIsInitializing(true);
        setInitializationError(null);
        try {
            console.log('🚀 MCP Playwright マスターコントローラーを初期化中...');
            // マスターコントローラー設定
            const masterConfig = {
                ...defaultMasterControllerConfig,
                detectorConfig: {
                    ...detectorConfig,
                    targetUrls: [
                        'http://192.168.3.135:3000',
                        'http://192.168.3.135:3000/admin'
                    ],
                    browsers: ['chromium', 'firefox'],
                    monitoringInterval: 5000,
                    enableScreenshots: true,
                    enableTrace: true,
                    reportingEnabled: true,
                },
                loopConfig: {
                    ...defaultInfiniteLoopConfig,
                    maxIterations: 500,
                    iterationDelay: 15000,
                    errorThreshold: 3,
                    successThreshold: 3,
                    timeoutMinutes: 180,
                },
                enableAutoStart: false,
                healthCheckInterval: 30000,
                reportingInterval: 300000,
                systemSettings: {
                    maxConcurrentRepairs: 3,
                    emergencyStopOnFailure: true,
                    enableDetailedLogging: true,
                    enablePerformanceMonitoring: true,
                },
            };
            const controller = new MCPPlaywrightMasterController(masterConfig);
            await controller.initialize();
            setMasterController(controller);
            setIsInitialized(true);
            setSystemStatus(prev => ({ ...prev, masterController: true }));
            console.log('✅ マスターコントローラーの初期化完了');
            // 定期的な統計更新を開始
            startRealtimeUpdates(controller);
        }
        catch (error) {
            console.error('❌ マスターコントローラー初期化エラー:', error);
            setInitializationError(error instanceof Error ? error.message : '初期化に失敗しました');
        }
        finally {
            setIsInitializing(false);
        }
    };
    // リアルタイム更新の開始
    const startRealtimeUpdates = (controller) => {
        const updateInterval = setInterval(async () => {
            try {
                await updateStatistics(controller);
            }
            catch (error) {
                console.error('❌ 統計更新エラー:', error);
            }
        }, 3000);
        return () => clearInterval(updateInterval);
    };
    // 初期化
    useEffect(() => {
        initializeMasterController();
        return () => {
            // クリーンアップ
            if (masterController) {
                masterController.stop().catch(console.error);
            }
        };
    }, []);
    // 統計情報の更新
    const updateStatistics = () => {
        if (!infiniteLoopMonitor)
            return;
        const repairStats = autoRepairEngine.getRepairStatistics();
        const loopStats = infiniteLoopMonitor.getStatistics();
        const currentLoopSession = infiniteLoopMonitor.getCurrentSession();
        setStatistics({
            totalErrors: repairStats.total,
            fixedErrors: repairStats.successful,
            activeMonitoring: infiniteLoopMonitor.isMonitoringActive(),
            successRate: repairStats.successRate,
            averageFixTime: 2.5, // 実装要
            loopSessions: loopStats.totalSessions
        });
        setCurrentSession(currentLoopSession);
        setSessionHistory(infiniteLoopMonitor.getSessionHistory());
    };
    // 無限ループ監視の開始/停止
    const toggleInfiniteLoop = async () => {
        if (!infiniteLoopMonitor)
            return;
        if (systemStatus.infiniteLoop) {
            infiniteLoopMonitor.stopInfiniteLoop();
            setSystemStatus(prev => ({ ...prev, infiniteLoop: false }));
        }
        else {
            try {
                await infiniteLoopMonitor.startInfiniteLoop('http://192.168.3.135:3000');
                setSystemStatus(prev => ({ ...prev, infiniteLoop: true }));
            }
            catch (error) {
                console.error('無限ループ開始エラー:', error);
            }
        }
    };
    // エラー検知の開始/停止
    const toggleErrorDetection = async () => {
        try {
            if (systemStatus.errorDetection) {
                errorDetectionEngine.stopMonitoring();
                setSystemStatus(prev => ({ ...prev, errorDetection: false }));
            }
            else {
                await errorDetectionEngine.startMonitoring();
                setSystemStatus(prev => ({ ...prev, errorDetection: true }));
            }
        }
        catch (error) {
            console.error('エラー検知切り替えエラー:', error);
        }
    };
    // レポートの表示
    const showReport = (report) => {
        setSelectedReport(report);
        setReportDialogOpen(true);
    };
    // レポートのダウンロード
    const downloadReport = (report) => {
        const data = JSON.stringify(report, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-monitor-report-${report.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsxs(Typography, { variant: "h4", sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(SecurityIcon, { sx: { mr: 2 } }), "\u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u76E3\u8996\u30B7\u30B9\u30C6\u30E0 \u7BA1\u7406\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9"] }), _jsxs(Box, { sx: { display: 'flex', gap: 2 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(SettingsIcon, {}), onClick: () => setConfigDialogOpen(true), children: "\u8A2D\u5B9A" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(RefreshIcon, {}), onClick: updateStatistics, children: "\u66F4\u65B0" })] })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", color: "error", children: statistics.totalErrors }), _jsx(Typography, { variant: "body2", children: "\u7DCF\u30A8\u30E9\u30FC\u6570" })] }), _jsx(ErrorIcon, { color: "error" })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", color: "success.main", children: statistics.fixedErrors }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6E08\u307F" })] }), _jsx(CheckCircleIcon, { color: "success" })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", color: "info.main", children: [statistics.successRate.toFixed(1), "%"] }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6210\u529F\u7387" })] }), _jsx(TrendingUpIcon, { color: "info" })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", color: "warning.main", children: statistics.loopSessions }), _jsx(Typography, { variant: "body2", children: "\u30EB\u30FC\u30D7\u30BB\u30C3\u30B7\u30E7\u30F3" })] }), _jsx(AutoModeIcon, { color: "warning" })] }) }) }) })] }), _jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30B7\u30B9\u30C6\u30E0\u5236\u5FA1" }), _jsxs(Grid, { container: true, spacing: 3, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: systemStatus.errorDetection, onChange: toggleErrorDetection, color: "primary" }), label: "\u30A8\u30E9\u30FC\u691C\u77E5" }) }), _jsx(Grid, { item: true, xs: 12, md: 3, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Button, { variant: systemStatus.infiniteLoop ? "contained" : "outlined", color: systemStatus.infiniteLoop ? "error" : "primary", startIcon: systemStatus.infiniteLoop ? _jsx(StopIcon, {}) : _jsx(PlayIcon, {}), onClick: toggleInfiniteLoop, size: "small", children: systemStatus.infiniteLoop ? '停止' : '開始' }), _jsx(Typography, { variant: "body2", children: "\u7121\u9650\u30EB\u30FC\u30D7\u76E3\u8996" })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: statistics.activeMonitoring && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", gutterBottom: true, children: "\u76E3\u8996\u72B6\u614B" }), _jsx(LinearProgress, {})] })) })] })] }) }), _jsx(Box, { sx: { borderBottom: 1, borderColor: 'divider', mb: 2 }, children: _jsxs(Tabs, { value: tabValue, onChange: (e, newValue) => setTabValue(newValue), "aria-label": "admin dashboard tabs", children: [_jsx(Tab, { label: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9", icon: _jsx(DashboardIcon, {}) }), _jsx(Tab, { label: "\u30E9\u30A4\u30D6\u76E3\u8996", icon: _jsx(VisibilityIcon, {}) }), _jsx(Tab, { label: "\u4FEE\u5FA9\u5C65\u6B74", icon: _jsx(BuildIcon, {}) }), _jsx(Tab, { label: "\u30EC\u30DD\u30FC\u30C8", icon: _jsx(AssessmentIcon, {}) }), _jsx(Tab, { label: "\u8A2D\u5B9A", icon: _jsx(SettingsIcon, {}) })] }) }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [currentSession && (_jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u73FE\u5728\u306E\u30BB\u30C3\u30B7\u30E7\u30F3" }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", children: ["\u30BB\u30C3\u30B7\u30E7\u30F3ID: ", currentSession.id] }), _jsxs(Typography, { variant: "body2", children: ["\u30B9\u30C6\u30FC\u30BF\u30B9:", _jsx(Chip, { label: currentSession.status, color: currentSession.status === 'running' ? 'primary' : 'default', size: "small", sx: { ml: 1 } })] }), _jsxs(Typography, { variant: "body2", children: ["\u958B\u59CB\u6642\u523B: ", currentSession.startTime.toLocaleString()] })] }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", children: ["\u53CD\u5FA9\u56DE\u6570: ", currentSession.iterations.length] }), _jsxs(Typography, { variant: "body2", children: ["\u691C\u51FA\u30A8\u30E9\u30FC: ", currentSession.totalErrors] }), _jsxs(Typography, { variant: "body2", children: ["\u4FEE\u5FA9\u6210\u529F: ", currentSession.successfulRepairs] })] })] })] }) }) })), _jsx(Grid, { item: true, xs: 12, md: 8, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30A8\u30E9\u30FC\u63A8\u79FB" }), _jsx(Box, { sx: { height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u30C1\u30E3\u30FC\u30C8\u30A8\u30EA\u30A2\uFF08\u5C06\u6765\u5B9F\u88C5\uFF09" }) })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u6700\u8FD1\u306E\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3" }), _jsxs(List, { dense: true, children: [_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(CheckCircleIcon, { color: "success" }) }), _jsx(ListItemText, { primary: "\u30A8\u30E9\u30FC\u4FEE\u5FA9\u5B8C\u4E86", secondary: "2\u5206\u524D" })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(WarningIcon, { color: "warning" }) }), _jsx(ListItemText, { primary: "\u65B0\u3057\u3044\u30A8\u30E9\u30FC\u3092\u691C\u51FA", secondary: "5\u5206\u524D" })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(AutoModeIcon, { color: "info" }) }), _jsx(ListItemText, { primary: "\u7121\u9650\u30EB\u30FC\u30D7\u76E3\u8996\u958B\u59CB", secondary: "10\u5206\u524D" })] })] })] }) }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(Alert, { severity: statistics.activeMonitoring ? "info" : "warning", action: _jsx(Button, { color: "inherit", size: "small", onClick: toggleErrorDetection, children: statistics.activeMonitoring ? '停止' : '開始' }), children: statistics.activeMonitoring
                                    ? 'システムは現在監視中です'
                                    : 'システム監視が停止しています' }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u7D71\u8A08" }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 6, md: 3, children: _jsxs(Box, { textAlign: "center", children: [_jsx(CircularProgress, { variant: "determinate", value: statistics.successRate, size: 80 }), _jsxs(Typography, { variant: "h6", sx: { mt: 1 }, children: [statistics.successRate.toFixed(1), "%"] }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6210\u529F\u7387" })] }) }), _jsx(Grid, { item: true, xs: 6, md: 3, children: _jsxs(Box, { textAlign: "center", children: [_jsx(Typography, { variant: "h4", color: "error", children: statistics.totalErrors }), _jsx(Typography, { variant: "body2", children: "\u7DCF\u30A8\u30E9\u30FC\u6570" })] }) }), _jsx(Grid, { item: true, xs: 6, md: 3, children: _jsxs(Box, { textAlign: "center", children: [_jsx(Typography, { variant: "h4", color: "success.main", children: statistics.fixedErrors }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6E08\u307F" })] }) }), _jsx(Grid, { item: true, xs: 6, md: 3, children: _jsxs(Box, { textAlign: "center", children: [_jsxs(Typography, { variant: "h4", color: "info.main", children: [statistics.averageFixTime, "s"] }), _jsx(Typography, { variant: "body2", children: "\u5E73\u5747\u4FEE\u5FA9\u6642\u9593" })] }) })] })] }) }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u4FEE\u5FA9\u5C65\u6B74" }), _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u6642\u523B" }), _jsx(TableCell, { children: "\u30A8\u30E9\u30FC\u30BF\u30A4\u30D7" }), _jsx(TableCell, { children: "\u30BD\u30FC\u30B9" }), _jsx(TableCell, { children: "\u4FEE\u5FA9\u72B6\u614B" }), _jsx(TableCell, { children: "\u8A66\u884C\u56DE\u6570" }), _jsx(TableCell, { children: "\u30A2\u30AF\u30B7\u30E7\u30F3" })] }) }), _jsx(TableBody, { children: [1, 2, 3, 4, 5].map((item) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: new Date(Date.now() - item * 300000).toLocaleString() }), _jsx(TableCell, { children: _jsx(Chip, { label: "JavaScript Error", color: "error", size: "small" }) }), _jsx(TableCell, { children: "/src/components/Dashboard.tsx" }), _jsx(TableCell, { children: _jsx(Chip, { label: item % 2 === 0 ? "成功" : "失敗", color: item % 2 === 0 ? "success" : "error", size: "small" }) }), _jsx(TableCell, { children: item }), _jsx(TableCell, { children: _jsx(IconButton, { size: "small", children: _jsx(VisibilityIcon, {}) }) })] }, item))) })] }) })] }) }) }), _jsx(TabPanel, { value: tabValue, index: 3, children: _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h6", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u30EC\u30DD\u30FC\u30C8" }), _jsx(Button, { startIcon: _jsx(DownloadIcon, {}), variant: "outlined", size: "small", children: "\u3059\u3079\u3066\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9" })] }), _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u30BB\u30C3\u30B7\u30E7\u30F3ID" }), _jsx(TableCell, { children: "\u958B\u59CB\u6642\u523B" }), _jsx(TableCell, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx(TableCell, { children: "\u53CD\u5FA9\u56DE\u6570" }), _jsx(TableCell, { children: "\u4FEE\u5FA9\u6210\u529F\u7387" }), _jsx(TableCell, { children: "\u30A2\u30AF\u30B7\u30E7\u30F3" })] }) }), _jsx(TableBody, { children: sessionHistory.slice(0, 10).map((session) => (_jsxs(TableRow, { children: [_jsxs(TableCell, { children: [session.id.substring(0, 12), "..."] }), _jsx(TableCell, { children: session.startTime.toLocaleString() }), _jsx(TableCell, { children: _jsx(Chip, { label: session.status, color: session.status === 'success' ? 'success' :
                                                                        session.status === 'emergency_stop' ? 'error' : 'default', size: "small" }) }), _jsx(TableCell, { children: session.iterations.length }), _jsxs(TableCell, { children: [session.totalRepairs > 0
                                                                        ? ((session.successfulRepairs / session.totalRepairs) * 100).toFixed(1)
                                                                        : '0', "%"] }), _jsxs(TableCell, { children: [_jsx(IconButton, { size: "small", onClick: () => showReport(session), children: _jsx(VisibilityIcon, {}) }), _jsx(IconButton, { size: "small", onClick: () => downloadReport(session), children: _jsx(DownloadIcon, {}) })] })] }, session.id))) })] }) })] }) }) }) }) }), _jsx(TabPanel, { value: tabValue, index: 4, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u76E3\u8996\u8A2D\u5B9A" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx(FormControlLabel, { control: _jsx(Switch, { defaultChecked: true }), label: "\u81EA\u52D5\u4FEE\u5FA9\u3092\u6709\u52B9\u306B\u3059\u308B" }), _jsx(FormControlLabel, { control: _jsx(Switch, { defaultChecked: true }), label: "\u4FEE\u5FA9\u5F8C\u306E\u5185\u90E8\u691C\u8A3C\u3092\u6709\u52B9\u306B\u3059\u308B" }), _jsx(FormControlLabel, { control: _jsx(Switch, {}), label: "\u7DCA\u6025\u505C\u6B62\u3092\u6709\u52B9\u306B\u3059\u308B" }), _jsx(FormControlLabel, { control: _jsx(Switch, { defaultChecked: true }), label: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u901A\u77E5\u3092\u6709\u52B9\u306B\u3059\u308B" })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u8A2D\u5B9A" }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx(Typography, { variant: "body2", children: "\u76E3\u8996\u9593\u9694: 5\u79D2" }), _jsx(Typography, { variant: "body2", children: "\u6700\u5927\u53CD\u5FA9\u56DE\u6570: 50\u56DE" }), _jsx(Typography, { variant: "body2", children: "\u6210\u529F\u95BE\u5024: 3\u56DE\u9023\u7D9A" }), _jsx(Typography, { variant: "body2", children: "\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8: 30\u79D2" })] })] }) }) })] }) }), _jsxs(Dialog, { open: reportDialogOpen, onClose: () => setReportDialogOpen(false), maxWidth: "lg", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u8A73\u7D30\u30EC\u30DD\u30FC\u30C8" }), _jsx(DialogContent, { children: selectedReport && (_jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["\u30BB\u30C3\u30B7\u30E7\u30F3: ", selectedReport.id] }), _jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["\u5B9F\u884C\u6642\u9593: ", selectedReport.startTime.toLocaleString(), " -", selectedReport.endTime?.toLocaleString() || '実行中'] }), _jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["\u30B9\u30C6\u30FC\u30BF\u30B9: ", selectedReport.status] }), _jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["\u6700\u7D42\u30EC\u30DD\u30FC\u30C8: ", selectedReport.finalReport] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u53CD\u5FA9\u8A73\u7D30" }), _jsx(List, { children: selectedReport.iterations?.map((iteration, index) => (_jsx(ListItem, { children: _jsx(ListItemText, { primary: `反復 ${iteration.number}: ${iteration.summary}`, secondary: `エラー: ${iteration.errorsDetected.length}, 修復: ${iteration.successfulRepairs}/${iteration.repairSessions.length}` }) }, index))) })] })) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setReportDialogOpen(false), children: "\u9589\u3058\u308B" }), selectedReport && (_jsx(Button, { onClick: () => downloadReport(selectedReport), startIcon: _jsx(DownloadIcon, {}), children: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9" }))] })] })] }));
};
export default BrowserErrorAdminDashboard;
