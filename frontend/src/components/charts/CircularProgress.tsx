import React, { useEffect, useState } from 'react'

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  label?: string
  showPercentage?: boolean
  color?: string
  backgroundColor?: string
  animated?: boolean
  showTrail?: boolean
  gradientColors?: {
    start: string
    end: string
  }
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  label,
  showPercentage = true,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  animated = true,
  showTrail = true,
  gradientColors
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  
  useEffect(() => {
    if (animated) {
      const animationDuration = 1000
      const steps = 50
      const stepValue = value / steps
      const stepTime = animationDuration / steps

      let currentStep = 0
      const interval = setInterval(() => {
        currentStep++
        setAnimatedValue(Math.min(stepValue * currentStep, value))
        
        if (currentStep >= steps) {
          clearInterval(interval)
        }
      }, stepTime)

      return () => clearInterval(interval)
    } else {
      setAnimatedValue(value)
    }
  }, [value, animated])

  const percentage = (animatedValue / max) * 100
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const center = size / 2
  
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {gradientColors && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
          </defs>
        )}
        
        {/* Background circle */}
        {showTrail && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gradientColors ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: animated ? 'stroke-dashoffset 0.5s ease-in-out' : 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }}
        />
        
        {/* Glow effect for high values */}
        {percentage > 80 && (
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke={gradientColors ? gradientColors.end : color}
            strokeWidth={1}
            strokeOpacity={0.3}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: animated ? 'stroke-dashoffset 0.5s ease-in-out' : 'none'
            }}
          />
        )}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <div className="text-lg font-bold text-gray-800">
            {Math.round(percentage)}%
          </div>
        )}
        {label && (
          <div className="text-xs text-gray-600 text-center mt-1 max-w-[80px]">
            {label}
          </div>
        )}
        {!showPercentage && !label && (
          <div className="text-lg font-bold text-gray-800">
            {Math.round(animatedValue)}
          </div>
        )}
      </div>
    </div>
  )
}

export default CircularProgress