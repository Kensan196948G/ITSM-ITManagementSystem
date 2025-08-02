import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  useTheme,
  useMediaQuery,
  Stack,
  Alert,
  Badge,
  Tooltip,
  IconButton,
  Divider,
  alpha,
  CircularProgress,
  LinearProgress,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
} from '@mui/material'
import {
  AutoFixHigh as AutoFixIcon,
  BugReport as BugIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  MonitorHeart as MonitorIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  Build as BuildIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Notifications as NotificationIcon,
  GitHub as GitHubIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material'
import ContentArea from '../layout/ContentArea'
import { CustomLineChart, CustomBarChart, CustomGaugeChart } from '../common/CustomCharts'

// 型定義
interface RepairEvent {
  id: string
  timestamp: string
  target: string
  type: 'error_detection' | 'repair_start' | 'repair_success' | 'repair_failure' | 'loop_complete'
  severity: 'info' | 'warning' | 'error' | 'success'
  message: string
  loop: number
  duration?: number
  details?: string
}

interface RepairStats {
  totalLoops: number
  totalErrors: number
  totalFixes: number
  lastScan: string
  systemHealth: 'healthy' | 'warning' | 'critical'
  fixSuccessRate: number
  averageLoopTime: number
  uptime: string
  activeRepairs: number
}

interface RepairTarget {
  name: string
  status: 'active' | 'idle' | 'error' | 'repairing'
  lastRepair: string
  repairCount: number
  successRate: number
  averageTime: number
}

const RepairMonitor: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [currentTab, setCurrentTab] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [monitoringEnabled, setMonitoringEnabled] = useState(true)

  // リアルタイムデータ（現在の状況に基づく）
  const [repairStats, setRepairStats] = useState<RepairStats>({
    totalLoops: 147,
    totalErrors: 441,
    totalFixes: 441,
    lastScan: '2025-08-02T15:55:20',
    systemHealth: 'warning',
    fixSuccessRate: 100.0,
    averageLoopTime: 95,
    uptime: '99.2%',
    activeRepairs: 0,
  })

  const [repairEvents, setRepairEvents] = useState<RepairEvent[]>([
    {
      id: '1',
      timestamp: '2025-08-02T15:55:20',
      target: 'git_status',
      type: 'repair_success',
      severity: 'success',
      message: 'Gitステータスチェック完了',
      loop: 147,
      duration: 2.1,
      details: 'リポジトリ状態確認完了',
    },
    {
      id: '2',
      timestamp: '2025-08-02T15:55:18',
      target: 'frontend_build',
      type: 'repair_success',
      severity: 'success',
      message: 'フロントエンドビルド成功',
      loop: 147,
      duration: 28.5,
      details: 'React アプリケーションビルド完了',
    },
    {
      id: '3',
      timestamp: '2025-08-02T15:54:50',
      target: 'backend_tests',
      type: 'repair_success',
      severity: 'success',
      message: 'バックエンドテスト実行完了',
      loop: 147,
      duration: 15.2,
      details: 'すべてのテストケースが正常終了',
    },
    {
      id: '4',
      timestamp: '2025-08-02T15:53:46',
      target: 'git_status',
      type: 'loop_complete',
      severity: 'info',
      message: 'ループ146完了',
      loop: 146,
      duration: 87.3,
      details: '自動修復サイクル正常終了',
    },
    {
      id: '5',
      timestamp: '2025-08-02T15:53:44',
      target: 'frontend_build',
      type: 'repair_success',
      severity: 'success',
      message: 'フロントエンドビルド成功',
      loop: 146,
      duration: 32.1,
    },
  ])

  const repairTargets: RepairTarget[] = [
    {
      name: 'git_status',
      status: 'active',
      lastRepair: '2025-08-02T15:55:20',
      repairCount: 147,
      successRate: 100,
      averageTime: 2.5,
    },
    {
      name: 'backend_tests',
      status: 'active',
      lastRepair: '2025-08-02T15:54:50',
      repairCount: 147,
      successRate: 98.6,
      averageTime: 16.8,
    },
    {
      name: 'frontend_build',
      status: 'active',
      lastRepair: '2025-08-02T15:55:18',
      repairCount: 147,
      successRate: 97.3,
      averageTime: 29.2,
    },
    {
      name: 'integration_tests',
      status: 'idle',
      lastRepair: '2025-08-02T14:50:00',
      repairCount: 89,
      successRate: 95.5,
      averageTime: 45.7,
    },
  ]

  // チャートデータ
  const loopTrendData = [
    { time: '15:00', loops: 3, errors: 5, fixes: 5, duration: 92 },
    { time: '15:15', loops: 4, errors: 6, fixes: 6, duration: 88 },
    { time: '15:30', loops: 3, errors: 4, fixes: 4, duration: 95 },
    { time: '15:45', loops: 2, errors: 3, fixes: 3, duration: 97 },
    { time: '16:00', loops: 1, errors: 2, fixes: 2, duration: 85 },
  ]

  const targetStatsData = repairTargets.map(target => ({
    name: target.name,
    successRate: target.successRate,
    repairCount: target.repairCount,
    averageTime: target.averageTime,
  }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.palette.success.main
      case 'repairing': return theme.palette.info.main
      case 'error': return theme.palette.error.main
      case 'idle': return theme.palette.grey[500]
      default: return theme.palette.grey[500]
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return theme.palette.success.main
      case 'warning': return theme.palette.warning.main
      case 'error': return theme.palette.error.main
      case 'info': return theme.palette.info.main
      default: return theme.palette.grey[500]
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'error_detection': return <BugIcon />
      case 'repair_start': return <PlayIcon />
      case 'repair_success': return <SuccessIcon />
      case 'repair_failure': return <ErrorIcon />
      case 'loop_complete': return <CheckCircle />
      default: return <MonitorIcon />
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // 実際の実装ではAPIからリアルタイムデータを取得
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLastUpdate(new Date())
      
      // ループカウントを更新（デモンストレーション）
      setRepairStats(prev => ({
        ...prev,
        totalLoops: prev.totalLoops + Math.floor(Math.random() * 2),
        totalErrors: prev.totalErrors + Math.floor(Math.random() * 3),
        lastScan: new Date().toISOString(),
      }))
    } finally {
      setRefreshing(false)
    }
  }, [])

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      handleRefresh()
    }, 30000) // 30秒ごとに更新
    
    return () => clearInterval(interval)
  }, [autoRefresh, handleRefresh])

  // 修復制御
  const handleRepairControl = useCallback((action: 'start' | 'stop' | 'pause') => {
    console.log(`修復システム: ${action}`)
    // 実際の実装ではAPIコール
  }, [])

  const pageActions = (
    <Stack direction="row" spacing={1} alignItems="center">
      <FormControlLabel
        control={
          <Switch
            checked={monitoringEnabled}
            onChange={(e) => setMonitoringEnabled(e.target.checked)}
            color="primary"
          />
        }
        label="監視有効"
      />
      
      <Tooltip title={autoRefresh ? '自動更新を無効化' : '自動更新を有効化'}>
        <IconButton 
          onClick={() => setAutoRefresh(!autoRefresh)}
          color={autoRefresh ? 'primary' : 'default'}
        >
          <Badge badgeContent={autoRefresh ? '自動' : null} color="primary">
            <RefreshIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Button
        variant="outlined"
        startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
        onClick={handleRefresh}
        disabled={refreshing}
        size={isMobile ? 'small' : 'medium'}
      >
        {refreshing ? '更新中...' : '更新'}
      </Button>
      
      <Button
        variant="contained"
        startIcon={<SettingsIcon />}
        size={isMobile ? 'small' : 'medium'}
      >
        設定
      </Button>
    </Stack>
  )

  return (
    <ContentArea
      pageTitle="修復監視システム"
      pageDescription="無限ループ自動修復システムのリアルタイム監視"
      actions={pageActions}
      showBreadcrumbs={true}
    >
      {/* 最終更新情報 */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          最終スキャン: {new Date(repairStats.lastScan).toLocaleString('ja-JP')}
        </Typography>
        <Stack direction="row" spacing={1}>
          {monitoringEnabled && (
            <Chip 
              label="監視中" 
              size="small" 
              color="success" 
              variant="outlined"
              icon={<MonitorIcon />}
            />
          )}
          {repairStats.activeRepairs > 0 && (
            <Chip 
              label={`${repairStats.activeRepairs}件修復中`}
              size="small" 
              color="warning" 
              variant="outlined"
              icon={<AutoFixIcon />}
            />
          )}
        </Stack>
      </Box>

      {/* システム状態アラート */}
      {repairStats.systemHealth === 'warning' && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              詳細確認
            </Button>
          }
        >
          システムが継続的な修復を実行中です。ループ回数: {repairStats.totalLoops}、総エラー数: {repairStats.totalErrors}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        {/* タブメニュー */}
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab 
            icon={<MonitorIcon />} 
            label="リアルタイム監視" 
            iconPosition="start"
          />
          <Tab 
            icon={<HistoryIcon />} 
            label="修復履歴" 
            iconPosition="start"
          />
          <Tab 
            icon={<ReportIcon />} 
            label="分析レポート" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Box>
          {/* 統計カード */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                      <AutoFixIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                        {repairStats.totalLoops}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        総ループ回数
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}>
                      <BugIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                        {repairStats.totalErrors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        検出エラー数
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                      <SuccessIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                        {repairStats.fixSuccessRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        修復成功率
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                      <SpeedIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                        {repairStats.uptime}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        システム稼働率
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 修復ターゲット状況 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={8}>
              <Card>
                <CardHeader
                  title="修復ターゲット状況"
                  subheader="各修復対象の現在の状態と統計"
                />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>ターゲット</TableCell>
                          <TableCell>ステータス</TableCell>
                          <TableCell align="right">修復回数</TableCell>
                          <TableCell align="right">成功率</TableCell>
                          <TableCell align="right">平均時間</TableCell>
                          <TableCell>最終修復</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {repairTargets.map((target) => (
                          <TableRow key={target.name}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {target.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={target.status.toUpperCase()}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getStatusColor(target.status), 0.1),
                                  color: getStatusColor(target.status),
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">{target.repairCount}</TableCell>
                            <TableCell align="right">{target.successRate}%</TableCell>
                            <TableCell align="right">{target.averageTime}s</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(target.lastRepair).toLocaleString('ja-JP')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <CustomGaugeChart
                title="システムヘルス"
                value={repairStats.fixSuccessRate}
                unit="%"
                height={300}
                thresholds={[
                  { value: 95, color: theme.palette.success.main, label: '良好' },
                  { value: 85, color: theme.palette.warning.main, label: '警告' },
                  { value: 0, color: theme.palette.error.main, label: '危険' },
                ]}
                onRefresh={handleRefresh}
              />
            </Grid>
          </Grid>

          {/* チャートセクション */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <CustomLineChart
                title="修復トレンド (過去1時間)"
                subtitle="ループ実行、エラー検出、修復成功の推移"
                data={loopTrendData}
                lines={[
                  { dataKey: 'loops', name: 'ループ実行', color: theme.palette.primary.main },
                  { dataKey: 'errors', name: 'エラー検出', color: theme.palette.error.main },
                  { dataKey: 'fixes', name: '修復成功', color: theme.palette.success.main },
                ]}
                xAxisKey="time"
                height={350}
                smooth={true}
                dots={true}
                onDataPointClick={(data) => console.log('チャートクリック:', data)}
                onRefresh={handleRefresh}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {currentTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            修復履歴
          </Typography>
          <Card>
            <CardContent>
              <List>
                {repairEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <Avatar sx={{ 
                          bgcolor: alpha(getSeverityColor(event.severity), 0.1),
                          color: getSeverityColor(event.severity),
                          width: 32,
                          height: 32,
                        }}>
                          {getEventIcon(event.type)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {event.message}
                            </Typography>
                            <Chip
                              label={`Loop ${event.loop}`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(event.timestamp).toLocaleString('ja-JP')}
                              {event.duration && ` • 実行時間: ${event.duration}秒`}
                            </Typography>
                            {event.details && (
                              <Typography variant="body2" color="text.secondary">
                                {event.details}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="詳細表示">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < repairEvents.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      )}

      {currentTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            分析レポート
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <CustomBarChart
                title="修復ターゲット別統計"
                data={targetStatsData}
                bars={[
                  { dataKey: 'successRate', name: '成功率 (%)', color: theme.palette.success.main },
                  { dataKey: 'averageTime', name: '平均時間 (秒)', color: theme.palette.info.main },
                ]}
                xAxisKey="name"
                height={350}
                onDataPointClick={(data) => console.log('バーチャートクリック:', data)}
                onRefresh={handleRefresh}
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </ContentArea>
  )
}

export default RepairMonitor