import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface GradientAreaChartProps {
  data: Array<{
    [key: string]: any
  }>
  dataKey: string
  xAxisKey: string
  title?: string
  gradientColors: {
    start: string
    end: string
  }
  height?: number
  animated?: boolean
}

const GradientAreaChart: React.FC<GradientAreaChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  title,
  gradientColors,
  height = 300,
  animated = true
}) => {
  const gradientId = `gradient-${dataKey}-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColors.start} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={gradientColors.end} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={gradientColors.start}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            animationDuration={animated ? 1000 : 0}
            animationEasing="ease-out"
            dot={{ 
              fill: gradientColors.start, 
              strokeWidth: 2, 
              r: 4,
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
            }}
            activeDot={{ 
              r: 6, 
              fill: gradientColors.start,
              stroke: '#ffffff',
              strokeWidth: 2,
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default GradientAreaChart