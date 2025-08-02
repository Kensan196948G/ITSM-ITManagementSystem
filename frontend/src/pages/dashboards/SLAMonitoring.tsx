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
import DataTable, { TableColumn } from '../../components/common/DataTable'
import { gradients, animations, chartColors } from '../../theme/theme'

// CircularProgress component placeholder
const CircularProgress: React.FC<any> = () => <div>Chart placeholder</div>

// HeatmapChart component placeholder  
const HeatmapChart: React.FC<any> = () => <div>Heatmap placeholder</div>

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

  // Removed unused constants - using theme colors instead

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

  const PRIORITY_COLORS = {
    critical: '#dc2626',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981'
  }

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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 優先度別SLA遵守率 */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="優先度別SLA遵守率" 
            subtitle="各優先度レベルでの達成状況"
            icon={<AssessmentIcon />}
            actions={
              <IconButton size="small">
                <RefreshIcon />
              </IconButton>
            }
          >
            <Stack spacing={3}>
              {priorityData.map((item, index) => {
                const priorityColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981']
                const color = priorityColors[index % priorityColors.length]
                const complianceRate = parseFloat(item.complianceRate)
                
                return (
                  <Paper key={index} sx={{ 
                    p: 3, 
                    background: `linear-gradient(135deg, ${color}10 0%, rgba(255,255,255,0.8) 100%)`,
                    border: `1px solid ${color}30`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 12px ${color}25`
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: color, width: 32, height: 32 }}>
                          <SpeedIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700, color }}>
                          {item.priority}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color }}>
                          {item.complianceRate}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          遵守率
                        </Typography>
                      </Box>
                    </Box>
                    
                    <LinearProgress 
                      variant="determinate" 
                      value={complianceRate} 
                      sx={{ 
                        height: 12, 
                        borderRadius: 6, 
                        mb: 2,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: color,
                          borderRadius: 6
                        }
                      }} 
                    />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {item.total}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            総チケット
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {item.onTime}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            期限内完了
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {item.violated}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SLA違反
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                )
              })}
            </Stack>
          </RichChartCard>
        </Grid>

        {/* カテゴリ別SLA分析 */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="カテゴリ別SLA分析" 
            subtitle="サービスカテゴリごとの遵守状況"
            icon={<AnalyticsIcon />}
            actions={
              <Stack direction="row" spacing={1}>
                <IconButton size="small">
                  <FilterIcon />
                </IconButton>
                <IconButton size="small">
                  <DownloadIcon />
                </IconButton>
              </Stack>
            }
          >
            <Stack spacing={3}>
              {data.categoryAnalysis.map((category, index) => {
                const getStatusColor = (rate: number) => {
                  if (rate >= 95) return { primary: '#10B981', secondary: '#059669', bg: '#F0FDF4' }
                  if (rate >= 90) return { primary: '#F59E0B', secondary: '#D97706', bg: '#FFFBEB' }
                  return { primary: '#EF4444', secondary: '#DC2626', bg: '#FEF2F2' }
                }
                
                const colors = getStatusColor(category.complianceRate)
                const categoryIcons = {
                  Infrastructure: <BuildIcon />,
                  Network: <NetworkIcon />,
                  Application: <AppsIcon />,
                  Hardware: <HardwareIcon />,
                  Security: <SecurityIcon />
                }
                
                return (
                  <Paper key={index} sx={{ 
                    p: 3, 
                    background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                    border: `2px solid ${colors.primary}30`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 8px 20px ${colors.primary}25`,
                      border: `2px solid ${colors.primary}50`
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                          bgcolor: colors.primary, 
                          width: 48, 
                          height: 48,
                          boxShadow: `0 4px 12px ${colors.primary}40`
                        }}>
                          {categoryIcons[category.category as keyof typeof categoryIcons] || <ComputerIcon />}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: colors.primary }}>
                            {category.category}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getTrendIcon(category.trend)}
                            <Typography variant="caption" color="text.secondary">
                              トレンド
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 900, 
                          color: colors.primary,
                          textShadow: `0 2px 4px ${colors.primary}20`
                        }}>
                          {category.complianceRate}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          SLA遵守率
                        </Typography>
                      </Box>
                    </Box>
                    
                    <LinearProgress 
                      variant="determinate" 
                      value={category.complianceRate} 
                      sx={{ 
                        height: 16, 
                        borderRadius: 8, 
                        mb: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                          borderRadius: 8
                        }
                      }} 
                    />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Box sx={{ 
                          textAlign: 'center', 
                          p: 2, 
                          bgcolor: 'background.paper', 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>
                            {category.avgResponseTime}h
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            平均応答時間
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ 
                          textAlign: 'center', 
                          p: 2, 
                          bgcolor: 'background.paper', 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {category.violationCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            違反件数
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ 
                          textAlign: 'center', 
                          p: 2, 
                          bgcolor: 'background.paper', 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                            {getTrendIcon(category.trend)}
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              ml: 1,
                              color: category.trend === 'up' ? 'success.main' : 
                                     category.trend === 'down' ? 'error.main' : 'text.secondary'
                            }}>
                              {category.trend === 'up' ? '改善' : category.trend === 'down' ? '悪化' : '安定'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            トレンド
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                )
              })}
            </Stack>
          </RichChartCard>
        </Grid>

        {/* SLA危険チケット一覧 */}
        <Grid item xs={12}>
          <RichChartCard 
            title="SLA危険チケット" 
            subtitle="期限が迫っているチケット - 緊急対応が必要"
            icon={<ErrorIcon />}
            actions={
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<NotificationsIcon />} variant="outlined">
                  アラート設定
                </Button>
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
              </Stack>
            }
          >
            <Box sx={{ maxHeight: 600, overflow: 'auto', pr: 1 }}>
              <Stack spacing={3}>
                {data.riskTickets.map((ticket) => {
                  const timeRemaining = getTimeRemaining(ticket.slaDeadline!)
                  const isUrgent = timeRemaining.urgent
                  const urgentColor = isUrgent ? '#EF4444' : '#F59E0B'
                  
                  return (
                    <Paper 
                      key={ticket.id}
                      sx={{
                        p: 3,
                        position: 'relative',
                        background: `linear-gradient(135deg, ${urgentColor}10 0%, rgba(255,255,255,0.9) 100%)`,
                        border: `2px solid ${urgentColor}30`,
                        borderLeft: `6px solid ${urgentColor}`,
                        transition: 'all 0.3s ease',
                        animation: isUrgent ? 'pulse 2s infinite' : 'none',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 8px 25px ${urgentColor}25`
                        }
                      }}
                    >
                      {isUrgent && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8, 
                          width: 12, 
                          height: 12, 
                          bgcolor: 'error.main', 
                          borderRadius: '50%',
                          animation: 'ping 1s infinite'
                        }} />
                      )}
                      
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ bgcolor: urgentColor, width: 40, height: 40 }}>
                              <AssignmentIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: urgentColor }}>
                                {ticket.id}
                              </Typography>
                              <Chip
                                label={getPriorityLabel(ticket.priority)}
                                size="small"
                                sx={{
                                  bgcolor: PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS],
                                  color: 'white',
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                          </Box>
                          
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            {ticket.title}
                          </Typography>
                          
                          <Stack direction="row" spacing={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <GroupIcon color="action" sx={{ fontSize: 18 }} />
                              <Typography variant="body2" color="text.secondary">
                                {ticket.assignee}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AssignmentIcon color="action" sx={{ fontSize: 18 }} />
                              <Typography variant="body2" color="text.secondary">
                                {ticket.category}
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ 
                              bgcolor: urgentColor, 
                              width: 64, 
                              height: 64, 
                              mx: 'auto', 
                              mb: 1 
                            }}>
                              <ScheduleIcon sx={{ fontSize: 32 }} />
                            </Avatar>
                            <Typography variant="h5" sx={{ 
                              fontWeight: 800, 
                              color: urgentColor,
                              mb: 0.5
                            }}>
                              {timeRemaining.text}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              残り時間
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={isUrgent ? 85 : 60} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4, 
                          my: 2,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: urgentColor,
                            borderRadius: 4
                          }
                        }} 
                      />
                      
                      <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button 
                          size="small" 
                          variant="outlined" 
                          startIcon={<AssignmentIcon />}
                        >
                          詳細
                        </Button>
                        {isUrgent && (
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="error"
                            startIcon={<TrendingUpIcon />}
                            sx={{ animation: 'bounce 1s infinite' }}
                          >
                            エスカレート
                          </Button>
                        )}
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            </Box>
          </RichChartCard>
        </Grid>

        {/* エスカレーション履歴 */}
        <Grid item xs={12} md={6}>
          <RichChartCard 
            title="エスカレーション履歴" 
            subtitle="最近のエスカレーション状況"
            icon={<TrendingUpIcon />}
            actions={
              <IconButton size="small">
                <TimelineIcon />
              </IconButton>
            }
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>チケットID</TableCell>
                    <TableCell>エスカレーション</TableCell>
                    <TableCell>理由</TableCell>
                    <TableCell align="center">ステータス</TableCell>
                    <TableCell align="center">日時</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.escalationHistory.slice(0, 5).map((escalation, index) => (
                    <TableRow 
                      key={index}
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        borderLeft: '3px solid',
                        borderLeftColor: 'primary.main'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {escalation.ticketId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUpIcon color="action" sx={{ fontSize: 16 }} />
                          <Typography variant="body2">
                            {escalation.from} → {escalation.to}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {escalation.reason}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            escalation.status === 'completed' ? '完了' :
                            escalation.status === 'pending' ? '保留中' : 'キャンセル'
                          }
                          size="small"
                          color={
                            escalation.status === 'completed' ? 'success' :
                            escalation.status === 'pending' ? 'warning' : 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" color="text.secondary">
                          {new Date(escalation.timestamp).toLocaleString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </RichChartCard>
        </Grid>

        {/* 全体SLA遵守状況 */}
        <Grid item xs={12} md={6}>
          <RichChartCard 
            title="全体SLA遵守状況" 
            subtitle="グラデーション付き円形プログレス"
            icon={<SpeedIcon />}
            actions={
              <Stack direction="row" spacing={1}>
                <IconButton size="small">
                  <AnalyticsIcon />
                </IconButton>
                <IconButton size="small">
                  <ShareIcon />
                </IconButton>
              </Stack>
            }
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <MuiCircularProgress
                  variant="determinate"
                  value={data.complianceRate}
                  size={180}
                  thickness={8}
                  sx={{
                    color: data.complianceRate >= 95 ? 'success.main' : 
                           data.complianceRate >= 90 ? 'warning.main' : 'error.main',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round'
                    }
                  }}
                />
                <Box sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {data.complianceRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SLA遵守率
                  </Typography>
                </Box>
              </Box>
              
              <Grid container spacing={3} sx={{ width: '100%' }}>
                <Grid item xs={6}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #10B98120 0%, #059669 08 100%)',
                    border: '1px solid #10B98130'
                  }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {Math.round((data.complianceRate / 100) * 
                        Object.values(data.priorityBreakdown).reduce((sum, p) => sum + p.total, 0))}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      遵守チケット
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #EF444420 0%, #DC2626 08 100%)',
                    border: '1px solid #EF444430'
                  }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {data.violationCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      違反チケット
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </RichChartCard>
        </Grid>
      </Grid>

      {/* 日次SLA状況 - ヒートマップ */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <RichChartCard 
            title="日次SLA遵守状況" 
            subtitle="過去30日間のSLA遵守率ヒートマップ - 色が濃いほど遵守率が高い"
            icon={<DashboardIcon />}
            actions={
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" startIcon={<FilterIcon />}>
                  期間選択
                </Button>
                <IconButton size="small">
                  <DownloadIcon />
                </IconButton>
              </Stack>
            }
          >
            <Box sx={{ p: 2 }}>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    月
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    火
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    水
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    木
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    金
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    土
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    日
                  </Typography>
                </Grid>
              </Grid>
              
              <Grid container spacing={0.5}>
                {slaHeatmapData.map((cell, index) => {
                  const getHeatColor = (value: number) => {
                    if (value >= 95) return '#10B981'
                    if (value >= 90) return '#F59E0B'
                    if (value >= 80) return '#EF4444'
                    return '#6B7280'
                  }
                  
                  return (
                    <Grid item key={index}>
                      <MuiTooltip title={cell.label}>
                        <Paper
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: getHeatColor(cell.value),
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.1)',
                              boxShadow: 2
                            }
                          }}
                        >
                          <Box sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'white', 
                                fontWeight: 600,
                                fontSize: '10px'
                              }}
                            >
                              {cell.value}
                            </Typography>
                          </Box>
                        </Paper>
                      </MuiTooltip>
                    </Grid>
                  )
                })}
              </Grid>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 3, gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  低
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {['#6B7280', '#EF4444', '#F59E0B', '#10B981'].map((color, index) => (
                    <Box key={index} sx={{
                      width: 12,
                      height: 12,
                      bgcolor: color,
                      borderRadius: 0.5
                    }} />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  高
                </Typography>
              </Box>
            </Box>
          </RichChartCard>
        </Grid>
      </Grid>
    </Box>
  )
})

export default SLAMonitoring