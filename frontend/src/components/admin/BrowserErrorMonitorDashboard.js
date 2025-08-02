import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ブラウザエラー監視管理者ダッシュボード
 * MCP Playwrightエラー検知・修復システムの管理画面
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, CardHeader, Grid, Typography, Button, Switch, FormControlLabel, Chip, Alert, AlertTitle, LinearProgress, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText, Divider, } from '@mui/material';
import { Refresh as RefreshIcon, Settings as SettingsIcon, BugReport as BugReportIcon, Build as BuildIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, ExpandMore as ExpandMoreIcon, Visibility as VisibilityIcon, GetApp as DownloadIcon, Timeline as TimelineIcon, Speed as SpeedIcon, Security as SecurityIcon, Accessibility as AccessibilityIcon, } from '@mui/icons-material';
// サービスのインポート（実際の実装では適切なパスに調整）
import { MCPPlaywrightErrorDetector, defaultConfig } from '../../services/mcpPlaywrightErrorDetector';
import { InfiniteLoopController, defaultInfiniteLoopConfig } from '../../services/infiniteLoopController';
import { ValidationSystem } from '../../services/validationSystem';
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `simple-tabpanel-${index}`, "aria-labelledby": `simple-tab-${index}`, ...other, children: value === index && _jsx(Box, { sx: { p: 3 }, children: children }) }));
}
export const BrowserErrorMonitorDashboard = () => {
    const [state, setState] = useState({
        isMonitoring: false,
        detectorStatus: null,
        loopStatus: null,
        validationReport: null,
        loading: false,
        error: null,
    });
    const [tabValue, setTabValue] = useState(0);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedError, setSelectedError] = useState(null);
    // システムインスタンス（実際の実装では適切な依存性注入が必要）
    const [detector] = useState(() => new MCPPlaywrightErrorDetector(defaultConfig));
    const [loopController] = useState(() => new InfiniteLoopController(defaultConfig, defaultInfiniteLoopConfig));
    const [validationSystem] = useState(() => new ValidationSystem());
    /**
     * データを更新
     */
    const updateData = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const detectorStatus = detector.getStatus();
            const loopStatus = loopController.getStatus();
            const validationReport = validationSystem.getLatestValidationResult();
            setState(prev => ({
                ...prev,
                detectorStatus,
                loopStatus,
                validationReport,
                isMonitoring: detectorStatus.isMonitoring,
                loading: false,
            }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: `データ更新エラー: ${error.message}`,
                loading: false,
            }));
        }
    }, [detector, loopController, validationSystem]);
    /**
     * 監視を開始
     */
    const startMonitoring = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            await detector.initialize();
            await detector.startMonitoring();
            await loopController.startInfiniteLoop();
            setState(prev => ({ ...prev, isMonitoring: true, loading: false }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: `監視開始エラー: ${error.message}`,
                loading: false,
            }));
        }
    };
    /**
     * 監視を停止
     */
    const stopMonitoring = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            await detector.stopMonitoring();
            await loopController.stopInfiniteLoop();
            setState(prev => ({ ...prev, isMonitoring: false, loading: false }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: `監視停止エラー: ${error.message}`,
                loading: false,
            }));
        }
    };
    /**
     * データを定期的に更新
     */
    useEffect(() => {
        updateData();
        const interval = setInterval(updateData, 5000); // 5秒ごとに更新
        return () => clearInterval(interval);
    }, [updateData]);
    /**
     * エラー詳細を表示
     */
    const showErrorDetails = (error) => {
        setSelectedError(error);
        setDetailsOpen(true);
    };
    /**
     * レポートをダウンロード
     */
    const downloadReport = (type) => {
        try {
            let data;
            let filename;
            switch (type) {
                case 'detector':
                    data = detector.generateReport();
                    filename = `detector-report-${new Date().toISOString()}.json`;
                    break;
                case 'validation':
                    data = state.validationReport;
                    filename = `validation-report-${new Date().toISOString()}.json`;
                    break;
                case 'loop':
                    data = {
                        status: state.loopStatus,
                        iterations: loopController.getIterationHistory(),
                    };
                    filename = `loop-report-${new Date().toISOString()}.json`;
                    break;
                default:
                    return;
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                error: `レポートダウンロードエラー: ${error.message}`,
            }));
        }
    };
    /**
     * ヘルススコアの色を取得
     */
    const getHealthScoreColor = (score) => {
        if (score >= 90)
            return '#4caf50'; // green
        if (score >= 70)
            return '#ff9800'; // orange  
        if (score >= 50)
            return '#f44336'; // red
        return '#9e9e9e'; // grey
    };
    /**
     * ステータスチップのプロパティを取得
     */
    const getStatusChipProps = (status) => {
        switch (status) {
            case 'running':
            case 'passed':
                return { color: 'success', icon: _jsx(CheckCircleIcon, {}) };
            case 'warning':
                return { color: 'warning', icon: _jsx(WarningIcon, {}) };
            case 'failed':
            case 'error':
                return { color: 'error', icon: _jsx(ErrorIcon, {}) };
            default:
                return { color: 'default', icon: _jsx(InfoIcon, {}) };
        }
    };
    return (_jsxs(Box, { sx: { flexGrow: 1, p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h4", component: "h1", sx: { fontWeight: 'bold' }, children: "\uD83D\uDD0D \u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u76E3\u8996\u30B7\u30B9\u30C6\u30E0" }), _jsxs(Box, { sx: { display: 'flex', gap: 2, alignItems: 'center' }, children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: state.isMonitoring, onChange: state.isMonitoring ? stopMonitoring : startMonitoring, disabled: state.loading, color: "primary" }), label: state.isMonitoring ? '監視中' : '停止中' }), _jsx(Tooltip, { title: "\u30C7\u30FC\u30BF\u3092\u66F4\u65B0", children: _jsx(IconButton, { onClick: updateData, disabled: state.loading, children: _jsx(RefreshIcon, {}) }) }), _jsx(Tooltip, { title: "\u8A2D\u5B9A", children: _jsx(IconButton, { onClick: () => setSettingsOpen(true), children: _jsx(SettingsIcon, {}) }) })] })] }), state.error && (_jsxs(Alert, { severity: "error", sx: { mb: 3 }, onClose: () => setState(prev => ({ ...prev, error: null })), children: [_jsx(AlertTitle, { children: "\u30A8\u30E9\u30FC" }), state.error] })), state.loading && _jsx(LinearProgress, { sx: { mb: 3 } }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\u76E3\u8996\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx(Typography, { variant: "h6", children: state.isMonitoring ? '🟢 アクティブ' : '🔴 停止中' })] }), _jsx(BugReportIcon, { color: state.isMonitoring ? 'success' : 'disabled' })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\u691C\u77E5\u30A8\u30E9\u30FC\u6570" }), _jsx(Typography, { variant: "h6", children: state.detectorStatus?.totalErrors || 0 })] }), _jsx(ErrorIcon, { color: "error" })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\u4FEE\u5FA9\u6210\u529F\u6570" }), _jsx(Typography, { variant: "h6", children: state.detectorStatus?.successfulRepairs || 0 })] }), _jsx(BuildIcon, { color: "success" })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\u30D8\u30EB\u30B9\u30B9\u30B3\u30A2" }), _jsx(Typography, { variant: "h6", sx: { color: getHealthScoreColor(state.loopStatus?.overallHealthScore || 0) }, children: state.loopStatus?.overallHealthScore?.toFixed(1) || 'N/A' })] }), _jsx(SpeedIcon, {})] }) }) }) })] }), _jsxs(Card, { children: [_jsxs(Tabs, { value: tabValue, onChange: (_, newValue) => setTabValue(newValue), variant: "scrollable", children: [_jsx(Tab, { label: "\uD83D\uDCCA \u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996", icon: _jsx(TimelineIcon, {}), iconPosition: "start" }), _jsx(Tab, { label: "\uD83D\uDD27 \u30A8\u30E9\u30FC\u30FB\u4FEE\u5FA9\u72B6\u6CC1", icon: _jsx(BuildIcon, {}), iconPosition: "start" }), _jsx(Tab, { label: "\u2705 \u691C\u8A3C\u7D50\u679C", icon: _jsx(CheckCircleIcon, {}), iconPosition: "start" }), _jsx(Tab, { label: "\uD83D\uDD04 \u30EB\u30FC\u30D7\u5236\u5FA1", icon: _jsx(RefreshIcon, {}), iconPosition: "start" }), _jsx(Tab, { label: "\uD83D\uDCC8 \u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9", icon: _jsx(SpeedIcon, {}), iconPosition: "start" })] }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 8, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uD83D\uDD0D \u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996\u72B6\u6CC1", action: _jsx(Button, { startIcon: _jsx(DownloadIcon, {}), onClick: () => downloadReport('detector'), size: "small", children: "\u30EC\u30DD\u30FC\u30C8" }) }), _jsx(CardContent, { children: state.detectorStatus?.recentErrors?.length > 0 ? (_jsx(TableContainer, { component: Paper, variant: "outlined", children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u6642\u523B" }), _jsx(TableCell, { children: "\u30BF\u30A4\u30D7" }), _jsx(TableCell, { children: "\u30EC\u30D9\u30EB" }), _jsx(TableCell, { children: "\u30E1\u30C3\u30BB\u30FC\u30B8" }), _jsx(TableCell, { children: "\u64CD\u4F5C" })] }) }), _jsx(TableBody, { children: state.detectorStatus.recentErrors.map((error) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: new Date(error.timestamp).toLocaleTimeString() }), _jsx(TableCell, { children: _jsx(Chip, { label: error.type, size: "small" }) }), _jsx(TableCell, { children: _jsx(Chip, { ...getStatusChipProps(error.level), label: error.level, size: "small" }) }), _jsx(TableCell, { sx: { maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }, children: error.message }), _jsx(TableCell, { children: _jsx(IconButton, { size: "small", onClick: () => showErrorDetails(error), children: _jsx(VisibilityIcon, {}) }) })] }, error.id))) })] }) })) : (_jsxs(Alert, { severity: "success", children: [_jsx(AlertTitle, { children: "\u2705 \u30B7\u30B9\u30C6\u30E0\u6B63\u5E38" }), "\u73FE\u5728\u3001\u30A8\u30E9\u30FC\u306F\u691C\u51FA\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002"] })) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uD83D\uDCC8 \u7D71\u8A08\u60C5\u5831" }), _jsx(CardContent, { children: _jsxs(List, { dense: true, children: [_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(BugReportIcon, {}) }), _jsx(ListItemText, { primary: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30D6\u30E9\u30A6\u30B6", secondary: state.detectorStatus?.activeBrowsers || 0 })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(VisibilityIcon, {}) }), _jsx(ListItemText, { primary: "\u76E3\u8996\u4E2D\u30DA\u30FC\u30B8", secondary: state.detectorStatus?.activePages || 0 })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(BuildIcon, {}) }), _jsx(ListItemText, { primary: "\u7DCF\u4FEE\u5FA9\u6570", secondary: state.detectorStatus?.totalRepairs || 0 })] })] }) })] }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uD83D\uDD27 \u6700\u8FD1\u306E\u4FEE\u5FA9\u6D3B\u52D5" }), _jsx(CardContent, { children: state.detectorStatus?.recentRepairs?.length > 0 ? (_jsx(Box, { children: state.detectorStatus.recentRepairs.map((repair, index) => (_jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, width: '100%' }, children: [_jsx(Chip, { ...getStatusChipProps(repair.success ? 'passed' : 'failed'), label: repair.success ? '成功' : '失敗', size: "small" }), _jsx(Typography, { sx: { flexGrow: 1 }, children: repair.description || repair.type }), _jsx(Typography, { variant: "caption", color: "textSecondary", children: new Date(repair.timestamp).toLocaleString() })] }) }), _jsx(AccordionDetails, { children: _jsx("pre", { style: { fontSize: '0.8rem', overflow: 'auto' }, children: JSON.stringify(repair, null, 2) }) })] }, index))) })) : (_jsx(Alert, { severity: "info", children: "\u4FEE\u5FA9\u6D3B\u52D5\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002" })) })] }) }) }) }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 8, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u2705 \u6700\u65B0\u691C\u8A3C\u7D50\u679C", action: _jsx(Button, { startIcon: _jsx(DownloadIcon, {}), onClick: () => downloadReport('validation'), size: "small", disabled: !state.validationReport, children: "\u30EC\u30DD\u30FC\u30C8" }) }), _jsx(CardContent, { children: state.validationReport ? (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', gap: 2, mb: 3 }, children: [_jsx(Chip, { ...getStatusChipProps(state.validationReport.status), label: state.validationReport.status }), _jsxs(Typography, { variant: "h6", children: ["\u30B9\u30B3\u30A2: ", state.validationReport.overallScore.toFixed(1), "/100"] }), _jsxs(Typography, { variant: "body2", color: "textSecondary", children: [state.validationReport.passedTests, "/", state.validationReport.totalTests, " \u30C6\u30B9\u30C8\u5408\u683C"] })] }), _jsx(Grid, { container: true, spacing: 2, children: Object.entries(state.validationReport.summary).map(([category, data]) => (_jsx(Grid, { item: true, xs: 6, sm: 4, children: _jsx(Card, { variant: "outlined", children: _jsxs(CardContent, { sx: { textAlign: 'center', py: 2 }, children: [_jsx(Typography, { variant: "h6", sx: { color: getHealthScoreColor(data.score) }, children: data.score.toFixed(0) }), _jsx(Typography, { variant: "caption", display: "block", children: category }), _jsxs(Typography, { variant: "caption", color: "textSecondary", children: [data.passed, "/", data.total] })] }) }) }, category))) }), state.validationReport.recommendations.length > 0 && (_jsxs(Box, { sx: { mt: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\uD83D\uDCA1 \u63A8\u5968\u4E8B\u9805" }), _jsx(List, { dense: true, children: state.validationReport.recommendations.map((rec, index) => (_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(InfoIcon, { color: "info" }) }), _jsx(ListItemText, { primary: rec })] }, index))) })] }))] })) : (_jsx(Alert, { severity: "info", children: "\u691C\u8A3C\u7D50\u679C\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u30B7\u30B9\u30C6\u30E0\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uD83C\uDFAF \u54C1\u8CEA\u30E1\u30C8\u30EA\u30AF\u30B9" }), _jsx(CardContent, { children: _jsxs(List, { dense: true, children: [_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(AccessibilityIcon, {}) }), _jsx(ListItemText, { primary: "\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3", secondary: `${state.validationReport?.summary.accessibility.score.toFixed(0) || 'N/A'}%` })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(SpeedIcon, {}) }), _jsx(ListItemText, { primary: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9", secondary: `${state.validationReport?.summary.performance.score.toFixed(0) || 'N/A'}%` })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(SecurityIcon, {}) }), _jsx(ListItemText, { primary: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3", secondary: `${state.validationReport?.summary.security.score.toFixed(0) || 'N/A'}%` })] })] }) })] }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 3, children: _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uD83D\uDD04 \u7121\u9650\u30EB\u30FC\u30D7\u5236\u5FA1\u30B7\u30B9\u30C6\u30E0", action: _jsx(Button, { startIcon: _jsx(DownloadIcon, {}), onClick: () => downloadReport('loop'), size: "small", children: "\u30EC\u30DD\u30FC\u30C8" }) }), _jsx(CardContent, { children: state.loopStatus ? (_jsxs(Box, { children: [_jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "h6", color: "primary", children: state.loopStatus.currentIteration }), _jsx(Typography, { variant: "caption", children: "\u73FE\u5728\u306E\u30A4\u30C6\u30EC\u30FC\u30B7\u30E7\u30F3" })] }), _jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "h6", color: "success.main", children: state.loopStatus.totalRepairsSuccessful }), _jsx(Typography, { variant: "caption", children: "\u6210\u529F\u3057\u305F\u4FEE\u5FA9" })] }), _jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "h6", color: "error.main", children: state.loopStatus.totalErrorsDetected }), _jsx(Typography, { variant: "caption", children: "\u691C\u51FA\u30A8\u30E9\u30FC\u7DCF\u6570" })] }), _jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "h6", sx: { color: getHealthScoreColor(state.loopStatus.overallHealthScore) }, children: state.loopStatus.overallHealthScore.toFixed(1) }), _jsx(Typography, { variant: "caption", children: "\u5168\u4F53\u30D8\u30EB\u30B9\u30B9\u30B3\u30A2" })] })] }), _jsxs(Box, { sx: { mb: 3 }, children: [_jsxs(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: ["\u5B9F\u884C\u6642\u9593: ", Math.floor(state.loopStatus.elapsedTime / 60000), "\u5206", Math.floor((state.loopStatus.elapsedTime % 60000) / 1000), "\u79D2"] }), _jsx(LinearProgress, { variant: "determinate", value: Math.min((state.loopStatus.currentIteration / 1000) * 100, 100), sx: { height: 8, borderRadius: 4 } })] }), state.loopStatus.lastIteration && (_jsx(Card, { variant: "outlined", children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u6700\u65B0\u30A4\u30C6\u30EC\u30FC\u30B7\u30E7\u30F3\u7D50\u679C" }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u30A8\u30E9\u30FC\u691C\u77E5\u6570" }), _jsx(Typography, { variant: "h6", children: state.loopStatus.lastIteration.errorsDetected })] }), _jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u4FEE\u5FA9\u8A66\u884C\u6570" }), _jsx(Typography, { variant: "h6", children: state.loopStatus.lastIteration.repairsAttempted })] }), _jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u4FEE\u5FA9\u6210\u529F\u6570" }), _jsx(Typography, { variant: "h6", children: state.loopStatus.lastIteration.repairsSuccessful })] }), _jsxs(Grid, { item: true, xs: 6, sm: 3, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u30D8\u30EB\u30B9\u30B9\u30B3\u30A2" }), _jsx(Typography, { variant: "h6", sx: { color: getHealthScoreColor(state.loopStatus.lastIteration.healthScore) }, children: state.loopStatus.lastIteration.healthScore.toFixed(1) })] })] })] }) }))] })) : (_jsx(Alert, { severity: "info", children: "\u30EB\u30FC\u30D7\u5236\u5FA1\u30B7\u30B9\u30C6\u30E0\u304C\u5B9F\u884C\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002" })) })] }) }) }) }), _jsx(TabPanel, { value: tabValue, index: 4, children: _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uD83D\uDCC8 \u30B7\u30B9\u30C6\u30E0\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9" }), _jsx(CardContent, { children: _jsx(Alert, { severity: "info", children: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u5206\u6790\u6A5F\u80FD\u306F\u5B9F\u88C5\u4E2D\u3067\u3059\u3002 \u73FE\u5728\u306E\u57FA\u672C\u30E1\u30C8\u30EA\u30AF\u30B9\u306F\u4ED6\u306E\u30BF\u30D6\u3067\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002" }) })] }) }) }) })] }), _jsxs(Dialog, { open: detailsOpen, onClose: () => setDetailsOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\uD83D\uDD0D \u30A8\u30E9\u30FC\u8A73\u7D30\u60C5\u5831" }), _jsx(DialogContent, { children: selectedError && (_jsxs(Box, { children: [_jsxs(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [_jsxs(Grid, { item: true, xs: 6, children: [_jsx(Typography, { variant: "subtitle2", color: "textSecondary", children: "\u30A8\u30E9\u30FCID" }), _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace' }, children: selectedError.id })] }), _jsxs(Grid, { item: true, xs: 6, children: [_jsx(Typography, { variant: "subtitle2", color: "textSecondary", children: "\u767A\u751F\u6642\u523B" }), _jsx(Typography, { variant: "body2", children: new Date(selectedError.timestamp).toLocaleString() })] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30E1\u30C3\u30BB\u30FC\u30B8" }), _jsx(Typography, { variant: "body2", sx: { mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }, children: selectedError.message }), selectedError.stackTrace && (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30B9\u30BF\u30C3\u30AF\u30C8\u30EC\u30FC\u30B9" }), _jsx("pre", { style: {
                                                fontSize: '0.8rem',
                                                overflow: 'auto',
                                                backgroundColor: '#f5f5f5',
                                                padding: '1rem',
                                                borderRadius: '4px'
                                            }, children: selectedError.stackTrace })] })), _jsx(Typography, { variant: "h6", gutterBottom: true, sx: { mt: 2 }, children: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u60C5\u5831" }), _jsx("pre", { style: {
                                        fontSize: '0.8rem',
                                        overflow: 'auto',
                                        backgroundColor: '#f5f5f5',
                                        padding: '1rem',
                                        borderRadius: '4px'
                                    }, children: JSON.stringify(selectedError.context, null, 2) })] })) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setDetailsOpen(false), children: "\u9589\u3058\u308B" }) })] }), _jsxs(Dialog, { open: settingsOpen, onClose: () => setSettingsOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u2699\uFE0F \u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A" }), _jsxs(DialogContent, { children: [_jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "\u8A2D\u5B9A\u5909\u66F4\u6A5F\u80FD\u306F\u5B9F\u88C5\u4E2D\u3067\u3059\u3002 \u73FE\u5728\u306F\u30C7\u30D5\u30A9\u30EB\u30C8\u8A2D\u5B9A\u3067\u52D5\u4F5C\u3057\u3066\u3044\u307E\u3059\u3002" }), _jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u76E3\u8996\u5BFE\u8C61URL" }), _jsxs(List, { dense: true, children: [_jsx(ListItem, { children: _jsx(ListItemText, { primary: "http://192.168.3.135:3000", secondary: "\u30E1\u30A4\u30F3\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3" }) }), _jsx(ListItem, { children: _jsx(ListItemText, { primary: "http://192.168.3.135:3000/admin", secondary: "\u7BA1\u7406\u8005\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }) })] })] }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setSettingsOpen(false), children: "\u9589\u3058\u308B" }) })] })] }));
};
