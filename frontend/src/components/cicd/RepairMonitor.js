import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Grid, Typography, Card, CardContent, CardHeader, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction, Avatar, useTheme, useMediaQuery, Stack, Alert, Badge, Tooltip, IconButton, Divider, alpha, CircularProgress, Switch, FormControlLabel, Tab, Tabs, } from '@mui/material';
import { AutoFixHigh as AutoFixIcon, BugReport as BugIcon, CheckCircle as SuccessIcon, Error as ErrorIcon, PlayArrow as PlayIcon, Refresh as RefreshIcon, Speed as SpeedIcon, MonitorHeart as MonitorIcon, History as HistoryIcon, Visibility as ViewIcon, Settings as SettingsIcon, Assessment as ReportIcon, } from '@mui/icons-material';
import ContentArea from '../layout/ContentArea';
import { CustomLineChart, CustomBarChart, CustomGaugeChart } from '../common/CustomCharts';
const RepairMonitor = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [currentTab, setCurrentTab] = useState(0);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [monitoringEnabled, setMonitoringEnabled] = useState(true);
    // リアルタイムデータ（現在の状況に基づく）
    const [repairStats, setRepairStats] = useState({
        totalLoops: 147,
        totalErrors: 441,
        totalFixes: 441,
        lastScan: '2025-08-02T15:55:20',
        systemHealth: 'warning',
        fixSuccessRate: 100.0,
        averageLoopTime: 95,
        uptime: '99.2%',
        activeRepairs: 0,
    });
    const [repairEvents, setRepairEvents] = useState([
        {
            id: '1',
            timestamp: '2025-08-02T15:55:20',
            target: 'git_status',
            type: 'repair_success',
            severity: 'success',
            message: 'Gitステータスチェック完了',
            loop: 147,
            duration: 2.1,
            details: 'リポジトリ状態確認完了',
        },
        {
            id: '2',
            timestamp: '2025-08-02T15:55:18',
            target: 'frontend_build',
            type: 'repair_success',
            severity: 'success',
            message: 'フロントエンドビルド成功',
            loop: 147,
            duration: 28.5,
            details: 'React アプリケーションビルド完了',
        },
        {
            id: '3',
            timestamp: '2025-08-02T15:54:50',
            target: 'backend_tests',
            type: 'repair_success',
            severity: 'success',
            message: 'バックエンドテスト実行完了',
            loop: 147,
            duration: 15.2,
            details: 'すべてのテストケースが正常終了',
        },
        {
            id: '4',
            timestamp: '2025-08-02T15:53:46',
            target: 'git_status',
            type: 'loop_complete',
            severity: 'info',
            message: 'ループ146完了',
            loop: 146,
            duration: 87.3,
            details: '自動修復サイクル正常終了',
        },
        {
            id: '5',
            timestamp: '2025-08-02T15:53:44',
            target: 'frontend_build',
            type: 'repair_success',
            severity: 'success',
            message: 'フロントエンドビルド成功',
            loop: 146,
            duration: 32.1,
        },
    ]);
    const repairTargets = [
        {
            name: 'git_status',
            status: 'active',
            lastRepair: '2025-08-02T15:55:20',
            repairCount: 147,
            successRate: 100,
            averageTime: 2.5,
        },
        {
            name: 'backend_tests',
            status: 'active',
            lastRepair: '2025-08-02T15:54:50',
            repairCount: 147,
            successRate: 98.6,
            averageTime: 16.8,
        },
        {
            name: 'frontend_build',
            status: 'active',
            lastRepair: '2025-08-02T15:55:18',
            repairCount: 147,
            successRate: 97.3,
            averageTime: 29.2,
        },
        {
            name: 'integration_tests',
            status: 'idle',
            lastRepair: '2025-08-02T14:50:00',
            repairCount: 89,
            successRate: 95.5,
            averageTime: 45.7,
        },
    ];
    // チャートデータ
    const loopTrendData = [
        { time: '15:00', loops: 3, errors: 5, fixes: 5, duration: 92 },
        { time: '15:15', loops: 4, errors: 6, fixes: 6, duration: 88 },
        { time: '15:30', loops: 3, errors: 4, fixes: 4, duration: 95 },
        { time: '15:45', loops: 2, errors: 3, fixes: 3, duration: 97 },
        { time: '16:00', loops: 1, errors: 2, fixes: 2, duration: 85 },
    ];
    const targetStatsData = repairTargets.map(target => ({
        name: target.name,
        successRate: target.successRate,
        repairCount: target.repairCount,
        averageTime: target.averageTime,
    }));
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return theme.palette.success.main;
            case 'repairing': return theme.palette.info.main;
            case 'error': return theme.palette.error.main;
            case 'idle': return theme.palette.grey[500];
            default: return theme.palette.grey[500];
        }
    };
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'success': return theme.palette.success.main;
            case 'warning': return theme.palette.warning.main;
            case 'error': return theme.palette.error.main;
            case 'info': return theme.palette.info.main;
            default: return theme.palette.grey[500];
        }
    };
    const getEventIcon = (type) => {
        switch (type) {
            case 'error_detection': return _jsx(BugIcon, {});
            case 'repair_start': return _jsx(PlayIcon, {});
            case 'repair_success': return _jsx(SuccessIcon, {});
            case 'repair_failure': return _jsx(ErrorIcon, {});
            case 'loop_complete': return _jsx(CheckCircle, {});
            default: return _jsx(MonitorIcon, {});
        }
    };
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // 実際の実装ではAPIからリアルタイムデータを取得
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLastUpdate(new Date());
            // ループカウントを更新（デモンストレーション）
            setRepairStats(prev => ({
                ...prev,
                totalLoops: prev.totalLoops + Math.floor(Math.random() * 2),
                totalErrors: prev.totalErrors + Math.floor(Math.random() * 3),
                lastScan: new Date().toISOString(),
            }));
        }
        finally {
            setRefreshing(false);
        }
    }, []);
    // 自動更新
    useEffect(() => {
        if (!autoRefresh)
            return;
        const interval = setInterval(() => {
            handleRefresh();
        }, 30000); // 30秒ごとに更新
        return () => clearInterval(interval);
    }, [autoRefresh, handleRefresh]);
    // 修復制御
    const handleRepairControl = useCallback((action) => {
        console.log(`修復システム: ${action}`);
        // 実際の実装ではAPIコール
    }, []);
    const pageActions = (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: monitoringEnabled, onChange: (e) => setMonitoringEnabled(e.target.checked), color: "primary" }), label: "\u76E3\u8996\u6709\u52B9" }), _jsx(Tooltip, { title: autoRefresh ? '自動更新を無効化' : '自動更新を有効化', children: _jsx(IconButton, { onClick: () => setAutoRefresh(!autoRefresh), color: autoRefresh ? 'primary' : 'default', children: _jsx(Badge, { badgeContent: autoRefresh ? '自動' : null, color: "primary", children: _jsx(RefreshIcon, {}) }) }) }), _jsx(Button, { variant: "outlined", startIcon: refreshing ? _jsx(CircularProgress, { size: 16 }) : _jsx(RefreshIcon, {}), onClick: handleRefresh, disabled: refreshing, size: isMobile ? 'small' : 'medium', children: refreshing ? '更新中...' : '更新' }), _jsx(Button, { variant: "contained", startIcon: _jsx(SettingsIcon, {}), size: isMobile ? 'small' : 'medium', children: "\u8A2D\u5B9A" })] }));
    return (_jsxs(ContentArea, { pageTitle: "\u4FEE\u5FA9\u76E3\u8996\u30B7\u30B9\u30C6\u30E0", pageDescription: "\u7121\u9650\u30EB\u30FC\u30D7\u81EA\u52D5\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0\u306E\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996", actions: pageActions, showBreadcrumbs: true, children: [_jsxs(Box, { sx: { mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u6700\u7D42\u30B9\u30AD\u30E3\u30F3: ", new Date(repairStats.lastScan).toLocaleString('ja-JP')] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [monitoringEnabled && (_jsx(Chip, { label: "\u76E3\u8996\u4E2D", size: "small", color: "success", variant: "outlined", icon: _jsx(MonitorIcon, {}) })), repairStats.activeRepairs > 0 && (_jsx(Chip, { label: `${repairStats.activeRepairs}件修復中`, size: "small", color: "warning", variant: "outlined", icon: _jsx(AutoFixIcon, {}) }))] })] }), repairStats.systemHealth === 'warning' && (_jsxs(Alert, { severity: "warning", sx: { mb: 3 }, action: _jsx(Button, { color: "inherit", size: "small", children: "\u8A73\u7D30\u78BA\u8A8D" }), children: ["\u30B7\u30B9\u30C6\u30E0\u304C\u7D99\u7D9A\u7684\u306A\u4FEE\u5FA9\u3092\u5B9F\u884C\u4E2D\u3067\u3059\u3002\u30EB\u30FC\u30D7\u56DE\u6570: ", repairStats.totalLoops, "\u3001\u7DCF\u30A8\u30E9\u30FC\u6570: ", repairStats.totalErrors] })), _jsx(Box, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: currentTab, onChange: (_, newValue) => setCurrentTab(newValue), sx: { borderBottom: 1, borderColor: 'divider' }, variant: isMobile ? 'fullWidth' : 'standard', children: [_jsx(Tab, { icon: _jsx(MonitorIcon, {}), label: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(HistoryIcon, {}), label: "\u4FEE\u5FA9\u5C65\u6B74", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(ReportIcon, {}), label: "\u5206\u6790\u30EC\u30DD\u30FC\u30C8", iconPosition: "start" })] }) }), currentTab === 0 && (_jsxs(Box, { children: [_jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { sx: { p: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }, children: _jsx(AutoFixIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.info.main }, children: repairStats.totalLoops }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7DCF\u30EB\u30FC\u30D7\u56DE\u6570" })] })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { sx: { p: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }, children: _jsx(BugIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.warning.main }, children: repairStats.totalErrors }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u691C\u51FA\u30A8\u30E9\u30FC\u6570" })] })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { sx: { p: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }, children: _jsx(SuccessIcon, {}) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.success.main }, children: [repairStats.fixSuccessRate, "%"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u4FEE\u5FA9\u6210\u529F\u7387" })] })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { sx: { p: 3 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }, children: _jsx(SpeedIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.primary.main }, children: repairStats.uptime }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30B7\u30B9\u30C6\u30E0\u7A3C\u50CD\u7387" })] })] }) }) }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, lg: 8, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u4FEE\u5FA9\u30BF\u30FC\u30B2\u30C3\u30C8\u72B6\u6CC1", subheader: "\u5404\u4FEE\u5FA9\u5BFE\u8C61\u306E\u73FE\u5728\u306E\u72B6\u614B\u3068\u7D71\u8A08" }), _jsx(CardContent, { children: _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u30BF\u30FC\u30B2\u30C3\u30C8" }), _jsx(TableCell, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx(TableCell, { align: "right", children: "\u4FEE\u5FA9\u56DE\u6570" }), _jsx(TableCell, { align: "right", children: "\u6210\u529F\u7387" }), _jsx(TableCell, { align: "right", children: "\u5E73\u5747\u6642\u9593" }), _jsx(TableCell, { children: "\u6700\u7D42\u4FEE\u5FA9" })] }) }), _jsx(TableBody, { children: repairTargets.map((target) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: target.name }) }), _jsx(TableCell, { children: _jsx(Chip, { label: target.status.toUpperCase(), size: "small", sx: {
                                                                                bgcolor: alpha(getStatusColor(target.status), 0.1),
                                                                                color: getStatusColor(target.status),
                                                                                fontWeight: 600,
                                                                            } }) }), _jsx(TableCell, { align: "right", children: target.repairCount }), _jsxs(TableCell, { align: "right", children: [target.successRate, "%"] }), _jsxs(TableCell, { align: "right", children: [target.averageTime, "s"] }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: new Date(target.lastRepair).toLocaleString('ja-JP') }) })] }, target.name))) })] }) }) })] }) }), _jsx(Grid, { item: true, xs: 12, lg: 4, children: _jsx(CustomGaugeChart, { title: "\u30B7\u30B9\u30C6\u30E0\u30D8\u30EB\u30B9", value: repairStats.fixSuccessRate, unit: "%", height: 300, thresholds: [
                                        { value: 95, color: theme.palette.success.main, label: '良好' },
                                        { value: 85, color: theme.palette.warning.main, label: '警告' },
                                        { value: 0, color: theme.palette.error.main, label: '危険' },
                                    ], onRefresh: handleRefresh }) })] }), _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsx(CustomLineChart, { title: "\u4FEE\u5FA9\u30C8\u30EC\u30F3\u30C9 (\u904E\u53BB1\u6642\u9593)", subtitle: "\u30EB\u30FC\u30D7\u5B9F\u884C\u3001\u30A8\u30E9\u30FC\u691C\u51FA\u3001\u4FEE\u5FA9\u6210\u529F\u306E\u63A8\u79FB", data: loopTrendData, lines: [
                                    { dataKey: 'loops', name: 'ループ実行', color: theme.palette.primary.main },
                                    { dataKey: 'errors', name: 'エラー検出', color: theme.palette.error.main },
                                    { dataKey: 'fixes', name: '修復成功', color: theme.palette.success.main },
                                ], xAxisKey: "time", height: 350, smooth: true, dots: true, onDataPointClick: (data) => console.log('チャートクリック:', data), onRefresh: handleRefresh }) }) })] })), currentTab === 1 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u4FEE\u5FA9\u5C65\u6B74" }), _jsx(Card, { children: _jsx(CardContent, { children: _jsx(List, { children: repairEvents.map((event, index) => (_jsxs(React.Fragment, { children: [_jsxs(ListItem, { alignItems: "flex-start", children: [_jsx(ListItemIcon, { children: _jsx(Avatar, { sx: {
                                                            bgcolor: alpha(getSeverityColor(event.severity), 0.1),
                                                            color: getSeverityColor(event.severity),
                                                            width: 32,
                                                            height: 32,
                                                        }, children: getEventIcon(event.type) }) }), _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Typography, { variant: "body1", sx: { fontWeight: 600 }, children: event.message }), _jsx(Chip, { label: `Loop ${event.loop}`, size: "small", variant: "outlined" })] }), secondary: _jsxs(Box, { children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [new Date(event.timestamp).toLocaleString('ja-JP'), event.duration && ` • 実行時間: ${event.duration}秒`] }), event.details && (_jsx(Typography, { variant: "body2", color: "text.secondary", children: event.details }))] }) }), _jsx(ListItemSecondaryAction, { children: _jsx(Tooltip, { title: "\u8A73\u7D30\u8868\u793A", children: _jsx(IconButton, { size: "small", children: _jsx(ViewIcon, {}) }) }) })] }), index < repairEvents.length - 1 && _jsx(Divider, { variant: "inset", component: "li" })] }, event.id))) }) }) })] })), currentTab === 2 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u5206\u6790\u30EC\u30DD\u30FC\u30C8" }), _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsx(CustomBarChart, { title: "\u4FEE\u5FA9\u30BF\u30FC\u30B2\u30C3\u30C8\u5225\u7D71\u8A08", data: targetStatsData, bars: [
                                    { dataKey: 'successRate', name: '成功率 (%)', color: theme.palette.success.main },
                                    { dataKey: 'averageTime', name: '平均時間 (秒)', color: theme.palette.info.main },
                                ], xAxisKey: "name", height: 350, onDataPointClick: (data) => console.log('バーチャートクリック:', data), onRefresh: handleRefresh }) }) })] }))] }));
};
export default RepairMonitor;
