import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { Card, CardContent, Typography, Box, Grid, FormControl, InputLabel, Select, MenuItem, Chip, Avatar, LinearProgress, Divider, List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction, } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, TrendingFlat as TrendingFlatIcon, Assignment as AssignmentIcon, Insights as InsightsIcon, } from '@mui/icons-material';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, } from 'recharts';
import { useTheme } from '@mui/material/styles';
const AdvancedAnalytics = ({ metrics, timeRange, onTimeRangeChange, }) => {
    const theme = useTheme();
    const [selectedMetric, setSelectedMetric] = useState('resolution');
    // Mock advanced analytics data
    const performanceData = useMemo(() => {
        const baseData = [
            { name: '月', tickets: 45, resolved: 42, avgTime: 3.2 },
            { name: '火', tickets: 38, resolved: 35, avgTime: 2.8 },
            { name: '水', tickets: 52, resolved: 48, avgTime: 4.1 },
            { name: '木', tickets: 29, resolved: 27, avgTime: 2.5 },
            { name: '金', tickets: 41, resolved: 39, avgTime: 3.6 },
            { name: '土', tickets: 18, resolved: 16, avgTime: 1.9 },
            { name: '日', tickets: 25, resolved: 23, avgTime: 2.3 },
        ];
        return baseData;
    }, [timeRange]);
    const categoryPerformance = [
        { category: 'Infrastructure', tickets: 25, avgResolution: 4.2, slaCompliance: 88 },
        { category: 'Network', tickets: 18, avgResolution: 3.1, slaCompliance: 92 },
        { category: 'Hardware', tickets: 32, avgResolution: 2.8, slaCompliance: 95 },
        { category: 'Software', tickets: 41, avgResolution: 5.1, slaCompliance: 82 },
        { category: 'Security', tickets: 12, avgResolution: 6.3, slaCompliance: 78 },
        { category: 'Email', tickets: 28, avgResolution: 1.9, slaCompliance: 98 },
    ];
    const agentPerformance = [
        { name: '山田太郎', tickets: 45, avgTime: 3.2, satisfaction: 4.8 },
        { name: '佐藤花子', tickets: 38, avgTime: 2.8, satisfaction: 4.6 },
        { name: '田中一郎', tickets: 52, avgTime: 4.1, satisfaction: 4.2 },
        { name: '高橋三郎', tickets: 29, avgTime: 2.5, satisfaction: 4.9 },
    ];
    const skillRadarData = [
        { skill: '技術力', value: 85 },
        { skill: 'コミュニケーション', value: 92 },
        { skill: '問題解決', value: 88 },
        { skill: '效率性', value: 79 },
        { skill: '顧客満足', value: 95 },
        { skill: 'チームワーク', value: 86 },
    ];
    const getTrendIcon = (current, previous) => {
        if (current > previous)
            return _jsx(TrendingUpIcon, { color: "success" });
        if (current < previous)
            return _jsx(TrendingDownIcon, { color: "error" });
        return _jsx(TrendingFlatIcon, { color: "info" });
    };
    const getTrendPercentage = (current, previous) => {
        const change = ((current - previous) / previous) * 100;
        return Math.abs(change).toFixed(1);
    };
    const getSLAColor = (compliance) => {
        if (compliance >= 95)
            return 'success';
        if (compliance >= 85)
            return 'warning';
        return 'error';
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(InsightsIcon, { color: "primary" }), _jsx(Typography, { variant: "h5", sx: { fontWeight: 600 }, children: "\u9AD8\u5EA6\u306A\u5206\u6790" })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u671F\u9593" }), _jsxs(Select, { value: timeRange, onChange: (e) => onTimeRangeChange(e.target.value), label: "\u671F\u9593", children: [_jsx(MenuItem, { value: "today", children: "\u4ECA\u65E5" }), _jsx(MenuItem, { value: "week", children: "\u4ECA\u9031" }), _jsx(MenuItem, { value: "month", children: "\u4ECA\u6708" }), _jsx(MenuItem, { value: "quarter", children: "\u56DB\u534A\u671F" })] })] })] }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, lg: 8, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u30C8\u30EC\u30F3\u30C9" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(AreaChart, { data: performanceData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, { yAxisId: "left" }), _jsx(YAxis, { yAxisId: "right", orientation: "right" }), _jsx(ChartTooltip, {}), _jsx(Legend, {}), _jsx(Area, { yAxisId: "left", type: "monotone", dataKey: "tickets", stackId: "1", stroke: theme.palette.primary.main, fill: theme.palette.primary.light, fillOpacity: 0.6, name: "\u65B0\u898F\u30C1\u30B1\u30C3\u30C8" }), _jsx(Area, { yAxisId: "left", type: "monotone", dataKey: "resolved", stackId: "2", stroke: theme.palette.success.main, fill: theme.palette.success.light, fillOpacity: 0.6, name: "\u89E3\u6C7A\u30C1\u30B1\u30C3\u30C8" }), _jsx(Line, { yAxisId: "right", type: "monotone", dataKey: "avgTime", stroke: theme.palette.warning.main, strokeWidth: 3, name: "\u5E73\u5747\u89E3\u6C7A\u6642\u9593(\u6642\u9593)" })] }) })] }) }) }), _jsx(Grid, { item: true, xs: 12, lg: 4, children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { sx: { bgcolor: 'primary.main', color: 'primary.contrastText' }, children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600 }, children: "94.5%" }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8 }, children: "SLA\u9075\u5B88\u7387" })] }), _jsxs(Box, { sx: { textAlign: 'right' }, children: [getTrendIcon(94.5, 92.1), _jsxs(Typography, { variant: "caption", display: "block", children: ["+", getTrendPercentage(94.5, 92.1), "%"] })] })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { sx: { bgcolor: 'success.main', color: 'success.contrastText' }, children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600 }, children: "3.2h" }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.8 }, children: "\u5E73\u5747\u89E3\u6C7A\u6642\u9593" })] }), _jsxs(Box, { sx: { textAlign: 'right' }, children: [getTrendIcon(3.2, 4.1), _jsxs(Typography, { variant: "caption", display: "block", children: ["-", getTrendPercentage(3.2, 4.1), "%"] })] })] }) }) }) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30AB\u30C6\u30B4\u30EA\u5225\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9" }), _jsx(List, { children: categoryPerformance.map((category, index) => (_jsxs(React.Fragment, { children: [_jsxs(ListItem, { children: [_jsx(ListItemAvatar, { children: _jsx(Avatar, { sx: { bgcolor: `hsl(${index * 60}, 60%, 50%)` }, children: _jsx(AssignmentIcon, {}) }) }), _jsx(ListItemText, { primary: category.category, secondary: _jsxs(Box, { component: "div", children: [_jsxs(Box, { component: "div", sx: { color: 'text.secondary', fontSize: '0.875rem' }, children: [category.tickets, "\u4EF6 | \u5E73\u5747", category.avgResolution, "h"] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }, children: [_jsx(Box, { component: "span", sx: { fontSize: '0.75rem' }, children: "SLA\u9075\u5B88\u7387:" }), _jsx(LinearProgress, { variant: "determinate", value: category.slaCompliance, sx: {
                                                                                    flexGrow: 1,
                                                                                    height: 6,
                                                                                    borderRadius: 3,
                                                                                    '& .MuiLinearProgress-bar': {
                                                                                        bgcolor: getSLAColor(category.slaCompliance) + '.main',
                                                                                    },
                                                                                } }), _jsxs(Box, { component: "span", sx: { minWidth: 35, fontSize: '0.75rem' }, children: [category.slaCompliance, "%"] })] })] }) }), _jsx(ListItemSecondaryAction, { children: _jsx(Chip, { label: category.slaCompliance >= 95 ? '優秀' : category.slaCompliance >= 85 ? '良好' : '改善必要', size: "small", color: getSLAColor(category.slaCompliance) }) })] }), index < categoryPerformance.length - 1 && _jsx(Divider, {})] }, category.category))) })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30C1\u30FC\u30E0\u30B9\u30AD\u30EB\u5206\u6790" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(RadarChart, { data: skillRadarData, children: [_jsx(PolarGrid, {}), _jsx(PolarAngleAxis, { dataKey: "skill", tick: { fontSize: 12 } }), _jsx(PolarRadiusAxis, { angle: 30, domain: [0, 100], tick: { fontSize: 10 } }), _jsx(Radar, { name: "\u30C1\u30FC\u30E0\u5E73\u5747", dataKey: "value", stroke: theme.palette.primary.main, fill: theme.palette.primary.main, fillOpacity: 0.3, strokeWidth: 2 }), _jsx(ChartTooltip, {})] }) })] }) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30C8\u30C3\u30D7\u30D1\u30D5\u30A9\u30FC\u30DE\u30FC" }), _jsx(Grid, { container: true, spacing: 2, children: agentPerformance.map((agent, index) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { variant: "outlined", sx: { bgcolor: index === 0 ? 'success.light' : 'background.paper' }, children: _jsxs(CardContent, { sx: { textAlign: 'center', py: 2 }, children: [_jsx(Avatar, { sx: {
                                                                width: 48,
                                                                height: 48,
                                                                mx: 'auto',
                                                                mb: 1,
                                                                bgcolor: index === 0 ? 'success.main' : 'primary.main',
                                                            }, children: agent.name.charAt(0) }), _jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600 }, children: agent.name }), _jsxs(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: [index + 1, "\u4F4D"] }), _jsxs(Box, { sx: { mt: 1 }, children: [_jsxs(Typography, { variant: "caption", display: "block", children: ["\u51E6\u7406\u6570: ", agent.tickets, "\u4EF6"] }), _jsxs(Typography, { variant: "caption", display: "block", children: ["\u5E73\u5747\u6642\u9593: ", agent.avgTime, "h"] }), _jsxs(Typography, { variant: "caption", display: "block", children: ["\u6E80\u8DB3\u5EA6: ", agent.satisfaction, "/5.0"] })] })] }) }) }, agent.name))) })] }) }) })] })] }));
};
export default AdvancedAnalytics;
