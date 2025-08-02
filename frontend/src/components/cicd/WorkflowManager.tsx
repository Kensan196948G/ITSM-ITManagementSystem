import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Stack,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  alpha,
  Tooltip,
  Badge,
  Divider,
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Pause as PauseIcon,
  Build as BuildIcon,
  CloudQueue as CloudIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon,
  AutoFixHigh as AutoFixIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  MonitorHeart as MonitorIcon,
} from '@mui/icons-material'
import ContentArea from '../layout/ContentArea'

// 型定義
interface WorkflowStep {
  id: string
  name: string
  type: 'build' | 'test' | 'deploy' | 'repair' | 'notify'
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  duration?: number
  startTime?: string
  endTime?: string
  command?: string
  errorMessage?: string
}

interface Workflow {
  id: string
  name: string
  description: string
  status: 'idle' | 'running' | 'success' | 'failed' | 'paused'
  enabled: boolean
  lastRun?: string
  nextRun?: string
  runCount: number
  successCount: number
  failureCount: number
  averageDuration: number
  trigger: 'manual' | 'scheduled' | 'webhook' | 'auto-repair'
  schedule?: string
  branch: string
  repository: string
  steps: WorkflowStep[]
  autoRetry: boolean
  maxRetries: number
  timeoutMinutes: number
}

const WorkflowManager: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // モックデータ
  useEffect(() => {
    const mockWorkflows: Workflow[] = [
      {
        id: 'auto-repair-workflow',
        name: 'CI/CD自動修復ワークフロー',
        description: '無限ループ検知と自動修復を実行するメインワークフロー',
        status: 'running',
        enabled: true,
        lastRun: '2025-08-02T15:49:54',
        nextRun: '2025-08-02T16:19:54',
        runCount: 146,
        successCount: 142,
        failureCount: 4,
        averageDuration: 90,
        trigger: 'auto-repair',
        schedule: '*/30 * * * *',
        branch: 'main',
        repository: 'ITSM-ITmanagementSystem',
        autoRetry: true,
        maxRetries: 3,
        timeoutMinutes: 30,
        steps: [
          {
            id: 'detect-errors',
            name: 'エラー検知',
            type: 'repair',
            status: 'success',
            duration: 15,
            startTime: '2025-08-02T15:49:54',
            endTime: '2025-08-02T15:50:09',
            command: 'python error_monitor.py --scan',
          },
          {
            id: 'run-tests',
            name: 'テスト実行',
            type: 'test',
            status: 'success',
            duration: 45,
            startTime: '2025-08-02T15:50:09',
            endTime: '2025-08-02T15:50:54',
            command: 'pytest tests/',
          },
          {
            id: 'apply-fixes',
            name: '修復適用',
            type: 'repair',
            status: 'running',
            startTime: '2025-08-02T15:50:54',
            command: 'python auto_repair.py --fix',
          },
          {
            id: 'verify-fixes',
            name: '修復確認',
            type: 'test',
            status: 'pending',
            command: 'pytest tests/ --verify',
          },
        ],
      },
      {
        id: 'backend-ci',
        name: 'バックエンドCI/CDパイプライン',
        description: 'バックエンドコードのビルド、テスト、デプロイ',
        status: 'success',
        enabled: true,
        lastRun: '2025-08-02T15:30:00',
        runCount: 89,
        successCount: 86,
        failureCount: 3,
        averageDuration: 180,
        trigger: 'webhook',
        branch: 'main',
        repository: 'ITSM-ITmanagementSystem',
        autoRetry: true,
        maxRetries: 2,
        timeoutMinutes: 15,
        steps: [
          {
            id: 'checkout',
            name: 'コードチェックアウト',
            type: 'build',
            status: 'success',
            duration: 10,
          },
          {
            id: 'install-deps',
            name: '依存関係インストール',
            type: 'build',
            status: 'success',
            duration: 45,
          },
          {
            id: 'run-tests',
            name: 'テスト実行',
            type: 'test',
            status: 'success',
            duration: 120,
          },
          {
            id: 'build-app',
            name: 'アプリビルド',
            type: 'build',
            status: 'success',
            duration: 30,
          },
        ],
      },
      {
        id: 'frontend-ci',
        name: 'フロントエンドCI/CDパイプライン',
        description: 'React アプリケーションのビルドとデプロイ',
        status: 'idle',
        enabled: true,
        lastRun: '2025-08-02T15:25:00',
        runCount: 73,
        successCount: 71,
        failureCount: 2,
        averageDuration: 95,
        trigger: 'webhook',
        branch: 'main',
        repository: 'ITSM-ITmanagementSystem',
        autoRetry: false,
        maxRetries: 1,
        timeoutMinutes: 10,
        steps: [
          {
            id: 'checkout',
            name: 'コードチェックアウト',
            type: 'build',
            status: 'success',
            duration: 8,
          },
          {
            id: 'install-deps',
            name: 'npm install',
            type: 'build',
            status: 'success',
            duration: 35,
          },
          {
            id: 'run-tests',
            name: 'ユニットテスト',
            type: 'test',
            status: 'success',
            duration: 25,
          },
          {
            id: 'build-app',
            name: 'プロダクションビルド',
            type: 'build',
            status: 'success',
            duration: 27,
          },
        ],
      },
    ]
    setWorkflows(mockWorkflows)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return theme.palette.info.main
      case 'success': return theme.palette.success.main
      case 'failed': return theme.palette.error.main
      case 'paused': return theme.palette.warning.main
      case 'pending': return theme.palette.grey[500]
      default: return theme.palette.grey[500]
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <PlayIcon />
      case 'success': return <SuccessIcon />
      case 'failed': return <ErrorIcon />
      case 'paused': return <PauseIcon />
      case 'pending': return <ScheduleIcon />
      default: return <ScheduleIcon />
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'build': return <BuildIcon />
      case 'test': return <CodeIcon />
      case 'deploy': return <CloudIcon />
      case 'repair': return <AutoFixIcon />
      case 'notify': return <MonitorIcon />
      default: return <BuildIcon />
    }
  }

  const handleWorkflowAction = useCallback((workflowId: string, action: 'start' | 'stop' | 'pause' | 'retry') => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === workflowId) {
        switch (action) {
          case 'start':
            return { ...w, status: 'running' as const }
          case 'stop':
          case 'pause':
            return { ...w, status: 'paused' as const }
          case 'retry':
            return { ...w, status: 'running' as const, runCount: w.runCount + 1 }
          default:
            return w
        }
      }
      return w
    }))
    console.log(`ワークフロー ${workflowId} で ${action} を実行`)
  }, [])

  const handleToggleEnabled = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, enabled: !w.enabled } : w
    ))
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      // 実際の実装ではAPIコール
    } finally {
      setRefreshing(false)
    }
  }, [])

  const pageActions = (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={handleRefresh}
        disabled={refreshing}
        size={isMobile ? 'small' : 'medium'}
      >
        更新
      </Button>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setCreateDialogOpen(true)}
        size={isMobile ? 'small' : 'medium'}
      >
        新規作成
      </Button>
    </Stack>
  )

  return (
    <ContentArea
      pageTitle="ワークフロー管理"
      pageDescription="CI/CD自動修復ワークフローの設定と管理"
      actions={pageActions}
      showBreadcrumbs={true}
    >
      {/* 統計サマリー */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                  <BuildIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {workflows.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    総ワークフロー数
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                  <PlayIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {workflows.filter(w => w.status === 'running').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    実行中
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                  <SuccessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {Math.round(workflows.reduce((acc, w) => acc + (w.successCount / w.runCount * 100), 0) / workflows.length)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平均成功率
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {Math.round(workflows.reduce((acc, w) => acc + w.averageDuration, 0) / workflows.length)}s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平均実行時間
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ワークフロー一覧 */}
      <Grid container spacing={3}>
        {workflows.map((workflow) => (
          <Grid item xs={12} lg={6} key={workflow.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Avatar sx={{ 
                      bgcolor: alpha(getStatusColor(workflow.status), 0.1), 
                      color: getStatusColor(workflow.status),
                    }}>
                      {getStatusIcon(workflow.status)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap>
                        {workflow.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {workflow.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={workflow.status.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: alpha(getStatusColor(workflow.status), 0.1),
                        color: getStatusColor(workflow.status),
                        fontWeight: 600,
                      }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={workflow.enabled}
                          onChange={() => handleToggleEnabled(workflow.id)}
                          size="small"
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />
                  </Stack>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    実行回数: {workflow.runCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    成功率: {Math.round((workflow.successCount / workflow.runCount) * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    最終実行: {workflow.lastRun ? new Date(workflow.lastRun).toLocaleString('ja-JP') : 'なし'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平均実行時間: {workflow.averageDuration}秒
                  </Typography>
                </Box>

                {/* ステップ詳細 */}
                <Box sx={{ mb: 2 }}>
                  <Button
                    size="small"
                    onClick={() => setDetailsOpen(detailsOpen === workflow.id ? null : workflow.id)}
                    endIcon={detailsOpen === workflow.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    ステップ詳細
                  </Button>
                  <Collapse in={detailsOpen === workflow.id}>
                    <List dense sx={{ mt: 1 }}>
                      {workflow.steps.map((step, index) => (
                        <ListItem key={step.id} sx={{ pl: 0 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Avatar sx={{ 
                              width: 24, 
                              height: 24, 
                              bgcolor: alpha(getStatusColor(step.status), 0.1),
                              color: getStatusColor(step.status),
                            }}>
                              {getStepIcon(step.type)}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={step.name}
                            secondary={step.command}
                            primaryTypographyProps={{ fontSize: '0.875rem' }}
                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={step.status}
                              size="small"
                              sx={{
                                bgcolor: alpha(getStatusColor(step.status), 0.1),
                                color: getStatusColor(step.status),
                                fontSize: '0.75rem',
                              }}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<PlayIcon />}
                    onClick={() => handleWorkflowAction(workflow.id, 'start')}
                    disabled={workflow.status === 'running' || !workflow.enabled}
                  >
                    実行
                  </Button>
                  <Button
                    size="small"
                    startIcon={<StopIcon />}
                    onClick={() => handleWorkflowAction(workflow.id, 'stop')}
                    disabled={workflow.status !== 'running'}
                  >
                    停止
                  </Button>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => handleWorkflowAction(workflow.id, 'retry')}
                    disabled={!workflow.enabled}
                  >
                    再実行
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="履歴表示">
                    <IconButton size="small">
                      <HistoryIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ログ表示">
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="設定編集">
                    <IconButton 
                      size="small"
                      onClick={() => {
                        setSelectedWorkflow(workflow)
                        setEditDialogOpen(true)
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 新規作成ダイアログ */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>新規ワークフロー作成</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            新しいCI/CDワークフローを作成します。
          </Typography>
          {/* フォーム要素は実装簡略化のため省略 */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained">作成</Button>
        </DialogActions>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ワークフロー編集</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            ワークフロー設定を編集します。
          </Typography>
          {/* フォーム要素は実装簡略化のため省略 */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </ContentArea>
  )
}

export default WorkflowManager