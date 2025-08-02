import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 問題管理ページ
 * 包括的な問題管理機能を提供（根本原因分析、既知エラー管理を含む）
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Chip, useTheme, Tabs, Tab, Button, useMediaQuery, Stack, Alert, Tooltip, FormControl, InputLabel, Select, MenuItem, Fab, alpha, CircularProgress, Paper, LinearProgress, Accordion, AccordionSummary, AccordionDetails, TextField, InputAdornment, Stepper, Step, StepLabel, StepContent, List, ListItem, ListItemIcon, ListItemText, } from '@mui/material';
import { SearchOff as ProblemIcon, Psychology as RCAIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon, Schedule as ScheduleIcon, TrendingUp as TrendingUpIcon, Refresh as RefreshIcon, Add as AddIcon, PlayArrow as StartIcon, PriorityHigh as PriorityHighIcon, AccessTime as TimeIcon, ViewList as ListViewIcon, ViewModule as CardViewIcon, Search as SearchIcon, ExpandMore as ExpandMoreIcon, Engineering as EngineeringIcon, BugReport as BugIcon, DataUsage as AnalysisIcon, Group as TeamIcon, Link as LinkIcon, Assessment as ReportIcon, } from '@mui/icons-material';
import { priorityColors, statusColors } from '../../theme/theme';
import ContentArea from '../../components/layout/ContentArea';
import DataTable from '../../components/common/DataTable';
import ModalDialog from '../../components/common/ModalDialog';
import FormBuilder from '../../components/common/FormBuilder';
import { CustomBarChart, CustomDonutChart, CustomLineChart } from '../../components/common/CustomCharts';
const ProblemManagement = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    // 状態管理
    const [currentTab, setCurrentTab] = useState(0);
    const [viewMode, setViewMode] = useState('table');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProblems, setSelectedProblems] = useState(new Set());
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRCAModal, setShowRCAModal] = useState(false);
    const [showKnownErrorModal, setShowKnownErrorModal] = useState(false);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    // モックデータ
    const mockStats = {
        total: 127,
        open: 23,
        investigation: 18,
        rcaInProgress: 12,
        knownErrors: 35,
        closed: 89,
        critical: 5,
        avgResolutionTime: 8.5,
        rcaCompletionRate: 85.2,
    };
    const mockProblems = [
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
    ];
    const mockKnownErrors = [
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
    ];
    // チャートデータ
    const priorityChartData = [
        { name: '致命的', value: 5, color: priorityColors.critical },
        { name: '高', value: 28, color: priorityColors.high },
        { name: '中', value: 62, color: priorityColors.medium },
        { name: '低', value: 32, color: priorityColors.low },
    ];
    const statusChartData = [
        { name: 'オープン', value: mockStats.open, color: statusColors.open },
        { name: '調査中', value: mockStats.investigation, color: statusColors.in_progress },
        { name: 'RCA進行中', value: mockStats.rcaInProgress, color: '#FF9800' },
        { name: '既知エラー', value: mockStats.knownErrors, color: '#2196F3' },
        { name: 'クローズ', value: mockStats.closed, color: statusColors.resolved },
    ];
    const trendData = [
        { date: '7/25', problems: 8, rca: 3, knownErrors: 5, resolved: 6 },
        { date: '7/26', problems: 12, rca: 5, knownErrors: 7, resolved: 4 },
        { date: '7/27', problems: 6, rca: 2, knownErrors: 4, resolved: 8 },
        { date: '7/28', problems: 15, rca: 7, knownErrors: 9, resolved: 5 },
        { date: '7/29', problems: 9, rca: 4, knownErrors: 6, resolved: 11 },
        { date: '7/30', problems: 18, rca: 8, knownErrors: 12, resolved: 7 },
        { date: '7/31', problems: 11, rca: 5, knownErrors: 8, resolved: 9 },
    ];
    // RCAステップの定義
    const rcaPhases = [
        { id: 'problem_definition', title: '問題定義', description: '問題の詳細な定義と影響範囲の特定' },
        { id: 'data_collection', title: 'データ収集', description: 'ログ、メトリクス、証拠の収集' },
        { id: 'timeline_analysis', title: 'タイムライン分析', description: '事象の時系列分析' },
        { id: 'fishbone_analysis', title: '特性要因図分析', description: '原因の体系的分析' },
        { id: 'root_cause_identification', title: '根本原因特定', description: '真の根本原因の特定' },
        { id: 'solution_development', title: '解決策開発', description: '恒久的解決策の開発' },
        { id: 'implementation', title: '実装', description: '解決策の実装と検証' }
    ];
    // テーブル列定義
    const columns = [
        {
            id: 'id',
            label: 'ID',
            minWidth: 100,
            render: (value) => (_jsx(Typography, { variant: "body2", color: "primary", sx: { fontWeight: 600, fontFamily: 'monospace' }, children: value })),
        },
        {
            id: 'title',
            label: 'タイトル',
            minWidth: 250,
            searchable: true,
            render: (value, row) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: value }), _jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: 'block', mt: 0.5 }, children: [row.category, " \u2022 ", row.affectedServices.length, "\u30B5\u30FC\u30D3\u30B9\u5F71\u97FF"] }), row.expectedResolutionDate && (_jsx(Chip, { icon: _jsx(TimeIcon, {}), label: `期限: ${new Date(row.expectedResolutionDate).toLocaleDateString('ja-JP')}`, size: "small", color: "info", variant: "outlined", sx: { mt: 0.5, height: 20, fontSize: '0.7rem' } }))] })),
        },
        {
            id: 'priority',
            label: '優先度',
            minWidth: 100,
            render: (value) => (_jsx(Chip, { label: value.toUpperCase(), size: "small", sx: {
                    bgcolor: `${priorityColors[value]}20`,
                    color: priorityColors[value],
                    fontWeight: 600,
                } })),
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
                };
                const statusColorMap = {
                    open: statusColors.open,
                    investigation: statusColors.in_progress,
                    rca_in_progress: '#FF9800',
                    known_error: '#2196F3',
                    closed: statusColors.resolved,
                };
                return (_jsx(Chip, { label: statusLabels[value], size: "small", sx: {
                        bgcolor: `${statusColorMap[value]}20`,
                        color: statusColorMap[value],
                        fontWeight: 500,
                    } }));
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
            render: (value, row) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: value }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [row.assignedMembers.length, "\u540D\u62C5\u5F53"] })] })),
        },
        {
            id: 'investigationProgress',
            label: '調査進捗',
            minWidth: 120,
            render: (value) => (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Box, { sx: { width: '100%', maxWidth: 60 }, children: _jsx(LinearProgress, { variant: "determinate", value: value, color: value >= 80 ? 'success' : value >= 50 ? 'warning' : 'error', sx: { height: 6, borderRadius: 3 } }) }), _jsxs(Typography, { variant: "caption", sx: { minWidth: 35 }, children: [value, "%"] })] })),
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
                };
                const impactColors = {
                    low: 'success',
                    medium: 'info',
                    high: 'warning',
                    critical: 'error'
                };
                return (_jsx(Chip, { label: impactLabels[value], size: "small", color: impactColors[value], variant: "outlined" }));
            },
        },
        {
            id: 'relatedIncidents',
            label: '関連インシデント',
            minWidth: 150,
            render: (value) => (_jsxs(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: [value.slice(0, 2).map((incident) => (_jsx(Chip, { label: incident, size: "small", variant: "outlined", sx: { fontSize: '0.7rem', height: 20 } }, incident))), value.length > 2 && (_jsx(Chip, { label: `+${value.length - 2}`, size: "small", variant: "outlined", sx: { fontSize: '0.7rem', height: 20 } }))] })),
        },
        {
            id: 'createdAt',
            label: '作成日時',
            minWidth: 150,
            render: (value) => new Date(value).toLocaleString('ja-JP'),
        },
    ];
    // 新規問題作成フォームの定義
    const problemFormFields = [
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
    ];
    // メトリックカードコンポーネント
    const MetricCard = ({ title, value, icon, color, trend, loading = false }) => (_jsx(Card, { sx: {
            height: '100%',
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[8],
            },
        }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }, children: [_jsx(Avatar, { sx: {
                                bgcolor: alpha(color, 0.1),
                                color,
                                width: 48,
                                height: 48,
                            }, children: icon }), _jsxs(Box, { sx: { textAlign: 'right' }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: title }), loading ? (_jsx(CircularProgress, { size: 24, sx: { mt: 1 } })) : (_jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color }, children: value }))] })] }), trend && !loading && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(TrendingUpIcon, { sx: { fontSize: 16, color: 'success.main' } }), _jsxs(Typography, { variant: "caption", sx: { color: 'success.main', fontWeight: 600 }, children: [trend.value > 0 ? '+' : '', trend.value, "% ", trend.label] })] }))] }) }));
    // 問題カードコンポーネント
    const ProblemCard = ({ problem, onSelect, selected }) => (_jsx(Card, { sx: {
            cursor: 'pointer',
            border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid',
            borderColor: selected ? 'primary.main' : 'divider',
            '&:hover': {
                boxShadow: theme.shadows[4],
            },
        }, onClick: onSelect, children: _jsxs(CardContent, { sx: { p: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 600, fontSize: '1rem', fontFamily: 'monospace' }, children: problem.id }), _jsxs(Box, { sx: { display: 'flex', gap: 0.5, flexWrap: 'wrap' }, children: [_jsx(Chip, { label: problem.priority.toUpperCase(), size: "small", sx: {
                                        bgcolor: `${priorityColors[problem.priority]}20`,
                                        color: priorityColors[problem.priority],
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                    } }), problem.knownErrorId && (_jsx(Chip, { icon: _jsx(RCAIcon, {}), label: "\u65E2\u77E5\u30A8\u30E9\u30FC", size: "small", color: "info", variant: "outlined" }))] })] }), _jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1 }, children: problem.title }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: problem.description }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }, children: [_jsx(Typography, { variant: "caption", children: "\u8ABF\u67FB\u9032\u6357" }), _jsxs(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: [problem.investigationProgress, "%"] })] }), _jsx(LinearProgress, { variant: "determinate", value: problem.investigationProgress, color: problem.investigationProgress >= 80 ? 'success' : problem.investigationProgress >= 50 ? 'warning' : 'error', sx: { height: 6, borderRadius: 3 } })] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(TeamIcon, { fontSize: "small", color: "action" }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: problem.assignedTeam })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: new Date(problem.createdAt).toLocaleDateString('ja-JP') })] }), _jsxs(Box, { sx: { mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }, children: [problem.relatedIncidents.slice(0, 3).map((incident) => (_jsx(Chip, { label: incident, size: "small", variant: "outlined", sx: { fontSize: '0.65rem', height: 18 } }, incident))), problem.relatedIncidents.length > 3 && (_jsx(Chip, { label: `+${problem.relatedIncidents.length - 3}`, size: "small", variant: "outlined", sx: { fontSize: '0.65rem', height: 18 } }))] })] }) }));
    // RCAステップコンポーネント
    const RCAStepComponent = ({ step, index }) => {
        const getStepIcon = (status) => {
            switch (status) {
                case 'completed':
                    return _jsx(CheckCircleIcon, { color: "success" });
                case 'in_progress':
                    return _jsx(CircularProgress, { size: 20 });
                default:
                    return _jsx(ScheduleIcon, { color: "disabled" });
            }
        };
        return (_jsxs(Step, { active: step.status !== 'pending', completed: step.status === 'completed', children: [_jsx(StepLabel, { icon: getStepIcon(step.status), children: _jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600 }, children: step.title }) }), _jsxs(StepContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: step.description }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u62C5\u5F53\u8005: ", step.assignee] }), step.startDate && (_jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: 'block' }, children: ["\u958B\u59CB: ", new Date(step.startDate).toLocaleDateString('ja-JP')] })), step.completionDate && (_jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: 'block' }, children: ["\u5B8C\u4E86: ", new Date(step.completionDate).toLocaleDateString('ja-JP')] }))] }), step.findings.length > 0 && (_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "caption", sx: { fontWeight: 600, display: 'block', mb: 1 }, children: "\u767A\u898B\u4E8B\u9805:" }), _jsx(List, { dense: true, children: step.findings.map((finding, idx) => (_jsxs(ListItem, { sx: { py: 0, px: 0 }, children: [_jsx(ListItemIcon, { sx: { minWidth: 20 }, children: _jsx(Typography, { variant: "caption", children: "\u2022" }) }), _jsx(ListItemText, { children: _jsx(Typography, { variant: "caption", children: finding }) })] }, idx))) })] })), step.attachments.length > 0 && (_jsx(Box, { sx: { mb: 1 }, children: _jsxs(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: ["\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB: ", step.attachments.join(', ')] }) }))] })] }));
    };
    // 既知エラーカードコンポーネント
    const KnownErrorCard = ({ knownError }) => (_jsx(Card, { sx: { mb: 2 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 600, fontFamily: 'monospace' }, children: knownError.id }), _jsx(Typography, { variant: "body1", sx: { fontWeight: 500 }, children: knownError.title })] }), _jsx(Chip, { label: knownError.severity.toUpperCase(), size: "small", color: knownError.severity === 'critical' ? 'error' : knownError.severity === 'high' ? 'warning' : 'info' })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsx(Typography, { variant: "subtitle2", children: "\u75C7\u72B6" }) }), _jsx(AccordionDetails, { children: _jsx(List, { dense: true, children: knownError.symptoms.map((symptom, index) => (_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(BugIcon, { fontSize: "small" }) }), _jsx(ListItemText, { primary: symptom })] }, index))) }) })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsx(Typography, { variant: "subtitle2", children: "\u6839\u672C\u539F\u56E0" }) }), _jsx(AccordionDetails, { children: _jsx(Typography, { variant: "body2", children: knownError.rootCause }) })] }), _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsx(Typography, { variant: "subtitle2", children: "\u56DE\u907F\u7B56" }) }), _jsx(AccordionDetails, { children: _jsx(Typography, { variant: "body2", children: knownError.workaround }) })] }), knownError.solution && (_jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsx(Typography, { variant: "subtitle2", children: "\u89E3\u6C7A\u7B56" }) }), _jsx(AccordionDetails, { children: _jsx(Typography, { variant: "body2", children: knownError.solution }) })] })), _jsxs(Box, { sx: { mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u5F71\u97FF\u30D0\u30FC\u30B8\u30E7\u30F3: ", knownError.affectedVersions.join(', ')] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: 'block' }, children: ["\u6700\u7D42\u66F4\u65B0: ", new Date(knownError.lastUpdated).toLocaleDateString('ja-JP')] })] }), knownError.documentUrl && (_jsx(Button, { size: "small", startIcon: _jsx(LinkIcon, {}), onClick: () => window.open(knownError.documentUrl, '_blank'), children: "\u8A73\u7D30\u8CC7\u6599" }))] })] }) }));
    // イベントハンドラー
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLastUpdate(new Date());
        }
        finally {
            setRefreshing(false);
        }
    }, []);
    const handleProblemClick = useCallback((problem) => {
        setSelectedProblem(problem);
        console.log('問題詳細を表示:', problem);
    }, []);
    const handleCreateProblem = useCallback(async (data) => {
        console.log('新規問題作成:', data);
        setShowCreateModal(false);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }, []);
    const handleStartRCA = useCallback((problem) => {
        setSelectedProblem(problem);
        setShowRCAModal(true);
    }, []);
    const handleCreateKnownError = useCallback((problem) => {
        setSelectedProblem(problem);
        setShowKnownErrorModal(true);
    }, []);
    const handleBulkAction = useCallback((action) => {
        console.log(`一括操作: ${action}`, Array.from(selectedProblems));
    }, [selectedProblems]);
    // フィルタリング
    const filteredProblems = useMemo(() => {
        return mockProblems.filter(problem => {
            if (filterStatus !== 'all' && problem.status !== filterStatus)
                return false;
            if (filterPriority !== 'all' && problem.priority !== filterPriority)
                return false;
            if (searchQuery && !(problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                problem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                problem.description.toLowerCase().includes(searchQuery.toLowerCase())))
                return false;
            return true;
        });
    }, [filterStatus, filterPriority, searchQuery]);
    const pageActions = (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs(Select, { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), label: "\u30B9\u30C6\u30FC\u30BF\u30B9", children: [_jsx(MenuItem, { value: "all", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "open", children: "\u30AA\u30FC\u30D7\u30F3" }), _jsx(MenuItem, { value: "investigation", children: "\u8ABF\u67FB\u4E2D" }), _jsx(MenuItem, { value: "rca_in_progress", children: "RCA\u9032\u884C\u4E2D" }), _jsx(MenuItem, { value: "known_error", children: "\u65E2\u77E5\u30A8\u30E9\u30FC" }), _jsx(MenuItem, { value: "closed", children: "\u30AF\u30ED\u30FC\u30BA" })] })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u512A\u5148\u5EA6" }), _jsxs(Select, { value: filterPriority, onChange: (e) => setFilterPriority(e.target.value), label: "\u512A\u5148\u5EA6", children: [_jsx(MenuItem, { value: "all", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "critical", children: "\u81F4\u547D\u7684" }), _jsx(MenuItem, { value: "high", children: "\u9AD8" }), _jsx(MenuItem, { value: "medium", children: "\u4E2D" }), _jsx(MenuItem, { value: "low", children: "\u4F4E" })] })] }), _jsx(Tooltip, { title: "\u8868\u793A\u5F62\u5F0F", children: _jsx(IconButton, { onClick: () => setViewMode(viewMode === 'table' ? 'card' : 'table'), color: viewMode === 'card' ? 'primary' : 'default', children: viewMode === 'table' ? _jsx(CardViewIcon, {}) : _jsx(ListViewIcon, {}) }) }), _jsx(Button, { variant: "outlined", startIcon: refreshing ? _jsx(CircularProgress, { size: 16 }) : _jsx(RefreshIcon, {}), onClick: handleRefresh, disabled: refreshing, size: isMobile ? 'small' : 'medium', children: refreshing ? '更新中...' : '更新' }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => setShowCreateModal(true), size: isMobile ? 'small' : 'medium', children: "\u65B0\u898F\u4F5C\u6210" })] }));
    return (_jsxs(ContentArea, { pageTitle: "\u554F\u984C\u7BA1\u7406", pageDescription: "ITIL\u6E96\u62E0\u306E\u554F\u984C\u7BA1\u7406\u3001\u6839\u672C\u539F\u56E0\u5206\u6790\u3001\u65E2\u77E5\u30A8\u30E9\u30FC\u7BA1\u7406", actions: pageActions, children: [mockStats.critical > 0 && (_jsxs(Alert, { severity: "error", sx: { mb: 3 }, action: _jsx(Button, { color: "inherit", size: "small", children: "\u8A73\u7D30" }), children: [mockStats.critical, "\u4EF6\u306E\u30AF\u30EA\u30C6\u30A3\u30AB\u30EB\u306A\u554F\u984C\u304C\u672A\u89E3\u6C7A\u3067\u3059"] })), _jsx(Box, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: currentTab, onChange: (_, newValue) => setCurrentTab(newValue), sx: { borderBottom: 1, borderColor: 'divider' }, variant: isMobile ? 'fullWidth' : 'standard', children: [_jsx(Tab, { icon: _jsx(ListViewIcon, {}), label: "\u554F\u984C\u4E00\u89A7", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(RCAIcon, {}), label: "RCA\u5206\u6790", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(EngineeringIcon, {}), label: "\u65E2\u77E5\u30A8\u30E9\u30FC", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(AnalysisIcon, {}), label: "\u7D71\u8A08\u30FB\u5206\u6790", iconPosition: "start" })] }) }), currentTab === 0 ? (_jsxs(Box, { children: [_jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u7DCF\u6570", value: mockStats.total, icon: _jsx(ProblemIcon, {}), color: theme.palette.primary.main, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u30AA\u30FC\u30D7\u30F3", value: mockStats.open, icon: _jsx(WarningIcon, {}), color: theme.palette.warning.main, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "RCA\u9032\u884C\u4E2D", value: mockStats.rcaInProgress, icon: _jsx(RCAIcon, {}), color: '#FF9800', loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u65E2\u77E5\u30A8\u30E9\u30FC", value: mockStats.knownErrors, icon: _jsx(EngineeringIcon, {}), color: '#2196F3', loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u30AF\u30EA\u30C6\u30A3\u30AB\u30EB", value: mockStats.critical, icon: _jsx(PriorityHighIcon, {}), color: theme.palette.error.main, loading: refreshing }) })] }), _jsx(Paper, { sx: { p: 2, mb: 3 }, children: _jsx(TextField, { fullWidth: true, placeholder: "\u554F\u984C\u3092\u691C\u7D22\uFF08ID\u3001\u30BF\u30A4\u30C8\u30EB\u3001\u8AAC\u660E\uFF09...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                            } }) }), selectedProblems.size > 0 && (_jsx(Paper, { sx: { p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Typography, { variant: "body1", children: [selectedProblems.size, "\u4EF6\u306E\u554F\u984C\u304C\u9078\u629E\u3055\u308C\u3066\u3044\u307E\u3059"] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(RCAIcon, {}), onClick: () => handleBulkAction('start_rca'), size: "small", children: "RCA\u958B\u59CB" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(StartIcon, {}), onClick: () => handleBulkAction('assign'), size: "small", children: "\u62C5\u5F53\u8005\u5272\u5F53" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(EngineeringIcon, {}), onClick: () => handleBulkAction('create_known_error'), size: "small", children: "\u65E2\u77E5\u30A8\u30E9\u30FC\u5316" })] })] }) })), viewMode === 'table' ? (_jsx(DataTable, { title: "\u554F\u984C\u4E00\u89A7", subtitle: `${filteredProblems.length}件の問題`, data: filteredProblems, columns: columns, loading: refreshing, searchable: false, filterable: true, exportable: true, selectable: true, dense: false, initialPageSize: 20, onRowClick: handleProblemClick, onRowSelect: (selected) => setSelectedProblems(new Set(selected.map(item => item.id))), onRefresh: handleRefresh, emptyStateMessage: "\u554F\u984C\u304C\u3042\u308A\u307E\u305B\u3093", actions: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(RCAIcon, {}), size: "small", onClick: () => console.log('RCA分析画面へ'), children: "RCA\u5206\u6790" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(ReportIcon, {}), size: "small", onClick: () => console.log('レポート生成'), children: "\u30EC\u30DD\u30FC\u30C8" })] }) })) : (_jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["\u554F\u984C\u4E00\u89A7 (", filteredProblems.length, "\u4EF6)"] }), _jsx(Grid, { container: true, spacing: 2, children: filteredProblems.map((problem) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(ProblemCard, { problem: problem, selected: selectedProblems.has(problem.id), onSelect: () => {
                                            const newSelected = new Set(selectedProblems);
                                            if (newSelected.has(problem.id)) {
                                                newSelected.delete(problem.id);
                                            }
                                            else {
                                                newSelected.add(problem.id);
                                            }
                                            setSelectedProblems(newSelected);
                                        } }) }, problem.id))) })] }))] })) : currentTab === 1 ? (_jsxs(Box, { children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u6839\u672C\u539F\u56E0\u5206\u6790 (RCA)" }), selectedProblem && selectedProblem.rcaSteps.length > 0 ? (_jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 8, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: [selectedProblem.title, " \u306ERCA\u9032\u6357"] }), _jsx(Stepper, { orientation: "vertical", children: selectedProblem.rcaSteps.map((step, index) => (_jsx(RCAStepComponent, { step: step, index: index }, step.id))) })] }) }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u554F\u984C\u8A73\u7D30" }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "ID" }), _jsx(Typography, { variant: "body1", sx: { fontFamily: 'monospace' }, children: selectedProblem.id })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u512A\u5148\u5EA6" }), _jsx(Chip, { label: selectedProblem.priority.toUpperCase(), size: "small", sx: {
                                                            bgcolor: `${priorityColors[selectedProblem.priority]}20`,
                                                            color: priorityColors[selectedProblem.priority],
                                                            fontWeight: 600,
                                                        } })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30D3\u30B8\u30CD\u30B9\u5F71\u97FF" }), _jsx(Typography, { variant: "body1", children: selectedProblem.businessImpact })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u62C5\u5F53\u30C1\u30FC\u30E0" }), _jsx(Typography, { variant: "body1", children: selectedProblem.assignedTeam })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5F71\u97FF\u30B5\u30FC\u30D3\u30B9" }), _jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }, children: selectedProblem.affectedServices.map((service) => (_jsx(Chip, { label: service, size: "small", variant: "outlined" }, service))) })] }), selectedProblem.rootCause && (_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6839\u672C\u539F\u56E0" }), _jsx(Typography, { variant: "body2", children: selectedProblem.rootCause })] }))] }) }) })] })) : (_jsxs(Box, { sx: { textAlign: 'center', py: 8 }, children: [_jsx(RCAIcon, { sx: { fontSize: 64, color: 'text.secondary', mb: 2 } }), _jsx(Typography, { variant: "h6", color: "text.secondary", gutterBottom: true, children: "RCA\u5206\u6790\u3092\u958B\u59CB\u3059\u308B\u554F\u984C\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u554F\u984C\u4E00\u89A7\u304B\u3089\u554F\u984C\u3092\u9078\u629E\u3057\u3001RCA\u5206\u6790\u3092\u958B\u59CB\u3067\u304D\u307E\u3059" })] }))] })) : currentTab === 2 ? (_jsxs(Box, { children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u65E2\u77E5\u30A8\u30E9\u30FC\u7BA1\u7406" }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 8, children: mockKnownErrors.map((knownError) => (_jsx(KnownErrorCard, { knownError: knownError }, knownError.id))) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u65E2\u77E5\u30A8\u30E9\u30FC\u7D71\u8A08" }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7DCF\u6570" }), _jsx(Typography, { variant: "h4", color: "primary", children: mockKnownErrors.length })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30A2\u30AF\u30C6\u30A3\u30D6" }), _jsx(Typography, { variant: "h5", color: "warning.main", children: mockKnownErrors.filter(ke => ke.status === 'active').length })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u89E3\u6C7A\u6E08\u307F" }), _jsx(Typography, { variant: "h5", color: "success.main", children: mockKnownErrors.filter(ke => ke.status === 'resolved').length })] })] }) }) })] })] })) : (_jsx(Box, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(CustomDonutChart, { title: "\u512A\u5148\u5EA6\u5225\u5206\u5E03", data: priorityChartData, dataKey: "value", nameKey: "name", height: 300, centerLabel: "\u7DCF\u6570", centerValue: priorityChartData.reduce((sum, item) => sum + item.value, 0) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(CustomBarChart, { title: "\u30B9\u30C6\u30FC\u30BF\u30B9\u5225\u5206\u5E03", data: statusChartData, bars: [{ dataKey: 'value', name: '件数', color: theme.palette.primary.main }], xAxisKey: "name", height: 300 }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(CustomLineChart, { title: "\u554F\u984C\u7BA1\u7406\u63A8\u79FB (\u904E\u53BB7\u65E5)", data: trendData, lines: [
                                    { dataKey: 'problems', name: '新規問題', color: theme.palette.primary.main },
                                    { dataKey: 'rca', name: 'RCA開始', color: '#FF9800' },
                                    { dataKey: 'knownErrors', name: '既知エラー化', color: '#2196F3' },
                                    { dataKey: 'resolved', name: '解決', color: theme.palette.success.main },
                                ], xAxisKey: "date", height: 350, smooth: true }) })] }) })), _jsx(ModalDialog, { open: showCreateModal, onClose: () => setShowCreateModal(false), title: "\u65B0\u898F\u554F\u984C\u4F5C\u6210", maxWidth: "md", fullWidth: true, children: _jsx(FormBuilder, { fields: problemFormFields, onSubmit: handleCreateProblem, onCancel: () => setShowCreateModal(false), submitLabel: "\u4F5C\u6210", cancelLabel: "\u30AD\u30E3\u30F3\u30BB\u30EB" }) }), _jsx(ModalDialog, { open: showRCAModal, onClose: () => setShowRCAModal(false), title: "RCA\u5206\u6790\u958B\u59CB", maxWidth: "sm", fullWidth: true, children: _jsxs(Box, { sx: { p: 2 }, children: [_jsxs(Typography, { variant: "body1", gutterBottom: true, children: [selectedProblem?.title, " \u306ERCA\u5206\u6790\u3092\u958B\u59CB\u3057\u307E\u3059\u304B\uFF1F"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "RCA\u5206\u6790\u306B\u306F\u4EE5\u4E0B\u306E\u30D5\u30A7\u30FC\u30BA\u304C\u542B\u307E\u308C\u307E\u3059\uFF1A" }), _jsx(List, { dense: true, children: rcaPhases.map((phase) => (_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(AnalysisIcon, { fontSize: "small" }) }), _jsx(ListItemText, { primary: phase.title, secondary: phase.description })] }, phase.id))) })] }) }), _jsx(ModalDialog, { open: showKnownErrorModal, onClose: () => setShowKnownErrorModal(false), title: "\u65E2\u77E5\u30A8\u30E9\u30FC\u767B\u9332", maxWidth: "md", fullWidth: true, children: _jsxs(Box, { sx: { p: 2 }, children: [_jsxs(Typography, { variant: "body1", gutterBottom: true, children: [selectedProblem?.title, " \u3092\u65E2\u77E5\u30A8\u30E9\u30FC\u3068\u3057\u3066\u767B\u9332\u3057\u307E\u3059\u304B\uFF1F"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u65E2\u77E5\u30A8\u30E9\u30FC\u3068\u3057\u3066\u767B\u9332\u3059\u308B\u3068\u3001\u540C\u69D8\u306E\u554F\u984C\u304C\u767A\u751F\u3057\u305F\u969B\u306E\u53C2\u7167\u60C5\u5831\u3068\u3057\u3066\u6D3B\u7528\u3067\u304D\u307E\u3059\u3002" })] }) }), _jsx(Fab, { color: "primary", "aria-label": "\u65B0\u898F\u554F\u984C\u4F5C\u6210", sx: {
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    zIndex: 1000,
                }, onClick: () => setShowCreateModal(true), children: _jsx(AddIcon, {}) })] }));
};
export default ProblemManagement;
