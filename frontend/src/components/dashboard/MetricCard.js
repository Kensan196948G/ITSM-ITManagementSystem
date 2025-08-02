import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const MetricCard = ({ metric, onClick, className = '' }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'good':
                return 'border-green-500 bg-green-50';
            case 'warning':
                return 'border-yellow-500 bg-yellow-50';
            case 'critical':
                return 'border-red-500 bg-red-50';
            default:
                return 'border-blue-500 bg-blue-50';
        }
    };
    const getTrendColor = (direction) => {
        switch (direction) {
            case 'up':
                return 'text-green-600';
            case 'down':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };
    const getTrendIcon = (direction) => {
        switch (direction) {
            case 'up':
                return '↗';
            case 'down':
                return '↘';
            default:
                return '→';
        }
    };
    return (_jsx("div", { className: `p-6 border-l-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${getStatusColor(metric.status)} ${onClick ? 'cursor-pointer' : ''} ${className}`, onClick: onClick, role: onClick ? 'button' : undefined, tabIndex: onClick ? 0 : undefined, onKeyDown: onClick ? (e) => e.key === 'Enter' && onClick() : undefined, "aria-label": `${metric.title}: ${metric.value}${metric.unit || ''}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-sm font-medium text-gray-600 mb-1", children: metric.title }), _jsxs("div", { className: "flex items-baseline space-x-2", children: [_jsx("span", { className: "text-3xl font-bold text-gray-900", children: typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value }), metric.unit && (_jsx("span", { className: "text-sm text-gray-500", children: metric.unit }))] }), metric.trend && (_jsxs("div", { className: `flex items-center space-x-1 mt-2 text-sm ${getTrendColor(metric.trend.direction)}`, children: [_jsx("span", { children: getTrendIcon(metric.trend.direction) }), _jsxs("span", { children: [metric.trend.percentage, "%"] }), _jsxs("span", { className: "text-gray-500", children: ["(", metric.trend.period, ")"] })] }))] }), metric.icon && (_jsx("div", { className: "text-2xl text-gray-400", children: metric.icon }))] }) }));
};
export default MetricCard;
