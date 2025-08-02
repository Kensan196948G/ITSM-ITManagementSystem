/**
 * カスタムチャートコンポーネント
 * Recharts を使用した高度なチャート機能を提供
 */

import React, { useMemo, useState, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  useTheme,
  alpha,
  Tooltip,
  Paper,
  Grid,
  Stack,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  GetApp as ExportIcon,
  ZoomIn as ZoomInIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Scatter,
  ScatterChart,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'

export interface ChartDataPoint {
  [key: string]: any
}

export interface ChartSeries {
  dataKey: string
  name: string
  color: string
  type?: 'line' | 'bar' | 'area'
  stackId?: string
  fill?: string
  stroke?: string
}

export interface BaseChartProps {
  data: ChartDataPoint[]
  title?: string
  subtitle?: string
  height?: number
  width?: string | number
  loading?: boolean
  error?: string
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  className?: string
  onDataPointClick?: (data: ChartDataPoint, index: number) => void
  onExport?: (type: 'png' | 'svg' | 'pdf') => void
  onRefresh?: () => void
  actions?: React.ReactNode
}

export interface LineChartProps extends BaseChartProps {
  lines: ChartSeries[]
  smooth?: boolean
  dots?: boolean
  strokeWidth?: number
  xAxisKey: string
  yAxisDomain?: [number, number]
}

export interface BarChartProps extends BaseChartProps {
  bars: ChartSeries[]
  orientation?: 'horizontal' | 'vertical'
  stacked?: boolean
  xAxisKey: string
  yAxisDomain?: [number, number]
}

export interface PieChartProps extends BaseChartProps {
  dataKey: string
  nameKey: string
  innerRadius?: number
  outerRadius?: number
  showLabels?: boolean
  showValues?: boolean
}

export interface AreaChartProps extends BaseChartProps {
  areas: ChartSeries[]
  stacked?: boolean
  xAxisKey: string
  yAxisDomain?: [number, number]
}

export interface DonutChartProps extends PieChartProps {
  centerLabel?: string
  centerValue?: string | number
}

export interface GaugeChartProps extends BaseChartProps {
  value: number
  min?: number
  max?: number
  unit?: string
  thresholds?: Array<{ value: number; color: string; label?: string }>
}

// チャート用の共通ヘッダーコンポーネント
const ChartHeader: React.FC<{
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  onExport?: (type: 'png' | 'svg' | 'pdf') => void
  onRefresh?: () => void
}> = ({ title, subtitle, actions, onExport, onRefresh }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuClose = () => setAnchorEl(null)

  return (
    <CardHeader
      title={title && <Typography variant="h6">{title}</Typography>}
      subheader={subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {actions}
          {(onExport || onRefresh) && (
            <>
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <MoreVertIcon />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                {onRefresh && (
                  <MenuItem onClick={() => { onRefresh(); handleMenuClose() }}>
                    <RefreshIcon sx={{ mr: 1 }} fontSize="small" />
                    更新
                  </MenuItem>
                )}
                {onExport && (
                  <MenuItem onClick={() => { onExport('png'); handleMenuClose() }}>
                    <ExportIcon sx={{ mr: 1 }} fontSize="small" />
                    PNG保存
                  </MenuItem>
                )}
                {onExport && (
                  <MenuItem onClick={() => { onExport('svg'); handleMenuClose() }}>
                    <ExportIcon sx={{ mr: 1 }} fontSize="small" />
                    SVG保存
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      }
    />
  )
}

// カスタムツールチップ
const CustomTooltip: React.FC<any> = ({ active, payload, label, formatter }) => {
  const theme = useTheme()
  
  if (active && payload && payload.length) {
    return (
      <Paper
        elevation={8}
        sx={{
          p: 2,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {label && (
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
        )}
        {payload.map((entry: any, index: number) => (
          <Typography
            key={index}
            variant="body2"
            sx={{ color: entry.color }}
          >
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </Typography>
        ))}
      </Paper>
    )
  }
  return null
}

// ライン チャート
export const CustomLineChart: React.FC<LineChartProps> = ({
  data,
  lines,
  title,
  subtitle,
  height = 300,
  smooth = true,
  dots = false,
  strokeWidth = 2,
  xAxisKey,
  yAxisDomain,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  onDataPointClick,
  onExport,
  onRefresh,
  actions,
  className,
}) => {
  const theme = useTheme()

  return (
    <Card className={className}>
      <ChartHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        onExport={onExport}
        onRefresh={onRefresh}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} onClick={onDataPointClick}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
            <XAxis dataKey={xAxisKey} stroke={theme.palette.text.secondary} />
            <YAxis stroke={theme.palette.text.secondary} domain={yAxisDomain} />
            {showTooltip && <RechartsTooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {lines.map((line, index) => (
              <Line
                key={index}
                type={smooth ? 'monotone' : 'linear'}
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={strokeWidth}
                dot={dots}
                activeDot={{ r: 6, fill: line.color }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// バー チャート
export const CustomBarChart: React.FC<BarChartProps> = ({
  data,
  bars,
  title,
  subtitle,
  height = 300,
  orientation = 'vertical',
  stacked = false,
  xAxisKey,
  yAxisDomain,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  onDataPointClick,
  onExport,
  onRefresh,
  actions,
  className,
}) => {
  const theme = useTheme()

  return (
    <Card className={className}>
      <ChartHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        onExport={onExport}
        onRefresh={onRefresh}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} onClick={onDataPointClick}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
            <XAxis dataKey={xAxisKey} stroke={theme.palette.text.secondary} />
            <YAxis stroke={theme.palette.text.secondary} domain={yAxisDomain} />
            {showTooltip && <RechartsTooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {bars.map((bar, index) => (
              <Bar
                key={index}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color}
                stackId={stacked ? bar.stackId || 'stack' : undefined}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// パイ チャート
export const CustomPieChart: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  title,
  subtitle,
  height = 300,
  innerRadius = 0,
  outerRadius,
  showLabels = true,
  showValues = true,
  showLegend = true,
  showTooltip = true,
  onDataPointClick,
  onExport,
  onRefresh,
  actions,
  className,
}) => {
  const theme = useTheme()
  const colors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ]

  const renderLabel = (entry: any) => {
    if (!showLabels) return ''
    return `${entry[nameKey]}${showValues ? `: ${entry[dataKey]}` : ''}`
  }

  return (
    <Card className={className}>
      <ChartHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        onExport={onExport}
        onRefresh={onRefresh}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={outerRadius || 80}
              innerRadius={innerRadius}
              fill="#8884d8"
              dataKey={dataKey}
              onClick={onDataPointClick}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && <RechartsTooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// エリア チャート
export const CustomAreaChart: React.FC<AreaChartProps> = ({
  data,
  areas,
  title,
  subtitle,
  height = 300,
  stacked = false,
  xAxisKey,
  yAxisDomain,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  onDataPointClick,
  onExport,
  onRefresh,
  actions,
  className,
}) => {
  const theme = useTheme()

  return (
    <Card className={className}>
      <ChartHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        onExport={onExport}
        onRefresh={onRefresh}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} onClick={onDataPointClick}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
            <XAxis dataKey={xAxisKey} stroke={theme.palette.text.secondary} />
            <YAxis stroke={theme.palette.text.secondary} domain={yAxisDomain} />
            {showTooltip && <RechartsTooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {areas.map((area, index) => (
              <Area
                key={index}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name}
                stackId={stacked ? area.stackId || 'stack' : undefined}
                stroke={area.color}
                fill={alpha(area.color, 0.6)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ドーナツ チャート
export const CustomDonutChart: React.FC<DonutChartProps> = ({
  data,
  dataKey,
  nameKey,
  title,
  subtitle,
  height = 300,
  centerLabel,
  centerValue,
  showLabels = false,
  showValues = true,
  showLegend = true,
  showTooltip = true,
  onDataPointClick,
  onExport,
  onRefresh,
  actions,
  className,
}) => {
  const theme = useTheme()
  const colors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ]

  return (
    <Card className={className}>
      <ChartHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        onExport={onExport}
        onRefresh={onRefresh}
      />
      <CardContent>
        <Box sx={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey={dataKey}
                onClick={onDataPointClick}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {showTooltip && <RechartsTooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
          
          {/* 中央のラベル */}
          {(centerLabel || centerValue) && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              {centerValue && (
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {centerValue}
                </Typography>
              )}
              {centerLabel && (
                <Typography variant="body2" color="text.secondary">
                  {centerLabel}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

// ゲージ チャート
export const CustomGaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min = 0,
  max = 100,
  unit = '%',
  title,
  subtitle,
  height = 200,
  thresholds = [
    { value: 70, color: '#ff4444', label: '危険' },
    { value: 50, color: '#ffaa00', label: '警告' },
    { value: 0, color: '#00aa00', label: '正常' },
  ],
  onExport,
  onRefresh,
  actions,
  className,
}) => {
  const theme = useTheme()
  
  const normalizedValue = Math.min(Math.max(value, min), max)
  const percentage = ((normalizedValue - min) / (max - min)) * 100
  
  const getColor = () => {
    for (const threshold of thresholds.sort((a, b) => b.value - a.value)) {
      if (normalizedValue >= threshold.value) {
        return threshold.color
      }
    }
    return theme.palette.primary.main
  }

  const data = [{ value: percentage, fill: getColor() }]

  return (
    <Card className={className}>
      <ChartHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        onExport={onExport}
        onRefresh={onRefresh}
      />
      <CardContent>
        <Box sx={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={height}>
            <RadialBarChart cx="50%" cy="70%" innerRadius="60%" outerRadius="90%" data={data} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" cornerRadius={10} fill={getColor()} />
            </RadialBarChart>
          </ResponsiveContainer>
          
          {/* 中央の値表示 */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 700, color: getColor() }}>
              {normalizedValue}{unit}
            </Typography>
          </Box>
        </Box>
        
        {/* しきい値の凡例 */}
        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'center' }}>
          {thresholds.map((threshold, index) => (
            <Chip
              key={index}
              label={`${threshold.label}: ${threshold.value}${unit}以上`}
              size="small"
              sx={{
                backgroundColor: alpha(threshold.color, 0.1),
                color: threshold.color,
                border: `1px solid ${threshold.color}`,
              }}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

// 複合チャート
export const CustomComposedChart: React.FC<{
  data: ChartDataPoint[]
  series: (ChartSeries & { chartType: 'line' | 'bar' | 'area' })[]
  title?: string
  subtitle?: string
  height?: number
  xAxisKey: string
  yAxisDomain?: [number, number]
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  onDataPointClick?: (data: ChartDataPoint, index: number) => void
  onExport?: (type: 'png' | 'svg' | 'pdf') => void
  onRefresh?: () => void
  actions?: React.ReactNode
  className?: string
}> = ({
  data,
  series,
  title,
  subtitle,
  height = 300,
  xAxisKey,
  yAxisDomain,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  onDataPointClick,
  onExport,
  onRefresh,
  actions,
  className,
}) => {
  const theme = useTheme()

  return (
    <Card className={className}>
      <ChartHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        onExport={onExport}
        onRefresh={onRefresh}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} onClick={onDataPointClick}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
            <XAxis dataKey={xAxisKey} stroke={theme.palette.text.secondary} />
            <YAxis stroke={theme.palette.text.secondary} domain={yAxisDomain} />
            {showTooltip && <RechartsTooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {series.map((item, index) => {
              switch (item.chartType) {
                case 'line':
                  return (
                    <Line
                      key={index}
                      type="monotone"
                      dataKey={item.dataKey}
                      name={item.name}
                      stroke={item.color}
                      strokeWidth={2}
                    />
                  )
                case 'bar':
                  return (
                    <Bar
                      key={index}
                      dataKey={item.dataKey}
                      name={item.name}
                      fill={item.color}
                      radius={[2, 2, 0, 0]}
                    />
                  )
                case 'area':
                  return (
                    <Area
                      key={index}
                      type="monotone"
                      dataKey={item.dataKey}
                      name={item.name}
                      stroke={item.color}
                      fill={alpha(item.color, 0.6)}
                    />
                  )
                default:
                  return null
              }
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export {
  ChartHeader,
  CustomTooltip,
}