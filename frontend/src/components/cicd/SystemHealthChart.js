import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, CardHeader, Typography, Grid, useTheme, alpha, Avatar, Chip, Stack, IconButton, Tooltip, LinearProgress, CircularProgress, } from '@mui/material';
import { Speed as SpeedIcon, Memory as MemoryIcon, Storage as StorageIcon, NetworkCheck as NetworkIcon, Security as SecurityIcon, CheckCircle as HealthyIcon, Warning as WarningIcon, Error as CriticalIcon, Refresh as RefreshIcon, Info as InfoIcon, } from '@mui/icons-material';
import { CustomGaugeChart, CustomLineChart } from '../common/CustomCharts';
const SystemHealthChart = ({ height = 400, showDetails = true, autoRefresh = true, refreshInterval = 30000, }) => {
    const theme = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    // システムヘルスメトリクス
    const [metrics, setMetrics] = useState([
        {
            id: 'cpu',
            name: 'CPU使用率',
            value: 68,
            threshold: { warning: 70, critical: 85 },
            status: 'healthy',
            unit: '%',
            icon: _jsx(SpeedIcon, {}),
            trend: -2.3,
            description: 'システムCPU使用率',
        },
        {
            id: 'memory',
            name: 'メモリ使用率',
            value: 74,
            threshold: { warning: 80, critical: 90 },
            status: 'healthy',
            unit: '%',
            icon: _jsx(MemoryIcon, {}),
            trend: 1.8,
            description: 'システムメモリ使用率',
        },
        {
            id: 'disk',
            name: 'ディスク使用率',
            value: 45,
            threshold: { warning: 85, critical: 95 },
            status: 'healthy',
            unit: '%',
            icon: _jsx(StorageIcon, {}),
            trend: 0.5,
            description: 'ディスク容量使用率',
        },
        {
            id: 'network',
            name: 'ネットワーク',
            value: 23,
            threshold: { warning: 70, critical: 90 },
            status: 'healthy',
            unit: '%',
            icon: _jsx(NetworkIcon, {}),
            trend: -0.8,
            description: 'ネットワーク使用率',
        },
        {
            id: 'security',
            name: 'セキュリティ',
            value: 98,
            threshold: { warning: 95, critical: 90 },
            status: 'healthy',
            unit: '%',
            icon: _jsx(SecurityIcon, {}),
            trend: 0.2,
            description: 'セキュリティスコア',
        },
    ]);
    // システム全体ステータス
    const [systemStatus, setSystemStatus] = useState({
        overall: 'healthy',
        uptime: '99.8%',
        lastUpdate: new Date().toISOString(),
        activeAlerts: 1,
        totalServices: 23,
        activeServices: 22,
    });
    // 時系列データ
    const healthTrendData = [
        { time: '15:00', cpu: 65, memory: 72, disk: 44, network: 25, security: 97 },
        { time: '15:15', cpu: 70, memory: 76, disk: 45, network: 28, security: 98 },
        { time: '15:30', cpu: 68, memory: 74, disk: 45, network: 23, security: 98 },
        { time: '15:45', cpu: 72, memory: 78, disk: 46, network: 22, security: 97 },
        { time: '16:00', cpu: 68, memory: 74, disk: 45, network: 23, security: 98 },
    ];
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return theme.palette.success.main;
            case 'warning': return theme.palette.warning.main;
            case 'critical': return theme.palette.error.main;
            default: return theme.palette.grey[500];
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return _jsx(HealthyIcon, {});
            case 'warning': return _jsx(WarningIcon, {});
            case 'critical': return _jsx(CriticalIcon, {});
            default: return _jsx(InfoIcon, {});
        }
    };
    const calculateOverallHealth = useCallback(() => {
        const criticalCount = metrics.filter(m => m.status === 'critical').length;
        const warningCount = metrics.filter(m => m.status === 'warning').length;
        if (criticalCount > 0)
            return 'critical';
        if (warningCount > 0)
            return 'warning';
        return 'healthy';
    }, [metrics]);
    const updateMetrics = useCallback(() => {
        setMetrics(prev => prev.map(metric => {
            // ランダムな変動を追加（デモンストレーション）
            const variation = (Math.random() - 0.5) * 5;
            const newValue = Math.max(0, Math.min(100, metric.value + variation));
            let status = 'healthy';
            if (metric.id === 'security') {
                // セキュリティは逆転（高い方が良い）
                if (newValue < metric.threshold.critical)
                    status = 'critical';
                else if (newValue < metric.threshold.warning)
                    status = 'warning';
            }
            else {
                if (newValue >= metric.threshold.critical)
                    status = 'critical';
                else if (newValue >= metric.threshold.warning)
                    status = 'warning';
            }
            return {
                ...metric,
                value: Math.round(newValue),
                status,
                trend: variation,
            };
        }));
    }, []);
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            updateMetrics();
            setLastUpdate(new Date());
            setSystemStatus(prev => ({
                ...prev,
                overall: calculateOverallHealth(),
                lastUpdate: new Date().toISOString(),
            }));
        }
        finally {
            setRefreshing(false);
        }
    }, [updateMetrics, calculateOverallHealth]);
    // 自動更新
    useEffect(() => {
        if (!autoRefresh)
            return;
        const interval = setInterval(() => {
            handleRefresh();
        }, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, handleRefresh]);
    // 全体ヘルススコアの計算
    const overallScore = Math.round(metrics.reduce((sum, metric) => {
        if (metric.id === 'security') {
            return sum + metric.value; // セキュリティは高い方が良い
        }
        return sum + (100 - metric.value); // その他は低い方が良い
    }, 0) / metrics.length);
    return (_jsxs(Card, { sx: { height: '100%' }, children: [_jsx(CardHeader, { title: "\u30B7\u30B9\u30C6\u30E0\u30D8\u30EB\u30B9", subheader: `最終更新: ${lastUpdate.toLocaleString('ja-JP')}`, action: _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(Chip, { label: systemStatus.overall.toUpperCase(), size: "small", sx: {
                                bgcolor: alpha(getStatusColor(systemStatus.overall), 0.1),
                                color: getStatusColor(systemStatus.overall),
                                fontWeight: 600,
                            }, icon: getStatusIcon(systemStatus.overall) }), _jsx(Tooltip, { title: "\u66F4\u65B0", children: _jsx(IconButton, { size: "small", onClick: handleRefresh, disabled: refreshing, children: refreshing ? _jsx(CircularProgress, { size: 16 }) : _jsx(RefreshIcon, {}) }) })] }) }), _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Box, { sx: { height: height / 2 }, children: _jsx(CustomGaugeChart, { title: "\u7DCF\u5408\u30D8\u30EB\u30B9\u30B9\u30B3\u30A2", value: overallScore, unit: "%", height: height / 2, thresholds: [
                                        { value: 90, color: theme.palette.success.main, label: '良好' },
                                        { value: 70, color: theme.palette.warning.main, label: '警告' },
                                        { value: 0, color: theme.palette.error.main, label: '危険' },
                                    ], onRefresh: handleRefresh }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Box, { sx: { height: height / 2, display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsxs(Box, { sx: {
                                            p: 2,
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            backgroundColor: alpha(theme.palette.background.paper, 0.5)
                                        }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u30B7\u30B9\u30C6\u30E0\u7A3C\u50CD\u7387" }), _jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: theme.palette.success.main }, children: systemStatus.uptime })] }), _jsxs(Box, { sx: {
                                            p: 2,
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            backgroundColor: alpha(theme.palette.background.paper, 0.5)
                                        }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u30B5\u30FC\u30D3\u30B9\u72B6\u6CC1" }), _jsxs(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: [systemStatus.activeServices, " / ", systemStatus.totalServices] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30B5\u30FC\u30D3\u30B9" })] }), systemStatus.activeAlerts > 0 && (_jsxs(Box, { sx: {
                                            p: 2,
                                            border: 1,
                                            borderColor: 'warning.main',
                                            borderRadius: 1,
                                            backgroundColor: alpha(theme.palette.warning.main, 0.1)
                                        }, children: [_jsx(Typography, { variant: "body2", color: "warning.main", gutterBottom: true, children: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30A2\u30E9\u30FC\u30C8" }), _jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: 'warning.main' }, children: systemStatus.activeAlerts })] }))] }) }), showDetails && (_jsxs(_Fragment, { children: [_jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u8A73\u7D30\u30E1\u30C8\u30EA\u30AF\u30B9" }), _jsx(Grid, { container: true, spacing: 2, children: metrics.map((metric) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, lg: 2.4, children: _jsx(Card, { variant: "outlined", sx: { height: '100%' }, children: _jsxs(CardContent, { sx: { p: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 1 }, children: [_jsx(Avatar, { sx: {
                                                                            bgcolor: alpha(getStatusColor(metric.status), 0.1),
                                                                            color: getStatusColor(metric.status),
                                                                            width: 32,
                                                                            height: 32,
                                                                        }, children: metric.icon }), _jsx(Box, { sx: { flex: 1, minWidth: 0 }, children: _jsx(Typography, { variant: "body2", noWrap: true, children: metric.name }) })] }), _jsxs(Typography, { variant: "h6", sx: { fontWeight: 700, mb: 1 }, children: [metric.value, metric.unit] }), _jsx(LinearProgress, { variant: "determinate", value: metric.value, sx: {
                                                                    height: 6,
                                                                    borderRadius: 3,
                                                                    bgcolor: 'grey.200',
                                                                    '& .MuiLinearProgress-bar': {
                                                                        bgcolor: getStatusColor(metric.status),
                                                                        borderRadius: 3,
                                                                    },
                                                                } }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }, children: [_jsx(Chip, { label: metric.status, size: "small", sx: {
                                                                            bgcolor: alpha(getStatusColor(metric.status), 0.1),
                                                                            color: getStatusColor(metric.status),
                                                                            fontSize: '0.75rem',
                                                                            height: 20,
                                                                        } }), _jsxs(Typography, { variant: "caption", sx: {
                                                                            color: metric.trend > 0 ? 'error.main' : 'success.main',
                                                                            fontWeight: 600,
                                                                        }, children: [metric.trend > 0 ? '+' : '', metric.trend.toFixed(1), "%"] })] })] }) }) }, metric.id))) })] }), _jsx(Grid, { item: true, xs: 12, children: _jsx(CustomLineChart, { title: "\u30B7\u30B9\u30C6\u30E0\u30D8\u30EB\u30B9\u30C8\u30EC\u30F3\u30C9 (\u904E\u53BB1\u6642\u9593)", data: healthTrendData, lines: [
                                            { dataKey: 'cpu', name: 'CPU', color: theme.palette.primary.main },
                                            { dataKey: 'memory', name: 'メモリ', color: theme.palette.secondary.main },
                                            { dataKey: 'disk', name: 'ディスク', color: theme.palette.info.main },
                                            { dataKey: 'network', name: 'ネットワーク', color: theme.palette.success.main },
                                            { dataKey: 'security', name: 'セキュリティ', color: theme.palette.warning.main },
                                        ], xAxisKey: "time", height: 250, smooth: true, dots: false, yAxisDomain: [0, 100], onDataPointClick: (data) => console.log('ヘルストレンドクリック:', data), onRefresh: handleRefresh }) })] }))] }) })] }));
};
export default SystemHealthChart;
