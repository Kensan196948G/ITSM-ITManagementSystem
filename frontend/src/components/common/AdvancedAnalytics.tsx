import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { useTheme } from '@mui/material/styles'
import type { DashboardMetrics, Ticket } from '../../types'

interface AdvancedAnalyticsProps {
  metrics: DashboardMetrics
  timeRange: 'today' | 'week' | 'month' | 'quarter'
  onTimeRangeChange: (range: 'today' | 'week' | 'month' | 'quarter') => void
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  metrics,
  timeRange,
  onTimeRangeChange,
}) => {
  const theme = useTheme()
  const [selectedMetric, setSelectedMetric] = useState<string>('resolution')

  // Mock advanced analytics data
  const performanceData = useMemo(() => {
    const baseData = [
      { name: '月', tickets: 45, resolved: 42, avgTime: 3.2 },
      { name: '火', tickets: 38, resolved: 35, avgTime: 2.8 },
      { name: '水', tickets: 52, resolved: 48, avgTime: 4.1 },
      { name: '木', tickets: 29, resolved: 27, avgTime: 2.5 },
      { name: '金', tickets: 41, resolved: 39, avgTime: 3.6 },
      { name: '土', tickets: 18, resolved: 16, avgTime: 1.9 },
      { name: '日', tickets: 25, resolved: 23, avgTime: 2.3 },
    ]
    return baseData
  }, [timeRange])

  const categoryPerformance = [
    { category: 'Infrastructure', tickets: 25, avgResolution: 4.2, slaCompliance: 88 },
    { category: 'Network', tickets: 18, avgResolution: 3.1, slaCompliance: 92 },
    { category: 'Hardware', tickets: 32, avgResolution: 2.8, slaCompliance: 95 },
    { category: 'Software', tickets: 41, avgResolution: 5.1, slaCompliance: 82 },
    { category: 'Security', tickets: 12, avgResolution: 6.3, slaCompliance: 78 },
    { category: 'Email', tickets: 28, avgResolution: 1.9, slaCompliance: 98 },
  ]

  const agentPerformance = [
    { name: '山田太郎', tickets: 45, avgTime: 3.2, satisfaction: 4.8 },
    { name: '佐藤花子', tickets: 38, avgTime: 2.8, satisfaction: 4.6 },
    { name: '田中一郎', tickets: 52, avgTime: 4.1, satisfaction: 4.2 },
    { name: '高橋三郎', tickets: 29, avgTime: 2.5, satisfaction: 4.9 },
  ]

  const skillRadarData = [
    { skill: '技術力', value: 85 },
    { skill: 'コミュニケーション', value: 92 },
    { skill: '問題解決', value: 88 },
    { skill: '效率性', value: 79 },
    { skill: '顧客満足', value: 95 },
    { skill: 'チームワーク', value: 86 },
  ]

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUpIcon color="success" />
    if (current < previous) return <TrendingDownIcon color="error" />
    return <TrendingFlatIcon color="info" />
  }

  const getTrendPercentage = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    return Math.abs(change).toFixed(1)
  }

  const getSLAColor = (compliance: number) => {
    if (compliance >= 95) return 'success'
    if (compliance >= 85) return 'warning'
    return 'error'
  }

  return (
    <Box>
      {/* Header with time range selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InsightsIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            高度な分析
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>期間</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as any)}
            label="期間"
          >
            <MenuItem value="today">今日</MenuItem>
            <MenuItem value="week">今週</MenuItem>
            <MenuItem value="month">今月</MenuItem>
            <MenuItem value="quarter">四半期</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Performance Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                パフォーマンストレンド
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="tickets"
                    stackId="1"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.light}
                    fillOpacity={0.6}
                    name="新規チケット"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="resolved"
                    stackId="2"
                    stroke={theme.palette.success.main}
                    fill={theme.palette.success.light}
                    fillOpacity={0.6}
                    name="解決チケット"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgTime"
                    stroke={theme.palette.warning.main}
                    strokeWidth={3}
                    name="平均解決時間(時間)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        94.5%
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        SLA遵守率
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      {getTrendIcon(94.5, 92.1)}
                      <Typography variant="caption" display="block">
                        +{getTrendPercentage(94.5, 92.1)}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        3.2h
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        平均解決時間
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      {getTrendIcon(3.2, 4.1)}
                      <Typography variant="caption" display="block">
                        -{getTrendPercentage(3.2, 4.1)}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Category Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                カテゴリ別パフォーマンス
              </Typography>
              <List>
                {categoryPerformance.map((category, index) => (
                  <React.Fragment key={category.category}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: `hsl(${index * 60}, 60%, 50%)` }}>
                          <AssignmentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={category.category}
                        secondary={
                          <Box component="div">
                            <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              {category.tickets}件 | 平均{category.avgResolution}h
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Box component="span" sx={{ fontSize: '0.75rem' }}>
                                SLA遵守率:
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={category.slaCompliance}
                                sx={{
                                  flexGrow: 1,
                                  height: 6,
                                  borderRadius: 3,
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: getSLAColor(category.slaCompliance) + '.main',
                                  },
                                }}
                              />
                              <Box component="span" sx={{ minWidth: 35, fontSize: '0.75rem' }}>
                                {category.slaCompliance}%
                              </Box>
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={category.slaCompliance >= 95 ? '優秀' : category.slaCompliance >= 85 ? '良好' : '改善必要'}
                          size="small"
                          color={getSLAColor(category.slaCompliance) as any}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < categoryPerformance.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Agent Performance Radar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                チームスキル分析
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={skillRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                  />
                  <Radar
                    name="チーム平均"
                    dataKey="value"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.main}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <ChartTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                トップパフォーマー
              </Typography>
              <Grid container spacing={2}>
                {agentPerformance.map((agent, index) => (
                  <Grid item xs={12} sm={6} md={3} key={agent.name}>
                    <Card variant="outlined" sx={{ bgcolor: index === 0 ? 'success.light' : 'background.paper' }}>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            mx: 'auto',
                            mb: 1,
                            bgcolor: index === 0 ? 'success.main' : 'primary.main',
                          }}
                        >
                          {agent.name.charAt(0)}
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {agent.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {index + 1}位
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" display="block">
                            処理数: {agent.tickets}件
                          </Typography>
                          <Typography variant="caption" display="block">
                            平均時間: {agent.avgTime}h
                          </Typography>
                          <Typography variant="caption" display="block">
                            満足度: {agent.satisfaction}/5.0
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AdvancedAnalytics