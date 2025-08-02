import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Chip, LinearProgress, useTheme, Button, Stack, FormControl, InputLabel, Select, MenuItem, alpha } from '@mui/material';
import { TrendingUp as TrendingUpIcon, Refresh as RefreshIcon, Speed as SpeedIcon, Storage as StorageIcon, NetworkCheck as NetworkIcon, Security as SecurityIcon, BugReport as BugIcon, CheckCircle as CheckCircleIcon, Schedule as ScheduleIcon, Assignment as AssignmentIcon, Group as GroupIcon, ShowChart as ChartIcon, Timeline as TimelineIcon, Assessment as ReportIcon, MonitorHeart as MonitorIcon, CloudQueue as CloudIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
// 🎨 アイコン豊富な新しいメトリクスカードコンポーネント
const IconRichMetricCard = React.memo(({ title, value, unit = '', change, changeLabel, target, icon, color, animated = true }) => {
    const theme = useTheme();
    const [animatedValue, setAnimatedValue] = useState(0);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        if (animated && typeof value === 'number') {
            const duration = 2000;
            const steps = 50;
            const increment = value / steps;
            let current = 0;
            const timer = setInterval(() => {
                current += increment;
                if (current >= value) {
                    setAnimatedValue(value);
                    clearInterval(timer);
                }
                else {
                    setAnimatedValue(current);
                }
            }, duration / steps);
            return () => clearInterval(timer);
        }
        else {
            setAnimatedValue(typeof value === 'number' ? value : 0);
        }
    }, [value, animated]);
    const getColorScheme = useCallback((color) => {
        switch (color) {
            case 'primary':
                return {
                    main: theme.palette.primary.main,
                    light: theme.palette.primary.light,
                    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    icon: '🚀'
                };
            case 'success':
                return {
                    main: theme.palette.success.main,
                    light: theme.palette.success.light,
                    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    icon: '✅'
                };
            case 'warning':
                return {
                    main: theme.palette.warning.main,
                    light: theme.palette.warning.light,
                    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    icon: '⚠️'
                };
            case 'error':
                return {
                    main: theme.palette.error.main,
                    light: theme.palette.error.light,
                    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                    icon: '🔥'
                };
            default:
                return {
                    main: theme.palette.grey[600],
                    light: theme.palette.grey[400],
                    gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    icon: '📊'
                };
        }
    }, [theme]);
    const colorScheme = getColorScheme(color);
    const progressPercentage = target ? Math.min((typeof value === 'number' ? value : 0) / target * 100, 100) : 0;
    return (_jsxs(Card, { sx: {
            height: '100%',
            background: colorScheme.gradient,
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '&:hover': {
                transform: 'translateY(-8px) scale(1.02)',
                boxShadow: `0 20px 40px ${alpha(colorScheme.main, 0.3)}`,
            },
            position: 'relative',
            overflow: 'hidden'
        }, children: [_jsx(Box, { sx: {
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha('#fff', 0.1)} 0%, transparent 70%)`,
                } }), _jsxs(CardContent, { sx: { p: 3, color: 'white', position: 'relative', zIndex: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Avatar, { sx: {
                                            bgcolor: alpha('#fff', 0.2),
                                            width: 48,
                                            height: 48,
                                            fontSize: '1.5rem'
                                        }, children: colorScheme.icon }), _jsx(Box, { children: _jsx(Typography, { variant: "body2", sx: { opacity: 0.9, fontWeight: 500 }, children: title }) })] }), _jsx(Box, { sx: { fontSize: '2rem', opacity: 0.7 }, children: icon })] }), _jsx(Box, { sx: { mb: 2 }, children: _jsxs(Typography, { variant: "h3", sx: {
                                fontWeight: 800,
                                mb: 0.5,
                                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }, children: [animated && mounted ?
                                    (typeof value === 'number' ?
                                        animatedValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) :
                                        value) :
                                    (typeof value === 'number' ? value.toLocaleString() : value), _jsx(Typography, { component: "span", variant: "h5", sx: { ml: 1, opacity: 0.8 }, children: unit })] }) }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 2 }, children: [_jsx(Box, { sx: { fontSize: '1.2rem' }, children: change > 0 ? '📈' : change < 0 ? '📉' : '➡️' }), _jsxs(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: [change > 0 ? '+' : '', change, "%"] }), _jsx(Typography, { variant: "caption", sx: { opacity: 0.8 }, children: changeLabel })] }), target && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { opacity: 0.8 }, children: "\u76EE\u6A19\u9054\u6210\u5EA6" }), _jsxs(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: [progressPercentage.toFixed(1), "%"] })] }), _jsx(LinearProgress, { variant: "determinate", value: progressPercentage, sx: {
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: alpha('#fff', 0.3),
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: '#fff',
                                        borderRadius: 3,
                                    }
                                } })] }))] })] }));
});
// 半円形ゲージチャートコンポーネント
const SemicircleGauge = React.memo(({ value, max, thresholds, size, animated = true, title, unit }) => {
    const [animatedValue, setAnimatedValue] = useState(0);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        if (animated) {
            const duration = 1500;
            const steps = 30;
            const increment = value / steps;
            let current = 0;
            const timer = setInterval(() => {
                current += increment;
                if (current >= value) {
                    setAnimatedValue(value);
                    clearInterval(timer);
                }
                else {
                    setAnimatedValue(current);
                }
            }, duration / steps);
            return () => clearInterval(timer);
        }
        else {
            setAnimatedValue(value);
        }
    }, [value, animated]);
    const radius = size / 2 - 20;
    const circumference = Math.PI * radius;
    const percentage = (animatedValue / max) * 100;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const getColor = useCallback((value) => {
        if (value <= thresholds.good)
            return '#10B981';
        if (value <= thresholds.warning)
            return '#F59E0B';
        return '#EF4444';
    }, [thresholds]);
    const currentColor = getColor(animatedValue);
    return (_jsxs("div", { className: "flex flex-col items-center space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsxs("svg", { width: size, height: size / 2 + 40, children: [_jsx("path", { d: `M 20 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2}`, fill: "none", stroke: "#E5E7EB", strokeWidth: "12", strokeLinecap: "round" }), _jsx("path", { d: `M 20 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2}`, fill: "none", stroke: currentColor, strokeWidth: "12", strokeLinecap: "round", strokeDasharray: strokeDasharray, strokeDashoffset: strokeDashoffset, className: "transition-all duration-1000 ease-out" })] }), _jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center", style: { top: size / 4 }, children: _jsxs("div", { className: "text-3xl font-black text-gray-800 mb-1", children: [mounted ? animatedValue.toFixed(1) : value.toFixed(1), unit] }) })] }), _jsx("div", { className: "text-center", children: _jsx("h3", { className: "text-lg font-semibold text-gray-800", children: title }) })] }));
});
// 改善提案カードコンポーネント
const ImprovementCard = React.memo(({ title, impact, priority, suggestions, actionable }) => {
    const getPriorityColor = useCallback((priority) => {
        switch (priority) {
            case 'high':
                return {
                    bg: 'from-red-50 to-red-100',
                    border: 'border-red-200',
                    badge: 'bg-red-500 text-white',
                    text: 'text-red-800'
                };
            case 'medium':
                return {
                    bg: 'from-yellow-50 to-yellow-100',
                    border: 'border-yellow-200',
                    badge: 'bg-yellow-500 text-white',
                    text: 'text-yellow-800'
                };
            case 'low':
                return {
                    bg: 'from-green-50 to-green-100',
                    border: 'border-green-200',
                    badge: 'bg-green-500 text-white',
                    text: 'text-green-800'
                };
            default:
                return {
                    bg: 'from-gray-50 to-gray-100',
                    border: 'border-gray-200',
                    badge: 'bg-gray-500 text-white',
                    text: 'text-gray-800'
                };
        }
    }, []);
    const colors = getPriorityColor(priority);
    const priorityLabel = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低';
    return (_jsxs("div", { className: `relative p-6 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300`, children: [_jsx("div", { className: "absolute top-4 right-4", children: _jsxs("span", { className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`, children: ["\u512A\u5148\u5EA6: ", priorityLabel] }) }), _jsxs("div", { className: "flex items-center space-x-4 mb-6", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("div", { className: `w-16 h-16 rounded-full bg-white bg-opacity-80 flex items-center justify-center ${colors.text}`, children: _jsxs("span", { className: "text-2xl font-bold", children: [impact, "%"] }) }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: `text-xl font-bold ${colors.text} mb-1`, children: title }), _jsx("p", { className: "text-sm text-gray-600", children: "\u5F71\u97FF\u5EA6\u30EC\u30D9\u30EB" })] })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-600 mb-2", children: [_jsx("span", { children: "\u30A4\u30F3\u30D1\u30AF\u30C8" }), _jsxs("span", { children: [impact, "%"] })] }), _jsx("div", { className: "w-full bg-white bg-opacity-60 rounded-full h-4", children: _jsx("div", { className: `h-4 rounded-full transition-all duration-1000 ease-out ${priority === 'high' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                                priority === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                    'bg-gradient-to-r from-green-400 to-green-600'}`, style: { width: `${impact}%` } }) })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("h4", { className: `font-semibold ${colors.text} mb-3 flex items-center`, children: [_jsx("span", { className: "mr-2", children: "\uD83D\uDE80" }), "\u6539\u5584\u63D0\u6848"] }), _jsx("ul", { className: "space-y-2", children: suggestions.map((suggestion, index) => (_jsxs("li", { className: "flex items-start space-x-3", children: [_jsx("span", { className: "flex-shrink-0 w-6 h-6 bg-white bg-opacity-80 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600", children: index + 1 }), _jsx("span", { className: "text-sm text-gray-700", children: suggestion })] }, index))) })] }), actionable && (_jsx("button", { className: `w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 hover:transform hover:scale-105 ${priority === 'high' ? 'bg-red-500 hover:bg-red-600' :
                    priority === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' :
                        'bg-green-500 hover:bg-green-600'}`, children: "\u6539\u5584\u65BD\u7B56\u3092\u5B9F\u884C" }))] }));
});
// 📊 多機能データテーブルコンポーネント
const PerformanceDataTable = ({ data, title, icon }) => {
    const theme = useTheme();
    const columns = [
        {
            id: 'name',
            label: '名前',
            searchable: true,
            render: (value, row) => (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: theme.palette.primary.main }, children: _jsx(GroupIcon, {}) }), _jsx(Typography, { variant: "body2", fontWeight: 600, children: value })] }))
        },
        {
            id: 'resolvedTickets',
            label: '解決数',
            align: 'center',
            render: (value) => (_jsx(Chip, { label: value, color: "primary", variant: "outlined", icon: _jsx(CheckCircleIcon, {}) }))
        },
        {
            id: 'avgResolutionTime',
            label: '平均時間',
            align: 'center',
            render: (value) => (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(ScheduleIcon, { fontSize: "small", color: "action" }), _jsxs(Typography, { variant: "body2", children: [value, "h"] })] }))
        },
        {
            id: 'efficiency',
            label: '効率性',
            align: 'center',
            render: (value) => (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(LinearProgress, { variant: "determinate", value: value, sx: {
                            width: 60,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha(theme.palette.primary.main, 0.1)
                        } }), _jsxs(Typography, { variant: "body2", fontWeight: 600, children: [value, "%"] })] }))
        },
        {
            id: 'rating',
            label: '評価',
            align: 'center',
            render: (value) => (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(Box, { sx: { color: '#FFD700', fontSize: '1.2rem' }, children: "\u2B50" }), _jsx(Typography, { variant: "body2", fontWeight: 600, children: value })] }))
        }
    ];
    return (_jsx(Card, { sx: { height: '100%' }, children: _jsxs(CardContent, { sx: { p: 0 }, children: [_jsx(Box, { sx: {
                        p: 2,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'white'
                    }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [icon, _jsx(Typography, { variant: "h6", fontWeight: 600, children: title })] }) }), _jsx(DataTable, { data: data, columns: columns, dense: true, initialPageSize: 5, searchable: false, filterable: false, exportable: true })] }) }));
};
// 🎯 リッチチャートコンポーネント
const RichChartCard = ({ title, children, icon, color = 'primary', actions }) => {
    const theme = useTheme();
    return (_jsx(Card, { sx: {
            height: '100%',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.shadows[8]
            },
            transition: 'all 0.3s ease'
        }, children: _jsxs(CardContent, { sx: { p: 0 }, children: [_jsxs(Box, { sx: {
                        p: 2,
                        background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [icon, _jsx(Typography, { variant: "h6", fontWeight: 600, children: title })] }), actions] }), _jsx(Box, { sx: { p: 2 }, children: children })] }) }));
};
const PerformanceAnalytics = React.memo(() => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
    // ダミーデータ生成をuseCallbackでメモ化
    const generateMockData = useCallback(() => {
        const resolutionTrend = Array.from({ length: 30 }, (_, i) => ({
            timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: 2.5 + Math.random() * 3 + Math.sin(i / 5) * 0.5,
            label: `Day ${i + 1}`
        }));
        const agentPerformance = [
            { id: '1', name: '田中 太郎', resolvedTickets: 45, avgResolutionTime: 2.3, efficiency: 92, rating: 4.8 },
            { id: '2', name: '佐藤 花子', resolvedTickets: 38, avgResolutionTime: 2.8, efficiency: 88, rating: 4.6 },
            { id: '3', name: '鈴木 次郎', resolvedTickets: 52, avgResolutionTime: 2.1, efficiency: 95, rating: 4.9 },
            { id: '4', name: '高橋 美咲', resolvedTickets: 41, avgResolutionTime: 2.6, efficiency: 90, rating: 4.7 },
            { id: '5', name: '渡辺 健一', resolvedTickets: 35, avgResolutionTime: 3.2, efficiency: 85, rating: 4.4 }
        ];
        const bottlenecks = [
            {
                area: 'チケット承認プロセス',
                severity: 'high',
                impact: 35,
                suggestions: ['承認フローの簡素化', '権限委譲の拡大', '自動承認ルールの導入']
            },
            {
                area: 'データベースクエリ',
                severity: 'medium',
                impact: 22,
                suggestions: ['インデックスの最適化', 'クエリの改善', 'キャッシュ戦略の見直し']
            },
            {
                area: 'API レスポンス',
                severity: 'low',
                impact: 15,
                suggestions: ['CDNの活用', 'レスポンス圧縮', 'キャッシュヘッダーの最適化']
            }
        ];
        return {
            ticketMetrics: {
                avgResolutionTime: 2.6,
                resolutionTrend,
                agentPerformance,
                bottlenecks
            },
            systemMetrics: {
                apiResponseTime: 245,
                dbQueryTime: 180,
                serverLoad: 68,
                pageLoadSpeed: 1.8
            },
            businessMetrics: {
                customerSatisfaction: 4.3,
                efficiencyImprovement: 12.5,
                costEfficiency: 89.2,
                roi: 156.7
            }
        };
    }, []);
    useEffect(() => {
        const fetchData = () => {
            setLoading(true);
            setTimeout(() => {
                setData(generateMockData());
                setLoading(false);
            }, 500);
        };
        fetchData();
    }, [selectedTimeframe, generateMockData]);
    // ヒートマップデータをuseMemoで計算
    const heatmapData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');
        const days = ['月', '火', '水', '木', '金', '土', '日'];
        const heatmapDataArray = [];
        days.forEach(day => {
            hours.forEach(hour => {
                const baseValue = Math.random() * 100;
                const dayMultiplier = ['土', '日'].includes(day) ? 0.3 : 1;
                const hourMultiplier = parseInt(hour) < 9 || parseInt(hour) > 18 ? 0.5 : 1.2;
                const value = Math.round(baseValue * dayMultiplier * hourMultiplier);
                heatmapDataArray.push({
                    x: hour,
                    y: day,
                    value: value,
                    label: `${day}曜日 ${hour} - パフォーマンス: ${value}%`
                });
            });
        });
        return heatmapDataArray;
    }, []);
    if (loading || !data) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-gray-50 to-blue-50", children: _jsx("div", { className: "container mx-auto px-4 py-6 max-w-7xl", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-8 bg-gray-300 rounded w-1/4 mb-6" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "h-32 bg-gray-200 rounded" }, i))) }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "h-64 bg-gray-200 rounded" }, i))) })] }) }) }));
    }
    return (_jsx(Box, { sx: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 3
        }, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { sx: {
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }, children: _jsxs(CardContent, { sx: { p: 4 }, children: [_jsxs(Stack, { direction: { xs: 'column', lg: 'row' }, spacing: 3, alignItems: "center", justifyContent: "space-between", children: [_jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [_jsx(Avatar, { sx: {
                                                        width: 80,
                                                        height: 80,
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        fontSize: '2rem',
                                                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)'
                                                    }, children: "\uD83D\uDCCA" }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h3", sx: {
                                                                fontWeight: 900,
                                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                backgroundClip: 'text',
                                                                WebkitBackgroundClip: 'text',
                                                                color: 'transparent',
                                                                mb: 1
                                                            }, children: "\uD83D\uDE80 \u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u5206\u6790\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }), _jsxs(Typography, { variant: "h6", color: "text.secondary", sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(MonitorIcon, {}), "\u30B7\u30B9\u30C6\u30E0\u3068\u30D3\u30B8\u30CD\u30B9\u306E\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u6307\u6A19\u3092\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996\u30FB\u5206\u6790"] })] })] }), _jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 150 }, children: [_jsx(InputLabel, { children: "\uD83D\uDCC5 \u671F\u9593\u9078\u629E" }), _jsxs(Select, { value: selectedTimeframe, onChange: (e) => setSelectedTimeframe(e.target.value), label: "\uD83D\uDCC5 \u671F\u9593\u9078\u629E", sx: { borderRadius: 2 }, children: [_jsx(MenuItem, { value: "1d", children: "\uD83D\uDD50 24\u6642\u9593" }), _jsx(MenuItem, { value: "7d", children: "\uD83D\uDCC5 7\u65E5\u9593" }), _jsx(MenuItem, { value: "30d", children: "\uD83D\uDCC5 30\u65E5\u9593" }), _jsx(MenuItem, { value: "90d", children: "\uD83D\uDCC5 90\u65E5\u9593" })] })] }), _jsx(Button, { variant: "contained", onClick: () => window.location.reload(), startIcon: _jsx(RefreshIcon, {}), sx: {
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        '&:hover': {
                                                            background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                                                            transform: 'scale(1.05)'
                                                        },
                                                        transition: 'all 0.2s',
                                                        borderRadius: 2,
                                                        px: 3
                                                    }, children: "\u66F4\u65B0" })] })] }), _jsxs(Box, { sx: { mt: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }, children: [_jsx(Chip, { icon: _jsx(CheckCircleIcon, {}), label: "\u30B7\u30B9\u30C6\u30E0\u6B63\u5E38", color: "success", variant: "outlined", sx: { fontSize: '0.9rem', py: 1 } }), _jsx(Chip, { icon: _jsx(MonitorIcon, {}), label: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u66F4\u65B0\u4E2D", color: "primary", variant: "outlined", sx: { fontSize: '0.9rem', py: 1 } }), _jsx(Chip, { icon: _jsx(ScheduleIcon, {}), label: `最終更新: ${new Date().toLocaleTimeString('ja-JP')}`, variant: "outlined", sx: { fontSize: '0.9rem', py: 1 } })] })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u30C1\u30B1\u30C3\u30C8\u5E73\u5747\u89E3\u6C7A\u6642\u9593", value: data.ticketMetrics.avgResolutionTime, unit: "\u6642\u9593", change: -8.2, changeLabel: "\u524D\u9031\u6BD4", target: 4.0, icon: _jsx(ScheduleIcon, {}), color: "success", animated: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "API\u5FDC\u7B54\u6642\u9593", value: data.systemMetrics.apiResponseTime, unit: "ms", change: 5.1, changeLabel: "\u524D\u9031\u6BD4", target: 200, icon: _jsx(SpeedIcon, {}), color: "warning", animated: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "\u9867\u5BA2\u6E80\u8DB3\u5EA6", value: data.businessMetrics.customerSatisfaction, unit: "/5.0", change: 3.2, changeLabel: "\u524D\u6708\u6BD4", target: 5.0, icon: _jsx(CheckCircleIcon, {}), color: "primary", animated: true }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(IconRichMetricCard, { title: "ROI", value: data.businessMetrics.roi, unit: "%", change: 12.4, changeLabel: "\u524D\u56DB\u534A\u671F\u6BD4", target: 200, icon: _jsx(TrendingUpIcon, {}), color: "success", animated: true }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30C1\u30B1\u30C3\u30C8\u89E3\u6C7A\u6642\u9593\u30C8\u30EC\u30F3\u30C9", icon: _jsx(TimelineIcon, {}), color: "primary", actions: _jsx(IconButton, { size: "small", sx: { color: 'white' }, children: _jsx(ChartIcon, {}) }), children: _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(AreaChart, { data: data.ticketMetrics.resolutionTrend.map(item => ({
                                    ...item,
                                    date: new Date(item.timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                                })), children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "colorResolution", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#667eea", stopOpacity: 0.8 }), _jsx("stop", { offset: "95%", stopColor: "#667eea", stopOpacity: 0.1 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "date", axisLine: false, tickLine: false, tick: { fontSize: 12, fill: '#666' } }), _jsx(YAxis, { axisLine: false, tickLine: false, tick: { fontSize: 12, fill: '#666' } }), _jsx(Tooltip, { contentStyle: {
                                            backgroundColor: 'rgba(255,255,255,0.95)',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        } }), _jsx(Area, { type: "monotone", dataKey: "value", stroke: "#667eea", strokeWidth: 3, fill: "url(#colorResolution)" })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(RichChartCard, { title: "\u30B7\u30B9\u30C6\u30E0\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u76E3\u8996", icon: _jsx(SpeedIcon, {}), color: "warning", actions: _jsx(IconButton, { size: "small", sx: { color: 'white' }, children: _jsx(MonitorIcon, {}) }), children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(Box, { sx: {
                                            textAlign: 'center',
                                            p: 3,
                                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                            borderRadius: 3,
                                            color: 'white',
                                            mb: 2
                                        }, children: [_jsxs(Typography, { variant: "h2", sx: { fontWeight: 900, mb: 1 }, children: [data.systemMetrics.serverLoad, "%"] }), _jsxs(Typography, { variant: "h6", sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }, children: [_jsx(CloudIcon, {}), "\u30B5\u30FC\u30D0\u30FC\u8CA0\u8377"] })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Card, { sx: {
                                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                            color: 'white',
                                            textAlign: 'center',
                                            p: 2
                                        }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }, children: [_jsx(StorageIcon, {}), _jsxs(Typography, { variant: "h4", fontWeight: 800, children: [data.systemMetrics.dbQueryTime, _jsx(Typography, { component: "span", variant: "body2", children: "ms" })] })] }), _jsx(Typography, { variant: "body2", children: "DB \u30AF\u30A8\u30EA\u6642\u9593" })] }) }), _jsx(Grid, { item: true, xs: 6, children: _jsxs(Card, { sx: {
                                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                            color: 'white',
                                            textAlign: 'center',
                                            p: 2
                                        }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }, children: [_jsx(NetworkIcon, {}), _jsxs(Typography, { variant: "h4", fontWeight: 800, children: [data.systemMetrics.pageLoadSpeed, _jsx(Typography, { component: "span", variant: "body2", children: "s" })] })] }), _jsx(Typography, { variant: "body2", children: "\u30DA\u30FC\u30B8\u8AAD\u307F\u8FBC\u307F" })] }) })] }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsx(PerformanceDataTable, { data: data.ticketMetrics.agentPerformance, title: "\u62C5\u5F53\u8005\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9", icon: _jsx(GroupIcon, {}) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(RichChartCard, { title: "\u30DC\u30C8\u30EB\u30CD\u30C3\u30AF\u5206\u6790\u30FB\u6539\u5584\u63D0\u6848", icon: _jsx(BugIcon, {}), color: "error", actions: _jsx(IconButton, { size: "small", sx: { color: 'white' }, children: _jsx(ReportIcon, {}) }), children: _jsx(Grid, { container: true, spacing: 3, children: data.ticketMetrics.bottlenecks.map((bottleneck, index) => (_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(ImprovementCard, { title: bottleneck.area, impact: bottleneck.impact, priority: bottleneck.severity === 'high' ? 'high' : bottleneck.severity === 'medium' ? 'medium' : 'low', suggestions: bottleneck.suggestions, actionable: true }) }, index))) }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(RichChartCard, { title: "\u30D3\u30B8\u30CD\u30B9\u30A4\u30F3\u30D1\u30AF\u30C8\u5206\u6790", icon: _jsx(AssignmentIcon, {}), color: "success", actions: _jsx(IconButton, { size: "small", sx: { color: 'white' }, children: _jsx(TrendingUpIcon, {}) }), children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(Card, { sx: {
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            textAlign: 'center',
                                            p: 3,
                                            height: '100%'
                                        }, children: _jsxs(Box, { sx: { position: 'relative' }, children: [_jsx(Box, { sx: { position: 'absolute', top: 0, right: 0, fontSize: '2rem', opacity: 0.3 }, children: "\uD83C\uDFAF" }), _jsxs(Typography, { variant: "h3", sx: { fontWeight: 900, mb: 1 }, children: [data.businessMetrics.roi, _jsx(Typography, { component: "span", variant: "h5", children: "%" })] }), _jsxs(Typography, { variant: "h6", sx: { mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }, children: [_jsx(TrendingUpIcon, {}), "\u6295\u8CC7\u53CE\u76CA\u7387"] }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8 }, children: "ROI\u6307\u6A19" })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(Card, { sx: {
                                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                            color: 'white',
                                            textAlign: 'center',
                                            p: 3,
                                            height: '100%'
                                        }, children: _jsxs(Box, { sx: { position: 'relative' }, children: [_jsx(Box, { sx: { position: 'absolute', top: 0, right: 0, fontSize: '2rem', opacity: 0.3 }, children: "\uD83D\uDCC8" }), _jsxs(Typography, { variant: "h3", sx: { fontWeight: 900, mb: 1 }, children: [data.businessMetrics.efficiencyImprovement, _jsx(Typography, { component: "span", variant: "h5", children: "%" })] }), _jsxs(Typography, { variant: "h6", sx: { mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }, children: [_jsx(SpeedIcon, {}), "\u696D\u52D9\u52B9\u7387\u6539\u5584\u7387"] }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8 }, children: "\u524D\u56DB\u534A\u671F\u6BD4\u8F03" })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(Card, { sx: {
                                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                            color: 'white',
                                            textAlign: 'center',
                                            p: 3,
                                            height: '100%'
                                        }, children: _jsxs(Box, { sx: { position: 'relative' }, children: [_jsx(Box, { sx: { position: 'absolute', top: 0, right: 0, fontSize: '2rem', opacity: 0.3 }, children: "\uD83D\uDCB0" }), _jsxs(Typography, { variant: "h3", sx: { fontWeight: 900, mb: 1 }, children: [data.businessMetrics.costEfficiency, _jsx(Typography, { component: "span", variant: "h5", children: "%" })] }), _jsxs(Typography, { variant: "h6", sx: { mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }, children: [_jsx(SecurityIcon, {}), "\u30B3\u30B9\u30C8\u52B9\u7387"] }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8 }, children: "\u6700\u9069\u5316\u30EC\u30D9\u30EB" })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { sx: { p: 3, background: alpha('#667eea', 0.1) }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", color: "primary", fontWeight: 600, children: "\u6708\u6B21\u6210\u9577\u7387" }), _jsxs(Typography, { variant: "h4", color: "primary", fontWeight: 800, children: ["+", (data.businessMetrics.efficiencyImprovement / 3).toFixed(1), "%"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7D99\u7D9A\u7684\u6539\u5584\u30C8\u30EC\u30F3\u30C9" })] }), _jsx(Box, { sx: { fontSize: '3rem' }, children: "\uD83D\uDCCA" })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { sx: { p: 3, background: alpha('#43e97b', 0.1) }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", color: "success.main", fontWeight: 600, children: "\u30B3\u30B9\u30C8\u524A\u6E1B\u984D" }), _jsxs(Typography, { variant: "h4", color: "success.main", fontWeight: 800, children: ["\u00A5", (data.businessMetrics.costEfficiency * 1000).toLocaleString()] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6708\u9593\u7BC0\u7D04\u52B9\u679C" })] }), _jsx(Box, { sx: { fontSize: '3rem' }, children: "\uD83D\uDCB4" })] }) }) })] }) }) })] }) }));
});
export default PerformanceAnalytics;
