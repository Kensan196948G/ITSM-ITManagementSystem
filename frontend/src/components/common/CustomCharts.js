import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * カスタムチャートコンポーネント
 * Recharts を使用した高度なチャート機能を提供
 */
import { useState } from 'react';
import { Box, Card, CardContent, CardHeader, Typography, IconButton, Menu, MenuItem, Chip, useTheme, alpha, Paper, Stack, } from '@mui/material';
import { MoreVert as MoreVertIcon, GetApp as ExportIcon, Refresh as RefreshIcon, } from '@mui/icons-material';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, RadialBarChart, RadialBar, ComposedChart, } from 'recharts';
// チャート用の共通ヘッダーコンポーネント
const ChartHeader = ({ title, subtitle, actions, onExport, onRefresh }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const handleMenuClose = () => setAnchorEl(null);
    return (_jsx(CardHeader, { title: title && _jsx(Typography, { variant: "h6", children: title }), subheader: subtitle && _jsx(Typography, { variant: "body2", color: "text.secondary", children: subtitle }), action: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [actions, (onExport || onRefresh) && (_jsxs(_Fragment, { children: [_jsx(IconButton, { size: "small", onClick: (e) => setAnchorEl(e.currentTarget), children: _jsx(MoreVertIcon, {}) }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, children: [onRefresh && (_jsxs(MenuItem, { onClick: () => { onRefresh(); handleMenuClose(); }, children: [_jsx(RefreshIcon, { sx: { mr: 1 }, fontSize: "small" }), "\u66F4\u65B0"] })), onExport && (_jsxs(MenuItem, { onClick: () => { onExport('png'); handleMenuClose(); }, children: [_jsx(ExportIcon, { sx: { mr: 1 }, fontSize: "small" }), "PNG\u4FDD\u5B58"] })), onExport && (_jsxs(MenuItem, { onClick: () => { onExport('svg'); handleMenuClose(); }, children: [_jsx(ExportIcon, { sx: { mr: 1 }, fontSize: "small" }), "SVG\u4FDD\u5B58"] }))] })] }))] }) }));
};
// カスタムツールチップ
const CustomTooltip = ({ active, payload, label, formatter }) => {
    const theme = useTheme();
    if (active && payload && payload.length) {
        return (_jsxs(Paper, { elevation: 8, sx: {
                p: 2,
                backgroundColor: alpha(theme.palette.background.paper, 0.95),
                border: `1px solid ${theme.palette.divider}`,
            }, children: [label && (_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: label })), payload.map((entry, index) => (_jsxs(Typography, { variant: "body2", sx: { color: entry.color }, children: [entry.name, ": ", formatter ? formatter(entry.value) : entry.value] }, index)))] }));
    }
    return null;
};
// ライン チャート
export const CustomLineChart = ({ data, lines, title, subtitle, height = 300, smooth = true, dots = false, strokeWidth = 2, xAxisKey, yAxisDomain, showLegend = true, showTooltip = true, showGrid = true, onDataPointClick, onExport, onRefresh, actions, className, }) => {
    const theme = useTheme();
    return (_jsxs(Card, { className: className, children: [_jsx(ChartHeader, { title: title, subtitle: subtitle, actions: actions, onExport: onExport, onRefresh: onRefresh }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(LineChart, { data: data, onClick: onDataPointClick, children: [showGrid && _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: theme.palette.divider }), _jsx(XAxis, { dataKey: xAxisKey, stroke: theme.palette.text.secondary }), _jsx(YAxis, { stroke: theme.palette.text.secondary, domain: yAxisDomain }), showTooltip && _jsx(RechartsTooltip, { content: _jsx(CustomTooltip, {}) }), showLegend && _jsx(Legend, {}), lines.map((line, index) => (_jsx(Line, { type: smooth ? 'monotone' : 'linear', dataKey: line.dataKey, name: line.name, stroke: line.color, strokeWidth: strokeWidth, dot: dots, activeDot: { r: 6, fill: line.color } }, index)))] }) }) })] }));
};
// バー チャート
export const CustomBarChart = ({ data, bars, title, subtitle, height = 300, orientation = 'vertical', stacked = false, xAxisKey, yAxisDomain, showLegend = true, showTooltip = true, showGrid = true, onDataPointClick, onExport, onRefresh, actions, className, }) => {
    const theme = useTheme();
    return (_jsxs(Card, { className: className, children: [_jsx(ChartHeader, { title: title, subtitle: subtitle, actions: actions, onExport: onExport, onRefresh: onRefresh }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(BarChart, { data: data, onClick: onDataPointClick, children: [showGrid && _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: theme.palette.divider }), _jsx(XAxis, { dataKey: xAxisKey, stroke: theme.palette.text.secondary }), _jsx(YAxis, { stroke: theme.palette.text.secondary, domain: yAxisDomain }), showTooltip && _jsx(RechartsTooltip, { content: _jsx(CustomTooltip, {}) }), showLegend && _jsx(Legend, {}), bars.map((bar, index) => (_jsx(Bar, { dataKey: bar.dataKey, name: bar.name, fill: bar.color, stackId: stacked ? bar.stackId || 'stack' : undefined, radius: [2, 2, 0, 0] }, index)))] }) }) })] }));
};
// パイ チャート
export const CustomPieChart = ({ data, dataKey, nameKey, title, subtitle, height = 300, innerRadius = 0, outerRadius, showLabels = true, showValues = true, showLegend = true, showTooltip = true, onDataPointClick, onExport, onRefresh, actions, className, }) => {
    const theme = useTheme();
    const colors = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.info.main,
    ];
    const renderLabel = (entry) => {
        if (!showLabels)
            return '';
        return `${entry[nameKey]}${showValues ? `: ${entry[dataKey]}` : ''}`;
    };
    return (_jsxs(Card, { className: className, children: [_jsx(ChartHeader, { title: title, subtitle: subtitle, actions: actions, onExport: onExport, onRefresh: onRefresh }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data, cx: "50%", cy: "50%", labelLine: false, label: renderLabel, outerRadius: outerRadius || 80, innerRadius: innerRadius, fill: "#8884d8", dataKey: dataKey, onClick: onDataPointClick, children: data.map((entry, index) => (_jsx(Cell, { fill: colors[index % colors.length] }, `cell-${index}`))) }), showTooltip && _jsx(RechartsTooltip, { content: _jsx(CustomTooltip, {}) }), showLegend && _jsx(Legend, {})] }) }) })] }));
};
// エリア チャート
export const CustomAreaChart = ({ data, areas, title, subtitle, height = 300, stacked = false, xAxisKey, yAxisDomain, showLegend = true, showTooltip = true, showGrid = true, onDataPointClick, onExport, onRefresh, actions, className, }) => {
    const theme = useTheme();
    return (_jsxs(Card, { className: className, children: [_jsx(ChartHeader, { title: title, subtitle: subtitle, actions: actions, onExport: onExport, onRefresh: onRefresh }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(AreaChart, { data: data, onClick: onDataPointClick, children: [showGrid && _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: theme.palette.divider }), _jsx(XAxis, { dataKey: xAxisKey, stroke: theme.palette.text.secondary }), _jsx(YAxis, { stroke: theme.palette.text.secondary, domain: yAxisDomain }), showTooltip && _jsx(RechartsTooltip, { content: _jsx(CustomTooltip, {}) }), showLegend && _jsx(Legend, {}), areas.map((area, index) => (_jsx(Area, { type: "monotone", dataKey: area.dataKey, name: area.name, stackId: stacked ? area.stackId || 'stack' : undefined, stroke: area.color, fill: alpha(area.color, 0.6) }, index)))] }) }) })] }));
};
// ドーナツ チャート
export const CustomDonutChart = ({ data, dataKey, nameKey, title, subtitle, height = 300, centerLabel, centerValue, showLabels = false, showValues = true, showLegend = true, showTooltip = true, onDataPointClick, onExport, onRefresh, actions, className, }) => {
    const theme = useTheme();
    const colors = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.info.main,
    ];
    return (_jsxs(Card, { className: className, children: [_jsx(ChartHeader, { title: title, subtitle: subtitle, actions: actions, onExport: onExport, onRefresh: onRefresh }), _jsx(CardContent, { children: _jsxs(Box, { sx: { position: 'relative' }, children: [_jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data, cx: "50%", cy: "50%", innerRadius: 60, outerRadius: 100, paddingAngle: 5, dataKey: dataKey, onClick: onDataPointClick, children: data.map((entry, index) => (_jsx(Cell, { fill: colors[index % colors.length] }, `cell-${index}`))) }), showTooltip && _jsx(RechartsTooltip, { content: _jsx(CustomTooltip, {}) }), showLegend && _jsx(Legend, {})] }) }), (centerLabel || centerValue) && (_jsxs(Box, { sx: {
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                            }, children: [centerValue && (_jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: centerValue })), centerLabel && (_jsx(Typography, { variant: "body2", color: "text.secondary", children: centerLabel }))] }))] }) })] }));
};
// ゲージ チャート
export const CustomGaugeChart = ({ value, min = 0, max = 100, unit = '%', title, subtitle, height = 200, thresholds = [
    { value: 70, color: '#ff4444', label: '危険' },
    { value: 50, color: '#ffaa00', label: '警告' },
    { value: 0, color: '#00aa00', label: '正常' },
], onExport, onRefresh, actions, className, }) => {
    const theme = useTheme();
    const normalizedValue = Math.min(Math.max(value, min), max);
    const percentage = ((normalizedValue - min) / (max - min)) * 100;
    const getColor = () => {
        for (const threshold of thresholds.sort((a, b) => b.value - a.value)) {
            if (normalizedValue >= threshold.value) {
                return threshold.color;
            }
        }
        return theme.palette.primary.main;
    };
    const data = [{ value: percentage, fill: getColor() }];
    return (_jsxs(Card, { className: className, children: [_jsx(ChartHeader, { title: title, subtitle: subtitle, actions: actions, onExport: onExport, onRefresh: onRefresh }), _jsxs(CardContent, { children: [_jsxs(Box, { sx: { position: 'relative' }, children: [_jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsx(RadialBarChart, { cx: "50%", cy: "70%", innerRadius: "60%", outerRadius: "90%", data: data, startAngle: 180, endAngle: 0, children: _jsx(RadialBar, { dataKey: "value", cornerRadius: 10, fill: getColor() }) }) }), _jsx(Box, { sx: {
                                    position: 'absolute',
                                    bottom: '20%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    textAlign: 'center',
                                }, children: _jsxs(Typography, { variant: "h3", sx: { fontWeight: 700, color: getColor() }, children: [normalizedValue, unit] }) })] }), _jsx(Stack, { direction: "row", spacing: 1, sx: { mt: 2, justifyContent: 'center' }, children: thresholds.map((threshold, index) => (_jsx(Chip, { label: `${threshold.label}: ${threshold.value}${unit}以上`, size: "small", sx: {
                                backgroundColor: alpha(threshold.color, 0.1),
                                color: threshold.color,
                                border: `1px solid ${threshold.color}`,
                            } }, index))) })] })] }));
};
// 複合チャート
export const CustomComposedChart = ({ data, series, title, subtitle, height = 300, xAxisKey, yAxisDomain, showLegend = true, showTooltip = true, showGrid = true, onDataPointClick, onExport, onRefresh, actions, className, }) => {
    const theme = useTheme();
    return (_jsxs(Card, { className: className, children: [_jsx(ChartHeader, { title: title, subtitle: subtitle, actions: actions, onExport: onExport, onRefresh: onRefresh }), _jsx(CardContent, { children: _jsx(ResponsiveContainer, { width: "100%", height: height, children: _jsxs(ComposedChart, { data: data, onClick: onDataPointClick, children: [showGrid && _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: theme.palette.divider }), _jsx(XAxis, { dataKey: xAxisKey, stroke: theme.palette.text.secondary }), _jsx(YAxis, { stroke: theme.palette.text.secondary, domain: yAxisDomain }), showTooltip && _jsx(RechartsTooltip, { content: _jsx(CustomTooltip, {}) }), showLegend && _jsx(Legend, {}), series.map((item, index) => {
                                switch (item.chartType) {
                                    case 'line':
                                        return (_jsx(Line, { type: "monotone", dataKey: item.dataKey, name: item.name, stroke: item.color, strokeWidth: 2 }, index));
                                    case 'bar':
                                        return (_jsx(Bar, { dataKey: item.dataKey, name: item.name, fill: item.color, radius: [2, 2, 0, 0] }, index));
                                    case 'area':
                                        return (_jsx(Area, { type: "monotone", dataKey: item.dataKey, name: item.name, stroke: item.color, fill: alpha(item.color, 0.6) }, index));
                                    default:
                                        return null;
                                }
                            })] }) }) })] }));
};
export { ChartHeader, CustomTooltip, };
