import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  useTheme,
  alpha,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
} from '@mui/material'
import {
  MonitorHeart as MonitorIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as CriticalIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { CustomGaugeChart, CustomLineChart, CustomBarChart } from '../common/CustomCharts'

// 型定義
interface HealthMetric {
  id: string
  name: string
  value: number
  threshold: {
    warning: number
    critical: number
  }
  status: 'healthy' | 'warning' | 'critical'
  unit: string
  icon: React.ReactElement
  trend: number // 前回との差分（%）
  description: string
}

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical'
  uptime: string
  lastUpdate: string
  activeAlerts: number
  totalServices: number
  activeServices: number
}

interface Props {
  height?: number
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const SystemHealthChart: React.FC<Props> = ({
  height = 400,
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const theme = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // システムヘルスメトリクス
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    {
      id: 'cpu',
      name: 'CPU使用率',
      value: 68,
      threshold: { warning: 70, critical: 85 },
      status: 'healthy',
      unit: '%',
      icon: <SpeedIcon />,
      trend: -2.3,
      description: 'システムCPU使用率',
    },
    {
      id: 'memory',
      name: 'メモリ使用率',
      value: 74,
      threshold: { warning: 80, critical: 90 },
      status: 'healthy',
      unit: '%',
      icon: <MemoryIcon />,
      trend: 1.8,
      description: 'システムメモリ使用率',
    },
    {
      id: 'disk',
      name: 'ディスク使用率',
      value: 45,
      threshold: { warning: 85, critical: 95 },
      status: 'healthy',
      unit: '%',
      icon: <StorageIcon />,
      trend: 0.5,
      description: 'ディスク容量使用率',
    },
    {
      id: 'network',
      name: 'ネットワーク',
      value: 23,
      threshold: { warning: 70, critical: 90 },
      status: 'healthy',
      unit: '%',
      icon: <NetworkIcon />,
      trend: -0.8,
      description: 'ネットワーク使用率',
    },
    {
      id: 'security',
      name: 'セキュリティ',
      value: 98,
      threshold: { warning: 95, critical: 90 },
      status: 'healthy',
      unit: '%',
      icon: <SecurityIcon />,
      trend: 0.2,
      description: 'セキュリティスコア',
    },
  ])

  // システム全体ステータス
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overall: 'healthy',
    uptime: '99.8%',
    lastUpdate: new Date().toISOString(),
    activeAlerts: 1,
    totalServices: 23,
    activeServices: 22,
  })

  // 時系列データ
  const healthTrendData = [
    { time: '15:00', cpu: 65, memory: 72, disk: 44, network: 25, security: 97 },
    { time: '15:15', cpu: 70, memory: 76, disk: 45, network: 28, security: 98 },
    { time: '15:30', cpu: 68, memory: 74, disk: 45, network: 23, security: 98 },
    { time: '15:45', cpu: 72, memory: 78, disk: 46, network: 22, security: 97 },
    { time: '16:00', cpu: 68, memory: 74, disk: 45, network: 23, security: 98 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return theme.palette.success.main
      case 'warning': return theme.palette.warning.main
      case 'critical': return theme.palette.error.main
      default: return theme.palette.grey[500]
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <HealthyIcon />
      case 'warning': return <WarningIcon />
      case 'critical': return <CriticalIcon />
      default: return <InfoIcon />
    }
  }

  const calculateOverallHealth = useCallback(() => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length
    const warningCount = metrics.filter(m => m.status === 'warning').length
    
    if (criticalCount > 0) return 'critical'
    if (warningCount > 0) return 'warning'
    return 'healthy'
  }, [metrics])

  const updateMetrics = useCallback(() => {
    setMetrics(prev => prev.map(metric => {
      // ランダムな変動を追加（デモンストレーション）
      const variation = (Math.random() - 0.5) * 5
      const newValue = Math.max(0, Math.min(100, metric.value + variation))
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (metric.id === 'security') {
        // セキュリティは逆転（高い方が良い）
        if (newValue < metric.threshold.critical) status = 'critical'
        else if (newValue < metric.threshold.warning) status = 'warning'
      } else {
        if (newValue >= metric.threshold.critical) status = 'critical'
        else if (newValue >= metric.threshold.warning) status = 'warning'
      }

      return {
        ...metric,
        value: Math.round(newValue),
        status,
        trend: variation,
      }
    }))
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateMetrics()
      setLastUpdate(new Date())
      setSystemStatus(prev => ({
        ...prev,
        overall: calculateOverallHealth(),
        lastUpdate: new Date().toISOString(),
      }))
    } finally {
      setRefreshing(false)
    }
  }, [updateMetrics, calculateOverallHealth])

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      handleRefresh()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, handleRefresh])

  // 全体ヘルススコアの計算
  const overallScore = Math.round(
    metrics.reduce((sum, metric) => {
      if (metric.id === 'security') {
        return sum + metric.value // セキュリティは高い方が良い
      }
      return sum + (100 - metric.value) // その他は低い方が良い
    }, 0) / metrics.length
  )

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="システムヘルス"
        subheader={`最終更新: ${lastUpdate.toLocaleString('ja-JP')}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={systemStatus.overall.toUpperCase()}
              size="small"
              sx={{
                bgcolor: alpha(getStatusColor(systemStatus.overall), 0.1),
                color: getStatusColor(systemStatus.overall),
                fontWeight: 600,
              }}
              icon={getStatusIcon(systemStatus.overall)}
            />
            <Tooltip title="更新">
              <IconButton 
                size="small" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* メインヘルスゲージ */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: height / 2 }}>
              <CustomGaugeChart
                title="総合ヘルススコア"
                value={overallScore}
                unit="%"
                height={height / 2}
                thresholds={[
                  { value: 90, color: theme.palette.success.main, label: '良好' },
                  { value: 70, color: theme.palette.warning.main, label: '警告' },
                  { value: 0, color: theme.palette.error.main, label: '危険' },
                ]}
                onRefresh={handleRefresh}
              />
            </Box>
          </Grid>

          {/* システム統計 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ height: height / 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ 
                p: 2, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.5)
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  システム稼働率
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  {systemStatus.uptime}
                </Typography>
              </Box>
              
              <Box sx={{ 
                p: 2, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.5)
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  サービス状況
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {systemStatus.activeServices} / {systemStatus.totalServices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  アクティブサービス
                </Typography>
              </Box>

              {systemStatus.activeAlerts > 0 && (
                <Box sx={{ 
                  p: 2, 
                  border: 1, 
                  borderColor: 'warning.main', 
                  borderRadius: 1,
                  backgroundColor: alpha(theme.palette.warning.main, 0.1)
                }}>
                  <Typography variant="body2" color="warning.main" gutterBottom>
                    アクティブアラート
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {systemStatus.activeAlerts}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {showDetails && (
            <>
              {/* 詳細メトリクス */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  詳細メトリクス
                </Typography>
                <Grid container spacing={2}>
                  {metrics.map((metric) => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={metric.id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar sx={{ 
                              bgcolor: alpha(getStatusColor(metric.status), 0.1),
                              color: getStatusColor(metric.status),
                              width: 32,
                              height: 32,
                            }}>
                              {metric.icon}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" noWrap>
                                {metric.name}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            {metric.value}{metric.unit}
                          </Typography>
                          
                          <LinearProgress
                            variant="determinate"
                            value={metric.value}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getStatusColor(metric.status),
                                borderRadius: 3,
                              },
                            }}
                          />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Chip
                              label={metric.status}
                              size="small"
                              sx={{
                                bgcolor: alpha(getStatusColor(metric.status), 0.1),
                                color: getStatusColor(metric.status),
                                fontSize: '0.75rem',
                                height: 20,
                              }}
                            />
                            <Typography 
                              variant="caption" 
                              sx={{
                                color: metric.trend > 0 ? 'error.main' : 'success.main',
                                fontWeight: 600,
                              }}
                            >
                              {metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* トレンドチャート */}
              <Grid item xs={12}>
                <CustomLineChart
                  title="システムヘルストレンド (過去1時間)"
                  data={healthTrendData}
                  lines={[
                    { dataKey: 'cpu', name: 'CPU', color: theme.palette.primary.main },
                    { dataKey: 'memory', name: 'メモリ', color: theme.palette.secondary.main },
                    { dataKey: 'disk', name: 'ディスク', color: theme.palette.info.main },
                    { dataKey: 'network', name: 'ネットワーク', color: theme.palette.success.main },
                    { dataKey: 'security', name: 'セキュリティ', color: theme.palette.warning.main },
                  ]}
                  xAxisKey="time"
                  height={250}
                  smooth={true}
                  dots={false}
                  yAxisDomain={[0, 100]}
                  onDataPointClick={(data) => console.log('ヘルストレンドクリック:', data)}
                  onRefresh={handleRefresh}
                />
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default SystemHealthChart