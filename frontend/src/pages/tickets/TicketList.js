import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, TextField, InputAdornment, Chip, IconButton, Menu, MenuItem, FormControl, InputLabel, Select, OutlinedInput, Grid, Card, CardContent, Avatar, Divider, Pagination, Tooltip, } from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon, Add as AddIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon, FileDownload as ExportIcon, ViewList as ViewListIcon, ViewModule as ViewModuleIcon, Schedule as ScheduleIcon, Person as PersonIcon, CalendarToday as CalendarIcon, } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { priorityColors, statusColors } from '../../theme/theme';
import { useDetailPanelContext } from '../../components/layout/Layout';
const TicketList = () => {
    const navigate = useNavigate();
    const { openDetailPanel } = useDetailPanelContext();
    const [viewMode, setViewMode] = useState('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [moreAnchor, setMoreAnchor] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filters, setFilters] = useState({});
    // Mock data - 実際の実装ではAPIから取得
    const mockTickets = [
        {
            id: '1',
            title: 'サーバー応答速度低下',
            description: 'Webサーバーの応答速度が著しく低下しています',
            status: 'open',
            priority: 'critical',
            category: 'Infrastructure',
            assigneeId: '1',
            assigneeName: '山田太郎',
            reporterId: '2',
            reporterName: '田中一郎',
            createdAt: '2025-08-01T10:30:00Z',
            updatedAt: '2025-08-01T11:00:00Z',
            slaDeadline: '2025-08-01T12:30:00Z',
            tags: ['urgent', 'server'],
        },
        {
            id: '2',
            title: 'メール送信エラー',
            description: 'メール送信時にSMTPエラーが発生',
            status: 'in_progress',
            priority: 'high',
            category: 'Email',
            assigneeId: '3',
            assigneeName: '佐藤花子',
            reporterId: '4',
            reporterName: '鈴木次郎',
            createdAt: '2025-08-01T09:15:00Z',
            updatedAt: '2025-08-01T10:45:00Z',
            tags: ['email', 'smtp'],
        },
        {
            id: '3',
            title: 'プリンター接続不良',
            description: 'オフィスプリンターに接続できない',
            status: 'resolved',
            priority: 'medium',
            category: 'Hardware',
            assigneeId: '5',
            assigneeName: '高橋三郎',
            reporterId: '6',
            reporterName: '渡辺四郎',
            createdAt: '2025-08-01T08:00:00Z',
            updatedAt: '2025-08-01T10:30:00Z',
            tags: ['printer', 'hardware'],
        },
        {
            id: '4',
            title: 'VPN接続問題',
            description: '在宅勤務でVPNに接続できない',
            status: 'open',
            priority: 'high',
            category: 'Network',
            reporterId: '7',
            reporterName: '伊藤五郎',
            createdAt: '2025-08-01T07:45:00Z',
            updatedAt: '2025-08-01T07:45:00Z',
            tags: ['vpn', 'remote'],
        },
        {
            id: '5',
            title: 'ソフトウェアライセンス期限',
            description: 'Adobe Creative Suiteのライセンスが期限切れ',
            status: 'on_hold',
            priority: 'low',
            category: 'License',
            assigneeId: '8',
            assigneeName: '中村六郎',
            reporterId: '9',
            reporterName: '小林七郎',
            createdAt: '2025-07-31T16:00:00Z',
            updatedAt: '2025-08-01T09:00:00Z',
            tags: ['license', 'adobe'],
        },
    ];
    const filteredTickets = mockTickets.filter(ticket => {
        if (searchQuery && !ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !ticket.description.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (filters.status?.length && !filters.status.includes(ticket.status)) {
            return false;
        }
        if (filters.priority?.length && !filters.priority.includes(ticket.priority)) {
            return false;
        }
        return true;
    });
    // 詳細パネルを開く関数
    const handleOpenDetailPanel = (ticket, event) => {
        if (event) {
            event.stopPropagation();
        }
        const detailItem = {
            id: ticket.id,
            type: 'ticket',
            title: ticket.title,
            subtitle: `#${ticket.id} • ${ticket.category} • ${ticket.reporterName}`,
            data: {
                ...ticket,
                // 拡張情報（実際のAPIから取得される）
                history: [
                    {
                        id: '1',
                        timestamp: ticket.updatedAt,
                        action: 'チケット更新',
                        field: 'status',
                        oldValue: 'open',
                        newValue: ticket.status,
                        userId: ticket.assigneeId || '',
                        userName: ticket.assigneeName || 'システム',
                        comment: 'ステータスを更新しました',
                    },
                ],
                comments: [
                    {
                        id: '1',
                        content: 'このチケットを調査中です。',
                        authorId: ticket.assigneeId || '',
                        authorName: ticket.assigneeName || 'システム',
                        isInternal: false,
                        createdAt: ticket.updatedAt,
                        updatedAt: ticket.updatedAt,
                    },
                ],
                attachments: [],
                workLogs: [
                    {
                        id: '1',
                        timestamp: ticket.updatedAt,
                        description: '初期調査を実施',
                        timeSpent: 30, // 分単位
                        userId: ticket.assigneeId || '',
                        userName: ticket.assigneeName || 'システム',
                        isInternal: false,
                    },
                ],
                customFields: [
                    {
                        name: 'impact',
                        label: '影響範囲',
                        type: 'select',
                        value: ticket.priority === 'critical' ? '全社' : '部分的',
                        options: ['全社', '部分的', '個人'],
                    },
                    {
                        name: 'urgency',
                        label: '緊急度',
                        type: 'select',
                        value: ticket.priority,
                        options: ['low', 'medium', 'high', 'critical'],
                    },
                ],
            },
            metadata: {
                lastViewed: new Date().toISOString(),
                source: 'ticket-list',
            },
        };
        openDetailPanel(detailItem, 'right');
    };
    const getPriorityChip = (priority) => {
        const color = priorityColors[priority];
        const labels = {
            critical: '緊急',
            high: '高',
            medium: '中',
            low: '低',
        };
        return (_jsx(Chip, { label: labels[priority], size: "small", sx: {
                bgcolor: `${color}20`,
                color: color,
                fontWeight: 600,
            } }));
    };
    const getStatusChip = (status) => {
        const color = statusColors[status];
        const labels = {
            open: '未対応',
            in_progress: '対応中',
            resolved: '解決済み',
            closed: '完了',
            on_hold: '保留中',
        };
        return (_jsx(Chip, { label: labels[status], size: "small", sx: {
                bgcolor: `${color}20`,
                color: color,
                fontWeight: 500,
            } }));
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const columns = [
        {
            field: 'id',
            headerName: 'ID',
            width: 80,
            renderCell: (params) => (_jsxs(Typography, { variant: "body2", sx: { fontFamily: 'monospace' }, children: ["#", params.value] })),
        },
        {
            field: 'title',
            headerName: 'タイトル',
            width: 280,
            renderCell: (params) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", sx: {
                            fontWeight: 600,
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main' },
                        }, onClick: (e) => handleOpenDetailPanel(params.row, e), children: params.value }), _jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, children: params.row.description })] })),
        },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 120,
            renderCell: (params) => getStatusChip(params.value),
        },
        {
            field: 'priority',
            headerName: '優先度',
            width: 100,
            renderCell: (params) => getPriorityChip(params.value),
        },
        {
            field: 'assigneeName',
            headerName: '担当者',
            width: 120,
            renderCell: (params) => (params.value ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Avatar, { sx: { width: 24, height: 24, fontSize: '0.75rem' }, children: params.value.charAt(0) }), _jsx(Typography, { variant: "body2", children: params.value })] })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u672A\u5272\u5F53" }))),
        },
        {
            field: 'createdAt',
            headerName: '作成日時',
            width: 140,
            renderCell: (params) => (_jsx(Typography, { variant: "body2", children: formatDate(params.value) })),
        },
        {
            field: 'actions',
            headerName: '',
            width: 50,
            sortable: false,
            renderCell: (params) => (_jsx(IconButton, { size: "small", onClick: (e) => {
                    e.stopPropagation();
                    // Handle individual ticket actions
                }, children: _jsx(MoreVertIcon, {}) })),
        },
    ];
    const TicketCard = ({ ticket }) => (_jsx(Card, { sx: {
            cursor: 'pointer',
            '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease-in-out',
            },
        }, onClick: (e) => handleOpenDetailPanel(ticket, e), children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }, children: [_jsxs(Box, { children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: ["#", ticket.id] }), _jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 1 }, children: ticket.title })] }), _jsx(IconButton, { size: "small", children: _jsx(MoreVertIcon, {}) })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: ticket.description }), _jsxs(Box, { sx: { display: 'flex', gap: 1, mb: 2 }, children: [getPriorityChip(ticket.priority), getStatusChip(ticket.status)] }), _jsx(Divider, { sx: { my: 2 } }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 6, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }, children: [_jsx(PersonIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u62C5\u5F53\u8005" })] }), _jsx(Typography, { variant: "body2", children: ticket.assigneeName || '未割当' })] }), _jsxs(Grid, { item: true, xs: 6, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }, children: [_jsx(CalendarIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u4F5C\u6210\u65E5\u6642" })] }), _jsx(Typography, { variant: "body2", children: formatDate(ticket.createdAt) })] })] }), ticket.slaDeadline && (_jsx(Box, { sx: { mt: 2, p: 1, bgcolor: 'warning.light', borderRadius: 1 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(ScheduleIcon, { sx: { fontSize: 16, color: 'warning.dark' } }), _jsxs(Typography, { variant: "caption", color: "warning.dark", children: ["SLA\u671F\u9650: ", formatDate(ticket.slaDeadline)] })] }) }))] }) }));
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600 }, children: "\u30C1\u30B1\u30C3\u30C8\u7BA1\u7406" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => navigate('/tickets/create'), size: "large", children: "\u65B0\u898F\u30C1\u30B1\u30C3\u30C8\u4F5C\u6210" })] }), _jsx(Paper, { sx: { p: 3, mb: 3 }, children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, placeholder: "\u30C1\u30B1\u30C3\u30C8\u3092\u691C\u7D22...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                                } }) }), _jsx(Grid, { item: true, xs: 12, md: 2, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs(Select, { name: "status", multiple: true, value: filters.status || [], onChange: (e) => setFilters(prev => ({ ...prev, status: e.target.value })), input: _jsx(OutlinedInput, { label: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => (_jsx(Chip, { label: value, size: "small" }, value))) })), children: [_jsx(MenuItem, { value: "open", children: "\u672A\u5BFE\u5FDC" }), _jsx(MenuItem, { value: "in_progress", children: "\u5BFE\u5FDC\u4E2D" }), _jsx(MenuItem, { value: "resolved", children: "\u89E3\u6C7A\u6E08\u307F" }), _jsx(MenuItem, { value: "closed", children: "\u5B8C\u4E86" }), _jsx(MenuItem, { value: "on_hold", children: "\u4FDD\u7559\u4E2D" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 2, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u512A\u5148\u5EA6" }), _jsxs(Select, { name: "priority", multiple: true, value: filters.priority || [], onChange: (e) => setFilters(prev => ({ ...prev, priority: e.target.value })), input: _jsx(OutlinedInput, { label: "\u512A\u5148\u5EA6" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => (_jsx(Chip, { label: value, size: "small" }, value))) })), children: [_jsx(MenuItem, { value: "critical", children: "\u7DCA\u6025" }), _jsx(MenuItem, { value: "high", children: "\u9AD8" }), _jsx(MenuItem, { value: "medium", children: "\u4E2D" }), _jsx(MenuItem, { value: "low", children: "\u4F4E" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(Box, { sx: { display: 'flex', gap: 1, justifyContent: 'flex-end' }, children: [_jsx(Tooltip, { title: "\u8868\u793A\u30E2\u30FC\u30C9\u5207\u66FF", children: _jsx(IconButton, { onClick: () => setViewMode(viewMode === 'table' ? 'card' : 'table'), children: viewMode === 'table' ? _jsx(ViewModuleIcon, {}) : _jsx(ViewListIcon, {}) }) }), _jsx(Tooltip, { title: "\u66F4\u65B0", children: _jsx(IconButton, { children: _jsx(RefreshIcon, {}) }) }), _jsx(Tooltip, { title: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8", children: _jsx(IconButton, { children: _jsx(ExportIcon, {}) }) }), _jsx(IconButton, { onClick: (e) => setMoreAnchor(e.currentTarget), children: _jsx(MoreVertIcon, {}) })] }) })] }) }), viewMode === 'table' ? (_jsx(Paper, { sx: { height: 600 }, children: _jsx(DataGrid, { rows: filteredTickets, columns: columns, initialState: {
                        pagination: {
                            paginationModel: { pageSize: pageSize },
                        },
                    }, pageSizeOptions: [5, 10, 25, 50], onPaginationModelChange: (model) => setPageSize(model.pageSize), checkboxSelection: true, disableRowSelectionOnClick: true, onRowClick: (params, event) => handleOpenDetailPanel(params.row, event), sx: {
                        '& .MuiDataGrid-row:hover': {
                            cursor: 'pointer',
                        },
                    } }) })) : (_jsxs(Box, { children: [_jsx(Grid, { container: true, spacing: 3, children: filteredTickets.map((ticket) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(TicketCard, { ticket: ticket }) }, ticket.id))) }), filteredTickets.length > pageSize && (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', mt: 3 }, children: _jsx(Pagination, { count: Math.ceil(filteredTickets.length / pageSize), page: currentPage, onChange: (_, page) => setCurrentPage(page), color: "primary" }) }))] })), _jsxs(Menu, { anchorEl: moreAnchor, open: Boolean(moreAnchor), onClose: () => setMoreAnchor(null), children: [_jsxs(MenuItem, { onClick: () => setMoreAnchor(null), children: [_jsx(ExportIcon, { sx: { mr: 2 } }), "CSV \u30A8\u30AF\u30B9\u30DD\u30FC\u30C8"] }), _jsxs(MenuItem, { onClick: () => setMoreAnchor(null), children: [_jsx(FilterIcon, { sx: { mr: 2 } }), "\u9AD8\u5EA6\u306A\u30D5\u30A3\u30EB\u30BF\u30FC"] })] })] }));
};
export default TicketList;
