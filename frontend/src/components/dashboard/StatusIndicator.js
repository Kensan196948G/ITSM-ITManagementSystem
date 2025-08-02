import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const StatusIndicator = ({ status, label, size = 'md', showLabel = true }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'online':
            case 'operational':
            case 'healthy':
            case 'connected':
                return 'bg-green-500';
            case 'warning':
            case 'degraded':
            case 'slow':
                return 'bg-yellow-500';
            case 'offline':
            case 'outage':
            case 'critical':
            case 'disconnected':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'online':
                return 'オンライン';
            case 'offline':
                return 'オフライン';
            case 'warning':
                return '警告';
            case 'operational':
                return '正常';
            case 'degraded':
                return '低下';
            case 'outage':
                return '停止';
            case 'healthy':
                return '正常';
            case 'critical':
                return '重大';
            case 'connected':
                return '接続中';
            case 'disconnected':
                return '切断';
            case 'slow':
                return '低速';
            default:
                return '不明';
        }
    };
    const getSizeClasses = (size) => {
        switch (size) {
            case 'sm':
                return 'w-2 h-2';
            case 'lg':
                return 'w-4 h-4';
            default:
                return 'w-3 h-3';
        }
    };
    return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: `rounded-full ${getStatusColor(status)} ${getSizeClasses(size)}`, "aria-label": `Status: ${getStatusText(status)}` }), showLabel && (_jsx("span", { className: "text-sm text-gray-700", children: label || getStatusText(status) }))] }));
};
export default StatusIndicator;
