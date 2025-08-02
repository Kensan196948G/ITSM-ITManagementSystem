import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Button, Card, CardContent, CardHeader, Divider, Grid, Chip, FormControlLabel, Checkbox, FormGroup, Dialog, DialogTitle, DialogContent, DialogActions, Alert, AlertTitle, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText, Badge, Tooltip, IconButton, TextField, Stack, Tabs, Tab, } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Security as SecurityIcon, People as PeopleIcon, Assignment as RoleIcon, Verified as VerifiedIcon, Warning as WarningIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, CheckCircle as CheckCircleIcon, RadioButtonUnchecked as UncheckedIcon, AdminPanelSettings as AdminIcon, ManageAccounts as ManagerIcon, Build as TechnicianIcon, Visibility as ViewerIcon, Lock as RestrictedIcon, } from '@mui/icons-material';
const TabPanel = ({ children, value, index }) => (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `rbac-tabpanel-${index}`, "aria-labelledby": `rbac-tab-${index}`, children: value === index && _jsx(Box, { sx: { py: 3 }, children: children }) }));
// Mock data
const mockPermissions = [
    // User Management
    { id: 'user:view', name: 'ユーザー閲覧', description: 'ユーザー情報を閲覧できます', resource: 'user', action: 'view', level: 'read', category: 'user' },
    { id: 'user:create', name: 'ユーザー作成', description: '新しいユーザーを作成できます', resource: 'user', action: 'create', level: 'write', category: 'user' },
    { id: 'user:update', name: 'ユーザー更新', description: 'ユーザー情報を更新できます', resource: 'user', action: 'update', level: 'write', category: 'user' },
    { id: 'user:delete', name: 'ユーザー削除', description: 'ユーザーを削除できます', resource: 'user', action: 'delete', level: 'admin', category: 'user', requiresApproval: true },
    { id: 'user:manage_roles', name: '役割管理', description: 'ユーザーの役割を管理できます', resource: 'user', action: 'manage_roles', level: 'admin', category: 'user', requiresApproval: true },
    // Ticket Management  
    { id: 'ticket:view', name: 'チケット閲覧', description: 'チケットを閲覧できます', resource: 'ticket', action: 'view', level: 'read', category: 'ticket' },
    { id: 'ticket:create', name: 'チケット作成', description: '新しいチケットを作成できます', resource: 'ticket', action: 'create', level: 'write', category: 'ticket' },
    { id: 'ticket:update', name: 'チケット更新', description: 'チケット情報を更新できます', resource: 'ticket', action: 'update', level: 'write', category: 'ticket' },
    { id: 'ticket:delete', name: 'チケット削除', description: 'チケットを削除できます', resource: 'ticket', action: 'delete', level: 'admin', category: 'ticket' },
    { id: 'ticket:assign', name: 'チケット割り当て', description: 'チケットを担当者に割り当てできます', resource: 'ticket', action: 'assign', level: 'write', category: 'ticket' },
    { id: 'ticket:close', name: 'チケット完了', description: 'チケットを完了にできます', resource: 'ticket', action: 'close', level: 'write', category: 'ticket' },
    // Report Management
    { id: 'report:view', name: 'レポート閲覧', description: 'レポートを閲覧できます', resource: 'report', action: 'view', level: 'read', category: 'report' },
    { id: 'report:create', name: 'レポート作成', description: 'レポートを作成できます', resource: 'report', action: 'create', level: 'write', category: 'report' },
    { id: 'report:export', name: 'レポート出力', description: 'レポートを出力できます', resource: 'report', action: 'export', level: 'write', category: 'report' },
    // System Management
    { id: 'system:config', name: 'システム設定', description: 'システム設定を変更できます', resource: 'system', action: 'config', level: 'admin', category: 'system', isSystemCritical: true, requiresApproval: true },
    { id: 'system:backup', name: 'バックアップ管理', description: 'システムバックアップを管理できます', resource: 'system', action: 'backup', level: 'admin', category: 'system', isSystemCritical: true },
    { id: 'system:audit', name: '監査ログ閲覧', description: '監査ログを閲覧できます', resource: 'system', action: 'audit', level: 'admin', category: 'system' },
    { id: 'system:maintenance', name: 'メンテナンス', description: 'システムメンテナンスを実行できます', resource: 'system', action: 'maintenance', level: 'admin', category: 'system', isSystemCritical: true, requiresApproval: true },
];
const mockRoles = [
    {
        id: 'admin',
        name: 'admin',
        displayName: 'システム管理者',
        description: 'システム全体の管理権限を持ちます',
        permissions: mockPermissions.map(p => p.id),
        isSystemRole: true,
        userCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
    },
    {
        id: 'manager',
        name: 'manager',
        displayName: 'マネージャー',
        description: 'チーム管理とレポート権限を持ちます',
        permissions: [
            'user:view', 'user:update',
            'ticket:view', 'ticket:create', 'ticket:update', 'ticket:assign', 'ticket:close',
            'report:view', 'report:create', 'report:export',
        ],
        isSystemRole: true,
        userCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2025-07-15T00:00:00Z',
    },
    {
        id: 'technician',
        name: 'technician',
        displayName: 'テクニシャン',
        description: 'チケット処理の権限を持ちます',
        permissions: [
            'ticket:view', 'ticket:create', 'ticket:update', 'ticket:close',
            'report:view',
        ],
        isSystemRole: true,
        userCount: 12,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2025-07-30T00:00:00Z',
    },
    {
        id: 'viewer',
        name: 'viewer',
        displayName: '閲覧者',
        description: '閲覧権限のみを持ちます',
        permissions: [
            'ticket:view',
            'report:view',
        ],
        isSystemRole: true,
        userCount: 8,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
    },
];
const RBACManager = ({ userId, currentUserRole = 'admin', onPermissionChange, onRoleChange, }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [selectedRole, setSelectedRole] = useState('');
    const [customPermissions, setCustomPermissions] = useState([]);
    const [editingRole, setEditingRole] = useState(null);
    const [createRoleDialog, setCreateRoleDialog] = useState(false);
    const [deleteRoleDialog, setDeleteRoleDialog] = useState(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({
        user: true,
        ticket: true,
        report: false,
        system: false,
    });
    // Group permissions by category
    const permissionsByCategory = useMemo(() => {
        const categories = {};
        mockPermissions.forEach(permission => {
            if (!categories[permission.category]) {
                categories[permission.category] = [];
            }
            categories[permission.category].push(permission);
        });
        return categories;
    }, []);
    const categoryConfig = {
        user: { label: 'ユーザー管理', icon: PeopleIcon, color: '#1976d2' },
        ticket: { label: 'チケット管理', icon: RoleIcon, color: '#388e3c' },
        report: { label: 'レポート', icon: VerifiedIcon, color: '#f57c00' },
        system: { label: 'システム設定', icon: SecurityIcon, color: '#d32f2f' },
    };
    const getRoleIcon = (roleId) => {
        switch (roleId) {
            case 'admin': return AdminIcon;
            case 'manager': return ManagerIcon;
            case 'technician': return TechnicianIcon;
            case 'viewer': return ViewerIcon;
            default: return RoleIcon;
        }
    };
    const getRoleColor = (roleId) => {
        switch (roleId) {
            case 'admin': return 'error';
            case 'manager': return 'warning';
            case 'technician': return 'info';
            case 'viewer': return 'default';
            default: return 'primary';
        }
    };
    const handleRoleSelect = useCallback((roleId) => {
        setSelectedRole(roleId);
        const role = mockRoles.find(r => r.id === roleId);
        if (role) {
            setCustomPermissions(role.permissions);
        }
    }, []);
    const handlePermissionToggle = useCallback((permissionId) => {
        setCustomPermissions(prev => {
            if (prev.includes(permissionId)) {
                return prev.filter(id => id !== permissionId);
            }
            else {
                return [...prev, permissionId];
            }
        });
    }, []);
    const handleSavePermissions = useCallback(() => {
        if (userId && onPermissionChange) {
            onPermissionChange(userId, customPermissions);
        }
    }, [userId, customPermissions, onPermissionChange]);
    const handleApplyRole = useCallback(() => {
        if (userId && selectedRole && onRoleChange) {
            onRoleChange(userId, selectedRole);
        }
    }, [userId, selectedRole, onRoleChange]);
    const getCategoryExpansion = (category) => expandedCategories[category] || false;
    const toggleCategoryExpansion = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };
    const getPermissionLevelChip = (level) => {
        const config = {
            read: { label: '読み取り', color: 'success' },
            write: { label: '書き込み', color: 'warning' },
            admin: { label: '管理者', color: 'error' },
        };
        return _jsx(Chip, { label: config[level].label, size: "small", color: config[level].color });
    };
    return (_jsxs(Box, { children: [_jsx(Box, { sx: { borderBottom: 1, borderColor: 'divider', mb: 3 }, children: _jsxs(Tabs, { value: activeTab, onChange: (_, newValue) => setActiveTab(newValue), children: [_jsx(Tab, { label: "\u5F79\u5272\u7BA1\u7406" }), _jsx(Tab, { label: "\u8A73\u7D30\u6A29\u9650\u8A2D\u5B9A" }), _jsx(Tab, { label: "\u5F79\u5272\u4F5C\u6210\u30FB\u7DE8\u96C6" })] }) }), _jsx(TabPanel, { value: activeTab, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u5229\u7528\u53EF\u80FD\u306A\u5F79\u5272" }), _jsx(Divider, { sx: { mb: 2 } }), _jsx(List, { children: mockRoles.map((role) => {
                                            const RoleIcon = getRoleIcon(role.id);
                                            return (_jsxs(ListItem, { sx: {
                                                    cursor: 'pointer',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                    bgcolor: selectedRole === role.id ? 'action.selected' : 'transparent',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }, onClick: () => handleRoleSelect(role.id), children: [_jsx(ListItemIcon, { children: _jsx(Badge, { badgeContent: role.userCount, color: "primary", children: _jsx(RoleIcon, {}) }) }), _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [role.displayName, role.isSystemRole && (_jsx(Chip, { label: "\u30B7\u30B9\u30C6\u30E0", size: "small", variant: "outlined" }))] }), secondary: role.description })] }, role.id));
                                        }) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 8, children: selectedRole ? (_jsxs(Paper, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }, children: [_jsxs(Typography, { variant: "h6", children: ["\u5F79\u5272\u306E\u8A73\u7D30: ", mockRoles.find(r => r.id === selectedRole)?.displayName] }), _jsx(Button, { variant: "contained", startIcon: _jsx(SaveIcon, {}), onClick: handleApplyRole, disabled: !userId, children: "\u9069\u7528" })] }), _jsx(Divider, { sx: { mb: 3 } }), Object.entries(permissionsByCategory).map(([category, permissions]) => {
                                        const config = categoryConfig[category];
                                        const CategoryIcon = config.icon;
                                        const rolePermissions = mockRoles.find(r => r.id === selectedRole)?.permissions || [];
                                        const categoryPermissions = permissions.filter(p => rolePermissions.includes(p.id));
                                        return (_jsxs(Accordion, { expanded: getCategoryExpansion(category), onChange: () => toggleCategoryExpansion(category), sx: { mb: 1 }, children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(CategoryIcon, { sx: { color: config.color } }), _jsx(Typography, { sx: { fontWeight: 600 }, children: config.label }), _jsx(Chip, { label: `${categoryPermissions.length}/${permissions.length}`, size: "small", color: categoryPermissions.length === permissions.length ? 'success' : 'default' })] }) }), _jsx(AccordionDetails, { children: _jsx(List, { dense: true, children: permissions.map((permission) => {
                                                            const hasPermission = rolePermissions.includes(permission.id);
                                                            return (_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: hasPermission ? (_jsx(CheckCircleIcon, { color: "success" })) : (_jsx(UncheckedIcon, { color: "disabled" })) }), _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [permission.name, getPermissionLevelChip(permission.level), permission.requiresApproval && (_jsx(Tooltip, { title: "\u627F\u8A8D\u304C\u5FC5\u8981\u306A\u6A29\u9650\u3067\u3059", children: _jsx(WarningIcon, { color: "warning", fontSize: "small" }) })), permission.isSystemCritical && (_jsx(Tooltip, { title: "\u30B7\u30B9\u30C6\u30E0\u91CD\u8981\u6A29\u9650\u3067\u3059", children: _jsx(RestrictedIcon, { color: "error", fontSize: "small" }) }))] }), secondary: permission.description })] }, permission.id));
                                                        }) }) })] }, category));
                                    })] })) : (_jsxs(Paper, { sx: { p: 3, textAlign: 'center' }, children: [_jsx(SecurityIcon, { sx: { fontSize: 64, color: 'text.disabled', mb: 2 } }), _jsx(Typography, { variant: "h6", color: "text.secondary", children: "\u5F79\u5272\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5DE6\u5074\u304B\u3089\u5F79\u5272\u3092\u9078\u629E\u3057\u3066\u3001\u8A73\u7D30\u306A\u6A29\u9650\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059" })] })) })] }) }), _jsxs(TabPanel, { value: activeTab, index: 1, children: [_jsxs(Alert, { severity: "info", sx: { mb: 3 }, children: [_jsx(AlertTitle, { children: "\u8A73\u7D30\u6A29\u9650\u8A2D\u5B9A" }), "\u500B\u5225\u306E\u6A29\u9650\u3092\u7D30\u304B\u304F\u8A2D\u5B9A\u3067\u304D\u307E\u3059\u3002\u30B7\u30B9\u30C6\u30E0\u91CD\u8981\u6A29\u9650\u3084\u627F\u8A8D\u304C\u5FC5\u8981\u306A\u6A29\u9650\u306B\u3054\u6CE8\u610F\u304F\u3060\u3055\u3044\u3002"] }), _jsxs(Paper, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justify: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h6", children: "\u500B\u5225\u6A29\u9650\u8A2D\u5B9A" }), _jsx(Button, { variant: "contained", startIcon: _jsx(SaveIcon, {}), onClick: handleSavePermissions, disabled: !userId, children: "\u6A29\u9650\u3092\u4FDD\u5B58" })] }), _jsx(Divider, { sx: { mb: 3 } }), Object.entries(permissionsByCategory).map(([category, permissions]) => {
                                const config = categoryConfig[category];
                                const CategoryIcon = config.icon;
                                const selectedCount = permissions.filter(p => customPermissions.includes(p.id)).length;
                                return (_jsxs(Accordion, { expanded: getCategoryExpansion(category), onChange: () => toggleCategoryExpansion(category), sx: { mb: 1 }, children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(CategoryIcon, { sx: { color: config.color } }), _jsx(Typography, { sx: { fontWeight: 600 }, children: config.label }), _jsx(Chip, { label: `${selectedCount}/${permissions.length}`, size: "small", color: selectedCount === permissions.length ? 'success' : selectedCount > 0 ? 'warning' : 'default' })] }) }), _jsx(AccordionDetails, { children: _jsx(FormGroup, { children: permissions.map((permission) => (_jsx(Box, { sx: { mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }, children: _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: customPermissions.includes(permission.id), onChange: () => handlePermissionToggle(permission.id), color: "primary" }), label: _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }, children: [_jsx(Typography, { variant: "body1", sx: { fontWeight: 500 }, children: permission.name }), getPermissionLevelChip(permission.level), permission.requiresApproval && (_jsx(Tooltip, { title: "\u3053\u306E\u6A29\u9650\u306E\u4ED8\u4E0E\u306B\u306F\u627F\u8A8D\u304C\u5FC5\u8981\u3067\u3059", children: _jsx(WarningIcon, { color: "warning", fontSize: "small" }) })), permission.isSystemCritical && (_jsx(Tooltip, { title: "\u30B7\u30B9\u30C6\u30E0\u91CD\u8981\u6A29\u9650\u3067\u3059\u3002\u614E\u91CD\u306B\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044", children: _jsx(RestrictedIcon, { color: "error", fontSize: "small" }) }))] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: permission.description })] }) }) }, permission.id))) }) })] }, category));
                            })] })] }), _jsx(TabPanel, { value: activeTab, index: 2, children: _jsx(Stack, { spacing: 3, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u65E2\u5B58\u306E\u5F79\u5272", action: _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => setCreateRoleDialog(true), children: "\u65B0\u3057\u3044\u5F79\u5272\u3092\u4F5C\u6210" }) }), _jsx(CardContent, { children: _jsx(Grid, { container: true, spacing: 2, children: mockRoles.map((role) => {
                                        const RoleIcon = getRoleIcon(role.id);
                                        return (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(Card, { variant: "outlined", children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 2 }, children: [_jsx(RoleIcon, {}), _jsx(Typography, { variant: "h6", children: role.displayName }), role.isSystemRole && (_jsx(Chip, { label: "\u30B7\u30B9\u30C6\u30E0", size: "small", variant: "outlined" }))] }), _jsx(Typography, { variant: "body2", color: "text.secondary", paragraph: true, children: role.description }), _jsxs(Box, { sx: { display: 'flex', justify: 'space-between', alignItems: 'center' }, children: [_jsxs(Typography, { variant: "body2", children: ["\u30E6\u30FC\u30B6\u30FC\u6570: ", role.userCount, "\u4EBA"] }), _jsxs(Box, { children: [_jsx(IconButton, { size: "small", onClick: () => setEditingRole(role), disabled: role.isSystemRole, children: _jsx(EditIcon, {}) }), _jsx(IconButton, { size: "small", onClick: () => setDeleteRoleDialog(role), disabled: role.isSystemRole || role.userCount > 0, color: "error", children: _jsx(DeleteIcon, {}) })] })] })] }) }) }, role.id));
                                    }) }) })] }) }) }), _jsxs(Dialog, { open: createRoleDialog, onClose: () => setCreateRoleDialog(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u65B0\u3057\u3044\u5F79\u5272\u3092\u4F5C\u6210" }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { mt: 2 }, children: [_jsx(TextField, { fullWidth: true, label: "\u5F79\u5272\u540D", value: newRoleName, onChange: (e) => setNewRoleName(e.target.value), sx: { mb: 2 } }), _jsx(TextField, { fullWidth: true, label: "\u8AAC\u660E", multiline: true, rows: 3, value: newRoleDescription, onChange: (e) => setNewRoleDescription(e.target.value), sx: { mb: 2 } })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setCreateRoleDialog(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { variant: "contained", onClick: () => {
                                    // 役割作成ロジック
                                    setCreateRoleDialog(false);
                                }, disabled: !newRoleName.trim(), children: "\u4F5C\u6210" })] })] }), _jsxs(Dialog, { open: Boolean(deleteRoleDialog), onClose: () => setDeleteRoleDialog(null), children: [_jsx(DialogTitle, { children: "\u5F79\u5272\u3092\u524A\u9664" }), _jsx(DialogContent, { children: _jsxs(Typography, { children: ["\u5F79\u5272\u300C", deleteRoleDialog?.displayName, "\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F \u3053\u306E\u64CD\u4F5C\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002"] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setDeleteRoleDialog(null), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { color: "error", variant: "contained", onClick: () => {
                                    // 役割削除ロジック
                                    setDeleteRoleDialog(null);
                                }, children: "\u524A\u9664" })] })] })] }));
};
export default RBACManager;
