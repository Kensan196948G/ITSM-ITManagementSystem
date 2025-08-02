import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const HeatmapChart = ({ data, title, width = 600, height = 400, cellSize = 40, colorScale = {
    low: '#E0F2FE',
    medium: '#0EA5E9',
    high: '#0C4A6E'
}, showLabels = true, showTooltip = true }) => {
    const [hoveredCell, setHoveredCell] = React.useState(null);
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
    // Get unique x and y values
    const xValues = Array.from(new Set(data.map(d => d.x))).sort();
    const yValues = Array.from(new Set(data.map(d => d.y))).sort();
    // Find min and max values for color scaling
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const getColor = (value) => {
        const normalized = (value - minValue) / (maxValue - minValue);
        if (normalized < 0.33) {
            return colorScale.low;
        }
        else if (normalized < 0.67) {
            return colorScale.medium;
        }
        else {
            return colorScale.high;
        }
    };
    const getIntensity = (value) => {
        const normalized = (value - minValue) / (maxValue - minValue);
        return 0.3 + (normalized * 0.7); // Range from 0.3 to 1.0
    };
    const handleMouseEnter = (cellData, event) => {
        if (showTooltip) {
            setHoveredCell(cellData);
            setMousePosition({ x: event.clientX, y: event.clientY });
        }
    };
    const handleMouseLeave = () => {
        setHoveredCell(null);
    };
    const handleMouseMove = (event) => {
        if (hoveredCell) {
            setMousePosition({ x: event.clientX, y: event.clientY });
        }
    };
    return (_jsxs("div", { className: "relative", children: [title && (_jsx("h3", { className: "text-lg font-semibold text-gray-800 mb-4 text-center", children: title })), _jsxs("div", { className: "relative inline-block", children: [_jsxs("svg", { width: width, height: height, className: "border border-gray-200 rounded-lg", onMouseMove: handleMouseMove, children: [_jsx("defs", { children: _jsx("pattern", { id: "grid", width: cellSize, height: cellSize, patternUnits: "userSpaceOnUse", children: _jsx("path", { d: `M ${cellSize} 0 L 0 0 0 ${cellSize}`, fill: "none", stroke: "#E5E7EB", strokeWidth: "1" }) }) }), _jsx("rect", { width: "100%", height: "100%", fill: "url(#grid)" }), data.map((cellData, index) => {
                                const x = xValues.indexOf(cellData.x) * cellSize + 60; // Offset for labels
                                const y = yValues.indexOf(cellData.y) * cellSize + 40; // Offset for labels
                                const color = getColor(cellData.value);
                                const intensity = getIntensity(cellData.value);
                                return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: cellSize, height: cellSize, fill: color, fillOpacity: intensity, stroke: "#ffffff", strokeWidth: "2", rx: "4", className: "transition-all duration-200 hover:stroke-gray-400 hover:stroke-2 cursor-pointer", onMouseEnter: (e) => handleMouseEnter(cellData, e), onMouseLeave: handleMouseLeave, style: {
                                                filter: hoveredCell === cellData ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' : 'none'
                                            } }), showLabels && (_jsx("text", { x: x + cellSize / 2, y: y + cellSize / 2, textAnchor: "middle", dy: ".35em", className: "text-xs font-medium fill-gray-700 pointer-events-none", children: cellData.value }))] }, index));
                            }), xValues.map((label, index) => (_jsx("text", { x: index * cellSize + cellSize / 2 + 60, y: 30, textAnchor: "middle", className: "text-sm font-medium fill-gray-600", children: label }, `x-${index}`))), yValues.map((label, index) => (_jsx("text", { x: 50, y: index * cellSize + cellSize / 2 + 40, textAnchor: "end", dy: ".35em", className: "text-sm font-medium fill-gray-600", children: label }, `y-${index}`)))] }), _jsxs("div", { className: "absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200", children: [_jsx("div", { className: "text-xs font-medium text-gray-700 mb-2", children: "\u5024\u306E\u7BC4\u56F2" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "w-4 h-4 rounded border border-gray-300", style: { backgroundColor: colorScale.low } }), _jsx("span", { className: "text-xs text-gray-600 mt-1", children: minValue })] }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "w-4 h-4 rounded border border-gray-300", style: { backgroundColor: colorScale.medium } }), _jsx("span", { className: "text-xs text-gray-600 mt-1", children: "\u4E2D\u9593" })] }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "w-4 h-4 rounded border border-gray-300", style: { backgroundColor: colorScale.high } }), _jsx("span", { className: "text-xs text-gray-600 mt-1", children: maxValue })] })] })] })] }), hoveredCell && showTooltip && (_jsxs("div", { className: "fixed z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none", style: {
                    left: mousePosition.x + 10,
                    top: mousePosition.y - 10,
                    transform: 'translate(0, -100%)'
                }, children: [_jsx("div", { className: "font-medium", children: hoveredCell.label || `${hoveredCell.x} × ${hoveredCell.y}` }), _jsxs("div", { children: ["\u5024: ", hoveredCell.value] })] }))] }));
};
export default HeatmapChart;
