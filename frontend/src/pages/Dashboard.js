import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Chip, LinearProgress, useTheme, Tabs, Tab, Button, useMediaQuery, Stack, Alert, Skeleton, Badge, Tooltip, FormControl, InputLabel, Select, MenuItem, Fab, alpha, CircularProgress, } from '@mui/material';
import { ConfirmationNumber as TicketIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon, Schedule as ScheduleIcon, TrendingUp as TrendingUpIcon, Refresh as RefreshIcon, Analytics as AnalyticsIcon, Dashboard as DashboardIcon, Add as AddIcon, Speed as SpeedIcon, MonitorHeart as MonitorIcon, AutoFixHigh as AutoFixIcon, BugReport as BugIcon, } from '@mui/icons-material';
import { priorityColors, statusColors } from '../theme/theme';
import ContentArea from '../components/layout/ContentArea';
import { CustomLineChart, CustomBarChart, CustomDonutChart, CustomGaugeChart, CustomAreaChart } from '../components/common/CustomCharts';
import DataTable from '../components/common/DataTable';
const Dashboard = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [currentTab, setCurrentTab] = useState(0);
    const [timeRange, setTimeRange] = useState('week');
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    // Mock data - 実際の実装ではAPIから取得
    const mockMetrics = {
        totalTickets: 1247,
        openTickets: 89,
        resolvedTickets: 1095,
        overdueTickets: 12,
        avgResolutionTime: 4.2,
        slaComplianceRate: 94.5,
        ticketsByPriority: {
            critical: 5,
            high: 23,
            medium: 45,
            low: 16,
        },
        ticketsByStatus: {
            open: 35,
            in_progress: 54,
            resolved: 12,
            closed: 3,
            on_hold: 8,
        },
        recentTickets: [
            {
                id: 'INC-001',
                title: 'サーバー応答速度低下',
                status: 'open',
                priority: 'critical',
                category: 'Infrastructure',
                reporterId: '1',
                reporterName: '田中一郎',
                createdAt: '2025-08-01T10:30:00Z',
                updatedAt: '2025-08-01T11:00:00Z',
                description: 'Webサーバーの応答速度が著しく低下しています',
                slaDeadline: '2025-08-01T12:30:00Z',
            },
            {
                id: 'INC-002',
                title: 'メール送信エラー',
                status: 'in_progress',
                priority: 'high',
                category: 'Email',
                reporterId: '2',
                reporterName: '佐藤花子',
                assigneeId: '3',
                assigneeName: '山田太郎',
                createdAt: '2025-08-01T09:15:00Z',
                updatedAt: '2025-08-01T10:45:00Z',
                description: 'メール送信時にSMTPエラーが発生',
            },
            {
                id: 'INC-003',
                title: 'プリンター接続不良',
                status: 'resolved',
                priority: 'medium',
                category: 'Hardware',
                reporterId: '4',
                reporterName: '鈴木次郎',
                assigneeId: '5',
                assigneeName: '高橋三郎',
                createdAt: '2025-08-01T08:00:00Z',
                updatedAt: '2025-08-01T10:30:00Z',
                description: 'オフィスプリンターに接続できない',
            },
            {
                id: 'INC-004',
                title: 'VPNアクセス不能',
                status: 'open',
                priority: 'high',
                category: 'Network',
                reporterId: '6',
                reporterName: '高田四郎',
                createdAt: '2025-08-01T07:45:00Z',
                updatedAt: '2025-08-01T10:15:00Z',
                description: '社外からVPNに接続できない',
                slaDeadline: '2025-08-01T15:45:00Z',
            },
            {
                id: 'INC-005',
                title: 'ファイルサーバーエラー',
                status: 'on_hold',
                priority: 'medium',
                category: 'Storage',
                reporterId: '7',
                reporterName: '清水五郎',
                assigneeId: '8',
                assigneeName: '森田六郎',
                createdAt: '2025-08-01T06:30:00Z',
                updatedAt: '2025-08-01T09:00:00Z',
                description: 'ファイルサーバーにアクセスできない',
            },
        ],
    };
    // システム全体のメトリクス
    const systemMetrics = {
        cpuUsage: 72,
        memoryUsage: 84,
        diskUsage: 65,
        networkUsage: 45,
        activeServices: 187,
        totalServices: 203,
        systemHealth: 'good',
        securityAlerts: 3,
    };
    // CI/CD自動修復システムのメトリクス
    const cicdMetrics = {
        totalLoops: 149,
        totalErrors: 447,
        fixSuccessRate: 100.0,
        activeRepairs: 0,
        lastScan: '2025-08-02T15:59:42',
        systemHealth: 'warning',
        uptime: '99.2%',
        averageLoopTime: 95,
    };
    const ticketTrendData = [
        { date: '7/25', tickets: 15, resolved: 12, pending: 8, critical: 2 },
        { date: '7/26', tickets: 22, resolved: 18, pending: 12, critical: 1 },
        { date: '7/27', tickets: 18, resolved: 20, pending: 9, critical: 3 },
        { date: '7/28', tickets: 25, resolved: 16, pending: 15, critical: 4 },
        { date: '7/29', tickets: 19, resolved: 23, pending: 11, critical: 2 },
        { date: '7/30', tickets: 28, resolved: 21, pending: 18, critical: 5 },
        { date: '7/31', tickets: 23, resolved: 25, pending: 14, critical: 3 },
    ];
    // SLAデータ
    const slaData = [
        { name: 'インシデント対応', target: 95, actual: 94.5, status: 'warning' },
        { name: 'サービス可用性', target: 99.9, actual: 99.2, status: 'good' },
        { name: '変更成功率', target: 98, actual: 96.8, status: 'warning' },
        { name: '問題解決率', target: 90, actual: 92.1, status: 'good' },
    ];
    // システムパフォーマンスデータ
    const performanceData = [
        { time: '00:00', cpu: 45, memory: 62, network: 23, disk: 34 },
        { time: '04:00', cpu: 38, memory: 58, network: 18, disk: 31 },
        { time: '08:00', cpu: 72, memory: 84, network: 45, disk: 56 },
        { time: '12:00', cpu: 89, memory: 91, network: 67, disk: 72 },
        { time: '16:00', cpu: 76, memory: 88, network: 54, disk: 68 },
        { time: '20:00', cpu: 65, memory: 75, network: 42, disk: 58 },
    ];
    const priorityData = [
        { name: '致命的', value: mockMetrics.ticketsByPriority.critical, color: priorityColors.critical },
        { name: '高', value: mockMetrics.ticketsByPriority.high, color: priorityColors.high },
        { name: '中', value: mockMetrics.ticketsByPriority.medium, color: priorityColors.medium },
        { name: '低', value: mockMetrics.ticketsByPriority.low, color: priorityColors.low },
    ];
    const statusData = [
        { name: '未対応', value: mockMetrics.ticketsByStatus.open, color: statusColors.open },
        { name: '対応中', value: mockMetrics.ticketsByStatus.in_progress, color: statusColors.in_progress },
        { name: '解決済み', value: mockMetrics.ticketsByStatus.resolved, color: statusColors.resolved },
        { name: '完了', value: mockMetrics.ticketsByStatus.closed, color: statusColors.closed },
        { name: '保留中', value: mockMetrics.ticketsByStatus.on_hold, color: statusColors.on_hold },
    ];
    // テーブルの列定義
    const ticketColumns = [
        {
            id: 'id',
            label: 'ID',
            minWidth: 100,
            render: (value) => (_jsx(Typography, { variant: "body2", color: "primary", sx: { fontWeight: 600 }, children: value })),
        },
        {
            id: 'title',
            label: 'タイトル',
            minWidth: 200,
            searchable: true,
        },
        {
            id: 'priority',
            label: '優先度',
            minWidth: 100,
            render: (value) => (_jsx(Chip, { label: value.toUpperCase(), size: "small", sx: {
                    bgcolor: `${priorityColors[value]}20`,
                    color: priorityColors[value],
                    fontWeight: 600,
                } })),
            filterType: 'select',
            filterOptions: [
                { value: 'critical', label: '致命的' },
                { value: 'high', label: '高' },
                { value: 'medium', label: '中' },
                { value: 'low', label: '低' },
            ],
        },
        {
            id: 'status',
            label: 'ステータス',
            minWidth: 120,
            render: (value) => {
                const statusLabels = {
                    open: '未対応',
                    in_progress: '対応中',
                    resolved: '解決済み',
                    closed: '完了',
                    on_hold: '保留中',
                };
                return (_jsx(Chip, { label: statusLabels[value], size: "small", sx: {
                        bgcolor: `${statusColors[value]}20`,
                        color: statusColors[value],
                        fontWeight: 500,
                    } }));
            },
        },
        {
            id: 'reporterName',
            label: '報告者',
            minWidth: 120,
            searchable: true,
        },
        {
            id: 'createdAt',
            label: '作成日時',
            minWidth: 150,
            render: (value) => new Date(value).toLocaleString('ja-JP'),
        },
    ];
    // 新しいメトリックカードコンポーネント
    const EnhancedMetricCard = ({ title, value, icon, color, trend, subtitle, action, loading = false }) => (_jsx(Card, { sx: {
            height: '100%',
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[8],
            },
        }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Avatar, { sx: {
                                        bgcolor: alpha(color, 0.1),
                                        color,
                                        width: 48,
                                        height: 48,
                                    }, children: icon }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: title }), subtitle && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: subtitle }))] })] }), action] }), loading ? (_jsx(Skeleton, { variant: "text", height: 40 })) : (_jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color, mb: 1 }, children: value })), trend && !loading && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(TrendingUpIcon, { sx: {
                                fontSize: 16,
                                color: trend.direction === 'up' ? 'success.main' :
                                    trend.direction === 'down' ? 'error.main' : 'text.secondary',
                                transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none',
                            } }), _jsxs(Typography, { variant: "caption", sx: {
                                color: trend.direction === 'up' ? 'success.main' :
                                    trend.direction === 'down' ? 'error.main' : 'text.secondary',
                                fontWeight: 600,
                            }, children: [trend.value > 0 ? '+' : '', trend.value, "% ", trend.label] })] }))] }) }));
    // データ更新処理
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // APIコールのシミュレーション
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLastUpdate(new Date());
            if (window.notifications) {
                window.notifications.success('データを更新しました');
            }
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
    // チケットクリックハンドラ
    const handleTicketClick = useCallback((ticket) => {
        // チケット詳細ページにナビゲート
        console.log('チケットをクリック:', ticket);
    }, []);
    // チャートデータポイントクリックハンドラ
    const handleChartClick = useCallback((data) => {
        console.log('チャートデータポイントをクリック:', data);
    }, []);
    const pageActions = (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u671F\u9593" }), _jsxs(Select, { value: timeRange, onChange: (e) => setTimeRange(e.target.value), label: "\u671F\u9593", children: [_jsx(MenuItem, { value: "today", children: "\u4ECA\u65E5" }), _jsx(MenuItem, { value: "week", children: "\u4ECA\u9031" }), _jsx(MenuItem, { value: "month", children: "\u4ECA\u6708" }), _jsx(MenuItem, { value: "quarter", children: "\u56DB\u534A\u671F" })] })] }), _jsx(Tooltip, { title: autoRefresh ? '自動更新を無効化' : '自動更新を有効化', children: _jsx(IconButton, { onClick: () => setAutoRefresh(!autoRefresh), color: autoRefresh ? 'primary' : 'default', children: _jsx(Badge, { badgeContent: autoRefresh ? '自動' : null, color: "primary", children: _jsx(RefreshIcon, {}) }) }) }), _jsx(Button, { variant: "outlined", startIcon: refreshing ? _jsx(CircularProgress, { size: 16 }) : _jsx(RefreshIcon, {}), onClick: handleRefresh, disabled: refreshing, size: isMobile ? 'small' : 'medium', children: refreshing ? '更新中...' : '更新' }), _jsx(Button, { variant: "contained", startIcon: _jsx(AnalyticsIcon, {}), onClick: () => setCurrentTab(1), size: isMobile ? 'small' : 'medium', children: "\u8A73\u7D30\u5206\u6790" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(AutoFixIcon, {}), onClick: () => console.log('CI/CDダッシュボードへ'), size: isMobile ? 'small' : 'medium', color: "success", children: "CI/CD\u76E3\u8996" })] }));
    return (_jsxs(ContentArea, { pageTitle: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9", pageDescription: "ITSM\u30B7\u30B9\u30C6\u30E0\u306E\u5168\u4F53\u7684\u306A\u72B6\u6CC1\u3068\u4E3B\u8981\u30E1\u30C8\u30EA\u30AF\u30B9", actions: pageActions, showBreadcrumbs: false, children: [_jsxs(Box, { sx: { mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u6700\u7D42\u66F4\u65B0: ", lastUpdate.toLocaleString('ja-JP')] }), autoRefresh && (_jsx(Chip, { label: "\u81EA\u52D5\u66F4\u65B0\u4E2D", size: "small", color: "primary", variant: "outlined", icon: _jsx(RefreshIcon, {}) }))] }), _jsx(Box, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: currentTab, onChange: (_, newValue) => setCurrentTab(newValue), sx: { borderBottom: 1, borderColor: 'divider' }, variant: isMobile ? 'fullWidth' : 'standard', children: [_jsx(Tab, { icon: _jsx(DashboardIcon, {}), label: "\u6982\u8981\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(AnalyticsIcon, {}), label: "\u8A73\u7D30\u5206\u6790", iconPosition: "start" })] }) }), currentTab === 0 ? (_jsxs(Box, { children: [systemMetrics.securityAlerts > 0 && (_jsxs(Alert, { severity: "warning", sx: { mb: 3 }, action: _jsx(Button, { color: "inherit", size: "small", children: "\u8A73\u7D30" }), children: [systemMetrics.securityAlerts, "\u4EF6\u306E\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u30A2\u30E9\u30FC\u30C8\u304C\u691C\u51FA\u3055\u308C\u307E\u3057\u305F"] })), cicdMetrics.systemHealth === 'warning' && (_jsxs(Alert, { severity: "info", sx: { mb: 3 }, action: _jsx(Button, { color: "inherit", size: "small", children: "CI/CD\u76E3\u8996\u3078" }), children: ["CI/CD\u81EA\u52D5\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0\u304C\u7A3C\u50CD\u4E2D\u3067\u3059 - \u30EB\u30FC\u30D7\u56DE\u6570: ", cicdMetrics.totalLoops, "\u3001\u4FEE\u5FA9\u6210\u529F\u7387: ", cicdMetrics.fixSuccessRate, "%"] })), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u7DCF\u30C1\u30B1\u30C3\u30C8\u6570", value: mockMetrics.totalTickets.toLocaleString(), icon: _jsx(TicketIcon, {}), color: theme.palette.primary.main, trend: { value: 5.2, label: "先月比", direction: "up" }, loading: refreshing, action: _jsx(Tooltip, { title: "\u30C1\u30B1\u30C3\u30C8\u4F5C\u6210", children: _jsx(IconButton, { size: "small", color: "primary", children: _jsx(AddIcon, {}) }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u672A\u5BFE\u5FDC\u30C1\u30B1\u30C3\u30C8", value: mockMetrics.openTickets, icon: _jsx(WarningIcon, {}), color: theme.palette.warning.main, subtitle: "\u7DCA\u6025\u5BFE\u5FDC\u304C\u5FC5\u8981", trend: { value: -2.1, label: "昨日比", direction: "down" }, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u89E3\u6C7A\u6E08\u307F\u30C1\u30B1\u30C3\u30C8", value: mockMetrics.resolvedTickets.toLocaleString(), icon: _jsx(CheckCircleIcon, {}), color: theme.palette.success.main, trend: { value: 12.8, label: "今週", direction: "up" }, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u671F\u9650\u8D85\u904E", value: mockMetrics.overdueTickets, icon: _jsx(ScheduleIcon, {}), color: theme.palette.error.main, subtitle: "SLA\u9055\u53CD\u30EA\u30B9\u30AF", trend: { value: 0, label: "変化なし", direction: "neutral" }, loading: refreshing }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(Typography, { variant: "h6", gutterBottom: true, sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(AutoFixIcon, { color: "primary" }), "CI/CD\u81EA\u52D5\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0"] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u4FEE\u5FA9\u30EB\u30FC\u30D7\u56DE\u6570", value: cicdMetrics.totalLoops, icon: _jsx(AutoFixIcon, {}), color: theme.palette.info.main, subtitle: "\u7D99\u7D9A\u5B9F\u884C\u4E2D", trend: { value: 2.1, label: "今日", direction: "up" }, loading: refreshing, action: _jsx(Tooltip, { title: "\u8A73\u7D30\u76E3\u8996", children: _jsx(IconButton, { size: "small", color: "primary", children: _jsx(MonitorIcon, {}) }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u691C\u51FA\u30A8\u30E9\u30FC\u6570", value: cicdMetrics.totalErrors, icon: _jsx(BugIcon, {}), color: theme.palette.warning.main, subtitle: "\u7DCF\u7D2F\u7A4D\u6570", trend: { value: 0.8, label: "1時間", direction: "up" }, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u4FEE\u5FA9\u6210\u529F\u7387", value: `${cicdMetrics.fixSuccessRate}%`, icon: _jsx(CheckCircleIcon, {}), color: theme.palette.success.main, subtitle: "\u81EA\u52D5\u4FEE\u5FA9\u7CBE\u5EA6", trend: { value: 0, label: "安定", direction: "neutral" }, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(EnhancedMetricCard, { title: "\u30B7\u30B9\u30C6\u30E0\u7A3C\u50CD\u7387", value: cicdMetrics.uptime, icon: _jsx(SpeedIcon, {}), color: theme.palette.primary.main, subtitle: "24\u6642\u9593\u7A3C\u50CD", trend: { value: 0.1, label: "昨日比", direction: "up" }, loading: refreshing }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, md: 3, children: _jsx(CustomGaugeChart, { title: "CPU\u4F7F\u7528\u7387", value: systemMetrics.cpuUsage, unit: "%", height: 200, thresholds: [
                                        { value: 80, color: theme.palette.error.main, label: '危険' },
                                        { value: 60, color: theme.palette.warning.main, label: '警告' },
                                        { value: 0, color: theme.palette.success.main, label: '正常' },
                                    ], onRefresh: handleRefresh }) }), _jsx(Grid, { item: true, xs: 12, md: 3, children: _jsx(CustomGaugeChart, { title: "\u30E1\u30E2\u30EA\u4F7F\u7528\u7387", value: systemMetrics.memoryUsage, unit: "%", height: 200, thresholds: [
                                        { value: 85, color: theme.palette.error.main, label: '危険' },
                                        { value: 70, color: theme.palette.warning.main, label: '警告' },
                                        { value: 0, color: theme.palette.success.main, label: '正常' },
                                    ], onRefresh: handleRefresh }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { sx: { height: '100%' }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "SLA\u9075\u5B88\u72B6\u6CC1" }), _jsx(Box, { sx: { mt: 2 }, children: slaData.map((sla, index) => (_jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "body2", children: sla.name }), _jsxs(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: [sla.actual, "% / ", sla.target, "%"] })] }), _jsx(LinearProgress, { variant: "determinate", value: (sla.actual / sla.target) * 100, sx: {
                                                                height: 8,
                                                                borderRadius: 4,
                                                                bgcolor: 'grey.200',
                                                                '& .MuiLinearProgress-bar': {
                                                                    bgcolor: sla.status === 'good' ? 'success.main' : 'warning.main',
                                                                    borderRadius: 4,
                                                                },
                                                            } })] }, index))) })] }) }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(CustomDonutChart, { title: "\u512A\u5148\u5EA6\u5225\u30C1\u30B1\u30C3\u30C8\u5206\u5E03", data: priorityData, dataKey: "value", nameKey: "name", height: 300, centerLabel: "\u7DCF\u30C1\u30B1\u30C3\u30C8\u6570", centerValue: Object.values(mockMetrics.ticketsByPriority).reduce((a, b) => a + b, 0), onDataPointClick: handleChartClick, onRefresh: handleRefresh }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(CustomBarChart, { title: "\u30B9\u30C6\u30FC\u30BF\u30B9\u5225\u30C1\u30B1\u30C3\u30C8\u5206\u5E03", data: statusData, bars: [{ dataKey: 'value', name: 'チケット数', color: theme.palette.primary.main }], xAxisKey: "name", height: 300, onDataPointClick: handleChartClick, onRefresh: handleRefresh }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(CustomAreaChart, { title: "\u30C1\u30B1\u30C3\u30C8\u63A8\u79FB (\u904E\u53BB7\u65E5)", data: ticketTrendData, areas: [
                                        { dataKey: 'tickets', name: '新規', color: theme.palette.primary.main },
                                        { dataKey: 'resolved', name: '解決', color: theme.palette.success.main },
                                        { dataKey: 'critical', name: '緊急', color: theme.palette.error.main },
                                    ], xAxisKey: "date", height: 300, stacked: false, onDataPointClick: handleChartClick, onRefresh: handleRefresh }) })] }), _jsx(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: _jsx(Grid, { item: true, xs: 12, children: _jsx(CustomLineChart, { title: "\u30B7\u30B9\u30C6\u30E0\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u63A8\u79FB (24\u6642\u9593)", subtitle: "CPU\u3001\u30E1\u30E2\u30EA\u3001\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3001\u30C7\u30A3\u30B9\u30AF\u306E\u4F7F\u7528\u7387", data: performanceData, lines: [
                                    { dataKey: 'cpu', name: 'CPU', color: theme.palette.primary.main },
                                    { dataKey: 'memory', name: 'メモリ', color: theme.palette.secondary.main },
                                    { dataKey: 'network', name: 'ネットワーク', color: theme.palette.success.main },
                                    { dataKey: 'disk', name: 'ディスク', color: theme.palette.warning.main },
                                ], xAxisKey: "time", height: 350, smooth: true, dots: false, yAxisDomain: [0, 100], onDataPointClick: handleChartClick, onRefresh: handleRefresh }) }) }), _jsx(DataTable, { title: "\u6700\u8FD1\u306E\u30C1\u30B1\u30C3\u30C8", subtitle: "\u904E\u53BB24\u6642\u9593\u306B\u4F5C\u6210\u30FB\u66F4\u65B0\u3055\u308C\u305F\u30C1\u30B1\u30C3\u30C8", data: mockMetrics.recentTickets, columns: ticketColumns, loading: refreshing, searchable: true, filterable: true, exportable: true, selectable: false, dense: false, initialPageSize: 10, onRowClick: handleTicketClick, onRefresh: handleRefresh, emptyStateMessage: "\u30C1\u30B1\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093", actions: _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), size: "small", onClick: () => console.log('新規チケット作成'), children: "\u65B0\u898F\u4F5C\u6210" }) })] })) : (_jsxs(Box, { children: [_jsxs(Typography, { variant: "h5", gutterBottom: true, children: ["\u8A73\u7D30\u5206\u6790 (", timeRange, ")"] }), _jsx(Typography, { variant: "body1", color: "text.secondary", gutterBottom: true, children: "\u9AD8\u5EA6\u306A\u5206\u6790\u6A5F\u80FD\u3068\u30EC\u30DD\u30FC\u30C8\u6A5F\u80FD\u306F\u3053\u3053\u306B\u5B9F\u88C5\u3055\u308C\u307E\u3059\u3002" }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30C8\u30EC\u30F3\u30C9\u5206\u6790" }), _jsx(Typography, { variant: "body2", children: "\u9577\u671F\u7684\u306A\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u30C8\u30EC\u30F3\u30C9\u3092\u5206\u6790\u3057\u307E\u3059\u3002" })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u4E88\u6E2C\u5206\u6790" }), _jsx(Typography, { variant: "body2", children: "\u5C06\u6765\u306E\u30EF\u30FC\u30AF\u30ED\u30FC\u30C9\u3068\u8AB2\u984C\u3092\u4E88\u6E2C\u3057\u307E\u3059\u3002" })] }) }) })] })] })), _jsx(Fab, { color: "primary", "aria-label": "\u65B0\u898F\u30C1\u30B1\u30C3\u30C8\u4F5C\u6210", sx: {
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    zIndex: 1000,
                }, onClick: () => console.log('新規チケット作成'), children: _jsx(AddIcon, {}) })] }));
};
export default Dashboard;
