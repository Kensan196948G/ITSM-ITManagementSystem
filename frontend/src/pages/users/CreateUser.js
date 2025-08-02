import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, Grid, Alert, AlertTitle, Card, CardContent, Divider, Chip, FormGroup, FormControlLabel, Checkbox, LinearProgress, Autocomplete, FormHelperText, } from '@mui/material';
import { Save as SaveIcon, Person as PersonIcon, Email as EmailIcon, Phone as PhoneIcon, Business as BusinessIcon, Security as SecurityIcon, } from '@mui/icons-material';
const CreateUser = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'viewer',
        department: '',
        manager: '',
        permissions: [],
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Mock data - 実際の実装ではAPIから取得
    const departments = [
        'IT部',
        'サポート部',
        '営業部',
        '人事部',
        '経理部',
        'マーケティング部',
        '開発部',
        '品質管理部',
    ];
    const managers = [
        '佐藤花子',
        '田中一郎',
        '高橋三郎',
        '渡辺四郎',
        '伊藤五郎',
    ];
    const permissionGroups = {
        user: {
            label: 'ユーザー管理',
            permissions: [
                { id: 'user:view', label: 'ユーザー閲覧' },
                { id: 'user:create', label: 'ユーザー作成' },
                { id: 'user:update', label: 'ユーザー編集' },
                { id: 'user:delete', label: 'ユーザー削除' },
            ],
        },
        ticket: {
            label: 'チケット管理',
            permissions: [
                { id: 'ticket:view', label: 'チケット閲覧' },
                { id: 'ticket:create', label: 'チケット作成' },
                { id: 'ticket:update', label: 'チケット編集' },
                { id: 'ticket:delete', label: 'チケット削除' },
                { id: 'ticket:assign', label: 'チケット割当' },
            ],
        },
        report: {
            label: 'レポート',
            permissions: [
                { id: 'report:view', label: 'レポート閲覧' },
                { id: 'report:create', label: 'レポート作成' },
                { id: 'report:export', label: 'レポートエクスポート' },
            ],
        },
        system: {
            label: 'システム設定',
            permissions: [
                { id: 'system:config', label: 'システム設定' },
                { id: 'system:backup', label: 'バックアップ管理' },
                { id: 'system:audit', label: '監査ログ' },
            ],
        },
    };
    const rolePermissionDefaults = {
        admin: Object.values(permissionGroups).flatMap(group => group.permissions.map(p => p.id)),
        manager: ['user:view', 'ticket:view', 'ticket:create', 'ticket:update', 'ticket:assign', 'report:view'],
        operator: ['ticket:view', 'ticket:create', 'ticket:update'],
        viewer: ['ticket:view'],
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.firstName.trim()) {
            newErrors.firstName = '名前（名）は必須です';
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = '名前（姓）は必須です';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'メールアドレスは必須です';
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = '有効なメールアドレスを入力してください';
        }
        if (formData.phone && !/^[\d\-\+\(\)\\s]+$/.test(formData.phone)) {
            newErrors.phone = '有効な電話番号を入力してください';
        }
        if (!formData.department) {
            newErrors.department = '部署は必須です';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        try {
            // API call simulation
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Success - redirect to user list
            navigate('/users', {
                state: { message: 'ユーザーが正常に作成されました' }
            });
        }
        catch (error) {
            console.error('Error creating user:', error);
            setErrors({ submit: 'ユーザーの作成に失敗しました。もう一度お試しください。' });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleRoleChange = (role) => {
        setFormData(prev => ({
            ...prev,
            role,
            permissions: rolePermissionDefaults[role] || [],
        }));
    };
    const handlePermissionChange = (permissionId, checked) => {
        setFormData(prev => ({
            ...prev,
            permissions: checked
                ? [...(prev.permissions || []), permissionId]
                : (prev.permissions || []).filter(p => p !== permissionId),
        }));
    };
    const getRoleDescription = (role) => {
        const descriptions = {
            admin: 'システム全体の管理権限を持ちます',
            manager: 'チーム管理とレポート閲覧が可能です',
            operator: 'チケットの作成・更新が可能です',
            viewer: 'チケットの閲覧のみ可能です',
        };
        return descriptions[role];
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600 }, children: "\u65B0\u898F\u30E6\u30FC\u30B6\u30FC\u4F5C\u6210" }), _jsx(Button, { variant: "outlined", onClick: () => navigate('/users'), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" })] }), isSubmitting && _jsx(LinearProgress, { sx: { mb: 2 } }), errors.submit && (_jsxs(Alert, { severity: "error", sx: { mb: 3 }, children: [_jsx(AlertTitle, { children: "\u30A8\u30E9\u30FC" }), errors.submit] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, md: 8, children: [_jsxs(Paper, { sx: { p: 3, mb: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u57FA\u672C\u60C5\u5831" }), _jsx(Divider, { sx: { mb: 3 } }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u59D3 *", value: formData.lastName, onChange: (e) => setFormData(prev => ({ ...prev, lastName: e.target.value })), error: !!errors.lastName, helperText: errors.lastName, placeholder: "\u5C71\u7530" }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u540D *", value: formData.firstName, onChange: (e) => setFormData(prev => ({ ...prev, firstName: e.target.value })), error: !!errors.firstName, helperText: errors.firstName, placeholder: "\u592A\u90CE" }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9 *", type: "email", value: formData.email, onChange: (e) => setFormData(prev => ({ ...prev, email: e.target.value })), error: !!errors.email, helperText: errors.email, placeholder: "user@example.com", InputProps: {
                                                                startAdornment: _jsx(EmailIcon, { sx: { mr: 1, color: 'text.secondary' } }),
                                                            } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u96FB\u8A71\u756A\u53F7", value: formData.phone, onChange: (e) => setFormData(prev => ({ ...prev, phone: e.target.value })), error: !!errors.phone, helperText: errors.phone, placeholder: "090-1234-5678", InputProps: {
                                                                startAdornment: _jsx(PhoneIcon, { sx: { mr: 1, color: 'text.secondary' } }),
                                                            } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, error: !!errors.department, children: [_jsx(InputLabel, { children: "\u90E8\u7F72 *" }), _jsx(Select, { value: formData.department, onChange: (e) => setFormData(prev => ({ ...prev, department: e.target.value })), label: "\u90E8\u7F72 *", startAdornment: _jsx(BusinessIcon, { sx: { mr: 1, color: 'text.secondary' } }), children: departments.map((dept) => (_jsx(MenuItem, { value: dept, children: dept }, dept))) }), errors.department && _jsx(FormHelperText, { children: errors.department })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Autocomplete, { options: managers, value: formData.manager || null, onChange: (_, value) => setFormData(prev => ({ ...prev, manager: value || '' })), renderInput: (params) => (_jsx(TextField, { ...params, label: "\u4E0A\u53F8\u30FB\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC", placeholder: "\u4E0A\u53F8\u3092\u9078\u629E\uFF08\u30AA\u30D7\u30B7\u30E7\u30F3\uFF09", InputProps: {
                                                                    ...params.InputProps,
                                                                    startAdornment: (_jsxs(_Fragment, { children: [_jsx(PersonIcon, { sx: { mr: 1, color: 'text.secondary' } }), params.InputProps.startAdornment] })),
                                                                } })) }) })] })] }), _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u6A29\u9650\u8A2D\u5B9A" }), _jsx(Divider, { sx: { mb: 3 } }), Object.entries(permissionGroups).map(([groupKey, group]) => (_jsxs(Box, { sx: { mb: 3 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600, mb: 1 }, children: group.label }), _jsx(FormGroup, { children: _jsx(Grid, { container: true, spacing: 1, children: group.permissions.map((permission) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: formData.permissions?.includes(permission.id) || false, onChange: (e) => handlePermissionChange(permission.id, e.target.checked) }), label: permission.label }) }, permission.id))) }) })] }, groupKey)))] })] }), _jsxs(Grid, { item: true, xs: 12, md: 4, children: [_jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u5F79\u5272 *" }), _jsx(FormControl, { fullWidth: true, sx: { mb: 2 }, children: _jsxs(Select, { value: formData.role, onChange: (e) => handleRoleChange(e.target.value), startAdornment: _jsx(SecurityIcon, { sx: { mr: 1, color: 'text.secondary' } }), children: [_jsx(MenuItem, { value: "admin", children: "\u7BA1\u7406\u8005" }), _jsx(MenuItem, { value: "manager", children: "\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC" }), _jsx(MenuItem, { value: "operator", children: "\u30AA\u30DA\u30EC\u30FC\u30BF\u30FC" }), _jsx(MenuItem, { value: "viewer", children: "\u95B2\u89A7\u8005" })] }) }), _jsx(Alert, { severity: "info", sx: { mb: 2 }, children: _jsx(Typography, { variant: "body2", children: getRoleDescription(formData.role) }) }), _jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u9078\u629E\u3057\u305F\u5F79\u5272\u306E\u6A29\u9650:" }), _jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: formData.permissions?.map((permission) => {
                                                        const permissionObj = Object.values(permissionGroups)
                                                            .flatMap(group => group.permissions)
                                                            .find(p => p.id === permission);
                                                        return (_jsx(Chip, { label: permissionObj?.label || permission, size: "small", variant: "outlined" }, permission));
                                                    }) })] }) }), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30D8\u30EB\u30D7" }), _jsx(Typography, { variant: "body2", color: "text.secondary", paragraph: true, children: "\u30E6\u30FC\u30B6\u30FC\u4F5C\u6210\u6642\u306E\u30DD\u30A4\u30F3\u30C8\uFF1A" }), _jsxs(Typography, { variant: "body2", color: "text.secondary", component: "div", children: ["\u2022 \u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306F\u4E00\u610F\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059", _jsx("br", {}), "\u2022 \u5F79\u5272\u306B\u5FDC\u3058\u3066\u9069\u5207\u306A\u6A29\u9650\u304C\u81EA\u52D5\u8A2D\u5B9A\u3055\u308C\u307E\u3059", _jsx("br", {}), "\u2022 \u5FC5\u8981\u306B\u5FDC\u3058\u3066\u500B\u5225\u306B\u6A29\u9650\u3092\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u3067\u304D\u307E\u3059", _jsx("br", {}), "\u2022 \u521D\u56DE\u30ED\u30B0\u30A4\u30F3\u6642\u306B\u30D1\u30B9\u30EF\u30FC\u30C9\u8A2D\u5B9A\u30E1\u30FC\u30EB\u304C\u9001\u4FE1\u3055\u308C\u307E\u3059"] })] }) })] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }, children: [_jsx(Button, { variant: "outlined", onClick: () => navigate('/users'), disabled: isSubmitting, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { type: "submit", variant: "contained", startIcon: _jsx(SaveIcon, {}), disabled: isSubmitting, size: "large", children: isSubmitting ? '作成中...' : 'ユーザーを作成' })] })] })] }));
};
export default CreateUser;
