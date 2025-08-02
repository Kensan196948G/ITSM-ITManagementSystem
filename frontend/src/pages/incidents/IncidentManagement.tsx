/**
 * インシデント管理ページ
 * 包括的なインシデント管理機能を提供
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Chip,
  useTheme,
  Tabs,
  Tab,
  Button,
  useMediaQuery,
  Stack,
  Alert,
  Badge,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  alpha,
  CircularProgress,
  Paper,
  Divider,
  LinearProgress,
} from '@mui/material'
import {
  BugReport as IncidentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Done as CompleteIcon,
  PriorityHigh as PriorityHighIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Category as CategoryIcon,
  FilterList as FilterIcon,
  ViewList as ListViewIcon,
  ViewModule as CardViewIcon,
  Search as SearchIcon,
  GetApp as ExportIcon,
  Notifications as NotificationsIcon,
  Escalator as EscalateIcon,
} from '@mui/icons-material'
import { priorityColors, statusColors } from '../../theme/theme'
import ContentArea from '../../components/layout/ContentArea'
import DataTable, { TableColumn } from '../../components/common/DataTable'
import ModalDialog from '../../components/common/ModalDialog'
import FormBuilder, { FormField } from '../../components/common/FormBuilder'
import { CustomBarChart, CustomDonutChart, CustomLineChart } from '../../components/common/CustomCharts'
import type { Ticket } from '../../types'

interface IncidentStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  overdue: number
  critical: number
  avgResolutionTime: number
  slaCompliance: number
}

const IncidentManagement: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  // 状態管理
  const [currentTab, setCurrentTab] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEscalateModal, setShowEscalateModal] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // モックデータ
  const mockStats: IncidentStats = {
    total: 247,
    open: 89,
    inProgress: 54,
    resolved: 95,
    overdue: 12,
    critical: 5,
    avgResolutionTime: 4.2,
    slaCompliance: 94.5,
  }

  const mockIncidents: Ticket[] = [
    {
      id: 'INC-001',
      title: 'Webサーバー応答速度低下',
      status: 'open',
      priority: 'critical',
      category: 'Infrastructure',
      reporterId: '1',
      reporterName: '田中一郎',
      createdAt: '2025-08-02T10:30:00Z',
      updatedAt: '2025-08-02T11:00:00Z',
      description: 'メインWebサーバーの応答速度が著しく低下しており、ユーザーからの苦情が多数寄せられています。',
      slaDeadline: '2025-08-02T14:30:00Z',
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
      createdAt: '2025-08-02T09:15:00Z',
      updatedAt: '2025-08-02T10:45:00Z',
      description: 'メール送信時にSMTPエラーが発生し、重要なメールが送信できない状況です。',
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
      createdAt: '2025-08-02T08:00:00Z',
      updatedAt: '2025-08-02T10:30:00Z',
      description: '2階オフィスのプリンターに接続できず、印刷業務に支障が出ています。',
    },
    {
      id: 'INC-004',
      title: 'VPNアクセス不能',
      status: 'open',
      priority: 'high',
      category: 'Network',
      reporterId: '6',
      reporterName: '高田四郎',
      createdAt: '2025-08-02T07:45:00Z',
      updatedAt: '2025-08-02T10:15:00Z',
      description: '社外からVPNに接続できず、リモートワークに支障が出ています。',
      slaDeadline: '2025-08-02T15:45:00Z',
    },
    {
      id: 'INC-005',
      title: 'データベース接続エラー',
      status: 'in_progress',
      priority: 'critical',
      category: 'Database',
      reporterId: '7',
      reporterName: '清水五郎',
      assigneeId: '8',
      assigneeName: '森田六郎',
      createdAt: '2025-08-02T06:30:00Z',
      updatedAt: '2025-08-02T09:00:00Z',
      description: '基幹システムのデータベースに接続できず、業務が停止しています。',
      slaDeadline: '2025-08-02T12:30:00Z',
    },
  ]

  // チャートデータ
  const priorityChartData = [
    { name: '致命的', value: 5, color: priorityColors.critical },
    { name: '高', value: 23, color: priorityColors.high },
    { name: '中', value: 45, color: priorityColors.medium },
    { name: '低', value: 16, color: priorityColors.low },
  ]

  const statusChartData = [
    { name: '未対応', value: mockStats.open, color: statusColors.open },
    { name: '対応中', value: mockStats.inProgress, color: statusColors.in_progress },
    { name: '解決済み', value: mockStats.resolved, color: statusColors.resolved },
  ]

  const trendData = [
    { date: '7/25', incidents: 15, resolved: 12 },
    { date: '7/26', incidents: 22, resolved: 18 },
    { date: '7/27', incidents: 18, resolved: 20 },
    { date: '7/28', incidents: 25, resolved: 16 },
    { date: '7/29', incidents: 19, resolved: 23 },
    { date: '7/30', incidents: 28, resolved: 21 },
    { date: '7/31', incidents: 23, resolved: 25 },
  ]

  // テーブル列定義
  const columns: TableColumn<Ticket>[] = [
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
      render: (value, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {value}
          </Typography>
          {row.slaDeadline && (
            <Chip
              icon={<TimeIcon />}
              label="SLA期限"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          )}
        </Box>
      ),
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
      filterType: 'select',
      filterOptions: [
        { value: 'open', label: '未対応' },
        { value: 'in_progress', label: '対応中' },
        { value: 'resolved', label: '解決済み' },
        { value: 'closed', label: '完了' },
        { value: 'on_hold', label: '保留中' },
      ],
    },
    {
      id: 'category',
      label: 'カテゴリ',
      minWidth: 120,
      searchable: true,
    },
    {
      id: 'reporterName',
      label: '報告者',
      minWidth: 120,
      searchable: true,
    },
    {
      id: 'assigneeName',
      label: '担当者',
      minWidth: 120,
      searchable: true,
      render: (value) => value || <Typography color="text.secondary">未割当</Typography>,
    },
    {
      id: 'createdAt',
      label: '作成日時',
      minWidth: 150,
      render: (value) => new Date(value).toLocaleString('ja-JP'),
    },
  ]

  // 新規インシデント作成フォームの定義
  const incidentFormFields: FormField[] = [
    {
      id: 'title',
      type: 'text',
      label: 'タイトル',
      placeholder: 'インシデントのタイトルを入力してください',
      required: true,
      validation: {
        minLength: 5,
        maxLength: 200,
      },
      gridProps: { xs: 12 },
    },
    {
      id: 'description',
      type: 'textarea',
      label: '詳細説明',
      placeholder: 'インシデントの詳細を説明してください',
      required: true,
      rows: 4,
      validation: {
        minLength: 10,
      },
      gridProps: { xs: 12 },
    },
    {
      id: 'priority',
      type: 'select',
      label: '優先度',
      required: true,
      options: [
        { value: 'low', label: '低' },
        { value: 'medium', label: '中' },
        { value: 'high', label: '高' },
        { value: 'critical', label: '致命的' },
      ],
      gridProps: { xs: 12, md: 6 },
    },
    {
      id: 'category',
      type: 'select',
      label: 'カテゴリ',
      required: true,
      options: [
        { value: 'Infrastructure', label: 'インフラストラクチャ' },
        { value: 'Network', label: 'ネットワーク' },
        { value: 'Database', label: 'データベース' },
        { value: 'Email', label: 'メール' },
        { value: 'Hardware', label: 'ハードウェア' },
        { value: 'Software', label: 'ソフトウェア' },
        { value: 'Security', label: 'セキュリティ' },
        { value: 'Other', label: 'その他' },
      ],
      gridProps: { xs: 12, md: 6 },
    },
    {
      id: 'impact',
      type: 'select',
      label: '影響度',
      required: true,
      options: [
        { value: 'low', label: '低 - 個人ユーザーに限定' },
        { value: 'medium', label: '中 - 部署レベル' },
        { value: 'high', label: '高 - 複数部署' },
        { value: 'critical', label: '致命的 - 全社レベル' },
      ],
      gridProps: { xs: 12, md: 6 },
    },
    {
      id: 'urgency',
      type: 'select',
      label: '緊急度',
      required: true,
      options: [
        { value: 'low', label: '低 - 業務への影響なし' },
        { value: 'medium', label: '中 - 一部機能制限' },
        { value: 'high', label: '高 - 重要機能停止' },
        { value: 'critical', label: '致命的 - 業務完全停止' },
      ],
      gridProps: { xs: 12, md: 6 },
    },
  ]

  // メトリックカードコンポーネント
  const MetricCard: React.FC<{
    title: string
    value: string | number
    icon: React.ReactElement
    color: string
    trend?: { value: number; label: string }
    loading?: boolean
  }> = ({ title, value, icon, color, trend, loading = false }) => (
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
          <Avatar sx={{ 
            bgcolor: alpha(color, 0.1), 
            color, 
            width: 48, 
            height: 48,
          }}>
            {icon}
          </Avatar>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={24} sx={{ mt: 1 }} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, color }}>
                {value}
              </Typography>
            )}
          </Box>
        </Box>
        
        {trend && !loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )

  // インシデントカードコンポーネント
  const IncidentCard: React.FC<{ incident: Ticket; onSelect: () => void; selected: boolean }> = ({ 
    incident, 
    onSelect, 
    selected 
  }) => (
    <Card 
      sx={{ 
        cursor: 'pointer',
        border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      }}
      onClick={onSelect}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            {incident.id}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip
              label={incident.priority.toUpperCase()}
              size="small"
              sx={{
                bgcolor: `${priorityColors[incident.priority as keyof typeof priorityColors]}20`,
                color: priorityColors[incident.priority as keyof typeof priorityColors],
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
            {incident.slaDeadline && (
              <Chip
                icon={<TimeIcon />}
                label="SLA"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {incident.title}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {incident.description}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {incident.reporterName}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {new Date(incident.createdAt).toLocaleDateString('ja-JP')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )

  // イベントハンドラー
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLastUpdate(new Date())
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleIncidentClick = useCallback((incident: Ticket) => {
    console.log('インシデント詳細を表示:', incident)
  }, [])

  const handleCreateIncident = useCallback(async (data: Record<string, any>) => {
    console.log('新規インシデント作成:', data)
    setShowCreateModal(false)
    // API呼び出しの模擬
    await new Promise(resolve => setTimeout(resolve, 1000))
  }, [])

  const handleBulkAction = useCallback((action: string) => {
    console.log(`一括操作: ${action}`, Array.from(selectedIncidents))
  }, [selectedIncidents])

  const handleEscalate = useCallback(async (data: Record<string, any>) => {
    console.log('エスカレーション:', data)
    setShowEscalateModal(false)
  }, [])

  // フィルタリング
  const filteredIncidents = useMemo(() => {
    return mockIncidents.filter(incident => {
      if (filterStatus !== 'all' && incident.status !== filterStatus) return false
      if (filterPriority !== 'all' && incident.priority !== filterPriority) return false
      return true
    })
  }, [filterStatus, filterPriority])

  const pageActions = (
    <Stack direction="row" spacing={1} alignItems="center">
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>ステータス</InputLabel>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          label="ステータス"
        >
          <MenuItem value="all">すべて</MenuItem>
          <MenuItem value="open">未対応</MenuItem>
          <MenuItem value="in_progress">対応中</MenuItem>
          <MenuItem value="resolved">解決済み</MenuItem>
        </Select>
      </FormControl>
      
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>優先度</InputLabel>
        <Select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          label="優先度"
        >
          <MenuItem value="all">すべて</MenuItem>
          <MenuItem value="critical">致命的</MenuItem>
          <MenuItem value="high">高</MenuItem>
          <MenuItem value="medium">中</MenuItem>
          <MenuItem value="low">低</MenuItem>
        </Select>
      </FormControl>
      
      <Tooltip title="表示形式">
        <IconButton 
          onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
          color={viewMode === 'card' ? 'primary' : 'default'}
        >
          {viewMode === 'table' ? <CardViewIcon /> : <ListViewIcon />}
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
        startIcon={<AddIcon />}
        onClick={() => setShowCreateModal(true)}
        size={isMobile ? 'small' : 'medium'}
      >
        新規作成
      </Button>
    </Stack>
  )

  return (
    <ContentArea
      pageTitle="インシデント管理"
      pageDescription="ITインシデントの管理、追跡、解決"
      actions={pageActions}
    >
      {/* アラート：期限超過インシデント */}
      {mockStats.overdue > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              詳細
            </Button>
          }
        >
          {mockStats.overdue}件のインシデントがSLA期限を超過しています
        </Alert>
      )}

      {/* タブナビゲーション */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab icon={<ListViewIcon />} label="インシデント一覧" iconPosition="start" />
          <Tab icon={<IncidentIcon />} label="統計・分析" iconPosition="start" />
        </Tabs>
      </Box>

      {currentTab === 0 ? (
        <Box>
          {/* メトリクスカード */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="総数"
                value={mockStats.total}
                icon={<AssignmentIcon />}
                color={theme.palette.primary.main}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="未対応"
                value={mockStats.open}
                icon={<WarningIcon />}
                color={theme.palette.warning.main}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="対応中"
                value={mockStats.inProgress}
                icon={<StartIcon />}
                color={theme.palette.info.main}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="解決済み"
                value={mockStats.resolved}
                icon={<CheckCircleIcon />}
                color={theme.palette.success.main}
                trend={{ value: 12.5, label: '今週' }}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="期限超過"
                value={mockStats.overdue}
                icon={<ScheduleIcon />}
                color={theme.palette.error.main}
                loading={refreshing}
              />
            </Grid>
          </Grid>

          {/* 一括操作バー */}
          {selectedIncidents.size > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body1">
                  {selectedIncidents.size}件のインシデントが選択されています
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<EscalateIcon />}
                    onClick={() => setShowEscalateModal(true)}
                    size="small"
                  >
                    エスカレーション
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<StartIcon />}
                    onClick={() => handleBulkAction('assign')}
                    size="small"
                  >
                    担当者割当
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CompleteIcon />}
                    onClick={() => handleBulkAction('close')}
                    size="small"
                  >
                    一括クローズ
                  </Button>
                </Stack>
              </Box>
            </Paper>
          )}

          {/* インシデント一覧 */}
          {viewMode === 'table' ? (
            <DataTable
              title="インシデント一覧"
              subtitle={`${filteredIncidents.length}件のインシデント`}
              data={filteredIncidents}
              columns={columns}
              loading={refreshing}
              searchable={true}
              filterable={true}
              exportable={true}
              selectable={true}
              dense={false}
              initialPageSize={20}
              onRowClick={handleIncidentClick}
              onRowSelect={(selected) => setSelectedIncidents(new Set(selected.map(item => item.id)))}
              onRefresh={handleRefresh}
              emptyStateMessage="インシデントがありません"
            />
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                インシデント一覧 ({filteredIncidents.length}件)
              </Typography>
              <Grid container spacing={2}>
                {filteredIncidents.map((incident) => (
                  <Grid item xs={12} sm={6} md={4} key={incident.id}>
                    <IncidentCard
                      incident={incident}
                      selected={selectedIncidents.has(incident.id)}
                      onSelect={() => {
                        const newSelected = new Set(selectedIncidents)
                        if (newSelected.has(incident.id)) {
                          newSelected.delete(incident.id)
                        } else {
                          newSelected.add(incident.id)
                        }
                        setSelectedIncidents(newSelected)
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      ) : (
        <Box>
          {/* 統計・分析タブ */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <CustomDonutChart
                title="優先度別分布"
                data={priorityChartData}
                dataKey="value"
                nameKey="name"
                height={300}
                centerLabel="総数"
                centerValue={priorityChartData.reduce((sum, item) => sum + item.value, 0)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <CustomBarChart
                title="ステータス別分布"
                data={statusChartData}
                bars={[{ dataKey: 'value', name: '件数', color: theme.palette.primary.main }]}
                xAxisKey="name"
                height={300}
              />
            </Grid>
            <Grid item xs={12}>
              <CustomLineChart
                title="インシデント推移 (過去7日)"
                data={trendData}
                lines={[
                  { dataKey: 'incidents', name: '新規', color: theme.palette.primary.main },
                  { dataKey: 'resolved', name: '解決', color: theme.palette.success.main },
                ]}
                xAxisKey="date"
                height={350}
                smooth={true}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* 新規インシデント作成モーダル */}
      <ModalDialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新規インシデント作成"
        maxWidth="md"
        fullWidth
      >
        <FormBuilder
          fields={incidentFormFields}
          onSubmit={handleCreateIncident}
          onCancel={() => setShowCreateModal(false)}
          submitLabel="作成"
          cancelLabel="キャンセル"
        />
      </ModalDialog>

      {/* エスカレーションモーダル */}
      <ModalDialog
        open={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        title="インシデントエスカレーション"
        maxWidth="sm"
        fullWidth
      >
        <FormBuilder
          fields={[
            {
              id: 'escalateTo',
              type: 'select',
              label: 'エスカレーション先',
              required: true,
              options: [
                { value: 'level2', label: 'レベル2サポート' },
                { value: 'manager', label: 'マネージャー' },
                { value: 'vendor', label: 'ベンダー' },
              ],
              gridProps: { xs: 12 },
            },
            {
              id: 'reason',
              type: 'textarea',
              label: 'エスカレーション理由',
              required: true,
              rows: 3,
              gridProps: { xs: 12 },
            },
          ]}
          onSubmit={handleEscalate}
          onCancel={() => setShowEscalateModal(false)}
          submitLabel="エスカレーション実行"
          cancelLabel="キャンセル"
        />
      </ModalDialog>

      {/* フローティングアクションボタン */}
      <Fab
        color="primary"
        aria-label="新規インシデント作成"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
        onClick={() => setShowCreateModal(true)}
      >
        <AddIcon />
      </Fab>
    </ContentArea>
  )
}

export default IncidentManagement