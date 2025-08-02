import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Chip, LinearProgress, Button, Stack, Skeleton, Tooltip as MuiTooltip, FormControl, InputLabel, Select, MenuItem, CircularProgress as MuiCircularProgress, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { Target as TargetIcon, Timeline as TimelineIcon, Warning as WarningIcon, Schedule as ScheduleIcon, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Assessment as AssessmentIcon, Notifications as NotificationsIcon, Error as ErrorIcon, Group as GroupIcon, Assignment as AssignmentIcon, Speed as SpeedIcon, Security as SecurityIcon, Build as BuildIcon, Refresh as RefreshIcon, Settings as SettingsIcon, FilterList as FilterIcon, Download as DownloadIcon, Share as ShareIcon, Analytics as AnalyticsIcon, Dashboard as DashboardIcon, Computer as ComputerIcon, NetworkCheck as NetworkIcon, Apps as AppsIcon, Hardware as HardwareIcon } from '@mui/icons-material';
import { gradients } from '../../theme/theme';
// CircularProgress component placeholder
const CircularProgress = () => _jsx("div", { children: "Chart placeholder" });
// HeatmapChart component placeholder  
const HeatmapChart = () => _jsx("div", { children: "Heatmap placeholder" });
const SLAMonitoring = React.memo(() => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [alertThreshold, setAlertThreshold] = useState(2); // 2時間前にアラート
    // ダミーデータ生成
    const generateMockData = () => {
        const riskTickets = [
            {
                id: 'INC-001',
                title: 'メールサーバー障害対応',
                priority: 'critical',
                status: 'in_progress',
                assignee: '田中 太郎',
                created: '2025-08-01T08:30:00Z',
                slaDeadline: '2025-08-01T12:30:00Z',
                category: 'Infrastructure'
            },
            {
                id: 'INC-002',
                title: 'ネットワーク接続問題',
                priority: 'high',
                status: 'open',
                assignee: '佐藤 花子',
                created: '2025-08-01T09:15:00Z',
                slaDeadline: '2025-08-01T17:15:00Z',
                category: 'Network'
            },
            {
                id: 'INC-003',
                title: 'アプリケーション性能低下',
                priority: 'high',
                status: 'in_progress',
                assignee: '鈴木 次郎',
                created: '2025-08-01T10:00:00Z',
                slaDeadline: '2025-08-01T18:00:00Z',
                category: 'Application'
            },
            {
                id: 'INC-004',
                title: 'プリンター接続不具合',
                priority: 'medium',
                status: 'open',
                assignee: '高橋 美咲',
                created: '2025-08-01T11:30:00Z',
                slaDeadline: '2025-08-02T11:30:00Z',
                category: 'Hardware'
            }
        ];
        const categoryAnalysis = [
            { category: 'Infrastructure', complianceRate: 95.2, avgResponseTime: 1.8, violationCount: 3, trend: 'up' },
            { category: 'Network', complianceRate: 88.7, avgResponseTime: 2.4, violationCount: 8, trend: 'down' },
            { category: 'Application', complianceRate: 91.5, avgResponseTime: 2.1, violationCount: 5, trend: 'stable' },
            { category: 'Hardware', complianceRate: 96.8, avgResponseTime: 1.5, violationCount: 2, trend: 'up' },
            { category: 'Security', complianceRate: 93.3, avgResponseTime: 1.9, violationCount: 4, trend: 'stable' }
        ];
        const escalationHistory = [
            {
                id: 'ESC-001',
                ticketId: 'INC-005',
                timestamp: '2025-08-01T08:00:00Z',
                from: 'Level 1 Support',
                to: 'Level 2 Support',
                reason: 'SLA期限接近',
                status: 'completed'
            },
            {
                id: 'ESC-002',
                ticketId: 'INC-006',
                timestamp: '2025-08-01T09:30:00Z',
                from: 'Level 2 Support',
                to: 'Senior Engineer',
                reason: '技術的複雑性',
                status: 'completed'
            },
            {
                id: 'ESC-003',
                ticketId: 'INC-007',
                timestamp: '2025-08-01T10:15:00Z',
                from: 'Level 1 Support',
                to: 'Level 2 Support',
                reason: 'SLA違反',
                status: 'pending'
            }
        ];
        return {
            complianceRate: 92.4,
            violationCount: 22,
            riskTickets,
            categoryAnalysis,
            escalationHistory,
            priorityBreakdown: {
                critical: { total: 45, onTime: 41, violated: 4 },
                high: { total: 120, onTime: 108, violated: 12 },
                medium: { total: 230, onTime: 224, violated: 6 },
                low: { total: 180, onTime: 180, violated: 0 }
            }
        };
    };
    useEffect(() => {
        const fetchData = () => {
            setLoading(true);
            setTimeout(() => {
                setData(generateMockData());
                setLoading(false);
            }, 1000);
        };
        fetchData();
        const interval = setInterval(fetchData, 300000); // 5分ごとに更新
        return () => clearInterval(interval);
    }, [selectedPriority]);
    // SLAヒートマップデータをuseMemoで計算
    const slaHeatmapData = useMemo(() => {
        const weeks = ['第1週', '第2週', '第3週', '第4週', '第5週'];
        const days = ['月', '火', '水', '木', '金', '土', '日'];
        const heatmapDataArray = [];
        weeks.forEach((week, weekIndex) => {
            days.forEach((day, dayIndex) => {
                // 週末は低めの値、平日は高めの値
                const baseValue = ['土', '日'].includes(day) ? 70 : 90;
                const randomVariation = (Math.random() - 0.5) * 20;
                const value = Math.max(60, Math.min(100, Math.round(baseValue + randomVariation)));
                heatmapDataArray.push({
                    x: day,
                    y: week,
                    value: value,
                    label: `${week} ${day}曜日 - SLA遵守率: ${value}%`
                });
            });
        });
        return heatmapDataArray;
    }, []);
    // Removed unused constants - using theme colors instead
    const getPriorityLabel = (priority) => {
        const labels = {
            critical: '緊急',
            high: '高',
            medium: '中',
            low: '低'
        };
        return labels[priority] || priority;
    };
    const getTimeRemaining = (deadline) => {
        const now = new Date();
        const slaTime = new Date(deadline);
        const diff = slaTime.getTime() - now.getTime();
        if (diff <= 0)
            return { text: '期限超過', color: 'text-red-600', urgent: true };
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours < alertThreshold) {
            return { text: `${hours}時間${minutes}分`, color: 'text-red-600', urgent: true };
        }
        else if (hours < 8) {
            return { text: `${hours}時間${minutes}分`, color: 'text-yellow-600', urgent: false };
        }
        else {
            return { text: `${hours}時間${minutes}分`, color: 'text-green-600', urgent: false };
        }
    };
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return _jsx(TrendingUpIcon, { sx: { fontSize: 16, color: 'success.main' } });
            case 'down': return _jsx(TrendingDownIcon, { sx: { fontSize: 16, color: 'error.main' } });
            default: return _jsx(TimelineIcon, { sx: { fontSize: 16, color: 'text.secondary' } });
        }
    };
    // Icon-rich metric card component
    const IconRichMetricCard = ({ title, value, icon, subtitle, trend, status = 'good', gradient }) => {
        const statusColors = {
            good: { primary: '#10B981', secondary: '#059669' },
            warning: { primary: '#F59E0B', secondary: '#D97706' },
            critical: { primary: '#EF4444', secondary: '#DC2626' }
        };
        const colors = statusColors[status];
        const bgGradient = gradient || `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}08 100%)`;
        return (_jsx(Card, { sx: {
                height: '100%',
                background: bgGradient,
                border: `1px solid ${colors.primary}30`,
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 25px ${colors.primary}25`,
                    border: `1px solid ${colors.primary}50`
                }
            }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 2 }, children: [_jsx(Avatar, { sx: {
                                    bgcolor: colors.primary,
                                    width: 56,
                                    height: 56,
                                    boxShadow: `0 4px 12px ${colors.primary}40`
                                }, children: icon }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: colors.primary, mb: 0.5 }, children: title }), subtitle && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: subtitle }))] })] }), _jsx(Typography, { variant: "h3", sx: {
                            fontWeight: 800,
                            color: colors.primary,
                            mb: 1,
                            textShadow: `0 2px 4px ${colors.primary}20`
                        }, children: value }), trend && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [getTrendIcon(trend.direction), _jsxs(Typography, { variant: "body2", sx: {
                                    fontWeight: 600,
                                    color: trend.direction === 'up' ? 'success.main' :
                                        trend.direction === 'down' ? 'error.main' : 'text.secondary'
                                }, children: [trend.percentage > 0 ? '+' : '', trend.percentage, "% ", trend.period] })] }))] }) }));
    };
    // Rich chart card component
    const RichChartCard = ({ title, subtitle, icon, children, className, actions }) => (_jsx(Card, { sx: {
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.8) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 6
            }
        }, className: className, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [icon && (_jsx(Avatar, { sx: { bgcolor: 'primary.main', width: 40, height: 40 }, children: icon })), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700 }, children: title }), subtitle && (_jsx(Typography, { variant: "body2", color: "text.secondary", children: subtitle }))] })] }), actions] }), children] }) }));
    if (loading || !data) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Grid, { container: true, spacing: 3, children: Array.from({ length: 8 }).map((_, i) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Skeleton, { variant: "circular", width: 56, height: 56, sx: { mb: 2 } }), _jsx(Skeleton, { variant: "text", height: 24, sx: { mb: 1 } }), _jsx(Skeleton, { variant: "text", height: 40, sx: { mb: 1 } }), _jsx(Skeleton, { variant: "text", width: "60%" })] }) }) }, i))) }) }));
    }
    // 優先度別データの計算
    const priorityData = Object.entries(data.priorityBreakdown).map(([priority, stats]) => ({
        priority: getPriorityLabel(priority),
        total: stats.total,
        onTime: stats.onTime,
        violated: stats.violated,
        complianceRate: ((stats.onTime / stats.total) * 100).toFixed(1)
    }));
    const PRIORITY_COLORS = {
        critical: '#dc2626',
        high: '#f59e0b',
        medium: '#3b82f6',
        low: '#10b981'
    };
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsx(Box, { sx: {
                    mb: 4,
                    p: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }, children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", justifyContent: "space-between", children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 1 }, children: [_jsx(Avatar, { sx: { bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }, children: _jsx(TargetIcon, { sx: { fontSize: 28 } }) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 800, mb: 0.5 }, children: "SLA\u76E3\u8996\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }), _jsx(Typography, { variant: "body1", sx: { opacity: 0.9 }, children: "\u30B5\u30FC\u30D3\u30B9\u30EC\u30D9\u30EB\u76EE\u6A19\u306E\u9075\u5B88\u72B6\u6CC1\u3068\u30EA\u30B9\u30AF\u5206\u6790" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Stack, { direction: "row", spacing: 2, justifyContent: "flex-end", flexWrap: "wrap", children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { sx: { color: 'white' }, children: "\u512A\u5148\u5EA6" }), _jsxs(Select, { value: selectedPriority, onChange: (e) => setSelectedPriority(e.target.value), label: "\u512A\u5148\u5EA6", sx: {
                                                    color: 'white',
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                                    '& .MuiSvgIcon-root': { color: 'white' }
                                                }, children: [_jsx(MenuItem, { value: "all", children: "\u5168\u512A\u5148\u5EA6" }), _jsx(MenuItem, { value: "critical", children: "\u7DCA\u6025" }), _jsx(MenuItem, { value: "high", children: "\u9AD8" }), _jsx(MenuItem, { value: "medium", children: "\u4E2D" }), _jsx(MenuItem, { value: "low", children: "\u4F4E" })] })] }), _jsx(Button, { variant: "outlined", startIcon: _jsx(SettingsIcon, {}), sx: {
                                            color: 'white',
                                            borderColor: 'rgba(255,255,255,0.3)',
                                            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                                        }, children: "\u8A2D\u5B9A" }), _jsx(Button, { variant: "contained", startIcon: _jsx(RefreshIcon, {}), sx: {
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                                        }, children: "\u66F4\u65B0" })] }) })] }) }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "SLA\u9075\u5B88\u7387", value: `${data.complianceRate}%`, icon: _jsx(TargetIcon, {}), subtitle: "\u5168\u4F53\u7684\u306A\u9075\u5B88\u72B6\u6CC1", trend: { direction: 'up', percentage: 2.1, period: '前月比' }, status: data.complianceRate >= 95 ? 'good' : data.complianceRate >= 90 ? 'warning' : 'critical', gradient: gradients.primary }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "SLA\u9055\u53CD\u4EF6\u6570", value: `${data.violationCount}件`, icon: _jsx(WarningIcon, {}), subtitle: "\u671F\u9650\u8D85\u904E\u30C1\u30B1\u30C3\u30C8", trend: { direction: 'down', percentage: 15.3, period: '前月比' }, status: data.violationCount <= 20 ? 'good' : data.violationCount <= 40 ? 'warning' : 'critical', gradient: gradients.warning }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u30EA\u30B9\u30AF\u30C1\u30B1\u30C3\u30C8", value: `${data.riskTickets.length}件`, icon: _jsx(ErrorIcon, {}), subtitle: "\u7DCA\u6025\u5BFE\u5FDC\u8981", trend: { direction: 'stable', percentage: 0, period: '前日比' }, status: data.riskTickets.length <= 5 ? 'good' : data.riskTickets.length <= 10 ? 'warning' : 'critical', gradient: gradients.critical }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3", value: `${data.escalationHistory.filter(e => e.status === 'pending').length}件`, icon: _jsx(TrendingUpIcon, {}), subtitle: "\u4FDD\u7559\u4E2D\u306E\u6848\u4EF6", trend: { direction: 'down', percentage: 8.7, period: '前週比' }, status: "good", gradient: gradients.success }) })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [_jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u512A\u5148\u5EA6\u5225SLA\u9075\u5B88\u7387", subtitle: "\u5404\u512A\u5148\u5EA6\u30EC\u30D9\u30EB\u3067\u306E\u9054\u6210\u72B6\u6CC1", icon: _jsx(AssessmentIcon, {}), actions: _jsx(IconButton, { size: "small", children: _jsx(RefreshIcon, {}) }), children: _jsx(Stack, { spacing: 3, children: priorityData.map((item, index) => {
                                    const priorityColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
                                    const color = priorityColors[index % priorityColors.length];
                                    const complianceRate = parseFloat(item.complianceRate);
                                    return (_jsxs(Paper, { sx: {
                                            p: 3,
                                            background: `linear-gradient(135deg, ${color}10 0%, rgba(255,255,255,0.8) 100%)`,
                                            border: `1px solid ${color}30`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 4px 12px ${color}25`
                                            }
                                        }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: color, width: 32, height: 32 }, children: _jsx(SpeedIcon, { sx: { fontSize: 18 } }) }), _jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color }, children: item.priority })] }), _jsxs(Box, { sx: { textAlign: 'right' }, children: [_jsxs(Typography, { variant: "h4", sx: { fontWeight: 800, color }, children: [item.complianceRate, "%"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u9075\u5B88\u7387" })] })] }), _jsx(LinearProgress, { variant: "determinate", value: complianceRate, sx: {
                                                    height: 12,
                                                    borderRadius: 6,
                                                    mb: 2,
                                                    bgcolor: 'grey.200',
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: color,
                                                        borderRadius: 6
                                                    }
                                                } }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 4, children: _jsxs(Box, { sx: { textAlign: 'center', p: 1, bgcolor: 'background.paper', borderRadius: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: 'primary.main' }, children: item.total }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u7DCF\u30C1\u30B1\u30C3\u30C8" })] }) }), _jsx(Grid, { item: true, xs: 4, children: _jsxs(Box, { sx: { textAlign: 'center', p: 1, bgcolor: 'background.paper', borderRadius: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: 'success.main' }, children: item.onTime }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u671F\u9650\u5185\u5B8C\u4E86" })] }) }), _jsx(Grid, { item: true, xs: 4, children: _jsxs(Box, { sx: { textAlign: 'center', p: 1, bgcolor: 'background.paper', borderRadius: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: 'error.main' }, children: item.violated }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "SLA\u9055\u53CD" })] }) })] })] }, index));
                                }) }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30AB\u30C6\u30B4\u30EA\u5225SLA\u5206\u6790", subtitle: "\u30B5\u30FC\u30D3\u30B9\u30AB\u30C6\u30B4\u30EA\u3054\u3068\u306E\u9075\u5B88\u72B6\u6CC1", icon: _jsx(AnalyticsIcon, {}), actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(IconButton, { size: "small", children: _jsx(FilterIcon, {}) }), _jsx(IconButton, { size: "small", children: _jsx(DownloadIcon, {}) })] }), children: _jsx(Stack, { spacing: 3, children: data.categoryAnalysis.map((category, index) => {
                                    const getStatusColor = (rate) => {
                                        if (rate >= 95)
                                            return { primary: '#10B981', secondary: '#059669', bg: '#F0FDF4' };
                                        if (rate >= 90)
                                            return { primary: '#F59E0B', secondary: '#D97706', bg: '#FFFBEB' };
                                        return { primary: '#EF4444', secondary: '#DC2626', bg: '#FEF2F2' };
                                    };
                                    const colors = getStatusColor(category.complianceRate);
                                    const categoryIcons = {
                                        Infrastructure: _jsx(BuildIcon, {}),
                                        Network: _jsx(NetworkIcon, {}),
                                        Application: _jsx(AppsIcon, {}),
                                        Hardware: _jsx(HardwareIcon, {}),
                                        Security: _jsx(SecurityIcon, {})
                                    };
                                    return (_jsxs(Paper, { sx: {
                                            p: 3,
                                            background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                                            border: `2px solid ${colors.primary}30`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-3px)',
                                                boxShadow: `0 8px 20px ${colors.primary}25`,
                                                border: `2px solid ${colors.primary}50`
                                            }
                                        }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: {
                                                                    bgcolor: colors.primary,
                                                                    width: 48,
                                                                    height: 48,
                                                                    boxShadow: `0 4px 12px ${colors.primary}40`
                                                                }, children: categoryIcons[category.category] || _jsx(ComputerIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: colors.primary }, children: category.category }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [getTrendIcon(category.trend), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u30C8\u30EC\u30F3\u30C9" })] })] })] }), _jsxs(Box, { sx: { textAlign: 'right' }, children: [_jsxs(Typography, { variant: "h3", sx: {
                                                                    fontWeight: 900,
                                                                    color: colors.primary,
                                                                    textShadow: `0 2px 4px ${colors.primary}20`
                                                                }, children: [category.complianceRate, "%"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "SLA\u9075\u5B88\u7387" })] })] }), _jsx(LinearProgress, { variant: "determinate", value: category.complianceRate, sx: {
                                                    height: 16,
                                                    borderRadius: 8,
                                                    mb: 3,
                                                    bgcolor: 'grey.200',
                                                    '& .MuiLinearProgress-bar': {
                                                        background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                        borderRadius: 8
                                                    }
                                                } }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 4, children: _jsxs(Box, { sx: {
                                                                textAlign: 'center',
                                                                p: 2,
                                                                bgcolor: 'background.paper',
                                                                borderRadius: 2,
                                                                border: '1px solid',
                                                                borderColor: 'grey.200'
                                                            }, children: [_jsxs(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'info.main' }, children: [category.avgResponseTime, "h"] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u5E73\u5747\u5FDC\u7B54\u6642\u9593" })] }) }), _jsx(Grid, { item: true, xs: 4, children: _jsxs(Box, { sx: {
                                                                textAlign: 'center',
                                                                p: 2,
                                                                bgcolor: 'background.paper',
                                                                borderRadius: 2,
                                                                border: '1px solid',
                                                                borderColor: 'grey.200'
                                                            }, children: [_jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'error.main' }, children: category.violationCount }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u9055\u53CD\u4EF6\u6570" })] }) }), _jsx(Grid, { item: true, xs: 4, children: _jsxs(Box, { sx: {
                                                                textAlign: 'center',
                                                                p: 2,
                                                                bgcolor: 'background.paper',
                                                                borderRadius: 2,
                                                                border: '1px solid',
                                                                borderColor: 'grey.200'
                                                            }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }, children: [getTrendIcon(category.trend), _jsx(Typography, { variant: "h6", sx: {
                                                                                fontWeight: 700,
                                                                                ml: 1,
                                                                                color: category.trend === 'up' ? 'success.main' :
                                                                                    category.trend === 'down' ? 'error.main' : 'text.secondary'
                                                                            }, children: category.trend === 'up' ? '改善' : category.trend === 'down' ? '悪化' : '安定' })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u30C8\u30EC\u30F3\u30C9" })] }) })] })] }, index));
                                }) }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(RichChartCard, { title: "SLA\u5371\u967A\u30C1\u30B1\u30C3\u30C8", subtitle: "\u671F\u9650\u304C\u8FEB\u3063\u3066\u3044\u308B\u30C1\u30B1\u30C3\u30C8 - \u7DCA\u6025\u5BFE\u5FDC\u304C\u5FC5\u8981", icon: _jsx(ErrorIcon, {}), actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", startIcon: _jsx(NotificationsIcon, {}), variant: "outlined", children: "\u30A2\u30E9\u30FC\u30C8\u8A2D\u5B9A" }), _jsx(IconButton, { size: "small", children: _jsx(RefreshIcon, {}) })] }), children: _jsx(Box, { sx: { maxHeight: 600, overflow: 'auto', pr: 1 }, children: _jsx(Stack, { spacing: 3, children: data.riskTickets.map((ticket) => {
                                        const timeRemaining = getTimeRemaining(ticket.slaDeadline);
                                        const isUrgent = timeRemaining.urgent;
                                        const urgentColor = isUrgent ? '#EF4444' : '#F59E0B';
                                        return (_jsxs(Paper, { sx: {
                                                p: 3,
                                                position: 'relative',
                                                background: `linear-gradient(135deg, ${urgentColor}10 0%, rgba(255,255,255,0.9) 100%)`,
                                                border: `2px solid ${urgentColor}30`,
                                                borderLeft: `6px solid ${urgentColor}`,
                                                transition: 'all 0.3s ease',
                                                animation: isUrgent ? 'pulse 2s infinite' : 'none',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 8px 25px ${urgentColor}25`
                                                }
                                            }, children: [isUrgent && (_jsx(Box, { sx: {
                                                        position: 'absolute',
                                                        top: 8,
                                                        right: 8,
                                                        width: 12,
                                                        height: 12,
                                                        bgcolor: 'error.main',
                                                        borderRadius: '50%',
                                                        animation: 'ping 1s infinite'
                                                    } })), _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsxs(Grid, { item: true, xs: 12, md: 8, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: urgentColor, width: 40, height: 40 }, children: _jsx(AssignmentIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: urgentColor }, children: ticket.id }), _jsx(Chip, { label: getPriorityLabel(ticket.priority), size: "small", sx: {
                                                                                        bgcolor: PRIORITY_COLORS[ticket.priority],
                                                                                        color: 'white',
                                                                                        fontWeight: 600
                                                                                    } })] })] }), _jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2 }, children: ticket.title }), _jsxs(Stack, { direction: "row", spacing: 3, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(GroupIcon, { color: "action", sx: { fontSize: 18 } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: ticket.assignee })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(AssignmentIcon, { color: "action", sx: { fontSize: 18 } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: ticket.category })] })] })] }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Avatar, { sx: {
                                                                            bgcolor: urgentColor,
                                                                            width: 64,
                                                                            height: 64,
                                                                            mx: 'auto',
                                                                            mb: 1
                                                                        }, children: _jsx(ScheduleIcon, { sx: { fontSize: 32 } }) }), _jsx(Typography, { variant: "h5", sx: {
                                                                            fontWeight: 800,
                                                                            color: urgentColor,
                                                                            mb: 0.5
                                                                        }, children: timeRemaining.text }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u6B8B\u308A\u6642\u9593" })] }) })] }), _jsx(LinearProgress, { variant: "determinate", value: isUrgent ? 85 : 60, sx: {
                                                        height: 8,
                                                        borderRadius: 4,
                                                        my: 2,
                                                        bgcolor: 'grey.200',
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: urgentColor,
                                                            borderRadius: 4
                                                        }
                                                    } }), _jsxs(Stack, { direction: "row", spacing: 2, justifyContent: "flex-end", children: [_jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(AssignmentIcon, {}), children: "\u8A73\u7D30" }), isUrgent && (_jsx(Button, { size: "small", variant: "contained", color: "error", startIcon: _jsx(TrendingUpIcon, {}), sx: { animation: 'bounce 1s infinite' }, children: "\u30A8\u30B9\u30AB\u30EC\u30FC\u30C8" }))] })] }, ticket.id));
                                    }) }) }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(RichChartCard, { title: "\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3\u5C65\u6B74", subtitle: "\u6700\u8FD1\u306E\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3\u72B6\u6CC1", icon: _jsx(TrendingUpIcon, {}), actions: _jsx(IconButton, { size: "small", children: _jsx(TimelineIcon, {}) }), children: _jsx(TableContainer, { children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u30C1\u30B1\u30C3\u30C8ID" }), _jsx(TableCell, { children: "\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3" }), _jsx(TableCell, { children: "\u7406\u7531" }), _jsx(TableCell, { align: "center", children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx(TableCell, { align: "center", children: "\u65E5\u6642" })] }) }), _jsx(TableBody, { children: data.escalationHistory.slice(0, 5).map((escalation, index) => (_jsxs(TableRow, { sx: {
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                    borderLeft: '3px solid',
                                                    borderLeftColor: 'primary.main'
                                                }, children: [_jsx(TableCell, { children: _jsx(Typography, { variant: "body2", sx: { fontWeight: 600, color: 'primary.main' }, children: escalation.ticketId }) }), _jsx(TableCell, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(TrendingUpIcon, { color: "action", sx: { fontSize: 16 } }), _jsxs(Typography, { variant: "body2", children: [escalation.from, " \u2192 ", escalation.to] })] }) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: escalation.reason }) }), _jsx(TableCell, { align: "center", children: _jsx(Chip, { label: escalation.status === 'completed' ? '完了' :
                                                                escalation.status === 'pending' ? '保留中' : 'キャンセル', size: "small", color: escalation.status === 'completed' ? 'success' :
                                                                escalation.status === 'pending' ? 'warning' : 'default', variant: "outlined" }) }), _jsx(TableCell, { align: "center", children: _jsx(Typography, { variant: "caption", color: "text.secondary", children: new Date(escalation.timestamp).toLocaleString('ja-JP', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) }) })] }, index))) })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(RichChartCard, { title: "\u5168\u4F53SLA\u9075\u5B88\u72B6\u6CC1", subtitle: "\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3\u4ED8\u304D\u5186\u5F62\u30D7\u30ED\u30B0\u30EC\u30B9", icon: _jsx(SpeedIcon, {}), actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(IconButton, { size: "small", children: _jsx(AnalyticsIcon, {}) }), _jsx(IconButton, { size: "small", children: _jsx(ShareIcon, {}) })] }), children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }, children: [_jsxs(Box, { sx: { position: 'relative', display: 'inline-flex' }, children: [_jsx(MuiCircularProgress, { variant: "determinate", value: data.complianceRate, size: 180, thickness: 8, sx: {
                                                    color: data.complianceRate >= 95 ? 'success.main' :
                                                        data.complianceRate >= 90 ? 'warning.main' : 'error.main',
                                                    '& .MuiCircularProgress-circle': {
                                                        strokeLinecap: 'round'
                                                    }
                                                } }), _jsxs(Box, { sx: {
                                                    top: 0,
                                                    left: 0,
                                                    bottom: 0,
                                                    right: 0,
                                                    position: 'absolute',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column'
                                                }, children: [_jsxs(Typography, { variant: "h3", sx: { fontWeight: 800, color: 'primary.main' }, children: [data.complianceRate, "%"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "SLA\u9075\u5B88\u7387" })] })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { width: '100%' }, children: [_jsx(Grid, { item: true, xs: 6, children: _jsxs(Paper, { sx: {
                                                        p: 2,
                                                        textAlign: 'center',
                                                        background: 'linear-gradient(135deg, #10B98120 0%, #059669 08 100%)',
                                                        border: '1px solid #10B98130'
                                                    }, children: [_jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'success.main' }, children: Math.round((data.complianceRate / 100) *
                                                                Object.values(data.priorityBreakdown).reduce((sum, p) => sum + p.total, 0)) }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u9075\u5B88\u30C1\u30B1\u30C3\u30C8" })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Paper, { sx: {
                                                        p: 2,
                                                        textAlign: 'center',
                                                        background: 'linear-gradient(135deg, #EF444420 0%, #DC2626 08 100%)',
                                                        border: '1px solid #EF444430'
                                                    }, children: [_jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: 'error.main' }, children: data.violationCount }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u9055\u53CD\u30C1\u30B1\u30C3\u30C8" })] }) })] })] }) }) })] }), _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsx(RichChartCard, { title: "\u65E5\u6B21SLA\u9075\u5B88\u72B6\u6CC1", subtitle: "\u904E\u53BB30\u65E5\u9593\u306ESLA\u9075\u5B88\u7387\u30D2\u30FC\u30C8\u30DE\u30C3\u30D7 - \u8272\u304C\u6FC3\u3044\u307B\u3069\u9075\u5B88\u7387\u304C\u9AD8\u3044", icon: _jsx(DashboardIcon, {}), actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(FilterIcon, {}), children: "\u671F\u9593\u9078\u629E" }), _jsx(IconButton, { size: "small", children: _jsx(DownloadIcon, {}) })] }), children: _jsxs(Box, { sx: { p: 2 }, children: [_jsxs(Grid, { container: true, spacing: 1, sx: { mb: 2 }, children: [_jsx(Grid, { item: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6708" }) }), _jsx(Grid, { item: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u706B" }) }), _jsx(Grid, { item: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6C34" }) }), _jsx(Grid, { item: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6728" }) }), _jsx(Grid, { item: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u91D1" }) }), _jsx(Grid, { item: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u571F" }) }), _jsx(Grid, { item: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u65E5" }) })] }), _jsx(Grid, { container: true, spacing: 0.5, children: slaHeatmapData.map((cell, index) => {
                                        const getHeatColor = (value) => {
                                            if (value >= 95)
                                                return '#10B981';
                                            if (value >= 90)
                                                return '#F59E0B';
                                            if (value >= 80)
                                                return '#EF4444';
                                            return '#6B7280';
                                        };
                                        return (_jsx(Grid, { item: true, children: _jsx(MuiTooltip, { title: cell.label, children: _jsx(Paper, { sx: {
                                                        width: 40,
                                                        height: 40,
                                                        bgcolor: getHeatColor(cell.value),
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            transform: 'scale(1.1)',
                                                            boxShadow: 2
                                                        }
                                                    }, children: _jsx(Box, { sx: {
                                                            width: '100%',
                                                            height: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }, children: _jsx(Typography, { variant: "caption", sx: {
                                                                color: 'white',
                                                                fontWeight: 600,
                                                                fontSize: '10px'
                                                            }, children: cell.value }) }) }) }) }, index));
                                    }) }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 3, gap: 2 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u4F4E" }), _jsx(Box, { sx: { display: 'flex', gap: 0.5 }, children: ['#6B7280', '#EF4444', '#F59E0B', '#10B981'].map((color, index) => (_jsx(Box, { sx: {
                                                    width: 12,
                                                    height: 12,
                                                    bgcolor: color,
                                                    borderRadius: 0.5
                                                } }, index))) }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u9AD8" })] })] }) }) }) })] }));
});
export default SLAMonitoring;
