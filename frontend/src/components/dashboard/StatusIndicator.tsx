import React from 'react'

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'operational' | 'degraded' | 'outage' | 'healthy' | 'critical' | 'connected' | 'disconnected' | 'slow'
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  showLabel = true
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'operational':
      case 'healthy':
      case 'connected':
        return 'bg-green-500'
      case 'warning':
      case 'degraded':
      case 'slow':
        return 'bg-yellow-500'
      case 'offline':
      case 'outage':
      case 'critical':
      case 'disconnected':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'オンライン'
      case 'offline':
        return 'オフライン'
      case 'warning':
        return '警告'
      case 'operational':
        return '正常'
      case 'degraded':
        return '低下'
      case 'outage':
        return '停止'
      case 'healthy':
        return '正常'
      case 'critical':
        return '重大'
      case 'connected':
        return '接続中'
      case 'disconnected':
        return '切断'
      case 'slow':
        return '低速'
      default:
        return '不明'
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2'
      case 'lg':
        return 'w-4 h-4'
      default:
        return 'w-3 h-3'
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`rounded-full ${getStatusColor(status)} ${getSizeClasses(size)}`}
        aria-label={`Status: ${getStatusText(status)}`}
      />
      {showLabel && (
        <span className="text-sm text-gray-700">
          {label || getStatusText(status)}
        </span>
      )}
    </div>
  )
}

export default StatusIndicator