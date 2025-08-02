import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, TextField, InputAdornment, Chip, IconButton, Menu, MenuItem, FormControl, InputLabel, Select, OutlinedInput, Grid, Card, CardContent, Avatar, Switch, FormControlLabel, Tooltip, Badge, } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon, FileDownload as ExportIcon, ViewList as ViewListIcon, ViewModule as ViewModuleIcon, Edit as EditIcon, Block as BlockIcon, CheckCircle as ActiveIcon, Email as EmailIcon, Phone as PhoneIcon, Business as DepartmentIcon, Schedule as LastLoginIcon, } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
const UserList = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [moreAnchor, setMoreAnchor] = useState(null);
    const [filters, setFilters] = useState({});
    // Mock data - 実際の実装ではAPIから取得
    const mockUsers = [
        {
            id: '1',
            firstName: '太郎',
            lastName: '山田',
            email: 'yamada@example.com',
            phone: '090-1234-5678',
            role: 'admin',
            department: 'IT部',
            manager: '佐藤花子',
            isActive: true,
            lastLogin: '2025-08-01T09:30:00Z',
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2025-08-01T09:30:00Z',
            permissions: ['user:create', 'user:update', 'user:delete', 'ticket:create', 'ticket:update'],
        },
        {
            id: '2',
            firstName: '花子',
            lastName: '佐藤',
            email: 'sato@example.com',
            phone: '090-2345-6789',
            role: 'manager',
            department: 'IT部',
            isActive: true,
            lastLogin: '2025-08-01T08:45:00Z',
            createdAt: '2024-02-01T10:00:00Z',
            updatedAt: '2025-08-01T08:45:00Z',
            permissions: ['ticket:create', 'ticket:update', 'ticket:assign'],
        },
        {
            id: '3',
            firstName: '一郎',
            lastName: '田中',
            email: 'tanaka@example.com',
            phone: '090-3456-7890',
            role: 'operator',
            department: 'サポート部',
            manager: '佐藤花子',
            isActive: true,
            lastLogin: '2025-08-01T10:15:00Z',
            createdAt: '2024-03-10T10:00:00Z',
            updatedAt: '2025-08-01T10:15:00Z',
            permissions: ['ticket:create', 'ticket:update'],
        },
        {
            id: '4',
            firstName: '次郎',
            lastName: '鈴木',
            email: 'suzuki@example.com',
            phone: '090-4567-8901',
            role: 'viewer',
            department: '営業部',
            manager: '高橋三郎',
            isActive: false,
            lastLogin: '2025-07-28T16:30:00Z',
            createdAt: '2024-04-05T10:00:00Z',
            updatedAt: '2025-07-28T16:30:00Z',
            permissions: ['ticket:view'],
        },
        {
            id: '5',
            firstName: '三郎',
            lastName: '高橋',
            email: 'takahashi@example.com',
            phone: '090-5678-9012',
            role: 'manager',
            department: '営業部',
            isActive: true,
            lastLogin: '2025-07-31T18:00:00Z',
            createdAt: '2024-01-20T10:00:00Z',
            updatedAt: '2025-07-31T18:00:00Z',
            permissions: ['ticket:create', 'ticket:update', 'user:view'],
        },
    ];
    const filteredUsers = mockUsers.filter(user => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!user.firstName.toLowerCase().includes(query) &&
                !user.lastName.toLowerCase().includes(query) &&
                !user.email.toLowerCase().includes(query) &&
                !user.department.toLowerCase().includes(query)) {
                return false;
            }
        }
        if (filters.role?.length && !filters.role.includes(user.role)) {
            return false;
        }
        if (filters.department?.length && !filters.department.includes(user.department)) {
            return false;
        }
        if (filters.isActive !== undefined && user.isActive !== filters.isActive) {
            return false;
        }
        return true;
    });
    const getRoleChip = (role) => {
        const roleConfig = {
            admin: { label: '管理者', color: 'error' },
            manager: { label: 'マネージャー', color: 'warning' },
            operator: { label: 'オペレーター', color: 'info' },
            viewer: { label: '閲覧者', color: 'default' },
        };
        const config = roleConfig[role];
        return (_jsx(Chip, { label: config.label, size: "small", color: config.color, variant: "outlined" }));
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
    const getLastLoginStatus = (lastLogin) => {
        if (!lastLogin)
            return { color: 'grey', text: '未ログイン' };
        const now = new Date();
        const loginDate = new Date(lastLogin);
        const diffHours = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
        if (diffHours < 1)
            return { color: 'success', text: '1時間以内' };
        if (diffHours < 24)
            return { color: 'info', text: '24時間以内' };
        if (diffHours < 168)
            return { color: 'warning', text: '1週間以内' };
        return { color: 'error', text: '1週間以上前' };
    };
    const columns = [
        {
            field: 'name',
            headerName: '名前',
            width: 180,
            renderCell: (params) => (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Avatar, { sx: { width: 32, height: 32 }, children: params.row.lastName.charAt(0) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "subtitle2", sx: {
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    '&:hover': { color: 'primary.main' },
                                }, onClick: () => navigate(`/users/${params.row.id}`), children: [params.row.lastName, " ", params.row.firstName] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: params.row.email })] })] })),
        },
        {
            field: 'role',
            headerName: '役割',
            width: 130,
            renderCell: (params) => getRoleChip(params.value),
        },
        {
            field: 'department',
            headerName: '部署',
            width: 120,
        },
        {
            field: 'isActive',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params) => (_jsx(Chip, { label: params.value ? 'アクティブ' : '無効', size: "small", color: params.value ? 'success' : 'default', icon: params.value ? _jsx(ActiveIcon, {}) : _jsx(BlockIcon, {}) })),
        },
        {
            field: 'lastLogin',
            headerName: '最終ログイン',
            width: 140,
            renderCell: (params) => {
                const status = getLastLoginStatus(params.value);
                return (_jsx(Tooltip, { title: params.value ? formatDate(params.value) : '未ログイン', children: _jsx(Chip, { label: status.text, size: "small", color: status.color, variant: "outlined" }) }));
            },
        },
        {
            field: 'actions',
            headerName: '',
            width: 50,
            sortable: false,
            renderCell: (params) => (_jsx(IconButton, { size: "small", onClick: (e) => {
                    e.stopPropagation();
                    navigate(`/users/${params.row.id}`);
                }, children: _jsx(EditIcon, {}) })),
        },
    ];
    const UserCard = ({ user }) => {
        const lastLoginStatus = getLastLoginStatus(user.lastLogin);
        return (_jsx(Card, { sx: {
                cursor: 'pointer',
                '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out',
                },
            }, onClick: () => navigate(`/users/${user.id}`), children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Badge, { color: user.isActive ? 'success' : 'error', variant: "dot", anchorOrigin: { vertical: 'bottom', horizontal: 'right' }, children: _jsx(Avatar, { sx: { width: 56, height: 56, fontSize: '1.5rem' }, children: user.lastName.charAt(0) }) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: [user.lastName, " ", user.firstName] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: user.email })] })] }), _jsx(IconButton, { size: "small", children: _jsx(MoreVertIcon, {}) })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1, mb: 2 }, children: [getRoleChip(user.role), _jsx(Chip, { label: user.isActive ? 'アクティブ' : '無効', size: "small", color: user.isActive ? 'success' : 'default' })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 6, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }, children: [_jsx(DepartmentIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u90E8\u7F72" })] }), _jsx(Typography, { variant: "body2", children: user.department })] }), _jsxs(Grid, { item: true, xs: 6, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }, children: [_jsx(LastLoginIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u6700\u7D42\u30ED\u30B0\u30A4\u30F3" })] }), _jsx(Chip, { label: lastLoginStatus.text, size: "small", color: lastLoginStatus.color, variant: "outlined" })] })] }), user.phone && (_jsx(Box, { sx: { mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(PhoneIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", children: user.phone })] }) }))] }) }));
    };
    const departments = [...new Set(mockUsers.map(user => user.department))];
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600 }, children: "\u30E6\u30FC\u30B6\u30FC\u7BA1\u7406" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => navigate('/users/create'), size: "large", children: "\u65B0\u898F\u30E6\u30FC\u30B6\u30FC\u4F5C\u6210" })] }), _jsx(Paper, { sx: { p: 3, mb: 3 }, children: _jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, placeholder: "\u30E6\u30FC\u30B6\u30FC\u3092\u691C\u7D22...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                                } }) }), _jsx(Grid, { item: true, xs: 12, md: 2, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u5F79\u5272" }), _jsxs(Select, { multiple: true, value: filters.role || [], onChange: (e) => setFilters(prev => ({ ...prev, role: e.target.value })), input: _jsx(OutlinedInput, { label: "\u5F79\u5272" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => (_jsx(Chip, { label: value, size: "small" }, value))) })), children: [_jsx(MenuItem, { value: "admin", children: "\u7BA1\u7406\u8005" }), _jsx(MenuItem, { value: "manager", children: "\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC" }), _jsx(MenuItem, { value: "operator", children: "\u30AA\u30DA\u30EC\u30FC\u30BF\u30FC" }), _jsx(MenuItem, { value: "viewer", children: "\u95B2\u89A7\u8005" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 2, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u90E8\u7F72" }), _jsx(Select, { multiple: true, value: filters.department || [], onChange: (e) => setFilters(prev => ({ ...prev, department: e.target.value })), input: _jsx(OutlinedInput, { label: "\u90E8\u7F72" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => (_jsx(Chip, { label: value, size: "small" }, value))) })), children: departments.map((dept) => (_jsx(MenuItem, { value: dept, children: dept }, dept))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 2, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: filters.isActive ?? true, onChange: (e) => setFilters(prev => ({ ...prev, isActive: e.target.checked })) }), label: "\u30A2\u30AF\u30C6\u30A3\u30D6\u306E\u307F" }) }), _jsx(Grid, { item: true, xs: 12, md: 2, children: _jsxs(Box, { sx: { display: 'flex', gap: 1, justifyContent: 'flex-end' }, children: [_jsx(Tooltip, { title: "\u8868\u793A\u30E2\u30FC\u30C9\u5207\u66FF", children: _jsx(IconButton, { onClick: () => setViewMode(viewMode === 'table' ? 'card' : 'table'), children: viewMode === 'table' ? _jsx(ViewModuleIcon, {}) : _jsx(ViewListIcon, {}) }) }), _jsx(Tooltip, { title: "\u66F4\u65B0", children: _jsx(IconButton, { children: _jsx(RefreshIcon, {}) }) }), _jsx(Tooltip, { title: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8", children: _jsx(IconButton, { children: _jsx(ExportIcon, {}) }) }), _jsx(IconButton, { onClick: (e) => setMoreAnchor(e.currentTarget), children: _jsx(MoreVertIcon, {}) })] }) })] }) }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 3, children: _jsx(Card, { children: _jsxs(CardContent, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600, color: 'primary.main' }, children: mockUsers.length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7DCF\u30E6\u30FC\u30B6\u30FC\u6570" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 3, children: _jsx(Card, { children: _jsxs(CardContent, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600, color: 'success.main' }, children: mockUsers.filter(u => u.isActive).length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30E6\u30FC\u30B6\u30FC" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 3, children: _jsx(Card, { children: _jsxs(CardContent, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600, color: 'warning.main' }, children: mockUsers.filter(u => u.role === 'admin').length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7BA1\u7406\u8005" })] }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 3, children: _jsx(Card, { children: _jsxs(CardContent, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600, color: 'info.main' }, children: departments.length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u90E8\u7F72\u6570" })] }) }) })] }), viewMode === 'table' ? (_jsx(Paper, { sx: { height: 600 }, children: _jsx(DataGrid, { rows: filteredUsers, columns: columns, initialState: {
                        pagination: {
                            paginationModel: { pageSize: 10 },
                        },
                    }, pageSizeOptions: [5, 10, 25, 50], checkboxSelection: true, disableRowSelectionOnClick: true, onRowClick: (params) => navigate(`/users/${params.id}`), sx: {
                        '& .MuiDataGrid-row:hover': {
                            cursor: 'pointer',
                        },
                    } }) })) : (_jsx(Grid, { container: true, spacing: 3, children: filteredUsers.map((user) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(UserCard, { user: user }) }, user.id))) })), _jsxs(Menu, { anchorEl: moreAnchor, open: Boolean(moreAnchor), onClose: () => setMoreAnchor(null), children: [_jsxs(MenuItem, { onClick: () => setMoreAnchor(null), children: [_jsx(ExportIcon, { sx: { mr: 2 } }), "CSV \u30A8\u30AF\u30B9\u30DD\u30FC\u30C8"] }), _jsxs(MenuItem, { onClick: () => setMoreAnchor(null), children: [_jsx(EmailIcon, { sx: { mr: 2 } }), "\u4E00\u62EC\u30E1\u30FC\u30EB\u9001\u4FE1"] })] })] }));
};
export default UserList;
