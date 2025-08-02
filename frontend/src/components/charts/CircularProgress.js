import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const CircularProgress = ({ value, max = 100, size = 120, strokeWidth = 8, label, showPercentage = true, color = '#3B82F6', backgroundColor = '#E5E7EB', animated = true, showTrail = true, gradientColors }) => {
    const [animatedValue, setAnimatedValue] = useState(0);
    useEffect(() => {
        if (animated) {
            const animationDuration = 1000;
            const steps = 50;
            const stepValue = value / steps;
            const stepTime = animationDuration / steps;
            let currentStep = 0;
            const interval = setInterval(() => {
                currentStep++;
                setAnimatedValue(Math.min(stepValue * currentStep, value));
                if (currentStep >= steps) {
                    clearInterval(interval);
                }
            }, stepTime);
            return () => clearInterval(interval);
        }
        else {
            setAnimatedValue(value);
        }
    }, [value, animated]);
    const percentage = (animatedValue / max) * 100;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const center = size / 2;
    const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
    return (_jsxs("div", { className: "relative inline-flex items-center justify-center", children: [_jsxs("svg", { width: size, height: size, className: "transform -rotate-90", children: [gradientColors && (_jsx("defs", { children: _jsxs("linearGradient", { id: gradientId, x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: [_jsx("stop", { offset: "0%", stopColor: gradientColors.start }), _jsx("stop", { offset: "100%", stopColor: gradientColors.end })] }) })), showTrail && (_jsx("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: backgroundColor, strokeWidth: strokeWidth, strokeLinecap: "round" })), _jsx("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: gradientColors ? `url(#${gradientId})` : color, strokeWidth: strokeWidth, strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: strokeDashoffset, style: {
                            transition: animated ? 'stroke-dashoffset 0.5s ease-in-out' : 'none',
                            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                        } }), percentage > 80 && (_jsx("circle", { cx: center, cy: center, r: radius + 2, fill: "none", stroke: gradientColors ? gradientColors.end : color, strokeWidth: 1, strokeOpacity: 0.3, strokeDasharray: circumference, strokeDashoffset: strokeDashoffset, style: {
                            transition: animated ? 'stroke-dashoffset 0.5s ease-in-out' : 'none'
                        } }))] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [showPercentage && (_jsxs("div", { className: "text-lg font-bold text-gray-800", children: [Math.round(percentage), "%"] })), label && (_jsx("div", { className: "text-xs text-gray-600 text-center mt-1 max-w-[80px]", children: label })), !showPercentage && !label && (_jsx("div", { className: "text-lg font-bold text-gray-800", children: Math.round(animatedValue) }))] })] }));
};
export default CircularProgress;
