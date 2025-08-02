import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Chip, Avatar, Divider, Grid, IconButton, Menu, MenuItem, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Badge, Alert, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, } from '@mui/material';
import { Edit as EditIcon, MoreVert as MoreVertIcon, Email as EmailIcon, Phone as PhoneIcon, Business as BusinessIcon, Person as PersonIcon, Security as SecurityIcon, Block as BlockIcon, CheckCircle as ActiveIcon, Notifications as NotificationIcon, VpnKey as PasswordIcon, Delete as DeleteIcon, } from '@mui/icons-material';
import RBACManager from '../../components/users/RBACManager';
const TabPanel = ({ children, value, index }) => (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `user-tabpanel-${index}`, "aria-labelledby": `user-tab-${index}`, children: value === index && _jsx(Box, { sx: { py: 3 }, children: children }) }));
const UserDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [moreAnchor, setMoreAnchor] = useState(null);
    const [deactivateDialog, setDeactivateDialog] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    // Mock data - 実際の実装ではAPIから取得
    const mockUser = {
        id: id || '1',
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
        permissions: [
            'user:view', 'user:create', 'user:update', 'user:delete',
            'ticket:view', 'ticket:create', 'ticket:update', 'ticket:delete', 'ticket:assign',
            'report:view', 'report:create', 'report:export',
            'system:config', 'system:backup', 'system:audit',
        ],
    };
    const mockUserTickets = [
        {
            id: '1',
            title: 'サーバー応答速度低下',
            description: 'Webサーバーの応答速度が著しく低下',
            status: 'in_progress',
            priority: 'critical',
            category: 'Infrastructure',
            assigneeId: mockUser.id,
            assigneeName: `${mockUser.lastName} ${mockUser.firstName}`,
            reporterId: '2',
            reporterName: '田中一郎',
            createdAt: '2025-08-01T10:30:00Z',
            updatedAt: '2025-08-01T11:00:00Z',
        },
        {
            id: '2',
            title: 'メール送信エラー',
            description: 'メール送信時にSMTPエラーが発生',
            status: 'resolved',
            priority: 'high',
            category: 'Email',
            assigneeId: mockUser.id,
            assigneeName: `${mockUser.lastName} ${mockUser.firstName}`,
            reporterId: '3',
            reporterName: '佐藤花子',
            createdAt: '2025-07-30T09:15:00Z',
            updatedAt: '2025-07-31T14:45:00Z',
        },
    ];
    const mockLoginHistory = [
        { date: '2025-08-01T09:30:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
        { date: '2025-07-31T18:45:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
        { date: '2025-07-31T08:15:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
        { date: '2025-07-30T17:30:00Z', ip: '192.168.1.101', userAgent: 'Firefox 89.0', success: false },
        { date: '2025-07-30T09:00:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
    ];
    const getRoleChip = (role) => {
        const roleConfig = {
            admin: { label: '管理者', color: 'error' },
            manager: { label: 'マネージャー', color: 'warning' },
            operator: { label: 'オペレーター', color: 'info' },
            viewer: { label: '閲覧者', color: 'default' },
        };
        const config = roleConfig[role];
        return (_jsx(Chip, { label: config.label, color: config.color, variant: "outlined" }));
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
    const getPermissionGroups = () => {
        const groups = {
            user: { label: 'ユーザー管理', permissions: [] },
            ticket: { label: 'チケット管理', permissions: [] },
            report: { label: 'レポート', permissions: [] },
            system: { label: 'システム設定', permissions: [] },
        };
        mockUser.permissions?.forEach(permission => {
            const [category] = permission.split(':');
            if (groups[category]) {
                groups[category].permissions.push(permission);
            }
        });
        return groups;
    };
    const handleToggleActive = () => {
        // Handle user activation/deactivation
        console.log('Toggle user active status');
        setDeactivateDialog(false);
    };
    const handleDeleteUser = () => {
        // Handle user deletion
        console.log('Delete user');
        navigate('/users');
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Badge, { color: mockUser.isActive ? 'success' : 'error', variant: "dot", anchorOrigin: { vertical: 'bottom', horizontal: 'right' }, children: _jsx(Avatar, { sx: { width: 80, height: 80, fontSize: '2rem' }, children: mockUser.lastName.charAt(0) }) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "h4", sx: { fontWeight: 600 }, children: [mockUser.lastName, " ", mockUser.firstName] }), _jsx(Typography, { variant: "h6", color: "text.secondary", gutterBottom: true, children: mockUser.email }), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' }, children: [getRoleChip(mockUser.role), _jsx(Chip, { label: mockUser.isActive ? 'アクティブ' : '無効', color: mockUser.isActive ? 'success' : 'default', icon: mockUser.isActive ? _jsx(ActiveIcon, {}) : _jsx(BlockIcon, {}) })] })] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(EditIcon, {}), onClick: () => navigate(`/users/${mockUser.id}/edit`), children: "\u7DE8\u96C6" }), _jsx(IconButton, { onClick: (e) => setMoreAnchor(e.currentTarget), children: _jsx(MoreVertIcon, {}) })] })] }), !mockUser.isActive && (_jsx(Alert, { severity: "warning", sx: { mb: 3 }, children: "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u306F\u73FE\u5728\u7121\u52B9\u306B\u306A\u3063\u3066\u3044\u307E\u3059\u3002\u30B7\u30B9\u30C6\u30E0\u306B\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u305B\u3093\u3002" })), _jsx(Box, { sx: { borderBottom: 1, borderColor: 'divider', mb: 3 }, children: _jsxs(Tabs, { value: tabValue, onChange: (_, newValue) => setTabValue(newValue), children: [_jsx(Tab, { label: "\u57FA\u672C\u60C5\u5831" }), _jsx(Tab, { label: "\u62C5\u5F53\u30C1\u30B1\u30C3\u30C8" }), _jsx(Tab, { label: "\u6A29\u9650\u8A2D\u5B9A" }), _jsx(Tab, { label: "\u30ED\u30B0\u30A4\u30F3\u5C65\u6B74" })] }) }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u500B\u4EBA\u60C5\u5831" }), _jsx(Divider, { sx: { mb: 2 } }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(PersonIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6C0F\u540D" })] }), _jsxs(Typography, { variant: "body1", children: [mockUser.lastName, " ", mockUser.firstName] })] }), _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(EmailIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9" })] }), _jsx(Typography, { variant: "body1", children: mockUser.email })] }), mockUser.phone && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(PhoneIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u96FB\u8A71\u756A\u53F7" })] }), _jsx(Typography, { variant: "body1", children: mockUser.phone })] })), _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(BusinessIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u90E8\u7F72" })] }), _jsx(Typography, { variant: "body1", children: mockUser.department })] }), mockUser.manager && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(PersonIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u4E0A\u53F8\u30FB\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC" })] }), _jsx(Typography, { variant: "body1", children: mockUser.manager })] }))] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30B7\u30B9\u30C6\u30E0\u60C5\u5831" }), _jsx(Divider, { sx: { mb: 2 } }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(SecurityIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5F79\u5272" })] }), getRoleChip(mockUser.role)] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u30A2\u30AB\u30A6\u30F3\u30C8\u72B6\u614B" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Chip, { label: mockUser.isActive ? 'アクティブ' : '無効', color: mockUser.isActive ? 'success' : 'default', icon: mockUser.isActive ? _jsx(ActiveIcon, {}) : _jsx(BlockIcon, {}) }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: mockUser.isActive, onChange: () => setDeactivateDialog(true) }), label: mockUser.isActive ? '有効' : '無効' })] })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u4F5C\u6210\u65E5\u6642" }), _jsx(Typography, { variant: "body1", children: formatDate(mockUser.createdAt) })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u6700\u7D42\u66F4\u65B0" }), _jsx(Typography, { variant: "body1", children: formatDate(mockUser.updatedAt) })] }), mockUser.lastLogin && (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u6700\u7D42\u30ED\u30B0\u30A4\u30F3" }), _jsx(Typography, { variant: "body1", children: formatDate(mockUser.lastLogin) })] }))] })] }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["\u62C5\u5F53\u30C1\u30B1\u30C3\u30C8 (", mockUserTickets.length, "\u4EF6)"] }), _jsx(Divider, { sx: { mb: 2 } }), _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "ID" }), _jsx(TableCell, { children: "\u30BF\u30A4\u30C8\u30EB" }), _jsx(TableCell, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx(TableCell, { children: "\u512A\u5148\u5EA6" }), _jsx(TableCell, { children: "\u4F5C\u6210\u65E5" })] }) }), _jsx(TableBody, { children: mockUserTickets.map((ticket) => (_jsxs(TableRow, { sx: { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }, onClick: () => navigate(`/tickets/${ticket.id}`), children: [_jsxs(TableCell, { children: ["#", ticket.id] }), _jsx(TableCell, { children: ticket.title }), _jsx(TableCell, { children: _jsx(Chip, { label: ticket.status, size: "small", color: ticket.status === 'resolved' ? 'success' : 'warning' }) }), _jsx(TableCell, { children: _jsx(Chip, { label: ticket.priority, size: "small", color: ticket.priority === 'critical' ? 'error' : 'warning' }) }), _jsx(TableCell, { children: formatDate(ticket.createdAt) })] }, ticket.id))) })] }) })] }) }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsx(RBACManager, { userId: mockUser.id, currentUserRole: "admin", onPermissionChange: (userId, permissions) => {
                        console.log('Permissions changed for user', userId, permissions);
                        // 実際の実装では API を呼び出してユーザーの権限を更新
                    }, onRoleChange: (userId, roleId) => {
                        console.log('Role changed for user', userId, roleId);
                        // 実際の実装では API を呼び出してユーザーの役割を更新
                    } }) }), _jsx(TabPanel, { value: tabValue, index: 3, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30ED\u30B0\u30A4\u30F3\u5C65\u6B74" }), _jsx(Divider, { sx: { mb: 2 } }), _jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u65E5\u6642" }), _jsx(TableCell, { children: "IP\u30A2\u30C9\u30EC\u30B9" }), _jsx(TableCell, { children: "\u30E6\u30FC\u30B6\u30FC\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8" }), _jsx(TableCell, { children: "\u7D50\u679C" })] }) }), _jsx(TableBody, { children: mockLoginHistory.map((log, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: formatDate(log.date) }), _jsx(TableCell, { children: log.ip }), _jsx(TableCell, { children: log.userAgent }), _jsx(TableCell, { children: _jsx(Chip, { label: log.success ? '成功' : '失敗', size: "small", color: log.success ? 'success' : 'error' }) })] }, index))) })] }) })] }) }), _jsxs(Menu, { anchorEl: moreAnchor, open: Boolean(moreAnchor), onClose: () => setMoreAnchor(null), children: [_jsxs(MenuItem, { onClick: () => { setMoreAnchor(null); setDeactivateDialog(true); }, children: [_jsx(BlockIcon, { sx: { mr: 2 } }), mockUser.isActive ? 'ユーザーを無効化' : 'ユーザーを有効化'] }), _jsxs(MenuItem, { onClick: () => setMoreAnchor(null), children: [_jsx(PasswordIcon, { sx: { mr: 2 } }), "\u30D1\u30B9\u30EF\u30FC\u30C9\u30EA\u30BB\u30C3\u30C8"] }), _jsxs(MenuItem, { onClick: () => setMoreAnchor(null), children: [_jsx(NotificationIcon, { sx: { mr: 2 } }), "\u901A\u77E5\u8A2D\u5B9A"] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: () => { setMoreAnchor(null); handleDeleteUser(); }, children: [_jsx(DeleteIcon, { sx: { mr: 2, color: 'error.main' } }), _jsx(Typography, { color: "error", children: "\u30E6\u30FC\u30B6\u30FC\u3092\u524A\u9664" })] })] }), _jsxs(Dialog, { open: deactivateDialog, onClose: () => setDeactivateDialog(false), maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: mockUser.isActive ? 'ユーザーを無効化' : 'ユーザーを有効化' }), _jsx(DialogContent, { children: _jsx(Typography, { children: mockUser.isActive
                                ? 'このユーザーを無効化しますか？無効化すると、ユーザーはシステムにアクセスできなくなります。'
                                : 'このユーザーを有効化しますか？有効化すると、ユーザーは再びシステムにアクセスできるようになります。' }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setDeactivateDialog(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: handleToggleActive, color: mockUser.isActive ? 'error' : 'primary', variant: "contained", children: mockUser.isActive ? '無効化' : '有効化' })] })] })] }));
};
export default UserDetail;
