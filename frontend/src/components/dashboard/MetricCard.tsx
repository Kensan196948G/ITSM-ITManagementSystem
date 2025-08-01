import React from 'react'
import { MetricCard as MetricCardType } from '../../types/dashboard'

interface MetricCardProps {
  metric: MetricCardType
  onClick?: () => void
  className?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, onClick, className = '' }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'good':
        return 'border-green-500 bg-green-50'
      case 'warning':
        return 'border-yellow-500 bg-yellow-50'
      case 'critical':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-blue-500 bg-blue-50'
    }
  }

  const getTrendColor = (direction?: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendIcon = (direction?: string) => {
    switch (direction) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      default:
        return '→'
    }
  }

  return (
    <div
      className={`p-6 border-l-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${getStatusColor(metric.status)} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`${metric.title}: ${metric.value}${metric.unit || ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.title}</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">
              {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
            </span>
            {metric.unit && (
              <span className="text-sm text-gray-500">{metric.unit}</span>
            )}
          </div>
          {metric.trend && (
            <div className={`flex items-center space-x-1 mt-2 text-sm ${getTrendColor(metric.trend.direction)}`}>
              <span>{getTrendIcon(metric.trend.direction)}</span>
              <span>{metric.trend.percentage}%</span>
              <span className="text-gray-500">({metric.trend.period})</span>
            </div>
          )}
        </div>
        {metric.icon && (
          <div className="text-2xl text-gray-400">
            {metric.icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default MetricCard