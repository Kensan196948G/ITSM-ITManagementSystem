import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  ComposedChart, Scatter, ScatterChart, Treemap, FunnelChart, Funnel, LabelList 
} from 'recharts'
import {
  Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Divider, Chip,
  LinearProgress, useTheme, Tabs, Tab, Button, useMediaQuery, Stack, Alert,
  Skeleton, Badge, Tooltip as MuiTooltip, FormControl, InputLabel, Select, MenuItem,
  Fab, alpha, CircularProgress, Paper, TableContainer, Table, TableHead, TableRow,
  TableCell, TableBody, TablePagination
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon, Refresh as RefreshIcon, Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon, Speed as SpeedIcon, Memory as MemoryIcon,
  Storage as StorageIcon, NetworkCheck as NetworkIcon, Security as SecurityIcon,
  BugReport as BugIcon, Build as BuildIcon, AutoFixHigh as AutoFixIcon,
  CheckCircle as CheckCircleIcon, Warning as WarningIcon, Error as ErrorIcon,
  Schedule as ScheduleIcon, Assignment as AssignmentIcon, Group as GroupIcon,
  ShowChart as ChartIcon, Timeline as TimelineIcon, TableChart as TableIcon,
  BarChart as BarChartIcon, DonutLarge as DonutIcon, PieChart as PieChartIcon,
  Assessment as ReportIcon, MonitorHeart as MonitorIcon, CloudQueue as CloudIcon,
  DataUsage as DataIcon, GraphicEq as GraphIcon, Hub as HubIcon
} from '@mui/icons-material'
import { PerformanceData, TimeSeriesData, AgentStats, BottleneckAnalysis } from '../../types/dashboard'
import MetricCard from '../../components/dashboard/MetricCard'
import ChartCard from '../../components/dashboard/ChartCard'
import DataTable, { TableColumn } from '../../components/common/DataTable'
import { gradients, animations, chartColors } from '../../theme/theme'

// 新しいコンポーネントのインターフェース定義
interface EnhancedMetricCardProps {
  title: string
  value: number | string
  unit?: string
  change: number
  changeLabel: string
  target?: number
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'error'
  animated?: boolean
}

interface SemicircleGaugeProps {
  value: number
  max: number
  thresholds: { good: number; warning: number }
  size: number
  animated?: boolean
  title: string
  unit: string
}

interface ImprovementCardProps {
  title: string
  impact: number
  priority: 'high' | 'medium' | 'low'
  suggestions: string[]
  actionable: boolean
}

// 🎨 アイコン豊富な新しいメトリクスカードコンポーネント
const IconRichMetricCard: React.FC<EnhancedMetricCardProps> = React.memo(({
  title,
  value,
  unit = '',
  change,
  changeLabel,
  target,
  icon,
  color,
  animated = true
}) => {
  const theme = useTheme()
  const [animatedValue, setAnimatedValue] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (animated && typeof value === 'number') {
      const duration = 2000
      const steps = 50
      const increment = value / steps
      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setAnimatedValue(value)
          clearInterval(timer)
        } else {
          setAnimatedValue(current)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    } else {
      setAnimatedValue(typeof value === 'number' ? value : 0)
    }
  }, [value, animated])

  const getColorScheme = useCallback((color: string) => {
    switch (color) {
      case 'primary':
        return {
          main: theme.palette.primary.main,
          light: theme.palette.primary.light,
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          icon: '🚀'
        }
      case 'success':
        return {
          main: theme.palette.success.main,
          light: theme.palette.success.light,
          gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          icon: '✅'
        }
      case 'warning':
        return {
          main: theme.palette.warning.main,
          light: theme.palette.warning.light,
          gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          icon: '⚠️'
        }
      case 'error':
        return {
          main: theme.palette.error.main,
          light: theme.palette.error.light,
          gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
          icon: '🔥'
        }
      default:
        return {
          main: theme.palette.grey[600],
          light: theme.palette.grey[400],
          gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          icon: '📊'
        }
    }
  }, [theme])

  const colorScheme = getColorScheme(color)
  const progressPercentage = target ? Math.min((typeof value === 'number' ? value : 0) / target * 100, 100) : 0

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: colorScheme.gradient,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: `0 20px 40px ${alpha(colorScheme.main, 0.3)}`,
        },
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 背景装飾パターン */}
      <Box sx={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha('#fff', 0.1)} 0%, transparent 70%)`,
      }} />
      
      <CardContent sx={{ p: 3, color: 'white', position: 'relative', zIndex: 1 }}>
        {/* ヘッダー部分 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ 
              bgcolor: alpha('#fff', 0.2), 
              width: 48, 
              height: 48,
              fontSize: '1.5rem'
            }}>
              {colorScheme.icon}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                {title}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ fontSize: '2rem', opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
        
        {/* メイン値表示 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            mb: 0.5,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {animated && mounted ? 
              (typeof value === 'number' ? 
                animatedValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) : 
                value
              ) : 
              (typeof value === 'number' ? value.toLocaleString() : value)
            }
            <Typography component="span" variant="h5" sx={{ ml: 1, opacity: 0.8 }}>
              {unit}
            </Typography>
          </Typography>
        </Box>

        {/* トレンド表示 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ fontSize: '1.2rem' }}>
            {change > 0 ? '📈' : change < 0 ? '📉' : '➡️'}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {change > 0 ? '+' : ''}{change}%
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {changeLabel}
          </Typography>
        </Box>

        {/* 進捗バー */}
        {target && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                目標達成度
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {progressPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage} 
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha('#fff', 0.3),
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#fff',
                  borderRadius: 3,
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  )
})

// 半円形ゲージチャートコンポーネント
const SemicircleGauge: React.FC<SemicircleGaugeProps> = React.memo(({
  value,
  max,
  thresholds,
  size,
  animated = true,
  title,
  unit
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (animated) {
      const duration = 1500
      const steps = 30
      const increment = value / steps
      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setAnimatedValue(value)
          clearInterval(timer)
        } else {
          setAnimatedValue(current)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    } else {
      setAnimatedValue(value)
    }
  }, [value, animated])

  const radius = size / 2 - 20
  const circumference = Math.PI * radius
  const percentage = (animatedValue / max) * 100
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = useCallback((value: number) => {
    if (value <= thresholds.good) return '#10B981'
    if (value <= thresholds.warning) return '#F59E0B'
    return '#EF4444'
  }, [thresholds])

  const currentColor = getColor(animatedValue)

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <svg width={size} height={size / 2 + 40}>
          <path
            d={`M 20 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          <path
            d={`M 20 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2}`}
            fill="none"
            stroke={currentColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: size / 4 }}>
          <div className="text-3xl font-black text-gray-800 mb-1">
            {mounted ? animatedValue.toFixed(1) : value.toFixed(1)}{unit}
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
    </div>
  )
})

// 改善提案カードコンポーネント
const ImprovementCard: React.FC<ImprovementCardProps> = React.memo(({
  title,
  impact,
  priority,
  suggestions,
  actionable
}) => {
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'from-red-50 to-red-100',
          border: 'border-red-200',
          badge: 'bg-red-500 text-white',
          text: 'text-red-800'
        }
      case 'medium':
        return {
          bg: 'from-yellow-50 to-yellow-100',
          border: 'border-yellow-200',
          badge: 'bg-yellow-500 text-white',
          text: 'text-yellow-800'
        }
      case 'low':
        return {
          bg: 'from-green-50 to-green-100',
          border: 'border-green-200',
          badge: 'bg-green-500 text-white',
          text: 'text-green-800'
        }
      default:
        return {
          bg: 'from-gray-50 to-gray-100',
          border: 'border-gray-200',
          badge: 'bg-gray-500 text-white',
          text: 'text-gray-800'
        }
    }
  }, [])

  const colors = getPriorityColor(priority)
  const priorityLabel = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'

  return (
    <div className={`relative p-6 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="absolute top-4 right-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
          優先度: {priorityLabel}
        </span>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-shrink-0">
          <div className={`w-16 h-16 rounded-full bg-white bg-opacity-80 flex items-center justify-center ${colors.text}`}>
            <span className="text-2xl font-bold">{impact}%</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className={`text-xl font-bold ${colors.text} mb-1`}>{title}</h3>
          <p className="text-sm text-gray-600">影響度レベル</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>インパクト</span>
          <span>{impact}%</span>
        </div>
        <div className="w-full bg-white bg-opacity-60 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all duration-1000 ease-out ${
              priority === 'high' ? 'bg-gradient-to-r from-red-400 to-red-600' :
              priority === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
              'bg-gradient-to-r from-green-400 to-green-600'
            }`}
            style={{ width: `${impact}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <h4 className={`font-semibold ${colors.text} mb-3 flex items-center`}>
          <span className="mr-2">🚀</span>
          改善提案
        </h4>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-80 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                {index + 1}
              </span>
              <span className="text-sm text-gray-700">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {actionable && (
        <button className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 hover:transform hover:scale-105 ${
          priority === 'high' ? 'bg-red-500 hover:bg-red-600' :
          priority === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' :
          'bg-green-500 hover:bg-green-600'
        }`}>
          改善施策を実行
        </button>
      )}
    </div>
  )
})

// 📊 多機能データテーブルコンポーネント
const PerformanceDataTable: React.FC<{
  data: any[]
  title: string
  icon: React.ReactNode
}> = ({ data, title, icon }) => {
  const theme = useTheme()
  
  const columns: TableColumn[] = [
    {
      id: 'name',
      label: '名前',
      searchable: true,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
            <GroupIcon />
          </Avatar>
          <Typography variant="body2" fontWeight={600}>{value}</Typography>
        </Box>
      )
    },
    {
      id: 'resolvedTickets',
      label: '解決数',
      align: 'center',
      render: (value) => (
        <Chip 
          label={value} 
          color="primary" 
          variant="outlined"
          icon={<CheckCircleIcon />}
        />
      )
    },
    {
      id: 'avgResolutionTime',
      label: '平均時間',
      align: 'center',
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2">{value}h</Typography>
        </Box>
      )
    },
    {
      id: 'efficiency',
      label: '効率性',
      align: 'center',
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={value} 
            sx={{ 
              width: 60, 
              height: 8, 
              borderRadius: 4,
              bgcolor: alpha(theme.palette.primary.main, 0.1)
            }} 
          />
          <Typography variant="body2" fontWeight={600}>{value}%</Typography>
        </Box>
      )
    },
    {
      id: 'rating',
      label: '評価',
      align: 'center',
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ color: '#FFD700', fontSize: '1.2rem' }}>⭐</Box>
          <Typography variant="body2" fontWeight={600}>{value}</Typography>
        </Box>
      )
    }
  ]

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ 
          p: 2, 
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="h6" fontWeight={600}>{title}</Typography>
          </Box>
        </Box>
        <DataTable
          data={data}
          columns={columns}
          dense
          initialPageSize={5}
          searchable={false}
          filterable={false}
          exportable={true}
        />
      </CardContent>
    </Card>
  )
}

// 🎯 リッチチャートコンポーネント
const RichChartCard: React.FC<{
  title: string
  children: React.ReactNode
  icon: React.ReactNode
  color?: string
  actions?: React.ReactNode
}> = ({ title, children, icon, color = 'primary', actions }) => {
  const theme = useTheme()
  
  return (
    <Card sx={{ 
      height: '100%',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[8]
      },
      transition: 'all 0.3s ease'
    }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ 
          p: 2, 
          background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="h6" fontWeight={600}>{title}</Typography>
          </Box>
          {actions}
        </Box>
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  )
}

const PerformanceAnalytics: React.FC = React.memo(() => {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1d' | '7d' | '30d' | '90d'>('7d')

  // ダミーデータ生成をuseCallbackでメモ化
  const generateMockData = useCallback((): PerformanceData => {
    const resolutionTrend: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 2.5 + Math.random() * 3 + Math.sin(i / 5) * 0.5,
      label: `Day ${i + 1}`
    }))

    const agentPerformance: AgentStats[] = [
      { id: '1', name: '田中 太郎', resolvedTickets: 45, avgResolutionTime: 2.3, efficiency: 92, rating: 4.8 },
      { id: '2', name: '佐藤 花子', resolvedTickets: 38, avgResolutionTime: 2.8, efficiency: 88, rating: 4.6 },
      { id: '3', name: '鈴木 次郎', resolvedTickets: 52, avgResolutionTime: 2.1, efficiency: 95, rating: 4.9 },
      { id: '4', name: '高橋 美咲', resolvedTickets: 41, avgResolutionTime: 2.6, efficiency: 90, rating: 4.7 },
      { id: '5', name: '渡辺 健一', resolvedTickets: 35, avgResolutionTime: 3.2, efficiency: 85, rating: 4.4 }
    ]

    const bottlenecks: BottleneckAnalysis[] = [
      {
        area: 'チケット承認プロセス',
        severity: 'high',
        impact: 35,
        suggestions: ['承認フローの簡素化', '権限委譲の拡大', '自動承認ルールの導入']
      },
      {
        area: 'データベースクエリ',
        severity: 'medium',
        impact: 22,
        suggestions: ['インデックスの最適化', 'クエリの改善', 'キャッシュ戦略の見直し']
      },
      {
        area: 'API レスポンス',
        severity: 'low',
        impact: 15,
        suggestions: ['CDNの活用', 'レスポンス圧縮', 'キャッシュヘッダーの最適化']
      }
    ]

    return {
      ticketMetrics: {
        avgResolutionTime: 2.6,
        resolutionTrend,
        agentPerformance,
        bottlenecks
      },
      systemMetrics: {
        apiResponseTime: 245,
        dbQueryTime: 180,
        serverLoad: 68,
        pageLoadSpeed: 1.8
      },
      businessMetrics: {
        customerSatisfaction: 4.3,
        efficiencyImprovement: 12.5,
        costEfficiency: 89.2,
        roi: 156.7
      }
    }
  }, [])

  useEffect(() => {
    const fetchData = () => {
      setLoading(true)
      setTimeout(() => {
        setData(generateMockData())
        setLoading(false)
      }, 500)
    }

    fetchData()
  }, [selectedTimeframe, generateMockData])

  // ヒートマップデータをuseMemoで計算
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00')
    const days = ['月', '火', '水', '木', '金', '土', '日']
    const heatmapDataArray: Array<{ x: string; y: string; value: number; label: string }> = []
    
    days.forEach(day => {
      hours.forEach(hour => {
        const baseValue = Math.random() * 100
        const dayMultiplier = ['土', '日'].includes(day) ? 0.3 : 1
        const hourMultiplier = parseInt(hour) < 9 || parseInt(hour) > 18 ? 0.5 : 1.2
        const value = Math.round(baseValue * dayMultiplier * hourMultiplier)
        
        heatmapDataArray.push({
          x: hour,
          y: day,
          value: value,
          label: `${day}曜日 ${hour} - パフォーマンス: ${value}%`
        })
      })
    })
    
    return heatmapDataArray
  }, [])

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 3
    }}>
      <Grid container spacing={3}>
        {/* 🎨 ヘッダーセクション - アイコン豊富な新デザイン */}
        <Grid item xs={12}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ 
                    width: 80, 
                    height: 80, 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontSize: '2rem',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)'
                  }}>
                    📊
                  </Avatar>
                  <Box>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 900,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      mb: 1
                    }}>
                      🚀 パフォーマンス分析ダッシュボード
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MonitorIcon />
                      システムとビジネスのパフォーマンス指標をリアルタイム監視・分析
                    </Typography>
                  </Box>
                </Stack>
                
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>📅 期間選択</InputLabel>
                    <Select
                      value={selectedTimeframe}
                      onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                      label="📅 期間選択"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="1d">🕐 24時間</MenuItem>
                      <MenuItem value="7d">📅 7日間</MenuItem>
                      <MenuItem value="30d">📅 30日間</MenuItem>
                      <MenuItem value="90d">📅 90日間</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button
                    variant="contained"
                    onClick={() => window.location.reload()}
                    startIcon={<RefreshIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                        transform: 'scale(1.05)'
                      },
                      transition: 'all 0.2s',
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    更新
                  </Button>
                </Stack>
              </Stack>
              
              {/* ✨ リアルタイムステータス表示 */}
              <Box sx={{ mt: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<CheckCircleIcon />} 
                  label="システム正常" 
                  color="success" 
                  variant="outlined"
                  sx={{ fontSize: '0.9rem', py: 1 }}
                />
                <Chip 
                  icon={<MonitorIcon />} 
                  label="リアルタイム更新中" 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontSize: '0.9rem', py: 1 }}
                />
                <Chip 
                  icon={<ScheduleIcon />} 
                  label={`最終更新: ${new Date().toLocaleTimeString('ja-JP')}`}
                  variant="outlined"
                  sx={{ fontSize: '0.9rem', py: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 📈 KPI メトリクス - アイコン豊富な新デザイン */}
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="チケット平均解決時間"
            value={data.ticketMetrics.avgResolutionTime}
            unit="時間"
            change={-8.2}
            changeLabel="前週比"
            target={4.0}
            icon={<ScheduleIcon />}
            color="success"
            animated={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="API応答時間"
            value={data.systemMetrics.apiResponseTime}
            unit="ms"
            change={5.1}
            changeLabel="前週比"
            target={200}
            icon={<SpeedIcon />}
            color="warning"
            animated={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="顧客満足度"
            value={data.businessMetrics.customerSatisfaction}
            unit="/5.0"
            change={3.2}
            changeLabel="前月比"
            target={5.0}
            icon={<CheckCircleIcon />}
            color="primary"
            animated={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="ROI"
            value={data.businessMetrics.roi}
            unit="%"
            change={12.4}
            changeLabel="前四半期比"
            target={200}
            icon={<TrendingUpIcon />}
            color="success"
            animated={true}
          />
        </Grid>

        {/* 📊 チャートセクション - アイコン豊富なリッチデザイン */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="チケット解決時間トレンド" 
            icon={<TimelineIcon />}
            color="primary"
            actions={
              <IconButton size="small" sx={{ color: 'white' }}>
                <ChartIcon />
              </IconButton>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.ticketMetrics.resolutionTrend.map(item => ({
                ...item,
                date: new Date(item.timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
              }))}>
                <defs>
                  <linearGradient id="colorResolution" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#667eea" 
                  strokeWidth={3}
                  fill="url(#colorResolution)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </RichChartCard>
        </Grid>

        {/* ⚡ システムパフォーマンス監視 */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="システムパフォーマンス監視" 
            icon={<SpeedIcon />}
            color="warning"
            actions={
              <IconButton size="small" sx={{ color: 'white' }}>
                <MonitorIcon />
              </IconButton>
            }
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 3,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: 3,
                  color: 'white',
                  mb: 2
                }}>
                  <Typography variant="h2" sx={{ fontWeight: 900, mb: 1 }}>
                    {data.systemMetrics.serverLoad}%
                  </Typography>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CloudIcon />
                    サーバー負荷
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  textAlign: 'center',
                  p: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                    <StorageIcon />
                    <Typography variant="h4" fontWeight={800}>
                      {data.systemMetrics.dbQueryTime}
                      <Typography component="span" variant="body2">ms</Typography>
                    </Typography>
                  </Box>
                  <Typography variant="body2">DB クエリ時間</Typography>
                </Card>
              </Grid>
              
              <Grid item xs={6}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white',
                  textAlign: 'center',
                  p: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                    <NetworkIcon />
                    <Typography variant="h4" fontWeight={800}>
                      {data.systemMetrics.pageLoadSpeed}
                      <Typography component="span" variant="body2">s</Typography>
                    </Typography>
                  </Box>
                  <Typography variant="body2">ページ読み込み</Typography>
                </Card>
              </Grid>
            </Grid>
          </RichChartCard>
        </Grid>

        {/* 👥 担当者パフォーマンステーブル */}
        <Grid item xs={12} lg={6}>
          <PerformanceDataTable
            data={data.ticketMetrics.agentPerformance}
            title="担当者パフォーマンス"
            icon={<GroupIcon />}
          />
        </Grid>

        {/* 🔍 ボトルネック分析カード */}
        <Grid item xs={12}>
          <RichChartCard 
            title="ボトルネック分析・改善提案" 
            icon={<BugIcon />}
            color="error"
            actions={
              <IconButton size="small" sx={{ color: 'white' }}>
                <ReportIcon />
              </IconButton>
            }
          >
            <Grid container spacing={3}>
              {data.ticketMetrics.bottlenecks.map((bottleneck, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <ImprovementCard
                    title={bottleneck.area}
                    impact={bottleneck.impact}
                    priority={bottleneck.severity === 'high' ? 'high' : bottleneck.severity === 'medium' ? 'medium' : 'low'}
                    suggestions={bottleneck.suggestions}
                    actionable={true}
                  />
                </Grid>
              ))}
            </Grid>
          </RichChartCard>
        </Grid>

        {/* 💼 ビジネスメトリクス表示 */}
        <Grid item xs={12}>
          <RichChartCard 
            title="ビジネスインパクト分析" 
            icon={<AssignmentIcon />}
            color="success"
            actions={
              <IconButton size="small" sx={{ color: 'white' }}>
                <TrendingUpIcon />
              </IconButton>
            }
          >
            <Grid container spacing={3}>
              {/* ROI指標 */}
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textAlign: 'center',
                  p: 3,
                  height: '100%'
                }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 0, right: 0, fontSize: '2rem', opacity: 0.3 }}>
                      🎯
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                      {data.businessMetrics.roi}
                      <Typography component="span" variant="h5">%</Typography>
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <TrendingUpIcon />
                      投資収益率
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      ROI指標
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* 効率改善 */}
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  textAlign: 'center',
                  p: 3,
                  height: '100%'
                }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 0, right: 0, fontSize: '2rem', opacity: 0.3 }}>
                      📈
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                      {data.businessMetrics.efficiencyImprovement}
                      <Typography component="span" variant="h5">%</Typography>
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <SpeedIcon />
                      業務効率改善率
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      前四半期比較
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* コスト効率 */}
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white',
                  textAlign: 'center',
                  p: 3,
                  height: '100%'
                }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 0, right: 0, fontSize: '2rem', opacity: 0.3 }}>
                      💰
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                      {data.businessMetrics.costEfficiency}
                      <Typography component="span" variant="h5">%</Typography>
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <SecurityIcon />
                      コスト効率
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      最適化レベル
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* サマリー統計 */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, background: alpha('#667eea', 0.1) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6" color="primary" fontWeight={600}>月次成長率</Typography>
                      <Typography variant="h4" color="primary" fontWeight={800}>
                        +{(data.businessMetrics.efficiencyImprovement / 3).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">継続的改善トレンド</Typography>
                    </Box>
                    <Box sx={{ fontSize: '3rem' }}>📊</Box>
                  </Box>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, background: alpha('#43e97b', 0.1) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6" color="success.main" fontWeight={600}>コスト削減額</Typography>
                      <Typography variant="h4" color="success.main" fontWeight={800}>
                        ¥{(data.businessMetrics.costEfficiency * 1000).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">月間節約効果</Typography>
                    </Box>
                    <Box sx={{ fontSize: '3rem' }}>💴</Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </RichChartCard>
        </Grid>
      </Grid>
    </Box>
  )
})

export default PerformanceAnalytics