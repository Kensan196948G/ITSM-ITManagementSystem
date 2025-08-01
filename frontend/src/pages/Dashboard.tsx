import React, { useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  useTheme,
  Tabs,
  Tab,
  Button,
  useMediaQuery,
  Collapse,
  Stack,
} from '@mui/material'
import {
  ConfirmationNumber as TicketIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  PriorityHigh as PriorityHighIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts'
import { priorityColors, statusColors } from '../theme/theme'
import AdvancedAnalytics from '../components/common/AdvancedAnalytics'
import { useResponsive, ResponsiveContainer as CustomResponsiveContainer, MobileCard } from '../components/common/ResponsiveContainer'
import ContentArea from '../components/layout/ContentArea'
import type { DashboardMetrics, Ticket, ChartDataPoint, TimeSeriesData } from '../types'

const Dashboard: React.FC = () => {
  const theme = useTheme()
  const { isMobile, isTablet, isXsScreen } = useResponsive()
  const [currentTab, setCurrentTab] = useState(0)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('week')
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    metrics: true,
    sla: true,
    charts: isMobile ? false : true,
    tickets: true,
  })

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
        id: '1',
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
        id: '2',
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
        id: '3',
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
    ],
  }

  const ticketTrendData: TimeSeriesData[] = [
    { date: '7/25', tickets: 15, resolved: 12 },
    { date: '7/26', tickets: 22, resolved: 18 },
    { date: '7/27', tickets: 18, resolved: 20 },
    { date: '7/28', tickets: 25, resolved: 16 },
    { date: '7/29', tickets: 19, resolved: 23 },
    { date: '7/30', tickets: 28, resolved: 21 },
    { date: '7/31', tickets: 23, resolved: 25 },
  ]

  const priorityData: ChartDataPoint[] = [
    { name: 'Critical', value: mockMetrics.ticketsByPriority.critical, color: priorityColors.critical },
    { name: 'High', value: mockMetrics.ticketsByPriority.high, color: priorityColors.high },
    { name: 'Medium', value: mockMetrics.ticketsByPriority.medium, color: priorityColors.medium },
    { name: 'Low', value: mockMetrics.ticketsByPriority.low, color: priorityColors.low },
  ]

  const statusData: ChartDataPoint[] = [
    { name: 'Open', value: mockMetrics.ticketsByStatus.open, color: statusColors.open },
    { name: 'In Progress', value: mockMetrics.ticketsByStatus.in_progress, color: statusColors.in_progress },
    { name: 'Resolved', value: mockMetrics.ticketsByStatus.resolved, color: statusColors.resolved },
    { name: 'Closed', value: mockMetrics.ticketsByStatus.closed, color: statusColors.closed },
    { name: 'On Hold', value: mockMetrics.ticketsByStatus.on_hold, color: statusColors.on_hold },
  ]

  const MetricCard: React.FC<{
    title: string
    value: string | number
    icon: React.ReactElement
    color: string
    trend?: string
    subtitle?: string
  }> = ({ title, value, icon, color, trend, subtitle }) => (
    <Card sx={{ 
      height: '100%',
      boxShadow: isMobile ? 1 : 3,
    }}>
      <CardContent sx={{ 
        p: isMobile ? 2 : 3,
        pb: isMobile ? '16px !important' : 3,
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 0,
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant={isMobile ? 'caption' : 'body2'} 
              color="text.secondary" 
              gutterBottom
            >
              {title}
            </Typography>
            <Typography 
              variant={isMobile ? 'h5' : 'h4'} 
              sx={{ 
                fontWeight: 600, 
                color,
                fontSize: isMobile ? '1.5rem' : '2.125rem',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant={isMobile ? 'caption' : 'body2'} 
                color="text.secondary"
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ 
            bgcolor: `${color}20`, 
            color, 
            width: isMobile ? 40 : 56, 
            height: isMobile ? 40 : 56,
            alignSelf: isMobile ? 'flex-end' : 'center',
          }}>
            {icon}
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: isMobile ? 1 : 2 }}>
            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main', mr: 0.5 }} />
            <Typography variant="caption" color="success.main" fontSize={isMobile ? '0.65rem' : '0.75rem'}>
              {trend}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )

  const getPriorityChip = (priority: string) => {
    const color = priorityColors[priority as keyof typeof priorityColors]
    return (
      <Chip
        label={priority.toUpperCase()}
        size="small"
        sx={{
          bgcolor: `${color}20`,
          color: color,
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    )
  }

  const getStatusChip = (status: string) => {
    const color = statusColors[status as keyof typeof statusColors]
    const statusLabels = {
      open: '未対応',
      in_progress: '対応中',
      resolved: '解決済み',
      closed: '完了',
      on_hold: '保留中',
    }
    return (
      <Chip
        label={statusLabels[status as keyof typeof statusLabels]}
        size="small"
        sx={{
          bgcolor: `${color}20`,
          color: color,
          fontWeight: 500,
        }}
      />
    )
  }

  const handleRefresh = () => {
    // Simulate data refresh
    if (window.notifications) {
      window.notifications.success('データを更新しました')
    }
  }

  const pageActions = (
    <Stack direction="row" spacing={2}>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={handleRefresh}
        size={isMobile ? 'small' : 'medium'}
      >
        更新
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
      <Box sx={{ mb: 3 }}>
        {/* タブメニュー */}
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
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

      {/* Dashboard Navigation Tabs */}
      <Paper sx={{ 
        mb: isMobile ? 2 : 3,
        boxShadow: isMobile ? 1 : 3,
      }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={!isMobile ? <DashboardIcon /> : undefined}
            label="概要"
            iconPosition={isMobile ? "top" : "start"}
            sx={{ 
              minHeight: isMobile ? 48 : 64,
              fontSize: isMobile ? '0.875rem' : '0.9375rem',
            }}
          />
          <Tab
            icon={!isMobile ? <AnalyticsIcon /> : undefined}
            label="詳細分析"
            iconPosition={isMobile ? "top" : "start"}
            sx={{ 
              minHeight: isMobile ? 48 : 64,
              fontSize: isMobile ? '0.875rem' : '0.9375rem',
            }}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 ? (
        <Box>

      {/* メトリクスカード */}
      <MobileCard 
        title={isMobile ? "主要指標" : undefined} 
        collapsible={isMobile} 
        defaultExpanded={expandedCards.metrics}
        dense={isMobile}
      >
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: isMobile ? 2 : 3 }}>
          <Grid item xs={6} sm={6} md={3}>
            <MetricCard
              title="総チケット数"
              value={mockMetrics.totalTickets.toLocaleString()}
              icon={<TicketIcon />}
              color={theme.palette.primary.main}
              trend={!isMobile ? "+5.2% from last month" : undefined}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <MetricCard
              title="未対応チケット"
              value={mockMetrics.openTickets}
              icon={<WarningIcon />}
              color={theme.palette.warning.main}
              subtitle={!isMobile ? "緊急対応が必要" : undefined}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <MetricCard
              title="解決済みチケット"
              value={mockMetrics.resolvedTickets.toLocaleString()}
              icon={<CheckCircleIcon />}
              color={theme.palette.success.main}
              trend={!isMobile ? "+12.8% this week" : undefined}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <MetricCard
              title="期限超過"
              value={mockMetrics.overdueTickets}
              icon={<ScheduleIcon />}
              color={theme.palette.error.main}
              subtitle={!isMobile ? "SLA違反リスク" : undefined}
            />
          </Grid>
        </Grid>
      </MobileCard>

      {/* SLA指標 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                SLA遵守率
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {mockMetrics.slaComplianceRate}%
                </Typography>
                <Box sx={{ ml: 2, flexGrow: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={mockMetrics.slaComplianceRate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'success.main',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                目標: 95% | 平均解決時間: {mockMetrics.avgResolutionTime}時間
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                チケット推移 (過去7日)
              </Typography>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={ticketTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    stackId="1"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.light}
                    fillOpacity={0.6}
                    name="新規"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stackId="2"
                    stroke={theme.palette.success.main}
                    fill={theme.palette.success.light}
                    fillOpacity={0.6}
                    name="解決"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* チャートセクション */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                優先度別チケット分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                ステータス別チケット分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" radius={4}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 最近のチケット */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              最近のチケット
            </Typography>
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List disablePadding>
            {mockMetrics.recentTickets.map((ticket, index) => (
              <React.Fragment key={ticket.id}>
                <ListItem
                  sx={{
                    px: 0,
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      cursor: 'pointer',
                    },
                  }}
                >
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: `${priorityColors[ticket.priority]}20`,
                        color: priorityColors[ticket.priority],
                      }}
                    >
                      <AssignmentIcon />
                    </Avatar>
                  </ListItemIcon>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600 }}>
                        {ticket.title}
                      </Typography>
                      {getPriorityChip(ticket.priority)}
                      {getStatusChip(ticket.status)}
                    </Box>
                    <Typography variant="body2" component="div" color="text.secondary" gutterBottom>
                      {ticket.description}
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary">
                      報告者: {ticket.reporterName} | 
                      {ticket.assigneeName && ` 担当者: ${ticket.assigneeName} | `}
                      作成: {new Date(ticket.createdAt).toLocaleString('ja-JP')}
                    </Typography>
                  </Box>
                  {ticket.slaDeadline && (
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip
                        icon={<PriorityHighIcon />}
                        label="SLA期限"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {new Date(ticket.slaDeadline).toLocaleString('ja-JP')}
                      </Typography>
                    </Box>
                  )}
                </ListItem>
                {index < mockMetrics.recentTickets.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
        </Box>
      ) : (
        <AdvancedAnalytics
          metrics={mockMetrics}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      )}
    </ContentArea>
  )
}

export default Dashboard