import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * インシデント管理ページ
 * 包括的なインシデント管理機能を提供
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Box, Grid, Typography, Card, CardContent, Avatar, IconButton, Chip, useTheme, Tabs, Tab, Button, useMediaQuery, Stack, Alert, Tooltip, FormControl, InputLabel, Select, MenuItem, Fab, alpha, CircularProgress, Paper, } from '@mui/material';
import { BugReport as IncidentIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon, Schedule as ScheduleIcon, TrendingUp as TrendingUpIcon, Refresh as RefreshIcon, Add as AddIcon, Assignment as AssignmentIcon, PlayArrow as StartIcon, Done as CompleteIcon, Person as PersonIcon, AccessTime as TimeIcon, ViewList as ListViewIcon, ViewModule as CardViewIcon, Escalator as EscalateIcon, } from '@mui/icons-material';
import { priorityColors, statusColors } from '../../theme/theme';
import ContentArea from '../../components/layout/ContentArea';
import DataTable from '../../components/common/DataTable';
import ModalDialog from '../../components/common/ModalDialog';
import FormBuilder from '../../components/common/FormBuilder';
import { CustomBarChart, CustomDonutChart, CustomLineChart } from '../../components/common/CustomCharts';
const IncidentManagement = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    // 状態管理
    const [currentTab, setCurrentTab] = useState(0);
    const [viewMode, setViewMode] = useState('table');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIncidents, setSelectedIncidents] = useState(new Set());
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    // モックデータ
    const mockStats = {
        total: 247,
        open: 89,
        inProgress: 54,
        resolved: 95,
        overdue: 12,
        critical: 5,
        avgResolutionTime: 4.2,
        slaCompliance: 94.5,
    };
    const mockIncidents = [
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
    ];
    // チャートデータ
    const priorityChartData = [
        { name: '致命的', value: 5, color: priorityColors.critical },
        { name: '高', value: 23, color: priorityColors.high },
        { name: '中', value: 45, color: priorityColors.medium },
        { name: '低', value: 16, color: priorityColors.low },
    ];
    const statusChartData = [
        { name: '未対応', value: mockStats.open, color: statusColors.open },
        { name: '対応中', value: mockStats.inProgress, color: statusColors.in_progress },
        { name: '解決済み', value: mockStats.resolved, color: statusColors.resolved },
    ];
    const trendData = [
        { date: '7/25', incidents: 15, resolved: 12 },
        { date: '7/26', incidents: 22, resolved: 18 },
        { date: '7/27', incidents: 18, resolved: 20 },
        { date: '7/28', incidents: 25, resolved: 16 },
        { date: '7/29', incidents: 19, resolved: 23 },
        { date: '7/30', incidents: 28, resolved: 21 },
        { date: '7/31', incidents: 23, resolved: 25 },
    ];
    // テーブル列定義
    const columns = [
        {
            id: 'id',
            label: 'ID',
            minWidth: 100,
            render: (value) => (_jsx(Typography, { variant: "body2", color: "primary", sx: { fontWeight: 600 }, children: value })),
        },
        {
            id: 'title',
            label: 'タイトル',
            minWidth: 200,
            searchable: true,
            render: (value, row) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: value }), row.slaDeadline && (_jsx(Chip, { icon: _jsx(TimeIcon, {}), label: "SLA\u671F\u9650", size: "small", color: "warning", variant: "outlined", sx: { mt: 0.5 } }))] })),
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
            minWidth: 120,
            render: (value) => {
                const statusLabels = {
                    open: '未対応',
                    in_progress: '対応中',
                    resolved: '解決済み',
                    closed: '完了',
                    on_hold: '保留中',
                };
                return (_jsx(Chip, { label: statusLabels[value], size: "small", sx: {
                        bgcolor: `${statusColors[value]}20`,
                        color: statusColors[value],
                        fontWeight: 500,
                    } }));
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
            render: (value) => value || _jsx(Typography, { color: "text.secondary", children: "\u672A\u5272\u5F53" }),
        },
        {
            id: 'createdAt',
            label: '作成日時',
            minWidth: 150,
            render: (value) => new Date(value).toLocaleString('ja-JP'),
        },
    ];
    // 新規インシデント作成フォームの定義
    const incidentFormFields = [
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
    // インシデントカードコンポーネント
    const IncidentCard = ({ incident, onSelect, selected }) => (_jsx(Card, { sx: {
            cursor: 'pointer',
            border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid',
            borderColor: selected ? 'primary.main' : 'divider',
            '&:hover': {
                boxShadow: theme.shadows[4],
            },
        }, onClick: onSelect, children: _jsxs(CardContent, { sx: { p: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 600, fontSize: '1rem' }, children: incident.id }), _jsxs(Box, { sx: { display: 'flex', gap: 0.5 }, children: [_jsx(Chip, { label: incident.priority.toUpperCase(), size: "small", sx: {
                                        bgcolor: `${priorityColors[incident.priority]}20`,
                                        color: priorityColors[incident.priority],
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                    } }), incident.slaDeadline && (_jsx(Chip, { icon: _jsx(TimeIcon, {}), label: "SLA", size: "small", color: "warning", variant: "outlined" }))] })] }), _jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1 }, children: incident.title }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: incident.description }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(PersonIcon, { fontSize: "small", color: "action" }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: incident.reporterName })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: new Date(incident.createdAt).toLocaleDateString('ja-JP') })] })] }) }));
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
    const handleIncidentClick = useCallback((incident) => {
        console.log('インシデント詳細を表示:', incident);
    }, []);
    const handleCreateIncident = useCallback(async (data) => {
        console.log('新規インシデント作成:', data);
        setShowCreateModal(false);
        // API呼び出しの模擬
        await new Promise(resolve => setTimeout(resolve, 1000));
    }, []);
    const handleBulkAction = useCallback((action) => {
        console.log(`一括操作: ${action}`, Array.from(selectedIncidents));
    }, [selectedIncidents]);
    const handleEscalate = useCallback(async (data) => {
        console.log('エスカレーション:', data);
        setShowEscalateModal(false);
    }, []);
    // フィルタリング
    const filteredIncidents = useMemo(() => {
        return mockIncidents.filter(incident => {
            if (filterStatus !== 'all' && incident.status !== filterStatus)
                return false;
            if (filterPriority !== 'all' && incident.priority !== filterPriority)
                return false;
            return true;
        });
    }, [filterStatus, filterPriority]);
    const pageActions = (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs(Select, { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), label: "\u30B9\u30C6\u30FC\u30BF\u30B9", children: [_jsx(MenuItem, { value: "all", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "open", children: "\u672A\u5BFE\u5FDC" }), _jsx(MenuItem, { value: "in_progress", children: "\u5BFE\u5FDC\u4E2D" }), _jsx(MenuItem, { value: "resolved", children: "\u89E3\u6C7A\u6E08\u307F" })] })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u512A\u5148\u5EA6" }), _jsxs(Select, { value: filterPriority, onChange: (e) => setFilterPriority(e.target.value), label: "\u512A\u5148\u5EA6", children: [_jsx(MenuItem, { value: "all", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "critical", children: "\u81F4\u547D\u7684" }), _jsx(MenuItem, { value: "high", children: "\u9AD8" }), _jsx(MenuItem, { value: "medium", children: "\u4E2D" }), _jsx(MenuItem, { value: "low", children: "\u4F4E" })] })] }), _jsx(Tooltip, { title: "\u8868\u793A\u5F62\u5F0F", children: _jsx(IconButton, { onClick: () => setViewMode(viewMode === 'table' ? 'card' : 'table'), color: viewMode === 'card' ? 'primary' : 'default', children: viewMode === 'table' ? _jsx(CardViewIcon, {}) : _jsx(ListViewIcon, {}) }) }), _jsx(Button, { variant: "outlined", startIcon: refreshing ? _jsx(CircularProgress, { size: 16 }) : _jsx(RefreshIcon, {}), onClick: handleRefresh, disabled: refreshing, size: isMobile ? 'small' : 'medium', children: refreshing ? '更新中...' : '更新' }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => setShowCreateModal(true), size: isMobile ? 'small' : 'medium', children: "\u65B0\u898F\u4F5C\u6210" })] }));
    return (_jsxs(ContentArea, { pageTitle: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u7BA1\u7406", pageDescription: "IT\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u306E\u7BA1\u7406\u3001\u8FFD\u8DE1\u3001\u89E3\u6C7A", actions: pageActions, children: [mockStats.overdue > 0 && (_jsxs(Alert, { severity: "error", sx: { mb: 3 }, action: _jsx(Button, { color: "inherit", size: "small", children: "\u8A73\u7D30" }), children: [mockStats.overdue, "\u4EF6\u306E\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u304CSLA\u671F\u9650\u3092\u8D85\u904E\u3057\u3066\u3044\u307E\u3059"] })), _jsx(Box, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: currentTab, onChange: (_, newValue) => setCurrentTab(newValue), sx: { borderBottom: 1, borderColor: 'divider' }, variant: isMobile ? 'fullWidth' : 'standard', children: [_jsx(Tab, { icon: _jsx(ListViewIcon, {}), label: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u4E00\u89A7", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(IncidentIcon, {}), label: "\u7D71\u8A08\u30FB\u5206\u6790", iconPosition: "start" })] }) }), currentTab === 0 ? (_jsxs(Box, { children: [_jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u7DCF\u6570", value: mockStats.total, icon: _jsx(AssignmentIcon, {}), color: theme.palette.primary.main, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u672A\u5BFE\u5FDC", value: mockStats.open, icon: _jsx(WarningIcon, {}), color: theme.palette.warning.main, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u5BFE\u5FDC\u4E2D", value: mockStats.inProgress, icon: _jsx(StartIcon, {}), color: theme.palette.info.main, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u89E3\u6C7A\u6E08\u307F", value: mockStats.resolved, icon: _jsx(CheckCircleIcon, {}), color: theme.palette.success.main, trend: { value: 12.5, label: '今週' }, loading: refreshing }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 2.4, children: _jsx(MetricCard, { title: "\u671F\u9650\u8D85\u904E", value: mockStats.overdue, icon: _jsx(ScheduleIcon, {}), color: theme.palette.error.main, loading: refreshing }) })] }), selectedIncidents.size > 0 && (_jsx(Paper, { sx: { p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Typography, { variant: "body1", children: [selectedIncidents.size, "\u4EF6\u306E\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u304C\u9078\u629E\u3055\u308C\u3066\u3044\u307E\u3059"] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(EscalateIcon, {}), onClick: () => setShowEscalateModal(true), size: "small", children: "\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(StartIcon, {}), onClick: () => handleBulkAction('assign'), size: "small", children: "\u62C5\u5F53\u8005\u5272\u5F53" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(CompleteIcon, {}), onClick: () => handleBulkAction('close'), size: "small", children: "\u4E00\u62EC\u30AF\u30ED\u30FC\u30BA" })] })] }) })), viewMode === 'table' ? (_jsx(DataTable, { title: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u4E00\u89A7", subtitle: `${filteredIncidents.length}件のインシデント`, data: filteredIncidents, columns: columns, loading: refreshing, searchable: true, filterable: true, exportable: true, selectable: true, dense: false, initialPageSize: 20, onRowClick: handleIncidentClick, onRowSelect: (selected) => setSelectedIncidents(new Set(selected.map(item => item.id))), onRefresh: handleRefresh, emptyStateMessage: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093" })) : (_jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u4E00\u89A7 (", filteredIncidents.length, "\u4EF6)"] }), _jsx(Grid, { container: true, spacing: 2, children: filteredIncidents.map((incident) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(IncidentCard, { incident: incident, selected: selectedIncidents.has(incident.id), onSelect: () => {
                                            const newSelected = new Set(selectedIncidents);
                                            if (newSelected.has(incident.id)) {
                                                newSelected.delete(incident.id);
                                            }
                                            else {
                                                newSelected.add(incident.id);
                                            }
                                            setSelectedIncidents(newSelected);
                                        } }) }, incident.id))) })] }))] })) : (_jsx(Box, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(CustomDonutChart, { title: "\u512A\u5148\u5EA6\u5225\u5206\u5E03", data: priorityChartData, dataKey: "value", nameKey: "name", height: 300, centerLabel: "\u7DCF\u6570", centerValue: priorityChartData.reduce((sum, item) => sum + item.value, 0) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(CustomBarChart, { title: "\u30B9\u30C6\u30FC\u30BF\u30B9\u5225\u5206\u5E03", data: statusChartData, bars: [{ dataKey: 'value', name: '件数', color: theme.palette.primary.main }], xAxisKey: "name", height: 300 }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(CustomLineChart, { title: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u63A8\u79FB (\u904E\u53BB7\u65E5)", data: trendData, lines: [
                                    { dataKey: 'incidents', name: '新規', color: theme.palette.primary.main },
                                    { dataKey: 'resolved', name: '解決', color: theme.palette.success.main },
                                ], xAxisKey: "date", height: 350, smooth: true }) })] }) })), _jsx(ModalDialog, { open: showCreateModal, onClose: () => setShowCreateModal(false), title: "\u65B0\u898F\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u4F5C\u6210", maxWidth: "md", fullWidth: true, children: _jsx(FormBuilder, { fields: incidentFormFields, onSubmit: handleCreateIncident, onCancel: () => setShowCreateModal(false), submitLabel: "\u4F5C\u6210", cancelLabel: "\u30AD\u30E3\u30F3\u30BB\u30EB" }) }), _jsx(ModalDialog, { open: showEscalateModal, onClose: () => setShowEscalateModal(false), title: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3", maxWidth: "sm", fullWidth: true, children: _jsx(FormBuilder, { fields: [
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
                    ], onSubmit: handleEscalate, onCancel: () => setShowEscalateModal(false), submitLabel: "\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3\u5B9F\u884C", cancelLabel: "\u30AD\u30E3\u30F3\u30BB\u30EB" }) }), _jsx(Fab, { color: "primary", "aria-label": "\u65B0\u898F\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u4F5C\u6210", sx: {
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    zIndex: 1000,
                }, onClick: () => setShowCreateModal(true), children: _jsx(AddIcon, {}) })] }));
};
export default IncidentManagement;
