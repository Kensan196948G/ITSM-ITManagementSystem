import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * インシデント一覧ページ
 * ITIL準拠のインシデント管理機能を提供
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Chip, IconButton, Menu, MenuItem, TextField, InputAdornment, FormControl, InputLabel, Select, Stack, } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, MoreVert as MoreVertIcon, ErrorOutline, PauseCircleOutline, CheckCircleOutline, TrendingUp, Assignment, } from '@mui/icons-material';
import ContentArea from '../../components/layout/ContentArea';
// モックデータ
const mockIncidents = [
    {
        id: 'INC-001',
        title: 'Webサーバーの応答時間が遅い',
        description: 'メインWebサーバーの応答時間が通常の5倍になっている',
        severity: 'high',
        status: 'in_progress',
        category: 'Performance',
        assignee: '田中 太郎',
        reporter: '佐藤 花子',
        createdAt: '2024-01-15T09:30:00Z',
        updatedAt: '2024-01-15T10:45:00Z',
        slaStatus: 'warning',
        affectedServices: ['Webサイト', 'API'],
    },
    {
        id: 'INC-002',
        title: 'データベース接続エラー',
        description: 'メインデータベースへの接続が断続的に失敗している',
        severity: 'critical',
        status: 'open',
        category: 'Database',
        assignee: '',
        reporter: '山田 次郎',
        createdAt: '2024-01-15T11:20:00Z',
        updatedAt: '2024-01-15T11:20:00Z',
        slaStatus: 'within',
        affectedServices: ['CRM', 'データベース'],
    },
    {
        id: 'INC-003',
        title: 'メール送信機能の不具合',
        description: '自動メール送信が動作していない',
        severity: 'medium',
        status: 'resolved',
        category: 'Email',
        assignee: '鈴木 一郎',
        reporter: '高橋 美咲',
        createdAt: '2024-01-14T14:15:00Z',
        updatedAt: '2024-01-15T08:30:00Z',
        slaStatus: 'within',
        affectedServices: ['メール'],
    },
];
const IncidentList = () => {
    const navigate = useNavigate();
    const [incidents] = useState(mockIncidents);
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedIncident, setSelectedIncident] = useState(null);
    // フィルタリングと検索
    const filteredIncidents = useMemo(() => {
        return incidents.filter(incident => {
            const matchesSearch = searchQuery === '' ||
                incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                incident.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                incident.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
            const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
            return matchesSearch && matchesSeverity && matchesStatus;
        });
    }, [incidents, searchQuery, severityFilter, statusFilter]);
    // 重要度のカラーマッピング
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'success';
            default: return 'default';
        }
    };
    // ステータスのアイコンとカラー
    const getStatusDisplay = (status) => {
        switch (status) {
            case 'open':
                return { icon: _jsx(ErrorOutline, {}), color: 'error', label: 'オープン' };
            case 'in_progress':
                return { icon: _jsx(TrendingUp, {}), color: 'warning', label: '対応中' };
            case 'pending':
                return { icon: _jsx(PauseCircleOutline, {}), color: 'info', label: '保留中' };
            case 'resolved':
                return { icon: _jsx(CheckCircleOutline, {}), color: 'success', label: '解決済み' };
            case 'closed':
                return { icon: _jsx(Assignment, {}), color: 'default', label: 'クローズ' };
            default:
                return { icon: _jsx(ErrorOutline, {}), color: 'default', label: status };
        }
    };
    // SLAステータスの表示
    const getSLAChip = (slaStatus) => {
        switch (slaStatus) {
            case 'within':
                return _jsx(Chip, { label: "SLA\u5185", size: "small", color: "success", variant: "outlined" });
            case 'warning':
                return _jsx(Chip, { label: "\u8B66\u544A", size: "small", color: "warning", variant: "outlined" });
            case 'breached':
                return _jsx(Chip, { label: "SLA\u9055\u53CD", size: "small", color: "error", variant: "outlined" });
            default:
                return null;
        }
    };
    // メニューハンドラー
    const handleMenuOpen = (event, incidentId) => {
        setAnchorEl(event.currentTarget);
        setSelectedIncident(incidentId);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedIncident(null);
    };
    const handleEdit = () => {
        if (selectedIncident) {
            navigate(`/incidents/${selectedIncident}/edit`);
        }
        handleMenuClose();
    };
    const handleAssign = () => {
        // TODO: アサイン機能の実装
        handleMenuClose();
    };
    const handleEscalate = () => {
        // TODO: エスカレーション機能の実装
        handleMenuClose();
    };
    // 統計データ
    const stats = useMemo(() => {
        const total = incidents.length;
        const critical = incidents.filter(i => i.severity === 'critical').length;
        const open = incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length;
        const slaBreached = incidents.filter(i => i.slaStatus === 'breached').length;
        return { total, critical, open, slaBreached };
    }, [incidents]);
    const pageActions = (_jsx(Stack, { direction: "row", spacing: 2, children: _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => navigate('/incidents/create'), children: "\u65B0\u898F\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8" }) }));
    return (_jsxs(ContentArea, { pageTitle: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u7BA1\u7406", pageDescription: "\u30B7\u30B9\u30C6\u30E0\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u306E\u7BA1\u7406\u3068\u8FFD\u8DE1", actions: pageActions, children: [_jsxs(Stack, { direction: "row", spacing: 2, sx: { mb: 3 }, children: [_jsx(Card, { sx: { minWidth: 120 }, children: _jsxs(CardContent, { sx: { p: 2, '&:last-child': { pb: 2 } }, children: [_jsx(Typography, { variant: "h4", color: "primary", children: stats.total }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7DCF\u4EF6\u6570" })] }) }), _jsx(Card, { sx: { minWidth: 120 }, children: _jsxs(CardContent, { sx: { p: 2, '&:last-child': { pb: 2 } }, children: [_jsx(Typography, { variant: "h4", color: "error", children: stats.critical }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30AF\u30EA\u30C6\u30A3\u30AB\u30EB" })] }) }), _jsx(Card, { sx: { minWidth: 120 }, children: _jsxs(CardContent, { sx: { p: 2, '&:last-child': { pb: 2 } }, children: [_jsx(Typography, { variant: "h4", color: "warning.main", children: stats.open }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30AA\u30FC\u30D7\u30F3" })] }) }), _jsx(Card, { sx: { minWidth: 120 }, children: _jsxs(CardContent, { sx: { p: 2, '&:last-child': { pb: 2 } }, children: [_jsx(Typography, { variant: "h4", color: "error", children: stats.slaBreached }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "SLA\u9055\u53CD" })] }) })] }), _jsx(Card, { sx: { mb: 3 }, children: _jsx(CardContent, { children: _jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [_jsx(TextField, { placeholder: "\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8\u3092\u691C\u7D22...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                                }, sx: { minWidth: 300 } }), _jsxs(FormControl, { sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u91CD\u8981\u5EA6" }), _jsxs(Select, { value: severityFilter, label: "\u91CD\u8981\u5EA6", onChange: (e) => setSeverityFilter(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "critical", children: "\u30AF\u30EA\u30C6\u30A3\u30AB\u30EB" }), _jsx(MenuItem, { value: "high", children: "\u9AD8" }), _jsx(MenuItem, { value: "medium", children: "\u4E2D" }), _jsx(MenuItem, { value: "low", children: "\u4F4E" })] })] }), _jsxs(FormControl, { sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs(Select, { value: statusFilter, label: "\u30B9\u30C6\u30FC\u30BF\u30B9", onChange: (e) => setStatusFilter(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "open", children: "\u30AA\u30FC\u30D7\u30F3" }), _jsx(MenuItem, { value: "in_progress", children: "\u5BFE\u5FDC\u4E2D" }), _jsx(MenuItem, { value: "pending", children: "\u4FDD\u7559" }), _jsx(MenuItem, { value: "resolved", children: "\u89E3\u6C7A\u6E08\u307F" }), _jsx(MenuItem, { value: "closed", children: "\u30AF\u30ED\u30FC\u30BA" })] })] })] }) }) }), _jsxs(Card, { children: [_jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "ID" }), _jsx(TableCell, { children: "\u30BF\u30A4\u30C8\u30EB" }), _jsx(TableCell, { children: "\u91CD\u8981\u5EA6" }), _jsx(TableCell, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx(TableCell, { children: "\u30AB\u30C6\u30B4\u30EA" }), _jsx(TableCell, { children: "\u62C5\u5F53\u8005" }), _jsx(TableCell, { children: "SLA" }), _jsx(TableCell, { children: "\u4F5C\u6210\u65E5\u6642" }), _jsx(TableCell, { children: "\u30A2\u30AF\u30B7\u30E7\u30F3" })] }) }), _jsx(TableBody, { children: filteredIncidents
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((incident) => {
                                        const statusDisplay = getStatusDisplay(incident.status);
                                        return (_jsxs(TableRow, { hover: true, sx: { cursor: 'pointer' }, onClick: () => navigate(`/incidents/${incident.id}`), children: [_jsx(TableCell, { children: _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace' }, children: incident.id }) }), _jsx(TableCell, { children: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: incident.title }), _jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, children: incident.description })] }) }), _jsx(TableCell, { children: _jsx(Chip, { label: incident.severity.toUpperCase(), size: "small", color: getSeverityColor(incident.severity) }) }), _jsx(TableCell, { children: _jsx(Chip, { icon: statusDisplay.icon, label: statusDisplay.label, size: "small", color: statusDisplay.color, variant: "outlined" }) }), _jsx(TableCell, { children: incident.category }), _jsx(TableCell, { children: incident.assignee || (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontStyle: 'italic' }, children: "\u672A\u5272\u308A\u5F53\u3066" })) }), _jsx(TableCell, { children: getSLAChip(incident.slaStatus) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", children: new Date(incident.createdAt).toLocaleString('ja-JP') }) }), _jsx(TableCell, { children: _jsx(IconButton, { size: "small", onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleMenuOpen(e, incident.id);
                                                        }, children: _jsx(MoreVertIcon, {}) }) })] }, incident.id));
                                    }) })] }) }), _jsx(TablePagination, { rowsPerPageOptions: [5, 10, 25], component: "div", count: filteredIncidents.length, rowsPerPage: rowsPerPage, page: page, onPageChange: (_, newPage) => setPage(newPage), onRowsPerPageChange: (e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }, labelRowsPerPage: "\u8868\u793A\u4EF6\u6570:", labelDisplayedRows: ({ from, to, count }) => `${from}-${to} / ${count}件` })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, children: [_jsxs(MenuItem, { onClick: handleEdit, children: [_jsx(Assignment, { sx: { mr: 1 } }), "\u7DE8\u96C6"] }), _jsxs(MenuItem, { onClick: handleAssign, children: [_jsx(TrendingUp, { sx: { mr: 1 } }), "\u30A2\u30B5\u30A4\u30F3"] }), _jsxs(MenuItem, { onClick: handleEscalate, children: [_jsx(ErrorOutline, { sx: { mr: 1 } }), "\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3"] })] })] }));
};
export default IncidentList;
