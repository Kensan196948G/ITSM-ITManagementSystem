import React from 'react'

interface TreemapData {
  name: string
  value: number
  color?: string
  children?: TreemapData[]
}

interface TreemapChartProps {
  data: TreemapData[]
  width?: number
  height?: number
  title?: string
  colorPalette?: string[]
  showLabels?: boolean
  showValues?: boolean
}

const TreemapChart: React.FC<TreemapChartProps> = ({
  data,
  width = 600,
  height = 400,
  title,
  colorPalette = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ],
  showLabels = true,
  showValues = true
}) => {
  const [hoveredItem, setHoveredItem] = React.useState<TreemapData | null>(null)

  // Simple treemap layout algorithm
  const calculateLayout = (items: TreemapData[], x: number, y: number, width: number, height: number) => {
    const total = items.reduce((sum, item) => sum + item.value, 0)
    const layouts: Array<{ item: TreemapData; x: number; y: number; width: number; height: number; color: string }> = []
    
    let currentX = x
    let currentY = y
    let remainingWidth = width
    let remainingHeight = height
    
    items.forEach((item, index) => {
      const proportion = item.value / total
      const color = item.color || colorPalette[index % colorPalette.length]
      
      if (index === items.length - 1) {
        // Last item takes remaining space
        layouts.push({
          item,
          x: currentX,
          y: currentY,
          width: remainingWidth,
          height: remainingHeight,
          color
        })
      } else {
        // Calculate size based on proportion
        let itemWidth: number
        let itemHeight: number
        
        if (remainingWidth > remainingHeight) {
          // Split horizontally
          itemWidth = remainingWidth * proportion
          itemHeight = remainingHeight
          currentX += itemWidth
          remainingWidth -= itemWidth
        } else {
          // Split vertically
          itemWidth = remainingWidth
          itemHeight = remainingHeight * proportion
          currentY += itemHeight
          remainingHeight -= itemHeight
        }
        
        layouts.push({
          item,
          x: currentX - (remainingWidth > remainingHeight ? itemWidth : 0),
          y: currentY - (remainingWidth > remainingHeight ? 0 : itemHeight),
          width: itemWidth,
          height: itemHeight,
          color
        })
      }
    })
    
    return layouts
  }

  const layouts = calculateLayout(data, 0, 0, width, height)

  const handleMouseEnter = (item: TreemapData) => {
    setHoveredItem(item)
  }

  const handleMouseLeave = () => {
    setHoveredItem(null)
  }

  const getTextColor = (backgroundColor: string) => {
    // Simple logic to determine if text should be light or dark
    const hex = backgroundColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? '#374151' : '#FFFFFF'
  }

  return (
    <div className="relative">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>
      )}
      
      <div className="relative">
        <svg
          width={width}
          height={height}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          {layouts.map((layout, index) => {
            const isHovered = hoveredItem === layout.item
            const textColor = getTextColor(layout.color)
            
            return (
              <g key={index}>
                {/* Rectangle */}
                <rect
                  x={layout.x}
                  y={layout.y}
                  width={layout.width}
                  height={layout.height}
                  fill={layout.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  rx="4"
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' : 'none',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: `${layout.x + layout.width / 2}px ${layout.y + layout.height / 2}px`
                  }}
                  onMouseEnter={() => handleMouseEnter(layout.item)}
                  onMouseLeave={handleMouseLeave}
                />
                
                {/* Labels */}
                {showLabels && layout.width > 60 && layout.height > 40 && (
                  <text
                    x={layout.x + layout.width / 2}
                    y={layout.y + layout.height / 2 - (showValues ? 8 : 0)}
                    textAnchor="middle"
                    dy=".35em"
                    fill={textColor}
                    className="text-sm font-medium pointer-events-none"
                    style={{
                      fontSize: Math.min(layout.width / 8, layout.height / 4, 14)
                    }}
                  >
                    {layout.item.name}
                  </text>
                )}
                
                {/* Values */}
                {showValues && layout.width > 60 && layout.height > 40 && (
                  <text
                    x={layout.x + layout.width / 2}
                    y={layout.y + layout.height / 2 + (showLabels ? 12 : 0)}
                    textAnchor="middle"
                    dy=".35em"
                    fill={textColor}
                    className="text-xs font-bold pointer-events-none"
                    style={{
                      fontSize: Math.min(layout.width / 10, layout.height / 6, 12)
                    }}
                  >
                    {layout.item.value}
                  </text>
                )}
                
                {/* Small items get minimal labels */}
                {(layout.width <= 60 || layout.height <= 40) && layout.width > 30 && layout.height > 20 && (
                  <text
                    x={layout.x + layout.width / 2}
                    y={layout.y + layout.height / 2}
                    textAnchor="middle"
                    dy=".35em"
                    fill={textColor}
                    className="text-xs font-bold pointer-events-none"
                    style={{
                      fontSize: Math.min(layout.width / 4, layout.height / 2, 10)
                    }}
                  >
                    {layout.item.value}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        
        {/* Tooltip */}
        {hoveredItem && (
          <div className="absolute top-4 right-4 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10">
            <div className="font-medium">{hoveredItem.name}</div>
            <div>値: {hoveredItem.value}</div>
            <div>割合: {((hoveredItem.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: item.color || colorPalette[index % colorPalette.length] }}
            />
            <span className="text-sm text-gray-700">{item.name} ({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TreemapChart