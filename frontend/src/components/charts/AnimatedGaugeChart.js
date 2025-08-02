import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const AnimatedGaugeChart = ({ value, max, title, unit = '', size = 200, thickness = 20, colors = {
    good: '#10B981',
    warning: '#F59E0B',
    critical: '#EF4444'
}, animated = true }) => {
    const [animatedValue, setAnimatedValue] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    useEffect(() => {
        if (animated) {
            setIsAnimating(true);
            const animationDuration = 1500;
            const steps = 60;
            const stepValue = value / steps;
            const stepTime = animationDuration / steps;
            let currentStep = 0;
            const interval = setInterval(() => {
                currentStep++;
                setAnimatedValue(Math.min(stepValue * currentStep, value));
                if (currentStep >= steps) {
                    clearInterval(interval);
                    setIsAnimating(false);
                }
            }, stepTime);
            return () => clearInterval(interval);
        }
        else {
            setAnimatedValue(value);
        }
    }, [value, animated]);
    const percentage = (animatedValue / max) * 100;
    const strokeDasharray = 2 * Math.PI * (size / 2 - thickness / 2);
    const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;
    const getColor = () => {
        if (percentage >= 80)
            return colors.critical;
        if (percentage >= 60)
            return colors.warning;
        return colors.good;
    };
    const center = size / 2;
    const radius = center - thickness / 2;
    return (_jsxs("div", { className: "flex flex-col items-center", children: [_jsxs("div", { className: "relative", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, className: "transform -rotate-90", children: [_jsx("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: "#E5E7EB", strokeWidth: thickness }), _jsx("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: getColor(), strokeWidth: thickness, strokeLinecap: "round", strokeDasharray: strokeDasharray, strokeDashoffset: strokeDashoffset, style: {
                                    transition: animated ? 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease' : 'none',
                                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
                                } }), _jsx("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: getColor(), strokeWidth: 2, strokeOpacity: 0.3, strokeDasharray: strokeDasharray, strokeDashoffset: strokeDashoffset, style: {
                                    transition: animated ? 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease' : 'none'
                                } })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsxs("div", { className: `text-3xl font-bold transition-colors duration-300 ${percentage >= 80 ? 'text-red-600' :
                                    percentage >= 60 ? 'text-yellow-600' : 'text-green-600'}`, children: [Math.round(animatedValue), unit] }), _jsxs("div", { className: "text-sm text-gray-500 mt-1", children: [percentage.toFixed(1), "%"] })] }), percentage >= 80 && (_jsx("div", { className: "absolute inset-0 rounded-full border-4 border-red-400 animate-pulse opacity-50" }))] }), _jsx("h3", { className: "text-lg font-semibold text-gray-800 mt-4 text-center", children: title }), _jsxs("div", { className: "flex items-center space-x-4 mt-2 text-sm", children: [_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-green-500" }), _jsx("span", { className: "text-gray-600", children: "\u826F\u597D (0-59%)" })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-yellow-500" }), _jsx("span", { className: "text-gray-600", children: "\u6CE8\u610F (60-79%)" })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-red-500" }), _jsx("span", { className: "text-gray-600", children: "\u5371\u967A (80%+)" })] })] })] }));
};
export default AnimatedGaugeChart;
