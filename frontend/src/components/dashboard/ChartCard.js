import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const ChartCard = ({ title, subtitle, children, actions, className = '', loading = false }) => {
    return (_jsxs("div", { className: `bg-white rounded-lg shadow-sm border border-gray-200 ${className}`, children: [_jsx("div", { className: "px-6 py-4 border-b border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: title }), subtitle && (_jsx("p", { className: "text-sm text-gray-600 mt-1", children: subtitle }))] }), actions && (_jsx("div", { className: "flex items-center space-x-2", children: actions }))] }) }), _jsx("div", { className: "p-6", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }) })) : (children) })] }));
};
export default ChartCard;
