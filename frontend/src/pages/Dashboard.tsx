import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Divider,
  Chip,
  LinearProgress,
  useTheme,
  Tabs,
  Tab,
  Button,
  useMediaQuery,
  Stack,
  Alert,
  Skeleton,
  Badge,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  alpha,
  CircularProgress,
} from '@mui/material'
import {
  ConfirmationNumber as TicketIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon,
  MonitorHeart as MonitorIcon,
  AssessmentOutlined as ReportIcon,
} from '@mui/icons-material'
import { priorityColors, statusColors } from '../theme/theme'
import ContentArea from '../components/layout/ContentArea'
import { CustomLineChart, CustomBarChart, CustomPieChart, CustomDonutChart, CustomGaugeChart, CustomAreaChart } from '../components/common/CustomCharts'
import DataTable, { TableColumn } from '../components/common/DataTable'
import type { DashboardMetrics, Ticket, ChartDataPoint, TimeSeriesData } from '../types'

const Dashboard: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [currentTab, setCurrentTab] = useState(0)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('week')
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Mock data - 実際の実装ではAPIから取得
  const mockMetrics: DashboardMetrics = {
    totalTickets: 1247,
    openTickets: 89,
    resolvedTickets: 1095,
    overdueTickets: 12,
    avgResolutionTime: 4.2,
    slaComplianceRate: 94.5,
    ticketsByPriority: {
      critical: 5,
      high: 23,
      medium: 45,
      low: 16,
    },
    ticketsByStatus: {
      open: 35,
      in_progress: 54,
      resolved: 12,
      closed: 3,
      on_hold: 8,
    },
    recentTickets: [
      {
        id: 'INC-001',
        title: 'サーバー応答速度低下',
        status: 'open',
        priority: 'critical',
        category: 'Infrastructure',
        reporterId: '1',
        reporterName: '田中一郎',
        createdAt: '2025-08-01T10:30:00Z',
        updatedAt: '2025-08-01T11:00:00Z',
        description: 'Webサーバーの応答速度が著しく低下しています',
        slaDeadline: '2025-08-01T12:30:00Z',
      },
      {
        id: 'INC-002',
        title: 'メール送信エラー',
        status: 'in_progress',
        priority: 'high',
        category: 'Email',
        reporterId: '2',
        reporterName: '佐藤花子',
        assigneeId: '3',
        assigneeName: '山田太郎',
        createdAt: '2025-08-01T09:15:00Z',
        updatedAt: '2025-08-01T10:45:00Z',
        description: 'メール送信時にSMTPエラーが発生',
      },
      {
        id: 'INC-003',
        title: 'プリンター接続不良',
        status: 'resolved',
        priority: 'medium',
        category: 'Hardware',
        reporterId: '4',
        reporterName: '鈴木次郎',
        assigneeId: '5',
        assigneeName: '高橋三郎',
        createdAt: '2025-08-01T08:00:00Z',
        updatedAt: '2025-08-01T10:30:00Z',
        description: 'オフィスプリンターに接続できない',
      },
      {
        id: 'INC-004',
        title: 'VPNアクセス不能',
        status: 'open',
        priority: 'high',
        category: 'Network',
        reporterId: '6',
        reporterName: '高田四郎',
        createdAt: '2025-08-01T07:45:00Z',
        updatedAt: '2025-08-01T10:15:00Z',
        description: '社外からVPNに接続できない',
        slaDeadline: '2025-08-01T15:45:00Z',
      },
      {
        id: 'INC-005',
        title: 'ファイルサーバーエラー',
        status: 'on_hold',
        priority: 'medium',
        category: 'Storage',
        reporterId: '7',
        reporterName: '清水五郎',
        assigneeId: '8',
        assigneeName: '森田六郎',
        createdAt: '2025-08-01T06:30:00Z',
        updatedAt: '2025-08-01T09:00:00Z',
        description: 'ファイルサーバーにアクセスできない',
      },
    ],
  }

  // システム全体のメトリクス
  const systemMetrics = {
    cpuUsage: 72,
    memoryUsage: 84,
    diskUsage: 65,
    networkUsage: 45,
    activeServices: 187,
    totalServices: 203,
    systemHealth: 'good',
    securityAlerts: 3,
  }

  const ticketTrendData: TimeSeriesData[] = [
    { date: '7/25', tickets: 15, resolved: 12, pending: 8, critical: 2 },
    { date: '7/26', tickets: 22, resolved: 18, pending: 12, critical: 1 },
    { date: '7/27', tickets: 18, resolved: 20, pending: 9, critical: 3 },
    { date: '7/28', tickets: 25, resolved: 16, pending: 15, critical: 4 },
    { date: '7/29', tickets: 19, resolved: 23, pending: 11, critical: 2 },
    { date: '7/30', tickets: 28, resolved: 21, pending: 18, critical: 5 },
    { date: '7/31', tickets: 23, resolved: 25, pending: 14, critical: 3 },
  ]

  // SLAデータ
  const slaData = [
    { name: 'インシデント対応', target: 95, actual: 94.5, status: 'warning' },
    { name: 'サービス可用性', target: 99.9, actual: 99.2, status: 'good' },
    { name: '変更成功率', target: 98, actual: 96.8, status: 'warning' },
    { name: '問題解決率', target: 90, actual: 92.1, status: 'good' },
  ]

  // システムパフォーマンスデータ
  const performanceData = [
    { time: '00:00', cpu: 45, memory: 62, network: 23, disk: 34 },
    { time: '04:00', cpu: 38, memory: 58, network: 18, disk: 31 },
    { time: '08:00', cpu: 72, memory: 84, network: 45, disk: 56 },
    { time: '12:00', cpu: 89, memory: 91, network: 67, disk: 72 },
    { time: '16:00', cpu: 76, memory: 88, network: 54, disk: 68 },
    { time: '20:00', cpu: 65, memory: 75, network: 42, disk: 58 },
  ]

  const priorityData: ChartDataPoint[] = [
    { name: '致命的', value: mockMetrics.ticketsByPriority.critical, color: priorityColors.critical },
    { name: '高', value: mockMetrics.ticketsByPriority.high, color: priorityColors.high },
    { name: '中', value: mockMetrics.ticketsByPriority.medium, color: priorityColors.medium },
    { name: '低', value: mockMetrics.ticketsByPriority.low, color: priorityColors.low },
  ]

  const statusData: ChartDataPoint[] = [
    { name: '未対応', value: mockMetrics.ticketsByStatus.open, color: statusColors.open },
    { name: '対応中', value: mockMetrics.ticketsByStatus.in_progress, color: statusColors.in_progress },
    { name: '解決済み', value: mockMetrics.ticketsByStatus.resolved, color: statusColors.resolved },
    { name: '完了', value: mockMetrics.ticketsByStatus.closed, color: statusColors.closed },
    { name: '保留中', value: mockMetrics.ticketsByStatus.on_hold, color: statusColors.on_hold },
  ]

  // テーブルの列定義
  const ticketColumns: TableColumn<Ticket>[] = [
    {
      id: 'id',
      label: 'ID',
      minWidth: 100,
      render: (value) => (
        <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
          {value}
        </Typography>
      ),
    },
    {
      id: 'title',
      label: 'タイトル',
      minWidth: 200,
      searchable: true,
    },
    {
      id: 'priority',
      label: '優先度',
      minWidth: 100,
      render: (value) => (
        <Chip
          label={value.toUpperCase()}
          size="small"
          sx={{
            bgcolor: `${priorityColors[value as keyof typeof priorityColors]}20`,
            color: priorityColors[value as keyof typeof priorityColors],
            fontWeight: 600,
          }}
        />
      ),
      filterType: 'select',
      filterOptions: [
        { value: 'critical', label: '致命的' },
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' },
      ],
    },
    {
      id: 'status',
      label: 'ステータス',
      minWidth: 120,
      render: (value) => {
        const statusLabels = {
          open: '未対応',
          in_progress: '対応中',
          resolved: '解決済み',
          closed: '完了',
          on_hold: '保留中',
        }
        return (
          <Chip
            label={statusLabels[value as keyof typeof statusLabels]}
            size="small"
            sx={{
              bgcolor: `${statusColors[value as keyof typeof statusColors]}20`,
              color: statusColors[value as keyof typeof statusColors],
              fontWeight: 500,
            }}
          />
        )
      },
    },
    {
      id: 'reporterName',
      label: '報告者',
      minWidth: 120,
      searchable: true,
    },
    {
      id: 'createdAt',
      label: '作成日時',
      minWidth: 150,
      render: (value) => new Date(value).toLocaleString('ja-JP'),
    },
  ]

  // 新しいメトリックカードコンポーネント
  const EnhancedMetricCard: React.FC<{
    title: string
    value: string | number
    icon: React.ReactElement
    color: string
    trend?: { value: number; label: string; direction: 'up' | 'down' | 'neutral' }
    subtitle?: string
    action?: React.ReactNode
    loading?: boolean
  }> = ({ title, value, icon, color, trend, subtitle, action, loading = false }) => (
    <Card sx={{ 
      height: '100%',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[8],
      },
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ 
              bgcolor: alpha(color, 0.1), 
              color, 
              width: 48, 
              height: 48,
            }}>
              {icon}
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {action}
        </Box>
        
        {loading ? (
          <Skeleton variant="text" height={40} />
        ) : (
          <Typography variant="h4" sx={{ fontWeight: 700, color, mb: 1 }}>
            {value}
          </Typography>
        )}
        
        {trend && !loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon 
              sx={{ 
                fontSize: 16, 
                color: trend.direction === 'up' ? 'success.main' : 
                       trend.direction === 'down' ? 'error.main' : 'text.secondary',
                transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none',
              }} 
            />
            <Typography 
              variant="caption" 
              sx={{
                color: trend.direction === 'up' ? 'success.main' : 
                       trend.direction === 'down' ? 'error.main' : 'text.secondary',
                fontWeight: 600,
              }}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )

  // データ更新処理
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // APIコールのシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLastUpdate(new Date())
      
      if (window.notifications) {
        window.notifications.success('データを更新しました')
      }
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

  // チケットクリックハンドラ
  const handleTicketClick = useCallback((ticket: Ticket) => {
    // チケット詳細ページにナビゲート
    console.log('チケットをクリック:', ticket)
  }, [])

  // チャートデータポイントクリックハンドラ
  const handleChartClick = useCallback((data: any) => {
    console.log('チャートデータポイントをクリック:', data)
  }, [])

  const pageActions = (
    <Stack direction="row" spacing={1} alignItems="center">
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>期間</InputLabel>
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          label="期間"
        >
          <MenuItem value="today">今日</MenuItem>
          <MenuItem value="week">今週</MenuItem>
          <MenuItem value="month">今月</MenuItem>
          <MenuItem value="quarter">四半期</MenuItem>
        </Select>
      </FormControl>
      
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
        startIcon={<AnalyticsIcon />}
        onClick={() => setCurrentTab(1)}
        size={isMobile ? 'small' : 'medium'}
      >
        詳細分析
      </Button>
    </Stack>
  )

  return (
    <ContentArea
      pageTitle="ダッシュボード"
      pageDescription="ITSMシステムの全体的な状況と主要メトリクス"
      actions={pageActions}
      showBreadcrumbs={false}
    >
      {/* ラストアップデート情報 */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          最終更新: {lastUpdate.toLocaleString('ja-JP')}
        </Typography>
        {autoRefresh && (
          <Chip 
            label="自動更新中" 
            size="small" 
            color="primary" 
            variant="outlined"
            icon={<RefreshIcon />}
          />
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        {/* タブメニュー */}
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab 
            icon={<DashboardIcon />} 
            label="概要ダッシュボード" 
            iconPosition="start"
          />
          <Tab 
            icon={<AnalyticsIcon />} 
            label="詳細分析" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 ? (
        <Box>
          {/* アラート・通知エリア */}
          {systemMetrics.securityAlerts > 0 && (
            <Alert 
              severity="warning" 
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small">
                  詳細
                </Button>
              }
            >
              {systemMetrics.securityAlerts}件のセキュリティアラートが検出されました
            </Alert>
          )}

          {/* メトリクスカード */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <EnhancedMetricCard
                title="総チケット数"
                value={mockMetrics.totalTickets.toLocaleString()}
                icon={<TicketIcon />}
                color={theme.palette.primary.main}
                trend={{ value: 5.2, label: "先月比", direction: "up" }}
                loading={refreshing}
                action={
                  <Tooltip title="チケット作成">
                    <IconButton size="small" color="primary">
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <EnhancedMetricCard
                title="未対応チケット"
                value={mockMetrics.openTickets}
                icon={<WarningIcon />}
                color={theme.palette.warning.main}
                subtitle="緊急対応が必要"
                trend={{ value: -2.1, label: "昨日比", direction: "down" }}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <EnhancedMetricCard
                title="解決済みチケット"
                value={mockMetrics.resolvedTickets.toLocaleString()}
                icon={<CheckCircleIcon />}
                color={theme.palette.success.main}
                trend={{ value: 12.8, label: "今週", direction: "up" }}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <EnhancedMetricCard
                title="期限超過"
                value={mockMetrics.overdueTickets}
                icon={<ScheduleIcon />}
                color={theme.palette.error.main}
                subtitle="SLA違反リスク"
                trend={{ value: 0, label: "変化なし", direction: "neutral" }}
                loading={refreshing}
              />
            </Grid>
          </Grid>

          {/* システムヘルス・パフォーマンス指標 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <CustomGaugeChart
                title="CPU使用率"
                value={systemMetrics.cpuUsage}
                unit="%"
                height={200}
                thresholds={[
                  { value: 80, color: theme.palette.error.main, label: '危険' },
                  { value: 60, color: theme.palette.warning.main, label: '警告' },
                  { value: 0, color: theme.palette.success.main, label: '正常' },
                ]}
                onRefresh={handleRefresh}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <CustomGaugeChart
                title="メモリ使用率"
                value={systemMetrics.memoryUsage}
                unit="%"
                height={200}
                thresholds={[
                  { value: 85, color: theme.palette.error.main, label: '危険' },
                  { value: 70, color: theme.palette.warning.main, label: '警告' },
                  { value: 0, color: theme.palette.success.main, label: '正常' },
                ]}
                onRefresh={handleRefresh}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    SLA遵守状況
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {slaData.map((sla, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{sla.name}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {sla.actual}% / {sla.target}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(sla.actual / sla.target) * 100}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: sla.status === 'good' ? 'success.main' : 'warning.main',
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* チャートセクション */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <CustomDonutChart
                title="優先度別チケット分布"
                data={priorityData}
                dataKey="value"
                nameKey="name"
                height={300}
                centerLabel="総チケット数"
                centerValue={Object.values(mockMetrics.ticketsByPriority).reduce((a, b) => a + b, 0)}
                onDataPointClick={handleChartClick}
                onRefresh={handleRefresh}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomBarChart
                title="ステータス別チケット分布"
                data={statusData}
                bars={[{ dataKey: 'value', name: 'チケット数', color: theme.palette.primary.main }]}
                xAxisKey="name"
                height={300}
                onDataPointClick={handleChartClick}
                onRefresh={handleRefresh}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <CustomAreaChart
                title="チケット推移 (過去7日)"
                data={ticketTrendData}
                areas={[
                  { dataKey: 'tickets', name: '新規', color: theme.palette.primary.main },
                  { dataKey: 'resolved', name: '解決', color: theme.palette.success.main },
                  { dataKey: 'critical', name: '緊急', color: theme.palette.error.main },
                ]}
                xAxisKey="date"
                height={300}
                stacked={false}
                onDataPointClick={handleChartClick}
                onRefresh={handleRefresh}
              />
            </Grid>
          </Grid>

          {/* システムパフォーマンス推移 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <CustomLineChart
                title="システムパフォーマンス推移 (24時間)"
                subtitle="CPU、メモリ、ネットワーク、ディスクの使用率"
                data={performanceData}
                lines={[
                  { dataKey: 'cpu', name: 'CPU', color: theme.palette.primary.main },
                  { dataKey: 'memory', name: 'メモリ', color: theme.palette.secondary.main },
                  { dataKey: 'network', name: 'ネットワーク', color: theme.palette.success.main },
                  { dataKey: 'disk', name: 'ディスク', color: theme.palette.warning.main },
                ]}
                xAxisKey="time"
                height={350}
                smooth={true}
                dots={false}
                yAxisDomain={[0, 100]}
                onDataPointClick={handleChartClick}
                onRefresh={handleRefresh}
              />
            </Grid>
          </Grid>

          {/* 最近のチケット - データテーブル */}
          <DataTable
            title="最近のチケット"
            subtitle="過去24時間に作成・更新されたチケット"
            data={mockMetrics.recentTickets}
            columns={ticketColumns}
            loading={refreshing}
            searchable={true}
            filterable={true}
            exportable={true}
            selectable={false}
            dense={false}
            initialPageSize={10}
            onRowClick={handleTicketClick}
            onRefresh={handleRefresh}
            emptyStateMessage="チケットがありません"
            actions={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => console.log('新規チケット作成')}
              >
                新規作成
              </Button>
            }
          />
        </Box>
      ) : (
        <Box>
          <Typography variant="h5" gutterBottom>
            詳細分析 ({timeRange})
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            高度な分析機能とレポート機能はここに実装されます。
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    トレンド分析
                  </Typography>
                  <Typography variant="body2">
                    長期的なパフォーマンストレンドを分析します。
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    予測分析
                  </Typography>
                  <Typography variant="body2">
                    将来のワークロードと課題を予測します。
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* フローティングアクションボタン */}
      <Fab
        color="primary"
        aria-label="新規チケット作成"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
        onClick={() => console.log('新規チケット作成')}
      >
        <AddIcon />
      </Fab>
    </ContentArea>
  )
}

export default Dashboard