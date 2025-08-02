/**
 * 問題管理ページ
 * 包括的な問題管理機能を提供（根本原因分析、既知エラー管理を含む）
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  SearchOff as ProblemIcon,
  Psychology as RCAIcon,
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
  ExpandMore as ExpandMoreIcon,
  Engineering as EngineeringIcon,
  BugReport as BugIcon,
  Lightbulb as SolutionIcon,
  AccountTree as TreeIcon,
  Timeline as TimelineIcon,
  DataUsage as AnalysisIcon,
  Speed as ImpactIcon,
  Security as SecurityIcon,
  Build as FixIcon,
  Group as TeamIcon,
  MoreVert as MoreVertIcon,
  Link as LinkIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material'
import { priorityColors, statusColors } from '../../theme/theme'
import ContentArea from '../../components/layout/ContentArea'
import DataTable, { TableColumn } from '../../components/common/DataTable'
import ModalDialog from '../../components/common/ModalDialog'
import FormBuilder, { FormField } from '../../components/common/FormBuilder'
import { CustomBarChart, CustomDonutChart, CustomLineChart, CustomAreaChart } from '../../components/common/CustomCharts'

// 問題のデータ型定義
interface Problem {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'investigation' | 'rca_in_progress' | 'known_error' | 'closed'
  category: string
  assignedTeam: string
  assignedMembers: string[]
  relatedIncidents: string[]
  affectedServices: string[]
  rootCause?: string
  workaround?: string
  solution?: string
  createdAt: string
  updatedAt: string
  investigationProgress: number
  businessImpact: 'low' | 'medium' | 'high' | 'critical'
  estimatedCost: number
  expectedResolutionDate?: string
  rcaSteps: RCAStep[]
  knownErrorId?: string
}

// RCA（根本原因分析）ステップ
interface RCAStep {
  id: string
  phase: 'problem_definition' | 'data_collection' | 'timeline_analysis' | 'fishbone_analysis' | 'root_cause_identification' | 'solution_development' | 'implementation'
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  assignee: string
  startDate?: string
  completionDate?: string
  findings: string[]
  attachments: string[]
}

// 既知エラー
interface KnownError {
  id: string
  problemId: string
  title: string
  symptoms: string[]
  rootCause: string
  workaround: string
  solution?: string
  affectedVersions: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'resolved' | 'obsolete'
  createdAt: string
  lastUpdated: string
  documentUrl?: string
}

// 統計データ
interface ProblemStats {
  total: number
  open: number
  investigation: number
  rcaInProgress: number
  knownErrors: number
  closed: number
  critical: number
  avgResolutionTime: number
  rcaCompletionRate: number
}

const ProblemManagement: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  // 状態管理
  const [currentTab, setCurrentTab] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRCAModal, setShowRCAModal] = useState(false)
  const [showKnownErrorModal, setShowKnownErrorModal] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')

  // モックデータ
  const mockStats: ProblemStats = {
    total: 127,
    open: 23,
    investigation: 18,
    rcaInProgress: 12,
    knownErrors: 35,
    closed: 89,
    critical: 5,
    avgResolutionTime: 8.5,
    rcaCompletionRate: 85.2,
  }

  const mockProblems: Problem[] = [
    {
      id: 'PRB-001',
      title: 'データベース接続タイムアウトの根本原因',
      description: '定期的に発生するデータベース接続タイムアウトエラーの根本原因を特定し、恒久的な解決策を実装する必要がある。',
      status: 'rca_in_progress',
      priority: 'high',
      category: 'Database',
      assignedTeam: 'データベースチーム',
      assignedMembers: ['田中太郎', '佐藤花子'],
      relatedIncidents: ['INC-001', 'INC-005', 'INC-012', 'INC-018'],
      affectedServices: ['CRMシステム', 'データベース', 'レポート機能'],
      rootCause: 'コネクションプールの設定不備とデッドロックの発生',
      workaround: 'コネクションプールサイズを一時的に増加し、クエリタイムアウトを調整',
      createdAt: '2025-07-25T09:00:00Z',
      updatedAt: '2025-08-02T14:30:00Z',
      investigationProgress: 75,
      businessImpact: 'high',
      estimatedCost: 250000,
      expectedResolutionDate: '2025-08-10T17:00:00Z',
      rcaSteps: [
        {
          id: 'rca-step-1',
          phase: 'problem_definition',
          title: '問題定義',
          description: '発生している問題の詳細な定義と影響範囲の特定',
          status: 'completed',
          assignee: '田中太郎',
          startDate: '2025-07-25T09:00:00Z',
          completionDate: '2025-07-26T17:00:00Z',
          findings: ['ピーク時間帯に接続タイムアウトが多発', '特定のクエリパターンで発生頻度が高い'],
          attachments: ['problem_definition.pdf']
        },
        {
          id: 'rca-step-2',
          phase: 'data_collection',
          title: 'データ収集',
          description: 'ログ、メトリクス、パフォーマンスデータの収集',
          status: 'completed',
          assignee: '佐藤花子',
          startDate: '2025-07-26T09:00:00Z',
          completionDate: '2025-07-28T17:00:00Z',
          findings: ['データベースログに大量のデッドロック記録', 'CPU使用率のスパイクを確認'],
          attachments: ['logs_analysis.xlsx', 'performance_metrics.json']
        },
        {
          id: 'rca-step-3',
          phase: 'timeline_analysis',
          title: 'タイムライン分析',
          description: '問題発生のタイムラインと関連イベントの分析',
          status: 'in_progress',
          assignee: '田中太郎',
          startDate: '2025-07-29T09:00:00Z',
          findings: ['アプリケーションデプロイ後に問題頻度が増加', 'データベースメンテナンス後に一時的改善'],
          attachments: []
        }
      ]
    },
    {
      id: 'PRB-002',
      title: 'メール送信遅延の問題',
      description: 'システムからのメール送信が遅延し、重要な通知が適切なタイミングで配信されない問題。',
      status: 'known_error',
      priority: 'medium',
      category: 'Email',
      assignedTeam: 'インフラチーム',
      assignedMembers: ['山田次郎'],
      relatedIncidents: ['INC-003', 'INC-008', 'INC-014'],
      affectedServices: ['メールシステム', '通知機能'],
      rootCause: 'SMTPサーバーの設定不備とキュー処理の問題',
      workaround: 'メール送信の優先度調整機能を使用し、重要メールを優先処理',
      solution: 'SMTPサーバーの再設定とキュー処理アルゴリズムの改善',
      createdAt: '2025-07-20T11:20:00Z',
      updatedAt: '2025-08-01T16:45:00Z',
      investigationProgress: 100,
      businessImpact: 'medium',
      estimatedCost: 150000,
      knownErrorId: 'KE-002',
      rcaSteps: []
    },
    {
      id: 'PRB-003',
      title: 'Webサーバーパフォーマンス劣化',
      description: 'ピーク時間帯におけるWebサーバーのパフォーマンス劣化により、ユーザー体験が著しく低下している。',
      status: 'investigation',
      priority: 'critical',
      category: 'Performance',
      assignedTeam: 'Webチーム',
      assignedMembers: ['鈴木一郎', '高橋美咲', '中村隆'],
      relatedIncidents: ['INC-002', 'INC-006', 'INC-009', 'INC-011', 'INC-015'],
      affectedServices: ['Webサイト', 'APIゲートウェイ', 'モバイルアプリ'],
      workaround: 'ロードバランサーの設定調整とキャッシュの最適化',
      createdAt: '2025-07-28T13:15:00Z',
      updatedAt: '2025-08-02T09:20:00Z',
      investigationProgress: 35,
      businessImpact: 'critical',
      estimatedCost: 500000,
      expectedResolutionDate: '2025-08-15T17:00:00Z',
      rcaSteps: []
    },
    {
      id: 'PRB-004',
      title: 'ファイル共有システムの同期エラー',
      description: 'ファイル共有システムで同期エラーが頻発し、データの整合性に問題が発生している。',
      status: 'open',
      priority: 'high',
      category: 'Storage',
      assignedTeam: 'ストレージチーム',
      assignedMembers: ['青木三郎', '森田四郎'],
      relatedIncidents: ['INC-007', 'INC-013'],
      affectedServices: ['ファイル共有', 'バックアップシステム'],
      createdAt: '2025-08-01T08:30:00Z',
      updatedAt: '2025-08-02T10:15:00Z',
      investigationProgress: 15,
      businessImpact: 'high',
      estimatedCost: 300000,
      rcaSteps: []
    },
    {
      id: 'PRB-005',
      title: 'API認証システムの断続的障害',
      description: 'API認証システムで断続的な障害が発生し、外部システムとの連携に支障をきたしている。',
      status: 'known_error',
      priority: 'high',
      category: 'Security',
      assignedTeam: 'セキュリティチーム',
      assignedMembers: ['伊藤五郎'],
      relatedIncidents: ['INC-004', 'INC-010', 'INC-016'],
      affectedServices: ['API認証', '外部連携'],
      rootCause: 'トークン有効期限の管理ロジックに不具合',
      workaround: 'トークン有効期限を短縮し、リフレッシュ頻度を増加',
      solution: '認証ロジックの全面見直しと新システムへの移行',
      createdAt: '2025-07-18T14:45:00Z',
      updatedAt: '2025-08-01T13:20:00Z',
      investigationProgress: 100,
      businessImpact: 'high',
      estimatedCost: 400000,
      knownErrorId: 'KE-005',
      rcaSteps: []
    },
  ]

  const mockKnownErrors: KnownError[] = [
    {
      id: 'KE-002',
      problemId: 'PRB-002',
      title: 'SMTPサーバーキュー処理遅延',
      symptoms: ['メール送信の遅延', 'キューの蓄積', 'タイムアウトエラー'],
      rootCause: 'SMTPサーバーの設定不備とキュー処理アルゴリズムの非効率性',
      workaround: 'メール優先度設定を使用して重要メールを優先処理',
      solution: 'SMTPサーバー設定の最適化とキュー処理の改善',
      affectedVersions: ['v2.1.0', 'v2.1.1', 'v2.1.2'],
      severity: 'medium',
      status: 'active',
      createdAt: '2025-07-22T10:00:00Z',
      lastUpdated: '2025-08-01T15:30:00Z',
      documentUrl: 'https://kb.company.com/ke-002'
    },
    {
      id: 'KE-005',
      problemId: 'PRB-005',
      title: 'API認証トークン管理不具合',
      symptoms: ['認証エラーの断続的発生', 'トークン期限切れの誤判定', 'API接続の不安定性'],
      rootCause: 'トークン有効期限の計算ロジックとタイムゾーン処理に不具合',
      workaround: 'トークン有効期限を短縮し、リフレッシュ間隔を調整',
      solution: '認証システムの全面的な再設計と実装',
      affectedVersions: ['v3.0.0', 'v3.0.1', 'v3.1.0'],
      severity: 'high',
      status: 'active',
      createdAt: '2025-07-19T16:20:00Z',
      lastUpdated: '2025-08-01T11:45:00Z',
      documentUrl: 'https://kb.company.com/ke-005'
    }
  ]

  // チャートデータ
  const priorityChartData = [
    { name: '致命的', value: 5, color: priorityColors.critical },
    { name: '高', value: 28, color: priorityColors.high },
    { name: '中', value: 62, color: priorityColors.medium },
    { name: '低', value: 32, color: priorityColors.low },
  ]

  const statusChartData = [
    { name: 'オープン', value: mockStats.open, color: statusColors.open },
    { name: '調査中', value: mockStats.investigation, color: statusColors.in_progress },
    { name: 'RCA進行中', value: mockStats.rcaInProgress, color: '#FF9800' },
    { name: '既知エラー', value: mockStats.knownErrors, color: '#2196F3' },
    { name: 'クローズ', value: mockStats.closed, color: statusColors.resolved },
  ]

  const trendData = [
    { date: '7/25', problems: 8, rca: 3, knownErrors: 5, resolved: 6 },
    { date: '7/26', problems: 12, rca: 5, knownErrors: 7, resolved: 4 },
    { date: '7/27', problems: 6, rca: 2, knownErrors: 4, resolved: 8 },
    { date: '7/28', problems: 15, rca: 7, knownErrors: 9, resolved: 5 },
    { date: '7/29', problems: 9, rca: 4, knownErrors: 6, resolved: 11 },
    { date: '7/30', problems: 18, rca: 8, knownErrors: 12, resolved: 7 },
    { date: '7/31', problems: 11, rca: 5, knownErrors: 8, resolved: 9 },
  ]

  // RCAステップの定義
  const rcaPhases = [
    { id: 'problem_definition', title: '問題定義', description: '問題の詳細な定義と影響範囲の特定' },
    { id: 'data_collection', title: 'データ収集', description: 'ログ、メトリクス、証拠の収集' },
    { id: 'timeline_analysis', title: 'タイムライン分析', description: '事象の時系列分析' },
    { id: 'fishbone_analysis', title: '特性要因図分析', description: '原因の体系的分析' },
    { id: 'root_cause_identification', title: '根本原因特定', description: '真の根本原因の特定' },
    { id: 'solution_development', title: '解決策開発', description: '恒久的解決策の開発' },
    { id: 'implementation', title: '実装', description: '解決策の実装と検証' }
  ]

  // テーブル列定義
  const columns: TableColumn<Problem>[] = [
    {
      id: 'id',
      label: 'ID',
      minWidth: 100,
      render: (value) => (
        <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
          {value}
        </Typography>
      ),
    },
    {
      id: 'title',
      label: 'タイトル',
      minWidth: 250,
      searchable: true,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {row.category} • {row.affectedServices.length}サービス影響
          </Typography>
          {row.expectedResolutionDate && (
            <Chip
              icon={<TimeIcon />}
              label={`期限: ${new Date(row.expectedResolutionDate).toLocaleDateString('ja-JP')}`}
              size="small"
              color="info"
              variant="outlined"
              sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
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
      minWidth: 140,
      render: (value) => {
        const statusLabels = {
          open: 'オープン',
          investigation: '調査中',
          rca_in_progress: 'RCA進行中',
          known_error: '既知エラー',
          closed: 'クローズ',
        }
        const statusColorMap = {
          open: statusColors.open,
          investigation: statusColors.in_progress,
          rca_in_progress: '#FF9800',
          known_error: '#2196F3',
          closed: statusColors.resolved,
        }
        return (
          <Chip
            label={statusLabels[value as keyof typeof statusLabels]}
            size="small"
            sx={{
              bgcolor: `${statusColorMap[value as keyof typeof statusColorMap]}20`,
              color: statusColorMap[value as keyof typeof statusColorMap],
              fontWeight: 500,
            }}
          />
        )
      },
      filterType: 'select',
      filterOptions: [
        { value: 'open', label: 'オープン' },
        { value: 'investigation', label: '調査中' },
        { value: 'rca_in_progress', label: 'RCA進行中' },
        { value: 'known_error', label: '既知エラー' },
        { value: 'closed', label: 'クローズ' },
      ],
    },
    {
      id: 'assignedTeam',
      label: '担当チーム',
      minWidth: 150,
      searchable: true,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.assignedMembers.length}名担当
          </Typography>
        </Box>
      ),
    },
    {
      id: 'investigationProgress',
      label: '調査進捗',
      minWidth: 120,
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: '100%', maxWidth: 60 }}>
            <LinearProgress
              variant="determinate"
              value={value}
              color={value >= 80 ? 'success' : value >= 50 ? 'warning' : 'error'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
          <Typography variant="caption" sx={{ minWidth: 35 }}>
            {value}%
          </Typography>
        </Box>
      ),
    },
    {
      id: 'businessImpact',
      label: 'ビジネス影響',
      minWidth: 120,
      render: (value) => {
        const impactLabels = {
          low: '低',
          medium: '中',
          high: '高',
          critical: '致命的'
        }
        const impactColors = {
          low: 'success',
          medium: 'info',
          high: 'warning',
          critical: 'error'
        }
        return (
          <Chip
            label={impactLabels[value as keyof typeof impactLabels]}
            size="small"
            color={impactColors[value as keyof typeof impactColors] as any}
            variant="outlined"
          />
        )
      },
    },
    {
      id: 'relatedIncidents',
      label: '関連インシデント',
      minWidth: 150,
      render: (value) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {value.slice(0, 2).map((incident: string) => (
            <Chip
              key={incident}
              label={incident}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
          {value.length > 2 && (
            <Chip
              label={`+${value.length - 2}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>
      ),
    },
    {
      id: 'createdAt',
      label: '作成日時',
      minWidth: 150,
      render: (value) => new Date(value).toLocaleString('ja-JP'),
    },
  ]

  // 新規問題作成フォームの定義
  const problemFormFields: FormField[] = [
    {
      id: 'title',
      type: 'text',
      label: 'タイトル',
      placeholder: '問題のタイトルを入力してください',
      required: true,
      validation: {
        minLength: 10,
        maxLength: 200,
      },
      gridProps: { xs: 12 },
    },
    {
      id: 'description',
      type: 'textarea',
      label: '詳細説明',
      placeholder: '問題の詳細を説明してください',
      required: true,
      rows: 4,
      validation: {
        minLength: 20,
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
        { value: 'Performance', label: 'パフォーマンス' },
        { value: 'Storage', label: 'ストレージ' },
        { value: 'Other', label: 'その他' },
      ],
      gridProps: { xs: 12, md: 6 },
    },
    {
      id: 'businessImpact',
      type: 'select',
      label: 'ビジネス影響度',
      required: true,
      options: [
        { value: 'low', label: '低 - 限定的な影響' },
        { value: 'medium', label: '中 - 部分的な機能影響' },
        { value: 'high', label: '高 - 重要な機能影響' },
        { value: 'critical', label: '致命的 - 業務停止レベル' },
      ],
      gridProps: { xs: 12, md: 6 },
    },
    {
      id: 'assignedTeam',
      type: 'select',
      label: '担当チーム',
      required: true,
      options: [
        { value: 'infrastructure', label: 'インフラチーム' },
        { value: 'database', label: 'データベースチーム' },
        { value: 'web', label: 'Webチーム' },
        { value: 'security', label: 'セキュリティチーム' },
        { value: 'storage', label: 'ストレージチーム' },
        { value: 'network', label: 'ネットワークチーム' },
      ],
      gridProps: { xs: 12, md: 6 },
    },
    {
      id: 'relatedIncidents',
      type: 'chips',
      label: '関連インシデント',
      placeholder: 'インシデントIDを入力（例: INC-001）',
      gridProps: { xs: 12 },
    },
    {
      id: 'affectedServices',
      type: 'chips',
      label: '影響を受けるサービス',
      placeholder: 'サービス名を入力',
      required: true,
      gridProps: { xs: 12 },
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

  // 問題カードコンポーネント
  const ProblemCard: React.FC<{ problem: Problem; onSelect: () => void; selected: boolean }> = ({ 
    problem, 
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
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', fontFamily: 'monospace' }}>
            {problem.id}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={problem.priority.toUpperCase()}
              size="small"
              sx={{
                bgcolor: `${priorityColors[problem.priority as keyof typeof priorityColors]}20`,
                color: priorityColors[problem.priority as keyof typeof priorityColors],
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
            {problem.knownErrorId && (
              <Chip
                icon={<RCAIcon />}
                label="既知エラー"
                size="small"
                color="info"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {problem.title}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {problem.description}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption">調査進捗</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {problem.investigationProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={problem.investigationProgress}
            color={problem.investigationProgress >= 80 ? 'success' : problem.investigationProgress >= 50 ? 'warning' : 'error'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TeamIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {problem.assignedTeam}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {new Date(problem.createdAt).toLocaleDateString('ja-JP')}
          </Typography>
        </Box>
        
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {problem.relatedIncidents.slice(0, 3).map((incident) => (
            <Chip
              key={incident}
              label={incident}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          ))}
          {problem.relatedIncidents.length > 3 && (
            <Chip
              label={`+${problem.relatedIncidents.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  )

  // RCAステップコンポーネント
  const RCAStepComponent: React.FC<{ step: RCAStep; index: number }> = ({ step, index }) => {
    const getStepIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return <CheckCircleIcon color="success" />
        case 'in_progress':
          return <CircularProgress size={20} />
        default:
          return <ScheduleIcon color="disabled" />
      }
    }

    return (
      <Step active={step.status !== 'pending'} completed={step.status === 'completed'}>
        <StepLabel icon={getStepIcon(step.status)}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {step.title}
          </Typography>
        </StepLabel>
        <StepContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {step.description}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              担当者: {step.assignee}
            </Typography>
            {step.startDate && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                開始: {new Date(step.startDate).toLocaleDateString('ja-JP')}
              </Typography>
            )}
            {step.completionDate && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                完了: {new Date(step.completionDate).toLocaleDateString('ja-JP')}
              </Typography>
            )}
          </Box>
          
          {step.findings.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                発見事項:
              </Typography>
              <List dense>
                {step.findings.map((finding, idx) => (
                  <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 20 }}>
                      <Typography variant="caption">•</Typography>
                    </ListItemIcon>
                    <ListItemText>
                      <Typography variant="caption">{finding}</Typography>
                    </ListItemText>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {step.attachments.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                添付ファイル: {step.attachments.join(', ')}
              </Typography>
            </Box>
          )}
        </StepContent>
      </Step>
    )
  }

  // 既知エラーカードコンポーネント
  const KnownErrorCard: React.FC<{ knownError: KnownError }> = ({ knownError }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
              {knownError.id}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {knownError.title}
            </Typography>
          </Box>
          <Chip
            label={knownError.severity.toUpperCase()}
            size="small"
            color={knownError.severity === 'critical' ? 'error' : knownError.severity === 'high' ? 'warning' : 'info'}
          />
        </Box>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">症状</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {knownError.symptoms.map((symptom, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <BugIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={symptom} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">根本原因</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">{knownError.rootCause}</Typography>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">回避策</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">{knownError.workaround}</Typography>
          </AccordionDetails>
        </Accordion>
        
        {knownError.solution && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">解決策</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">{knownError.solution}</Typography>
            </AccordionDetails>
          </Accordion>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              影響バージョン: {knownError.affectedVersions.join(', ')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              最終更新: {new Date(knownError.lastUpdated).toLocaleDateString('ja-JP')}
            </Typography>
          </Box>
          {knownError.documentUrl && (
            <Button
              size="small"
              startIcon={<LinkIcon />}
              onClick={() => window.open(knownError.documentUrl, '_blank')}
            >
              詳細資料
            </Button>
          )}
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

  const handleProblemClick = useCallback((problem: Problem) => {
    setSelectedProblem(problem)
    console.log('問題詳細を表示:', problem)
  }, [])

  const handleCreateProblem = useCallback(async (data: Record<string, any>) => {
    console.log('新規問題作成:', data)
    setShowCreateModal(false)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }, [])

  const handleStartRCA = useCallback((problem: Problem) => {
    setSelectedProblem(problem)
    setShowRCAModal(true)
  }, [])

  const handleCreateKnownError = useCallback((problem: Problem) => {
    setSelectedProblem(problem)
    setShowKnownErrorModal(true)
  }, [])

  const handleBulkAction = useCallback((action: string) => {
    console.log(`一括操作: ${action}`, Array.from(selectedProblems))
  }, [selectedProblems])

  // フィルタリング
  const filteredProblems = useMemo(() => {
    return mockProblems.filter(problem => {
      if (filterStatus !== 'all' && problem.status !== filterStatus) return false
      if (filterPriority !== 'all' && problem.priority !== filterPriority) return false
      if (searchQuery && !(
        problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        problem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        problem.description.toLowerCase().includes(searchQuery.toLowerCase())
      )) return false
      return true
    })
  }, [filterStatus, filterPriority, searchQuery])

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
          <MenuItem value="open">オープン</MenuItem>
          <MenuItem value="investigation">調査中</MenuItem>
          <MenuItem value="rca_in_progress">RCA進行中</MenuItem>
          <MenuItem value="known_error">既知エラー</MenuItem>
          <MenuItem value="closed">クローズ</MenuItem>
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
      pageTitle="問題管理"
      pageDescription="ITIL準拠の問題管理、根本原因分析、既知エラー管理"
      actions={pageActions}
    >
      {/* アラート：クリティカル問題 */}
      {mockStats.critical > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              詳細
            </Button>
          }
        >
          {mockStats.critical}件のクリティカルな問題が未解決です
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
          <Tab icon={<ListViewIcon />} label="問題一覧" iconPosition="start" />
          <Tab icon={<RCAIcon />} label="RCA分析" iconPosition="start" />
          <Tab icon={<EngineeringIcon />} label="既知エラー" iconPosition="start" />
          <Tab icon={<AnalysisIcon />} label="統計・分析" iconPosition="start" />
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
                icon={<ProblemIcon />}
                color={theme.palette.primary.main}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="オープン"
                value={mockStats.open}
                icon={<WarningIcon />}
                color={theme.palette.warning.main}
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="RCA進行中"
                value={mockStats.rcaInProgress}
                icon={<RCAIcon />}
                color='#FF9800'
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="既知エラー"
                value={mockStats.knownErrors}
                icon={<EngineeringIcon />}
                color='#2196F3'
                loading={refreshing}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <MetricCard
                title="クリティカル"
                value={mockStats.critical}
                icon={<PriorityHighIcon />}
                color={theme.palette.error.main}
                loading={refreshing}
              />
            </Grid>
          </Grid>

          {/* 検索バー */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="問題を検索（ID、タイトル、説明）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* 一括操作バー */}
          {selectedProblems.size > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body1">
                  {selectedProblems.size}件の問題が選択されています
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<RCAIcon />}
                    onClick={() => handleBulkAction('start_rca')}
                    size="small"
                  >
                    RCA開始
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
                    startIcon={<EngineeringIcon />}
                    onClick={() => handleBulkAction('create_known_error')}
                    size="small"
                  >
                    既知エラー化
                  </Button>
                </Stack>
              </Box>
            </Paper>
          )}

          {/* 問題一覧 */}
          {viewMode === 'table' ? (
            <DataTable
              title="問題一覧"
              subtitle={`${filteredProblems.length}件の問題`}
              data={filteredProblems}
              columns={columns}
              loading={refreshing}
              searchable={false} // 独自の検索を使用
              filterable={true}
              exportable={true}
              selectable={true}
              dense={false}
              initialPageSize={20}
              onRowClick={handleProblemClick}
              onRowSelect={(selected) => setSelectedProblems(new Set(selected.map(item => item.id)))}
              onRefresh={handleRefresh}
              emptyStateMessage="問題がありません"
              actions={
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<RCAIcon />}
                    size="small"
                    onClick={() => console.log('RCA分析画面へ')}
                  >
                    RCA分析
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ReportIcon />}
                    size="small"
                    onClick={() => console.log('レポート生成')}
                  >
                    レポート
                  </Button>
                </Stack>
              }
            />
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                問題一覧 ({filteredProblems.length}件)
              </Typography>
              <Grid container spacing={2}>
                {filteredProblems.map((problem) => (
                  <Grid item xs={12} sm={6} md={4} key={problem.id}>
                    <ProblemCard
                      problem={problem}
                      selected={selectedProblems.has(problem.id)}
                      onSelect={() => {
                        const newSelected = new Set(selectedProblems)
                        if (newSelected.has(problem.id)) {
                          newSelected.delete(problem.id)
                        } else {
                          newSelected.add(problem.id)
                        }
                        setSelectedProblems(newSelected)
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      ) : currentTab === 1 ? (
        <Box>
          {/* RCA分析タブ */}
          <Typography variant="h5" gutterBottom>
            根本原因分析 (RCA)
          </Typography>
          
          {selectedProblem && selectedProblem.rcaSteps.length > 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {selectedProblem.title} のRCA進捗
                    </Typography>
                    <Stepper orientation="vertical">
                      {selectedProblem.rcaSteps.map((step, index) => (
                        <RCAStepComponent key={step.id} step={step} index={index} />
                      ))}
                    </Stepper>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      問題詳細
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">ID</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{selectedProblem.id}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">優先度</Typography>
                      <Chip
                        label={selectedProblem.priority.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${priorityColors[selectedProblem.priority as keyof typeof priorityColors]}20`,
                          color: priorityColors[selectedProblem.priority as keyof typeof priorityColors],
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">ビジネス影響</Typography>
                      <Typography variant="body1">{selectedProblem.businessImpact}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">担当チーム</Typography>
                      <Typography variant="body1">{selectedProblem.assignedTeam}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">影響サービス</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {selectedProblem.affectedServices.map((service) => (
                          <Chip key={service} label={service} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                    {selectedProblem.rootCause && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">根本原因</Typography>
                        <Typography variant="body2">{selectedProblem.rootCause}</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <RCAIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                RCA分析を開始する問題を選択してください
              </Typography>
              <Typography variant="body2" color="text.secondary">
                問題一覧から問題を選択し、RCA分析を開始できます
              </Typography>
            </Box>
          )}
        </Box>
      ) : currentTab === 2 ? (
        <Box>
          {/* 既知エラータブ */}
          <Typography variant="h5" gutterBottom>
            既知エラー管理
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {mockKnownErrors.map((knownError) => (
                <KnownErrorCard key={knownError.id} knownError={knownError} />
              ))}
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    既知エラー統計
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">総数</Typography>
                    <Typography variant="h4" color="primary">{mockKnownErrors.length}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">アクティブ</Typography>
                    <Typography variant="h5" color="warning.main">
                      {mockKnownErrors.filter(ke => ke.status === 'active').length}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">解決済み</Typography>
                    <Typography variant="h5" color="success.main">
                      {mockKnownErrors.filter(ke => ke.status === 'resolved').length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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
                title="問題管理推移 (過去7日)"
                data={trendData}
                lines={[
                  { dataKey: 'problems', name: '新規問題', color: theme.palette.primary.main },
                  { dataKey: 'rca', name: 'RCA開始', color: '#FF9800' },
                  { dataKey: 'knownErrors', name: '既知エラー化', color: '#2196F3' },
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

      {/* 新規問題作成モーダル */}
      <ModalDialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新規問題作成"
        maxWidth="md"
        fullWidth
      >
        <FormBuilder
          fields={problemFormFields}
          onSubmit={handleCreateProblem}
          onCancel={() => setShowCreateModal(false)}
          submitLabel="作成"
          cancelLabel="キャンセル"
        />
      </ModalDialog>

      {/* RCA開始モーダル */}
      <ModalDialog
        open={showRCAModal}
        onClose={() => setShowRCAModal(false)}
        title="RCA分析開始"
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body1" gutterBottom>
            {selectedProblem?.title} のRCA分析を開始しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            RCA分析には以下のフェーズが含まれます：
          </Typography>
          <List dense>
            {rcaPhases.map((phase) => (
              <ListItem key={phase.id}>
                <ListItemIcon>
                  <AnalysisIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={phase.title}
                  secondary={phase.description}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </ModalDialog>

      {/* 既知エラー作成モーダル */}
      <ModalDialog
        open={showKnownErrorModal}
        onClose={() => setShowKnownErrorModal(false)}
        title="既知エラー登録"
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body1" gutterBottom>
            {selectedProblem?.title} を既知エラーとして登録しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary">
            既知エラーとして登録すると、同様の問題が発生した際の参照情報として活用できます。
          </Typography>
        </Box>
      </ModalDialog>

      {/* フローティングアクションボタン */}
      <Fab
        color="primary"
        aria-label="新規問題作成"
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

export default ProblemManagement