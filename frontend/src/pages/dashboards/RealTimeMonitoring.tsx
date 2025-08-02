import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import {
  Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Divider, Chip,
  LinearProgress, useTheme, Tabs, Tab, Button, useMediaQuery, Stack, Alert as MuiAlert,
  Skeleton, Badge, Tooltip as MuiTooltip, FormControl, InputLabel, Select, MenuItem,
  Fab, alpha, CircularProgress as MuiCircularProgress, Paper, TableContainer, 
  Table, TableHead, TableRow, TableCell, TableBody, Switch, FormControlLabel
} from '@mui/material'
import {
  Computer as ComputerIcon, Storage as StorageIcon, Memory as MemoryIcon, Speed as SpeedIcon,
  NetworkCheck as NetworkIcon, Security as SecurityIcon, Cloud as CloudIcon, 
  MonitorHeart as MonitorIcon, Dashboard as DashboardIcon, Analytics as AnalyticsIcon,
  Warning as WarningIcon, Error as ErrorIcon, CheckCircle as CheckCircleIcon,
  Notifications as NotificationsIcon, Group as GroupIcon, Assignment as AssignmentIcon,
  Refresh as RefreshIcon, Settings as SettingsIcon, PlayArrow as PlayIcon,
  Pause as PauseIcon, Timeline as TimelineIcon, TrendingUp as TrendingUpIcon,
  Build as BuildIcon, Hardware as HardwareIcon, Apps as AppsIcon,
  Person as PersonIcon, Schedule as ScheduleIcon, SystemUpdate as SystemIcon,
  Lock as LockIcon, Description as DescriptionIcon, Activity as ActivityIcon
} from '@mui/icons-material'
import { RealTimeData, ServerStatus, ServiceStatus, Alert, Ticket, StatusChange, SystemEvent, UserActivity } from '../../types/dashboard'
import StatusIndicator from '../../components/dashboard/StatusIndicator'
import { gradients, animations, chartColors } from '../../theme/theme'

// Enhanced metric card component with Material-UI
interface IconRichMetricCardProps {
  title: string
  value: number | string
  unit?: string
  status: 'good' | 'warning' | 'critical'
  icon: React.ReactElement
  subtitle?: string
  isLive?: boolean
}

const IconRichMetricCard: React.FC<IconRichMetricCardProps> = React.memo(({ 
  title, value, unit, status, icon, subtitle, isLive = false 
}) => {
  const statusColors = {
    good: { primary: '#10B981', secondary: '#059669', bg: '#F0FDF4' },
    warning: { primary: '#F59E0B', secondary: '#D97706', bg: '#FFFBEB' },
    critical: { primary: '#EF4444', secondary: '#DC2626', bg: '#FEF2F2' }
  }
  
  const colors = statusColors[status]
  
  return (
    <Card sx={{ 
      height: '100%',
      background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(255,255,255,0.9) 100%)`,
      border: `2px solid ${colors.primary}30`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'visible',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 30px ${colors.primary}25`,
        border: `2px solid ${colors.primary}60`
      }
    }}>
      {isLive && (
        <Box sx={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 12,
          height: 12,
          bgcolor: 'success.main',
          borderRadius: '50%',
          animation: 'ping 2s infinite',
          zIndex: 1
        }} />
      )}
      
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: colors.primary, 
            width: 56, 
            height: 56,
            boxShadow: `0 6px 15px ${colors.primary}40`
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
          fontWeight: 900, 
          color: colors.primary,
          mb: 1,
          textShadow: `0 2px 4px ${colors.primary}20`
        }}>
          {value}{unit && <span style={{ fontSize: '0.6em', marginLeft: '4px' }}>{unit}</span>}
        </Typography>
        
        <Typography variant="body2" sx={{ 
          fontWeight: 600,
          color: colors.primary,
          opacity: 0.8
        }}>
          {status === 'good' ? '正常稼働中' : status === 'warning' ? '要注意' : '緊急対応要'}
        </Typography>
      </CardContent>
    </Card>
  )
})

// Rich chart card component
const RichChartCard: React.FC<{
  title: string
  subtitle?: string
  icon?: React.ReactElement
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  isLive?: boolean
}> = ({ title, subtitle, icon, children, className, actions, isLive = false }) => (
  <Card sx={{ 
    height: '100%',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease',
    position: 'relative',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: 8
    }
  }}>
    {isLive && (
      <Box sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        bgcolor: 'success.main',
        borderRadius: 2,
        color: 'white'
      }}>
        <Box sx={{ width: 6, height: 6, bgcolor: 'white', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 600 }}>
          LIVE
        </Typography>
      </Box>
    )}
    
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

const RealTimeMonitoring: React.FC = React.memo(() => {
  const [data, setData] = useState<RealTimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(300000) // 5分
  const [systemLoadHistory, setSystemLoadHistory] = useState<{ time: string; load: number }[]>([])

  // ダミーデータ生成をuseCallbackでメモ化
  const generateMockData = useCallback((): RealTimeData => {
    const currentTime = new Date()
    
    const servers: ServerStatus[] = [
      {
        id: 'srv-web-01',
        name: 'Webサーバー01',
        status: Math.random() > 0.1 ? 'online' : 'warning',
        cpu: Math.round(20 + Math.random() * 60),
        memory: Math.round(30 + Math.random() * 50),
        disk: Math.round(40 + Math.random() * 40),
        uptime: '15日 3時間 45分'
      },
      {
        id: 'srv-web-02',
        name: 'Webサーバー02',
        status: Math.random() > 0.1 ? 'online' : 'offline',
        cpu: Math.round(25 + Math.random() * 55),
        memory: Math.round(35 + Math.random() * 45),
        disk: Math.round(45 + Math.random() * 35),
        uptime: '12日 8時間 22分'
      },
      {
        id: 'srv-db-01',
        name: 'データベースサーバー',
        status: 'online',
        cpu: Math.round(40 + Math.random() * 40),
        memory: Math.round(60 + Math.random() * 30),
        disk: Math.round(70 + Math.random() * 20),
        uptime: '45日 12時間 18分'
      },
      {
        id: 'srv-app-01',
        name: 'アプリケーションサーバー',
        status: Math.random() > 0.05 ? 'online' : 'warning',
        cpu: Math.round(30 + Math.random() * 50),
        memory: Math.round(40 + Math.random() * 40),
        disk: Math.round(50 + Math.random() * 30),
        uptime: '8日 16時間 5分'
      }
    ]

    const services: ServiceStatus[] = [
      {
        id: 'svc-web',
        name: 'Webサービス',
        status: Math.random() > 0.1 ? 'operational' : 'degraded',
        responseTime: Math.round(150 + Math.random() * 200),
        uptime: 99.8,
        lastCheck: currentTime.toISOString()
      },
      {
        id: 'svc-api',
        name: 'APIサービス',
        status: 'operational',
        responseTime: Math.round(80 + Math.random() * 100),
        uptime: 99.9,
        lastCheck: currentTime.toISOString()
      },
      {
        id: 'svc-auth',
        name: '認証サービス',
        status: Math.random() > 0.05 ? 'operational' : 'outage',
        responseTime: Math.round(100 + Math.random() * 150),
        uptime: 99.7,
        lastCheck: currentTime.toISOString()
      },
      {
        id: 'svc-email',
        name: 'メールサービス',
        status: 'operational',
        responseTime: Math.round(200 + Math.random() * 300),
        uptime: 99.5,
        lastCheck: currentTime.toISOString()
      }
    ]

    const alerts: Alert[] = [
      {
        id: 'alert-001',
        type: Math.random() > 0.7 ? 'critical' : Math.random() > 0.5 ? 'warning' : 'info',
        message: 'CPUリソース使用率が高くなっています',
        timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString(),
        source: 'システム監視'
      },
      {
        id: 'alert-002',
        type: 'warning',
        message: 'ディスク容量が80%を超過しました',
        timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString(),
        source: 'インフラ監視'
      },
      {
        id: 'alert-003',
        type: 'info',
        message: '定期メンテナンスが完了しました',
        timestamp: new Date(currentTime.getTime() - Math.random() * 900000).toISOString(),
        source: 'メンテナンス'
      }
    ]

    const recentTickets: Ticket[] = [
      {
        id: 'INC-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        title: 'ネットワーク接続の不具合',
        priority: Math.random() > 0.7 ? 'high' : 'medium',
        status: 'open',
        assignee: '田中 太郎',
        created: new Date(currentTime.getTime() - Math.random() * 3600000).toISOString(),
        category: 'Network'
      },
      {
        id: 'INC-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        title: 'アプリケーションエラー',
        priority: 'critical',
        status: 'in_progress',
        assignee: '佐藤 花子',
        created: new Date(currentTime.getTime() - Math.random() * 1800000).toISOString(),
        category: 'Application'
      }
    ]

    const statusChanges: StatusChange[] = [
      {
        id: 'change-001',
        ticketId: 'INC-123',
        from: 'open',
        to: 'in_progress',
        timestamp: new Date(currentTime.getTime() - Math.random() * 900000).toISOString(),
        user: '鈴木 次郎'
      },
      {
        id: 'change-002',
        ticketId: 'INC-124',
        from: 'in_progress',
        to: 'resolved',
        timestamp: new Date(currentTime.getTime() - Math.random() * 1200000).toISOString(),
        user: '高橋 美咲'
      }
    ]

    const systemEvents: SystemEvent[] = [
      {
        id: 'event-001',
        type: 'system',
        message: 'サーバー再起動が完了しました',
        timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString(),
        severity: 'low'
      },
      {
        id: 'event-002',
        type: 'security',
        message: '不正アクセス試行を検出',
        timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString(),
        severity: 'high'
      }
    ]

    const userActivity: UserActivity[] = [
      {
        id: 'activity-001',
        user: '山田 花子',
        action: 'ログイン',
        target: 'システム',
        timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString()
      },
      {
        id: 'activity-002',
        user: '伊藤 太郎',
        action: 'チケット更新',
        target: 'INC-125',
        timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString()
      }
    ]

    return {
      systemStatus: {
        servers,
        services,
        network: {
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          latency: Math.round(20 + Math.random() * 30),
          packetLoss: Math.round(Math.random() * 2 * 100) / 100,
          bandwidth: Math.round(800 + Math.random() * 200)
        },
        database: {
          status: Math.random() > 0.05 ? 'connected' : 'slow',
          connections: Math.round(15 + Math.random() * 35),
          queryTime: Math.round(50 + Math.random() * 100),
          size: '2.5GB'
        }
      },
      liveMetrics: {
        activeUsers: Math.round(45 + Math.random() * 20),
        activeTickets: Math.round(120 + Math.random() * 30),
        systemLoad: Math.round(30 + Math.random() * 40),
        alerts
      },
      liveFeed: {
        recentTickets,
        statusChanges,
        systemEvents,
        userActivity
      }
    }
  }, [])

  // データ取得関数をuseCallbackでメモ化 - 安定化
  const fetchData = useCallback(() => {
    if (!autoRefresh) return
    
    // loadingステートを直接操作しないで安定化
    const newData = generateMockData()
    setData(prevData => {
      // データが変わった場合のみ更新
      if (!prevData || JSON.stringify(prevData.liveMetrics.systemLoad) !== JSON.stringify(newData.liveMetrics.systemLoad)) {
        return newData
      }
      return prevData
    })
    
    // システム負荷履歴を更新 - 安定化
    const currentTime = new Date().toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    setSystemLoadHistory(prev => {
      const newHistory = [...prev, { time: currentTime, load: newData.liveMetrics.systemLoad }]
      return newHistory.length > 20 ? newHistory.slice(-20) : newHistory
    })
  }, [autoRefresh, generateMockData])

  // 初期ロード用のuseEffect
  useEffect(() => {
    const initialLoad = () => {
      setLoading(true)
      setTimeout(() => {
        setData(generateMockData())
        setLoading(false)
      }, 500)
    }
    
    initialLoad()
  }, [generateMockData])
  
  // リフレッシュ用のuseEffect - 分離して安定化
  useEffect(() => {
    if (autoRefresh && data) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, fetchData, data])

  // アイコンとカラー関数をuseMemoでメモ化
  const getAlertIcon = useMemo(() => (type: string) => {
    switch (type) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return 'ℹ️'
    }
  }, [])

  const getAlertColor = useMemo(() => (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800'
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800'
      case 'error': return 'border-red-500 bg-red-50 text-red-800'
      default: return 'border-blue-500 bg-blue-50 text-blue-800'
    }
  }, [])

  const getEventIcon = useMemo(() => (type: string) => {
    switch (type) {
      case 'system': return '⚙️'
      case 'security': return '🔒'
      case 'maintenance': return '🔧'
      case 'error': return '❌'
      default: return '📝'
    }
  }, [])

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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with gradient background */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        borderRadius: 2,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          animation: 'pulse 3s infinite'
        }} />
        
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <MonitorIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  リアルタイム監視ダッシュボード
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  システム状態とライブメトリクスの監視
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    sx={{ 
                      '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.3)' },
                      '& .MuiSwitch-thumb': { bgcolor: 'white' }
                    }}
                  />
                }
                label="自動更新"
                sx={{ color: 'white', '& .MuiFormControlLabel-label': { fontWeight: 600 } }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value as string))}
                  disabled={!autoRefresh}
                  sx={{ 
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '& .MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  <MenuItem value={30000}>30秒</MenuItem>
                  <MenuItem value={60000}>1分</MenuItem>
                  <MenuItem value={300000}>5分</MenuItem>
                  <MenuItem value={600000}>10分</MenuItem>
                </Select>
              </FormControl>
              <Chip
                icon={<Box sx={{ width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%', animation: 'pulse 2s infinite' }} />}
                label="LIVE"
                variant="outlined"
                sx={{ 
                  color: 'white', 
                  borderColor: 'rgba(255,255,255,0.3)',
                  fontWeight: 600
                }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* ライブメトリクス */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="アクティブユーザー"
            value={data.liveMetrics.activeUsers}
            unit="人"
            status="good"
            icon={<GroupIcon />}
            subtitle="現在オンライン"
            isLive={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="アクティブチケット"
            value={data.liveMetrics.activeTickets}
            unit="件"
            status="good"
            icon={<AssignmentIcon />}
            subtitle="対応中のチケット"
            isLive={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="システム負荷"
            value={data.liveMetrics.systemLoad}
            unit="%"
            status={data.liveMetrics.systemLoad > 80 ? 'critical' : data.liveMetrics.systemLoad > 60 ? 'warning' : 'good'}
            icon={<SpeedIcon />}
            subtitle="CPU・メモリ総合"
            isLive={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <IconRichMetricCard
            title="アクティブアラート"
            value={data.liveMetrics.alerts.filter(a => a.type === 'critical' || a.type === 'warning').length}
            unit="件"
            status={data.liveMetrics.alerts.filter(a => a.type === 'critical').length > 0 ? 'critical' : 
                   data.liveMetrics.alerts.filter(a => a.type === 'warning').length > 0 ? 'warning' : 'good'}
            icon={<NotificationsIcon />}
            subtitle="要対応アラート"
            isLive={true}
          />
        </Grid>
      </Grid>

      {/* システム状態監視 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* サーバー状態 */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="サーバー状態" 
            subtitle="各サーバーのリアルタイム監視"
            icon={<ComputerIcon />}
            isLive={true}
            actions={
              <Stack direction="row" spacing={1}>
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
                <IconButton size="small">
                  <SettingsIcon />
                </IconButton>
              </Stack>
            }
          >
            <Stack spacing={3}>
              {data.systemStatus.servers.map((server) => {
                const getServerIcon = (name: string) => {
                  if (name.includes('Web')) return <NetworkIcon />
                  if (name.includes('データベース')) return <StorageIcon />
                  if (name.includes('アプリケーション')) return <AppsIcon />
                  return <ComputerIcon />
                }
                
                const getStatusColor = (status: string) => {
                  if (status === 'online') return { color: '#10B981', bg: '#F0FDF4' }
                  if (status === 'warning') return { color: '#F59E0B', bg: '#FFFBEB' }
                  return { color: '#EF4444', bg: '#FEF2F2' }
                }
                
                const statusColor = getStatusColor(server.status)
                
                return (
                  <Paper key={server.id} sx={{ 
                    p: 3, 
                    background: `linear-gradient(135deg, ${statusColor.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                    border: `1px solid ${statusColor.color}30`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 20px ${statusColor.color}25`
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: statusColor.color, width: 40, height: 40 }}>
                          {getServerIcon(server.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: statusColor.color }}>
                            {server.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {server.status === 'online' ? 'オンライン' : server.status === 'warning' ? '警告' : 'オフライン'}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={`稼働時間: ${server.uptime}`}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          borderColor: statusColor.color,
                          color: statusColor.color,
                          fontWeight: 600
                        }}
                      />
                    </Box>
                    
                    <Grid container spacing={2}>
                      {[
                        { label: 'CPU', value: server.cpu, icon: <SpeedIcon /> },
                        { label: 'メモリ', value: server.memory, icon: <MemoryIcon /> },
                        { label: 'ディスク', value: server.disk, icon: <StorageIcon /> }
                      ].map((metric, index) => {
                        const getMetricColor = (value: number) => {
                          if (value > 80) return '#EF4444'
                          if (value > 60) return '#F59E0B'
                          return '#10B981'
                        }
                        
                        const metricColor = getMetricColor(metric.value)
                        
                        return (
                          <Grid item xs={4} key={index}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                <Avatar sx={{ bgcolor: metricColor, width: 24, height: 24 }}>
                                  {React.cloneElement(metric.icon, { sx: { fontSize: 14 } })}
                                </Avatar>
                                <Typography variant="caption" color="text.secondary">
                                  {metric.label}
                                </Typography>
                              </Box>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: metricColor, mb: 1 }}>
                                {metric.value}%
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={metric.value} 
                                sx={{ 
                                  height: 6, 
                                  borderRadius: 3,
                                  bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: metricColor,
                                    borderRadius: 3
                                  }
                                }} 
                              />
                            </Box>
                          </Grid>
                        )
                      })}
                    </Grid>
                  </Paper>
                )
              })}
            </Stack>
          </RichChartCard>
        </Grid>

        {/* サービス状態 */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="サービス状態" 
            subtitle="各サービスの稼働状況"
            icon={<AppsIcon />}
            isLive={true}
            actions={
              <Stack direction="row" spacing={1}>
                <IconButton size="small">
                  <AnalyticsIcon />
                </IconButton>
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
              </Stack>
            }
          >
            <Stack spacing={3}>
              {data.systemStatus.services.map((service) => {
                const getServiceIcon = (name: string) => {
                  if (name.includes('Web')) return <NetworkIcon />
                  if (name.includes('API')) return <AppsIcon />
                  if (name.includes('認証')) return <SecurityIcon />
                  if (name.includes('メール')) return <DescriptionIcon />
                  return <CloudIcon />
                }
                
                const getServiceStatusColor = (status: string) => {
                  if (status === 'operational') return { color: '#10B981', bg: '#F0FDF4', label: '正常稼働' }
                  if (status === 'degraded') return { color: '#F59E0B', bg: '#FFFBEB', label: '性能低下' }
                  return { color: '#EF4444', bg: '#FEF2F2', label: 'サービス停止' }
                }
                
                const statusInfo = getServiceStatusColor(service.status)
                
                return (
                  <Paper key={service.id} sx={{ 
                    p: 3, 
                    background: `linear-gradient(135deg, ${statusInfo.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                    border: `1px solid ${statusInfo.color}30`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 15px ${statusInfo.color}25`
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: statusInfo.color, width: 36, height: 36 }}>
                          {getServiceIcon(service.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: statusInfo.color }}>
                            {service.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: statusInfo.color, fontWeight: 600 }}>
                            {statusInfo.label}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: statusInfo.color }}>
                          {service.uptime}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          稼働率
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {service.responseTime}ms
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            応答時間
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {new Date(service.lastCheck).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            最終確認
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

        {/* システム負荷履歴 */}
        <Grid item xs={12}>
          <RichChartCard 
            title="システム負荷履歴" 
            subtitle="過去20回の負荷推移 - リアルタイム更新"
            icon={<TimelineIcon />}
            isLive={true}
            actions={
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" startIcon={<AnalyticsIcon />}>
                  詳細分析
                </Button>
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
              </Stack>
            }
          >
            <Box sx={{ height: 250, width: '100%' }}>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={systemLoadHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }} 
                    stroke="#666"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    unit="%" 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'システム負荷']}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="load" 
                    stroke="#3b82f6" 
                    fill="url(#areaGradient)"
                    fillOpacity={0.8}
                    strokeWidth={3}
                  />
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </RichChartCard>
        </Grid>
      </Grid>

      {/* ライブフィード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* アラート一覧 */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="アクティブアラート" 
            subtitle="現在のシステムアラート"
            icon={<NotificationsIcon />}
            isLive={true}
            actions={
              <IconButton size="small">
                <SettingsIcon />
              </IconButton>
            }
          >
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Stack spacing={2}>
                {data.liveMetrics.alerts.map((alert) => {
                  const getAlertIconComponent = (type: string) => {
                    switch (type) {
                      case 'critical': return <ErrorIcon />
                      case 'warning': return <WarningIcon />
                      default: return <NotificationsIcon />
                    }
                  }
                  
                  const getAlertSeverity = (type: string) => {
                    switch (type) {
                      case 'critical': return { color: '#EF4444', bg: '#FEF2F2', severity: 'error' as const }
                      case 'warning': return { color: '#F59E0B', bg: '#FFFBEB', severity: 'warning' as const }
                      default: return { color: '#3B82F6', bg: '#EFF6FF', severity: 'info' as const }
                    }
                  }
                  
                  const alertSeverity = getAlertSeverity(alert.type)
                  
                  return (
                    <Paper key={alert.id} sx={{
                      p: 2,
                      background: `linear-gradient(135deg, ${alertSeverity.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                      border: `1px solid ${alertSeverity.color}30`,
                      borderLeft: `4px solid ${alertSeverity.color}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: `0 4px 12px ${alertSeverity.color}25`
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alertSeverity.color, width: 32, height: 32 }}>
                          {getAlertIconComponent(alert.type)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            {alert.message}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip
                              label={alert.source}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                borderColor: alertSeverity.color,
                                color: alertSeverity.color,
                                fontSize: '11px'
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(alert.timestamp).toLocaleString('ja-JP', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  )
                })}
              </Stack>
            </Box>
          </RichChartCard>
        </Grid>

        {/* 最新チケット */}
        <Grid item xs={12} lg={6}>
          <RichChartCard 
            title="最新チケット" 
            subtitle="最近作成されたチケット"
            icon={<AssignmentIcon />}
            isLive={true}
            actions={
              <Button size="small" variant="outlined" startIcon={<AssignmentIcon />}>
                全件表示
              </Button>
            }
          >
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Stack spacing={2}>
                {data.liveFeed.recentTickets.map((ticket) => {
                  const getPriorityColor = (priority: string) => {
                    switch (priority) {
                      case 'critical': return { color: '#EF4444', bg: '#FEF2F2', label: '緊急' }
                      case 'high': return { color: '#F59E0B', bg: '#FFFBEB', label: '高' }
                      case 'medium': return { color: '#3B82F6', bg: '#EFF6FF', label: '中' }
                      default: return { color: '#10B981', bg: '#F0FDF4', label: '低' }
                    }
                  }
                  
                  const priorityInfo = getPriorityColor(ticket.priority)
                  
                  return (
                    <Paper key={ticket.id} sx={{
                      p: 3,
                      background: `linear-gradient(135deg, ${priorityInfo.bg} 0%, rgba(255,255,255,0.9) 100%)`,
                      border: `1px solid ${priorityInfo.color}30`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 15px ${priorityInfo.color}25`
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: priorityInfo.color, width: 32, height: 32 }}>
                            <AssignmentIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: priorityInfo.color }}>
                            {ticket.id}
                          </Typography>
                        </Box>
                        <Chip
                          label={priorityInfo.label}
                          size="small"
                          sx={{
                            bgcolor: priorityInfo.color,
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                        {ticket.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon color="action" sx={{ fontSize: 16 }} />
                          <Typography variant="caption" color="text.secondary">
                            {ticket.assignee}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(ticket.created).toLocaleString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </Box>
                    </Paper>
                  )
                })}
              </Stack>
            </Box>
          </RichChartCard>
        </Grid>

          {/* システムイベント */}
          <ChartCard title="システムイベント" subtitle="最新のシステムイベント">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.liveFeed.systemEvents.map((event) => (
                <div key={event.id} className="border-l-4 border-blue-400 pl-3 py-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{getEventIcon(event.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm">{event.message}</p>
                      <div className="flex justify-between mt-1 text-xs text-gray-600">
                        <span className={`font-medium ${
                          event.severity === 'critical' ? 'text-red-600' :
                          event.severity === 'high' ? 'text-orange-600' :
                          event.severity === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {event.severity === 'critical' ? '重大' :
                           event.severity === 'high' ? '高' :
                           event.severity === 'medium' ? '中' : '低'}
                        </span>
                        <span>{new Date(event.timestamp).toLocaleString('ja-JP')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* ユーザーアクティビティ */}
          <ChartCard title="ユーザーアクティビティ" subtitle="最新のユーザー操作">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.liveFeed.userActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {activity.user.split(' ')[0][0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-gray-600">{activity.action}: {activity.target}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleTimeString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* ネットワーク・データベース状態 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="ネットワーク状態" subtitle="ネットワーク接続とパフォーマンス">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">全体状態</span>
                <StatusIndicator status={data.systemStatus.network.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">レイテンシ</div>
                  <div className="text-lg font-semibold">{data.systemStatus.network.latency}ms</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">パケットロス</div>
                  <div className="text-lg font-semibold">{data.systemStatus.network.packetLoss}%</div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">帯域幅使用量</div>
                <div className="text-lg font-semibold">{data.systemStatus.network.bandwidth} Mbps</div>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="データベース状態" subtitle="データベース接続とパフォーマンス">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">接続状態</span>
                <StatusIndicator status={data.systemStatus.database.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">アクティブ接続</div>
                  <div className="text-lg font-semibold">{data.systemStatus.database.connections}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">クエリ時間</div>
                  <div className="text-lg font-semibold">{data.systemStatus.database.queryTime}ms</div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">データベースサイズ</div>
                <div className="text-lg font-semibold">{data.systemStatus.database.size}</div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
})

export default RealTimeMonitoring