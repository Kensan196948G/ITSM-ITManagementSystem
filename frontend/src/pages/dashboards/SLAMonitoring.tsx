import React, { useState, useEffect, useMemo } from 'react'
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, RadialBarChart, RadialBar, TreemapChart, Treemap 
} from 'recharts'
import {
  Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Divider, Chip,
  LinearProgress, useTheme, Tabs, Tab, Button, useMediaQuery, Stack, Alert,
  Skeleton, Badge, Tooltip as MuiTooltip, FormControl, InputLabel, Select, MenuItem,
  Fab, alpha, CircularProgress as MuiCircularProgress, Paper, TableContainer, 
  Table, TableHead, TableRow, TableCell, TableBody, AccordionSummary, AccordionDetails, Accordion
} from '@mui/material'
import {
  Target as TargetIcon, Timeline as TimelineIcon, Warning as WarningIcon, 
  CheckCircle as CheckCircleIcon, Schedule as ScheduleIcon, TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon, Assessment as AssessmentIcon, Notifications as NotificationsIcon,
  Error as ErrorIcon, Group as GroupIcon, Assignment as AssignmentIcon, Speed as SpeedIcon,
  Security as SecurityIcon, Build as BuildIcon, MonitorHeart as MonitorIcon,
  ExpandMore as ExpandMoreIcon, PlayArrow as PlayIcon, Pause as PauseIcon,
  Refresh as RefreshIcon, Settings as SettingsIcon, FilterList as FilterIcon,
  Download as DownloadIcon, Share as ShareIcon, Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon, BugReport as BugIcon, Computer as ComputerIcon,
  NetworkCheck as NetworkIcon, Apps as AppsIcon, Hardware as HardwareIcon
} from '@mui/icons-material'
import { SLAData, Ticket, CategorySLAStats, EscalationEvent } from '../../types/dashboard'
import MetricCard from '../../components/dashboard/MetricCard'
import ChartCard from '../../components/dashboard/ChartCard'
import DataTable, { TableColumn } from '../../components/common/DataTable'
import { gradients, animations, chartColors } from '../../theme/theme'

const SLAMonitoring: React.FC = React.memo(() => {
  const [data, setData] = useState<SLAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [alertThreshold, setAlertThreshold] = useState<number>(2) // 2時間前にアラート

  // ダミーデータ生成
  const generateMockData = (): SLAData => {
    const riskTickets: Ticket[] = [
      {
        id: 'INC-001',
        title: 'メールサーバー障害対応',
        priority: 'critical',
        status: 'in_progress',
        assignee: '田中 太郎',
        created: '2025-08-01T08:30:00Z',
        slaDeadline: '2025-08-01T12:30:00Z',
        category: 'Infrastructure'
      },
      {
        id: 'INC-002',
        title: 'ネットワーク接続問題',
        priority: 'high',
        status: 'open',
        assignee: '佐藤 花子',
        created: '2025-08-01T09:15:00Z',
        slaDeadline: '2025-08-01T17:15:00Z',
        category: 'Network'
      },
      {
        id: 'INC-003',
        title: 'アプリケーション性能低下',
        priority: 'high',
        status: 'in_progress',
        assignee: '鈴木 次郎',
        created: '2025-08-01T10:00:00Z',
        slaDeadline: '2025-08-01T18:00:00Z',
        category: 'Application'
      },
      {
        id: 'INC-004',
        title: 'プリンター接続不具合',
        priority: 'medium',
        status: 'open',
        assignee: '高橋 美咲',
        created: '2025-08-01T11:30:00Z',
        slaDeadline: '2025-08-02T11:30:00Z',
        category: 'Hardware'
      }
    ]

    const categoryAnalysis: CategorySLAStats[] = [
      { category: 'Infrastructure', complianceRate: 95.2, avgResponseTime: 1.8, violationCount: 3, trend: 'up' },
      { category: 'Network', complianceRate: 88.7, avgResponseTime: 2.4, violationCount: 8, trend: 'down' },
      { category: 'Application', complianceRate: 91.5, avgResponseTime: 2.1, violationCount: 5, trend: 'stable' },
      { category: 'Hardware', complianceRate: 96.8, avgResponseTime: 1.5, violationCount: 2, trend: 'up' },
      { category: 'Security', complianceRate: 93.3, avgResponseTime: 1.9, violationCount: 4, trend: 'stable' }
    ]

    const escalationHistory: EscalationEvent[] = [
      {
        id: 'ESC-001',
        ticketId: 'INC-005',
        timestamp: '2025-08-01T08:00:00Z',
        from: 'Level 1 Support',
        to: 'Level 2 Support',
        reason: 'SLA期限接近',
        status: 'completed'
      },
      {
        id: 'ESC-002',
        ticketId: 'INC-006',
        timestamp: '2025-08-01T09:30:00Z',
        from: 'Level 2 Support',
        to: 'Senior Engineer',
        reason: '技術的複雑性',
        status: 'completed'
      },
      {
        id: 'ESC-003',
        ticketId: 'INC-007',
        timestamp: '2025-08-01T10:15:00Z',
        from: 'Level 1 Support',
        to: 'Level 2 Support',
        reason: 'SLA違反',
        status: 'pending'
      }
    ]

    return {
      complianceRate: 92.4,
      violationCount: 22,
      riskTickets,
      categoryAnalysis,
      escalationHistory,
      priorityBreakdown: {
        critical: { total: 45, onTime: 41, violated: 4 },
        high: { total: 120, onTime: 108, violated: 12 },
        medium: { total: 230, onTime: 224, violated: 6 },
        low: { total: 180, onTime: 180, violated: 0 }
      }
    }
  }

  useEffect(() => {
    const fetchData = () => {
      setLoading(true)
      setTimeout(() => {
        setData(generateMockData())
        setLoading(false)
      }, 1000)
    }

    fetchData()
    const interval = setInterval(fetchData, 300000) // 5分ごとに更新
    return () => clearInterval(interval)
  }, [selectedPriority])

  // SLAヒートマップデータをuseMemoで計算
  const slaHeatmapData = useMemo(() => {
    const weeks = ['第1週', '第2週', '第3週', '第4週', '第5週']
    const days = ['月', '火', '水', '木', '金', '土', '日']
    const heatmapDataArray: Array<{ x: string; y: string; value: number; label: string }> = []
    
    weeks.forEach((week, weekIndex) => {
      days.forEach((day, dayIndex) => {
        // 週末は低めの値、平日は高めの値
        const baseValue = ['土', '日'].includes(day) ? 70 : 90
        const randomVariation = (Math.random() - 0.5) * 20
        const value = Math.max(60, Math.min(100, Math.round(baseValue + randomVariation)))
        
        heatmapDataArray.push({
          x: day,
          y: week,
          value: value,
          label: `${week} ${day}曜日 - SLA遵守率: ${value}%`
        })
      })
    })
    
    return heatmapDataArray
  }, [])

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
  const PRIORITY_COLORS = {
    critical: '#dc2626',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981'
  }

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      critical: '緊急',
      high: '高',
      medium: '中',
      low: '低'
    }
    return labels[priority] || priority
  }

  const getTimeRemaining = (deadline: string) => {
    const now = new Date()
    const slaTime = new Date(deadline)
    const diff = slaTime.getTime() - now.getTime()
    
    if (diff <= 0) return { text: '期限超過', color: 'text-red-600', urgent: true }
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours < alertThreshold) {
      return { text: `${hours}時間${minutes}分`, color: 'text-red-600', urgent: true }
    } else if (hours < 8) {
      return { text: `${hours}時間${minutes}分`, color: 'text-yellow-600', urgent: false }
    } else {
      return { text: `${hours}時間${minutes}分`, color: 'text-green-600', urgent: false }
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
      case 'down': return <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
      default: return <TimelineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
    }
  }

  // Icon-rich metric card component
  const IconRichMetricCard: React.FC<{
    title: string
    value: string | number
    icon: React.ReactElement
    subtitle?: string
    trend?: { direction: 'up' | 'down' | 'stable', percentage: number, period: string }
    status?: 'good' | 'warning' | 'critical'
    gradient?: string
  }> = ({ title, value, icon, subtitle, trend, status = 'good', gradient }) => {
    const statusColors = {
      good: { primary: '#10B981', secondary: '#059669' },
      warning: { primary: '#F59E0B', secondary: '#D97706' },
      critical: { primary: '#EF4444', secondary: '#DC2626' }
    }
    
    const colors = statusColors[status]
    const bgGradient = gradient || `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}08 100%)`
    
    return (
      <Card 
        sx={{ 
          height: '100%',
          background: bgGradient,
          border: `1px solid ${colors.primary}30`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 25px ${colors.primary}25`,
            border: `1px solid ${colors.primary}50`
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ 
              bgcolor: colors.primary, 
              width: 56, 
              height: 56,
              boxShadow: `0 4px 12px ${colors.primary}40`
            }}>
              {icon}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: colors.primary, mb: 0.5 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            color: colors.primary,
            mb: 1,
            textShadow: `0 2px 4px ${colors.primary}20`
          }}>
            {value}
          </Typography>
          
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getTrendIcon(trend.direction)}
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 600,
                  color: trend.direction === 'up' ? 'success.main' : 
                         trend.direction === 'down' ? 'error.main' : 'text.secondary'
                }}
              >
                {trend.percentage > 0 ? '+' : ''}{trend.percentage}% {trend.period}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    )
  }

  // Rich chart card component
  const RichChartCard: React.FC<{
    title: string
    subtitle?: string
    icon?: React.ReactElement
    children: React.ReactNode
    className?: string
    actions?: React.ReactNode
  }> = ({ title, subtitle, icon, children, className, actions }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.8) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 6
        }
      }}
      className={className}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {icon && (
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                {icon}
              </Avatar>
            )}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actions}
        </Box>
        {children}
      </CardContent>
    </Card>
  )

  if (loading || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="circular" width={56} height={56} sx={{ mb: 2 }} />
                  <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  // 優先度別データの計算
  const priorityData = Object.entries(data.priorityBreakdown).map(([priority, stats]) => ({
    priority: getPriorityLabel(priority),
    total: stats.total,
    onTime: stats.onTime,
    violated: stats.violated,
    complianceRate: ((stats.onTime / stats.total) * 100).toFixed(1)
  }))

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with gradient background */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        borderRadius: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                <TargetIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  SLA監視ダッシュボード
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  サービスレベル目標の遵守状況とリスク分析
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: 'white' }}>優先度</InputLabel>
                <Select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as any)}
                  label="優先度"
                  sx={{ 
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '& .MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  <MenuItem value="all">全優先度</MenuItem>
                  <MenuItem value="critical">緊急</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="low">低</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                sx={{ 
                  color: 'white', 
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                設定
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                }}
              >
                更新
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* KPI メトリクス */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="SLA遵守率"
            value={`${data.complianceRate}%`}
            icon={<TargetIcon />}
            subtitle="全体的な遵守状況"
            trend={{ direction: 'up', percentage: 2.1, period: '前月比' }}
            status={data.complianceRate >= 95 ? 'good' : data.complianceRate >= 90 ? 'warning' : 'critical'}
            gradient={gradients.primary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="SLA違反件数"
            value={`${data.violationCount}件`}
            icon={<WarningIcon />}
            subtitle="期限超過チケット"
            trend={{ direction: 'down', percentage: 15.3, period: '前月比' }}
            status={data.violationCount <= 20 ? 'good' : data.violationCount <= 40 ? 'warning' : 'critical'}
            gradient={gradients.warning}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="リスクチケット"
            value={`${data.riskTickets.length}件`}
            icon={<ErrorIcon />}
            subtitle="緊急対応要"
            trend={{ direction: 'stable', percentage: 0, period: '前日比' }}
            status={data.riskTickets.length <= 5 ? 'good' : data.riskTickets.length <= 10 ? 'warning' : 'critical'}
            gradient={gradients.critical}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="エスカレーション"
            value={`${data.escalationHistory.filter(e => e.status === 'pending').length}件`}
            icon={<TrendingUpIcon />}
            subtitle="保留中の案件"
            trend={{ direction: 'down', percentage: 8.7, period: '前週比' }}
            status="good"
            gradient={gradients.success}
          />
        </Grid>
      </Grid>

      {/* チャートセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 優先度別SLA遵守率 - 修正版 */}
        <ChartCard title="優先度別SLA遵守率" subtitle="各優先度レベルでの達成状況">
          <div className="space-y-4">
            {priorityData.map((item, index) => {
              const colors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
              const colorClass = colors[index % colors.length]
              const complianceRate = parseFloat(item.complianceRate)
              
              return (
                <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 ${colorClass} rounded`}></div>
                      <h4 className="font-semibold text-lg text-gray-800">{item.priority}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">{item.complianceRate}%</div>
                      <div className="text-sm text-gray-600">遵守率</div>
                    </div>
                  </div>
                  
                  {/* プログレスバー */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div 
                      className={`h-3 rounded-full ${colorClass} transition-all duration-1000 ease-out relative`}
                      style={{ width: `${complianceRate}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {complianceRate > 25 && `${item.complianceRate}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 詳細統計 */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-gray-800">{item.total}</div>
                      <div className="text-gray-600">総チケット</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{item.onTime}</div>
                      <div className="text-gray-600">期限内完了</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{item.violated}</div>
                      <div className="text-gray-600">SLA違反</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>

        {/* カテゴリ別SLA分析 - 修正版 */}
        <ChartCard title="📊 カテゴリ別SLA分析" subtitle="サービスカテゴリごとの遵守状況">
          <div className="space-y-4">
            {data.categoryAnalysis.map((category, index) => {
              const getStatusColor = (rate: number) => {
                if (rate >= 95) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', bar: 'bg-green-500' }
                if (rate >= 90) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', bar: 'bg-yellow-500' }
                return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', bar: 'bg-red-500' }
              }
              
              const colors = getStatusColor(category.complianceRate)
              
              return (
                <div key={index} className={`p-6 rounded-xl border-2 ${colors.border} ${colors.bg} shadow-sm hover:shadow-md transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full ${colors.bar} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{category.category[0]}</span>
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg ${colors.text}`}>{category.category}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-lg">{getTrendIcon(category.trend)}</span>
                          <span className="text-sm text-gray-600">トレンド</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-black ${colors.text}`}>                     
                        {category.complianceRate}%
                      </div>
                      <div className="text-sm text-gray-600">SLA遵守率</div>
                    </div>
                  </div>
                  
                  {/* プログレスバー - テキスト表示改善 */}
                  <div className="w-full bg-gray-200 rounded-full h-6 mb-4 relative">
                    <div 
                      className={`h-6 rounded-full ${colors.bar} transition-all duration-1000 ease-out flex items-center justify-center relative overflow-hidden`}
                      style={{ width: `${category.complianceRate}%` }}
                    >
                      {/* 白いテキスト - コントラスト確保 */}
                      {category.complianceRate > 30 && (
                        <span className="text-white font-bold text-sm drop-shadow-lg">
                          {category.complianceRate}% 遵守
                        </span>
                      )}
                    </div>
                    {/* プログレスバーの外側にもラベル表示 */}
                    {category.complianceRate <= 30 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`font-bold text-sm ${colors.text}`}>
                          {category.complianceRate}% 遵守
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* 詳細統計グリッド */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl font-bold text-blue-600">{category.avgResponseTime}h</div>
                      <div className="text-sm text-gray-600 font-medium">平均応答時間</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-2xl font-bold text-red-600">{category.violationCount}</div>
                      <div className="text-sm text-gray-600 font-medium">違反件数</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className={`text-2xl font-bold ${
                        category.trend === 'up' ? 'text-green-600' : 
                        category.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {category.trend === 'up' ? '↗ 改善' : category.trend === 'down' ? '↘ 悪化' : '→ 安定'}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">トレンド</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>

        {/* SLA危険チケット一覧 - カード形式 */}
        <ChartCard title="🚨 SLA危険チケット" subtitle="期限が迫っているチケット（カード形式）" className="lg:col-span-2">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.riskTickets.map((ticket) => {
              const timeRemaining = getTimeRemaining(ticket.slaDeadline!)
              const urgencyGradient = timeRemaining.urgent ? gradients.critical : gradients.warning;
              
              return (
                <div 
                  key={ticket.id} 
                  className={`relative p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl border-l-4 ${
                    timeRemaining.urgent ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${
                      timeRemaining.urgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                    } 0%, rgba(255, 255, 255, 0.05) 100%)`,
                    borderLeftColor: timeRemaining.urgent ? '#EF4444' : '#F59E0B'
                  }}
                >
                  {/* 危険度インジケーター */}
                  {timeRemaining.urgent && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg font-bold text-gray-800">{ticket.id}</span>
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full text-white shadow-lg`} 
                              style={{ 
                                backgroundColor: PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS],
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                              }}>
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{ticket.title}</h4>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <span>👤</span>
                          <span>{ticket.assignee}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>📁</span>
                          <span>{ticket.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-3xl font-black mb-2 ${timeRemaining.color}`}>
                        ⏰
                      </div>
                      <div className={`text-xl font-bold ${timeRemaining.color}`}>
                        {timeRemaining.text}
                      </div>
                      <div className="text-sm text-gray-600">残り時間</div>
                    </div>
                  </div>
                  
                  {/* プログレスバー（残り時間の視覚化） */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div 
                      className="h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: timeRemaining.urgent ? '90%' : '60%',
                        background: urgencyGradient
                      }}
                    />
                  </div>
                  
                  {/* アクションボタン */}
                  <div className="flex items-center justify-end space-x-3">
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md">
                      📝 詳細
                    </button>
                    {timeRemaining.urgent && (
                      <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md animate-bounce">
                        ⬆️ エスカレート
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>

        {/* エスカレーション履歴 */}
        <ChartCard title="エスカレーション履歴" subtitle="最近のエスカレーション状況">
          <div className="space-y-4">
            {data.escalationHistory.slice(0, 5).map((escalation, index) => (
              <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {escalation.ticketId}: {escalation.from} → {escalation.to}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{escalation.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      escalation.status === 'completed' ? 'bg-green-100 text-green-800' :
                      escalation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {escalation.status === 'completed' ? '完了' : 
                       escalation.status === 'pending' ? '保留中' : 'キャンセル'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(escalation.timestamp).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* SLA遵守率 - 円形プログレス */}
        <ChartCard title="⭐ 全体SLA遵守状況" subtitle="グラデーション付き円形プログレス">
          <div className="flex flex-col items-center space-y-6">
            <CircularProgress
              value={data.complianceRate}
              max={100}
              size={200}
              strokeWidth={12}
              label="SLA遵守率"
              showPercentage={true}
              animated={true}
              showTrail={true}
              gradientColors={{
                start: data.complianceRate >= 95 ? '#10B981' : data.complianceRate >= 90 ? '#F59E0B' : '#EF4444',
                end: data.complianceRate >= 95 ? '#059669' : data.complianceRate >= 90 ? '#D97706' : '#DC2626'
              }}
            />
            
            {/* 詳細統計 */}
            <div className="grid grid-cols-2 gap-6 w-full">
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((data.complianceRate / 100) * 
                    Object.values(data.priorityBreakdown).reduce((sum, p) => sum + p.total, 0))}
                </div>
                <div className="text-sm text-green-700">遵守チケット</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{data.violationCount}</div>
                <div className="text-sm text-red-700">違反チケット</div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* 日次SLA状況 - カレンダーヒートマップ */}
      <ChartCard title="📅 日次SLA遵守状況" subtitle="過去30日間のSLA遵守率ヒートマップ">
        <HeatmapChart
          data={slaHeatmapData}
          width={600}
          height={250}
          cellSize={35}
          colorScale={{
            low: '#FEE2E2',
            medium: '#FCD34D',
            high: '#34D399'
          }}
          showLabels={false}
          showTooltip={true}
        />
      </ChartCard>
    </div>
  )
})

export default SLAMonitoring