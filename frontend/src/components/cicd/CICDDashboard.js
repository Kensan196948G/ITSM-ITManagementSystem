import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Chip, LinearProgress, useTheme, Button, useMediaQuery, Stack, Alert, Badge, Tooltip, CircularProgress, alpha, Switch, FormControlLabel, Tab, Tabs, } from '@mui/material';
import { Build as BuildIcon, CheckCircle as SuccessIcon, Error as ErrorIcon, Schedule as ScheduleIcon, PlayArrow as PlayIcon, Stop as StopIcon, Refresh as RefreshIcon, Settings as SettingsIcon, Speed as SpeedIcon, BugReport as BugIcon, AutoFixHigh as AutoFixIcon, MonitorHeart as MonitorIcon, Assessment as ReportIcon, } from '@mui/icons-material';
import ContentArea from '../layout/ContentArea';
import { CustomLineChart, CustomDonutChart, CustomGaugeChart } from '../common/CustomCharts';
const CICDDashboard = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [currentTab, setCurrentTab] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [autoRepairEnabled, setAutoRepairEnabled] = useState(true);
    // リアルタイム修復メトリクス（現在の状況に基づく）
    const repairMetrics = {
        totalLoops: 144,
        totalErrors: 432,
        lastScan: '2025-08-02T15:49:54',
        systemHealth: 'warning',
        fixSuccessRate: 87.5,
        activeRepairs: 3,
        uptime: '98.7%',
    };
    // ワークフロー状況
    const workflows = [
        {
            id: 'cicd-auto-repair',
            name: 'CI/CD自動修復ワークフロー',
            status: 'running',
            progress: 75,
            duration: 450,
            lastRun: '2025-08-02T15:49:54',
            nextRun: '2025-08-02T16:19:54',
            branch: 'main',
            commit: '6a276fb',
            author: 'Auto-Repair System',
            errorCount: 0,
            repairAttempts: 144,
        },
        {
            id: 'backend-tests',
            name: 'バックエンドテストスイート',
            status: 'success',
            progress: 100,
            duration: 180,
            lastRun: '2025-08-02T15:30:00',
            branch: 'main',
            commit: '2b136ff',
            author: 'Auto-Repair System',
            errorCount: 0,
            repairAttempts: 0,
        },
        {
            id: 'frontend-tests',
            name: 'フロントエンドテストスイート',
            status: 'success',
            progress: 100,
            duration: 95,
            lastRun: '2025-08-02T15:25:00',
            branch: 'main',
            commit: '32f5915',
            author: 'Auto-Repair System',
            errorCount: 0,
            repairAttempts: 0,
        },
        {
            id: 'integration-tests',
            name: '統合テスト',
            status: 'pending',
            progress: 0,
            duration: 0,
            lastRun: '2025-08-02T14:50:00',
            nextRun: '2025-08-02T16:00:00',
            branch: 'main',
            commit: '112d469',
            author: 'Auto-Repair System',
            errorCount: 0,
            repairAttempts: 0,
        },
    ];
    // システムリソース監視
    const systemResources = [
        { name: 'CPU使用率', usage: 68, threshold: 80, status: 'normal', unit: '%' },
        { name: 'メモリ使用率', usage: 74, threshold: 85, status: 'normal', unit: '%' },
        { name: 'ディスク使用率', usage: 45, threshold: 90, status: 'normal', unit: '%' },
        { name: 'ネットワーク', usage: 23, threshold: 70, status: 'normal', unit: '%' },
    ];
    // チャートデータ
    const repairTrendData = [
        { time: '12:00', loops: 10, errors: 15, fixes: 13 },
        { time: '13:00', loops: 12, errors: 18, fixes: 16 },
        { time: '14:00', loops: 15, errors: 22, fixes: 19 },
        { time: '15:00', loops: 18, errors: 25, fixes: 22 },
        { time: '16:00', loops: 20, errors: 28, fixes: 25 },
    ];
    const statusData = [
        { name: '成功', value: 85, color: theme.palette.success.main },
        { name: '警告', value: 12, color: theme.palette.warning.main },
        { name: 'エラー', value: 3, color: theme.palette.error.main },
    ];
    // ステータス色の取得
    const getStatusColor = (status) => {
        switch (status) {
            case 'running': return theme.palette.info.main;
            case 'success': return theme.palette.success.main;
            case 'failed': return theme.palette.error.main;
            case 'pending': return theme.palette.warning.main;
            case 'cancelled': return theme.palette.grey[500];
            default: return theme.palette.grey[500];
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'running': return _jsx(PlayIcon, {});
            case 'success': return _jsx(SuccessIcon, {});
            case 'failed': return _jsx(ErrorIcon, {});
            case 'pending': return _jsx(ScheduleIcon, {});
            case 'cancelled': return _jsx(StopIcon, {});
            default: return _jsx(ScheduleIcon, {});
        }
    };
    // データ更新処理
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // APIコール（実際の実装では適切なエンドポイント）
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLastUpdate(new Date());
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
    // ワークフロー制御
    const handleWorkflowAction = useCallback((workflowId, action) => {
        console.log(`ワークフロー ${workflowId} で ${action} を実行`);
        // 実際の実装ではAPIコール
    }, []);
    // 自動修復切り替え
    const handleAutoRepairToggle = useCallback(() => {
        setAutoRepairEnabled(!autoRepairEnabled);
        // 実際の実装ではAPIコール
    }, [autoRepairEnabled]);
    const pageActions = (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: autoRepairEnabled, onChange: handleAutoRepairToggle, color: "primary" }), label: "\u81EA\u52D5\u4FEE\u5FA9" }), _jsx(Tooltip, { title: autoRefresh ? '自動更新を無効化' : '自動更新を有効化', children: _jsx(IconButton, { onClick: () => setAutoRefresh(!autoRefresh), color: autoRefresh ? 'primary' : 'default', children: _jsx(Badge, { badgeContent: autoRefresh ? '自動' : null, color: "primary", children: _jsx(RefreshIcon, {}) }) }) }), _jsx(Button, { variant: "outlined", startIcon: refreshing ? _jsx(CircularProgress, { size: 16 }) : _jsx(RefreshIcon, {}), onClick: handleRefresh, disabled: refreshing, size: isMobile ? 'small' : 'medium', children: refreshing ? '更新中...' : '更新' }), _jsx(Button, { variant: "contained", startIcon: _jsx(SettingsIcon, {}), size: isMobile ? 'small' : 'medium', children: "\u8A2D\u5B9A" })] }));
    return (_jsxs(ContentArea, { pageTitle: "CI/CD\u81EA\u52D5\u4FEE\u5FA9\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9", pageDescription: "\u7D99\u7D9A\u7684\u30A4\u30F3\u30C6\u30B0\u30EC\u30FC\u30B7\u30E7\u30F3\u30FB\u30C7\u30D7\u30ED\u30A4\u30E1\u30F3\u30C8\u3068\u81EA\u52D5\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0\u306E\u76E3\u8996", actions: pageActions, showBreadcrumbs: true, children: [_jsxs(Box, { sx: { mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u6700\u7D42\u66F4\u65B0: ", lastUpdate.toLocaleString('ja-JP')] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [autoRefresh && (_jsx(Chip, { label: "\u81EA\u52D5\u66F4\u65B0\u4E2D", size: "small", color: "primary", variant: "outlined", icon: _jsx(RefreshIcon, {}) })), autoRepairEnabled && (_jsx(Chip, { label: "\u81EA\u52D5\u4FEE\u5FA9\u7A3C\u50CD\u4E2D", size: "small", color: "success", variant: "outlined", icon: _jsx(AutoFixIcon, {}) }))] })] }), repairMetrics.systemHealth === 'warning' && (_jsxs(Alert, { severity: "warning", sx: { mb: 3 }, action: _jsx(Button, { color: "inherit", size: "small", children: "\u8A73\u7D30\u78BA\u8A8D" }), children: ["\u81EA\u52D5\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0\u304C", repairMetrics.activeRepairs, "\u4EF6\u306E\u30A8\u30E9\u30FC\u3092\u51E6\u7406\u4E2D\u3067\u3059\u3002\u30EB\u30FC\u30D7\u56DE\u6570: ", repairMetrics.totalLoops] })), _jsx(Box, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: currentTab, onChange: (_, newValue) => setCurrentTab(newValue), sx: { borderBottom: 1, borderColor: 'divider' }, variant: isMobile ? 'fullWidth' : 'standard', children: [_jsx(Tab, { icon: _jsx(MonitorIcon, {}), label: "\u76E3\u8996\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(BuildIcon, {}), label: "\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u7BA1\u7406", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(ReportIcon, {}), label: "\u4FEE\u5FA9\u30EC\u30DD\u30FC\u30C8", iconPosition: "start" })] }) }), currentTab === 0 && (_jsxs(Box, { children: [_jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { height: '100%' }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsx(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: _jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }, children: _jsx(AutoFixIcon, {}) }) }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.info.main, mb: 1 }, children: repairMetrics.totalLoops }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u4FEE\u5FA9\u30EB\u30FC\u30D7\u5B9F\u884C\u56DE\u6570" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { height: '100%' }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsx(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: _jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }, children: _jsx(BugIcon, {}) }) }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.warning.main, mb: 1 }, children: repairMetrics.totalErrors }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7DCF\u691C\u51FA\u30A8\u30E9\u30FC\u6570" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { height: '100%' }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsx(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: _jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }, children: _jsx(SuccessIcon, {}) }) }), _jsxs(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.success.main, mb: 1 }, children: [repairMetrics.fixSuccessRate, "%"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u4FEE\u5FA9\u6210\u529F\u7387" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { sx: { height: '100%' }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsx(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: _jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }, children: _jsx(SpeedIcon, {}) }) }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: theme.palette.primary.main, mb: 1 }, children: repairMetrics.uptime }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30B7\u30B9\u30C6\u30E0\u7A3C\u50CD\u7387" })] }) }) })] }), _jsx(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: systemResources.map((resource, index) => (_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsx(CustomGaugeChart, { title: resource.name, value: resource.usage, unit: resource.unit, height: 200, thresholds: [
                                    { value: resource.threshold, color: theme.palette.error.main, label: '危険' },
                                    { value: resource.threshold * 0.8, color: theme.palette.warning.main, label: '警告' },
                                    { value: 0, color: theme.palette.success.main, label: '正常' },
                                ], onRefresh: handleRefresh }) }, index))) }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, md: 8, children: _jsx(CustomLineChart, { title: "\u4FEE\u5FA9\u30C8\u30EC\u30F3\u30C9 (\u904E\u53BB5\u6642\u9593)", subtitle: "\u30EB\u30FC\u30D7\u5B9F\u884C\u3001\u30A8\u30E9\u30FC\u691C\u51FA\u3001\u4FEE\u5FA9\u6210\u529F\u306E\u63A8\u79FB", data: repairTrendData, lines: [
                                        { dataKey: 'loops', name: 'ループ実行', color: theme.palette.primary.main },
                                        { dataKey: 'errors', name: 'エラー検出', color: theme.palette.error.main },
                                        { dataKey: 'fixes', name: '修復成功', color: theme.palette.success.main },
                                    ], xAxisKey: "time", height: 350, smooth: true, dots: true, onDataPointClick: (data) => console.log('チャートクリック:', data), onRefresh: handleRefresh }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(CustomDonutChart, { title: "\u4FEE\u5FA9\u30B9\u30C6\u30FC\u30BF\u30B9\u5206\u5E03", data: statusData, dataKey: "value", nameKey: "name", height: 350, centerLabel: "\u7DCF\u5B9F\u884C\u6570", centerValue: statusData.reduce((sum, item) => sum + item.value, 0), onDataPointClick: (data) => console.log('ドーナツチャートクリック:', data), onRefresh: handleRefresh }) })] })] })), currentTab === 1 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC" }), _jsx(Grid, { container: true, spacing: 3, children: workflows.map((workflow) => (_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Avatar, { sx: {
                                                                bgcolor: alpha(getStatusColor(workflow.status), 0.1),
                                                                color: getStatusColor(workflow.status),
                                                                width: 40,
                                                                height: 40,
                                                            }, children: getStatusIcon(workflow.status) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", noWrap: true, children: workflow.name }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [workflow.branch, " \u2022 ", workflow.commit] })] })] }), _jsx(Chip, { label: workflow.status.toUpperCase(), size: "small", sx: {
                                                        bgcolor: alpha(getStatusColor(workflow.status), 0.1),
                                                        color: getStatusColor(workflow.status),
                                                        fontWeight: 600,
                                                    } })] }), workflow.status === 'running' && (_jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", children: "\u9032\u6357" }), _jsxs(Typography, { variant: "body2", children: [workflow.progress, "%"] })] }), _jsx(LinearProgress, { variant: "determinate", value: workflow.progress, sx: { height: 8, borderRadius: 4 } })] })), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u6700\u7D42\u5B9F\u884C: ", new Date(workflow.lastRun).toLocaleString('ja-JP')] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u5B9F\u884C\u6642\u9593: ", workflow.duration, "\u79D2"] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u4F5C\u6210\u8005: ", workflow.author] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u4FEE\u5FA9\u8A66\u884C: ", workflow.repairAttempts, "\u56DE"] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { size: "small", startIcon: _jsx(PlayIcon, {}), onClick: () => handleWorkflowAction(workflow.id, 'start'), disabled: workflow.status === 'running', children: "\u5B9F\u884C" }), _jsx(Button, { size: "small", startIcon: _jsx(StopIcon, {}), onClick: () => handleWorkflowAction(workflow.id, 'stop'), disabled: workflow.status !== 'running', children: "\u505C\u6B62" }), _jsx(Button, { size: "small", startIcon: _jsx(RefreshIcon, {}), onClick: () => handleWorkflowAction(workflow.id, 'retry'), children: "\u518D\u5B9F\u884C" })] })] }) }) }, workflow.id))) })] })), currentTab === 2 && (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u4FEE\u5FA9\u30EC\u30DD\u30FC\u30C8" }), _jsx(Typography, { variant: "body1", color: "text.secondary", gutterBottom: true, children: "\u8A73\u7D30\u306A\u4FEE\u5FA9\u30EC\u30DD\u30FC\u30C8\u3068\u5206\u6790\u7D50\u679C\u3092\u8868\u793A\u3057\u307E\u3059\u3002" }), _jsx(Card, { children: _jsx(CardContent, { children: _jsx(Typography, { variant: "body2", children: "\u30EC\u30DD\u30FC\u30C8\u6A5F\u80FD\u306F\u5B9F\u88C5\u4E2D\u3067\u3059\u3002\u7121\u9650\u30EB\u30FC\u30D7\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0\u306E\u30ED\u30B0\u3068\u30E1\u30C8\u30EA\u30AF\u30B9\u3092\u57FA\u306B\u3057\u305F \u5305\u62EC\u7684\u306A\u30EC\u30DD\u30FC\u30C8\u6A5F\u80FD\u3092\u63D0\u4F9B\u4E88\u5B9A\u3067\u3059\u3002" }) }) })] }))] }));
};
export default CICDDashboard;
