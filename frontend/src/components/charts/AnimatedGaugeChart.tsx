import React, { useEffect, useState } from 'react'

interface AnimatedGaugeChartProps {
  value: number
  max: number
  title: string
  unit?: string
  size?: number
  thickness?: number
  colors?: {
    good: string
    warning: string
    critical: string
  }
  animated?: boolean
}

const AnimatedGaugeChart: React.FC<AnimatedGaugeChartProps> = ({
  value,
  max,
  title,
  unit = '',
  size = 200,
  thickness = 20,
  colors = {
    good: '#10B981',
    warning: '#F59E0B',
    critical: '#EF4444'
  },
  animated = true
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (animated) {
      setIsAnimating(true)
      const animationDuration = 1500
      const steps = 60
      const stepValue = value / steps
      const stepTime = animationDuration / steps

      let currentStep = 0
      const interval = setInterval(() => {
        currentStep++
        setAnimatedValue(Math.min(stepValue * currentStep, value))
        
        if (currentStep >= steps) {
          clearInterval(interval)
          setIsAnimating(false)
        }
      }, stepTime)

      return () => clearInterval(interval)
    } else {
      setAnimatedValue(value)
    }
  }, [value, animated])

  const percentage = (animatedValue / max) * 100
  const strokeDasharray = 2 * Math.PI * (size / 2 - thickness / 2)
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray

  const getColor = () => {
    if (percentage >= 80) return colors.critical
    if (percentage >= 60) return colors.warning
    return colors.good
  }

  const center = size / 2
  const radius = center - thickness / 2

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={thickness}
          />
          
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: animated ? 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease' : 'none',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
            }}
          />
          
          {/* Glow effect */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={2}
            strokeOpacity={0.3}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: animated ? 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease' : 'none'
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-3xl font-bold transition-colors duration-300 ${
            percentage >= 80 ? 'text-red-600' :
            percentage >= 60 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {Math.round(animatedValue)}{unit}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {percentage.toFixed(1)}%
          </div>
        </div>
        
        {/* Pulse animation for critical values */}
        {percentage >= 80 && (
          <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-pulse opacity-50" />
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-800 mt-4 text-center">{title}</h3>
      
      {/* Status indicators */}
      <div className="flex items-center space-x-4 mt-2 text-sm">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">良好 (0-59%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600">注意 (60-79%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600">危険 (80%+)</span>
        </div>
      </div>
    </div>
  )
}

export default AnimatedGaugeChart