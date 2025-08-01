import React from 'react'

interface HeatmapData {
  x: string
  y: string
  value: number
  label?: string
}

interface HeatmapChartProps {
  data: HeatmapData[]
  title?: string
  width?: number
  height?: number
  cellSize?: number
  colorScale?: {
    low: string
    medium: string
    high: string
  }
  showLabels?: boolean
  showTooltip?: boolean
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  title,
  width = 600,
  height = 400,
  cellSize = 40,
  colorScale = {
    low: '#E0F2FE',
    medium: '#0EA5E9',
    high: '#0C4A6E'
  },
  showLabels = true,
  showTooltip = true
}) => {
  const [hoveredCell, setHoveredCell] = React.useState<HeatmapData | null>(null)
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })

  // Get unique x and y values
  const xValues = Array.from(new Set(data.map(d => d.x))).sort()
  const yValues = Array.from(new Set(data.map(d => d.y))).sort()
  
  // Find min and max values for color scaling
  const values = data.map(d => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  
  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue)
    
    if (normalized < 0.33) {
      return colorScale.low
    } else if (normalized < 0.67) {
      return colorScale.medium
    } else {
      return colorScale.high
    }
  }
  
  const getIntensity = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue)
    return 0.3 + (normalized * 0.7) // Range from 0.3 to 1.0
  }

  const handleMouseEnter = (cellData: HeatmapData, event: React.MouseEvent) => {
    if (showTooltip) {
      setHoveredCell(cellData)
      setMousePosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleMouseLeave = () => {
    setHoveredCell(null)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredCell) {
      setMousePosition({ x: event.clientX, y: event.clientY })
    }
  }

  return (
    <div className="relative">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>
      )}
      
      <div className="relative inline-block">
        <svg
          width={width}
          height={height}
          className="border border-gray-200 rounded-lg"
          onMouseMove={handleMouseMove}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
              <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke="#E5E7EB" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Heatmap cells */}
          {data.map((cellData, index) => {
            const x = xValues.indexOf(cellData.x) * cellSize + 60 // Offset for labels
            const y = yValues.indexOf(cellData.y) * cellSize + 40 // Offset for labels
            const color = getColor(cellData.value)
            const intensity = getIntensity(cellData.value)
            
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={color}
                  fillOpacity={intensity}
                  stroke="#ffffff"
                  strokeWidth="2"
                  rx="4"
                  className="transition-all duration-200 hover:stroke-gray-400 hover:stroke-2 cursor-pointer"
                  onMouseEnter={(e) => handleMouseEnter(cellData, e)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    filter: hoveredCell === cellData ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' : 'none'
                  }}
                />
                
                {/* Cell labels */}
                {showLabels && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2}
                    textAnchor="middle"
                    dy=".35em"
                    className="text-xs font-medium fill-gray-700 pointer-events-none"
                  >
                    {cellData.value}
                  </text>
                )}
              </g>
            )
          })}
          
          {/* X-axis labels */}
          {xValues.map((label, index) => (
            <text
              key={`x-${index}`}
              x={index * cellSize + cellSize / 2 + 60}
              y={30}
              textAnchor="middle"
              className="text-sm font-medium fill-gray-600"
            >
              {label}
            </text>
          ))}
          
          {/* Y-axis labels */}
          {yValues.map((label, index) => (
            <text
              key={`y-${index}`}
              x={50}
              y={index * cellSize + cellSize / 2 + 40}
              textAnchor="end"
              dy=".35em"
              className="text-sm font-medium fill-gray-600"
            >
              {label}
            </text>
          ))}
        </svg>
        
        {/* Color legend */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">値の範囲</div>
          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-center">
              <div 
                className="w-4 h-4 rounded border border-gray-300" 
                style={{ backgroundColor: colorScale.low }}
              />
              <span className="text-xs text-gray-600 mt-1">{minValue}</span>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className="w-4 h-4 rounded border border-gray-300" 
                style={{ backgroundColor: colorScale.medium }}
              />
              <span className="text-xs text-gray-600 mt-1">中間</span>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className="w-4 h-4 rounded border border-gray-300" 
                style={{ backgroundColor: colorScale.high }}
              />
              <span className="text-xs text-gray-600 mt-1">{maxValue}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {hoveredCell && showTooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: 'translate(0, -100%)'
          }}
        >
          <div className="font-medium">{hoveredCell.label || `${hoveredCell.x} × ${hoveredCell.y}`}</div>
          <div>値: {hoveredCell.value}</div>
        </div>
      )}
    </div>
  )
}

export default HeatmapChart