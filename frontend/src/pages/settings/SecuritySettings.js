import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * セキュリティ設定ページ
 * パスワードポリシー、セッション管理、2要素認証、IPアクセス制限
 */
import { useState } from 'react';
import { Box, Typography, Grid, TextField, Switch, FormControlLabel, Card, CardContent, CardHeader, Accordion, AccordionSummary, AccordionDetails, Alert, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip, List, ListItem, ListItemText, ListItemIcon, Slider, FormGroup, } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Lock as PasswordIcon, AccessTime as AccessTimeIcon, Shield as ShieldIcon, Block as BlockIcon, Add as AddIcon, Delete as DeleteIcon, Warning as WarningIcon, VpnKey as VpnKeyIcon, } from '@mui/icons-material';
const SecuritySettings = ({ settings }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [ipDialogOpen, setIpDialogOpen] = useState(false);
    const [newIpAddress, setNewIpAddress] = useState('');
    const [ipListType, setIpListType] = useState('whitelist');
    const handlePasswordPolicyChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            passwordPolicy: {
                ...prev.passwordPolicy,
                [field]: value,
            },
        }));
    };
    const handleSessionChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            session: {
                ...prev.session,
                [field]: value,
            },
        }));
    };
    const handleTwoFactorChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            twoFactorAuth: {
                ...prev.twoFactorAuth,
                [field]: value,
            },
        }));
    };
    const handleIpAccessChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            ipAccess: {
                ...prev.ipAccess,
                [field]: value,
            },
        }));
    };
    const addIpAddress = () => {
        if (!newIpAddress.trim())
            return;
        const listKey = ipListType;
        setLocalSettings(prev => ({
            ...prev,
            ipAccess: {
                ...prev.ipAccess,
                [listKey]: [...prev.ipAccess[listKey], newIpAddress.trim()],
            },
        }));
        setNewIpAddress('');
        setIpDialogOpen(false);
    };
    const removeIpAddress = (ip, listType) => {
        setLocalSettings(prev => ({
            ...prev,
            ipAccess: {
                ...prev.ipAccess,
                [listType]: prev.ipAccess[listType].filter(item => item !== ip),
            },
        }));
    };
    const getPasswordStrengthLevel = () => {
        const policy = localSettings.passwordPolicy;
        let score = 0;
        if (policy.minLength >= 8)
            score += 1;
        if (policy.requireUppercase)
            score += 1;
        if (policy.requireLowercase)
            score += 1;
        if (policy.requireNumbers)
            score += 1;
        if (policy.requireSpecialChars)
            score += 1;
        if (policy.maxAge > 0 && policy.maxAge <= 90)
            score += 1;
        if (score <= 2)
            return { level: 'weak', color: 'error' };
        if (score <= 4)
            return { level: 'medium', color: 'warning' };
        return { level: 'strong', color: 'success' };
    };
    const passwordStrength = getPasswordStrengthLevel();
    return (_jsxs(Box, { sx: { maxWidth: 1200, mx: 'auto' }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u8A2D\u5B9A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "\u30B7\u30B9\u30C6\u30E0\u306E\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u30DD\u30EA\u30B7\u30FC\u3068\u30A2\u30AF\u30BB\u30B9\u5236\u5FA1\u3092\u7BA1\u7406\u3057\u307E\u3059" }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { defaultExpanded: true, children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(PasswordIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\u30D1\u30B9\u30EF\u30FC\u30C9\u30DD\u30EA\u30B7\u30FC" }), _jsx(Chip, { label: `強度: ${passwordStrength.level}`, color: passwordStrength.color, size: "small", sx: { ml: 2 } })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u57FA\u672C\u8981\u4EF6" }), _jsxs(CardContent, { children: [_jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Typography, { gutterBottom: true, children: ["\u6700\u5C0F\u6587\u5B57\u6570: ", localSettings.passwordPolicy.minLength] }), _jsx(Slider, { value: localSettings.passwordPolicy.minLength, onChange: (_, value) => handlePasswordPolicyChange('minLength', value), min: 4, max: 32, marks: true, valueLabelDisplay: "auto" })] }), _jsxs(FormGroup, { children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.passwordPolicy.requireUppercase, onChange: (e) => handlePasswordPolicyChange('requireUppercase', e.target.checked) }), label: "\u5927\u6587\u5B57\u3092\u542B\u3080" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.passwordPolicy.requireLowercase, onChange: (e) => handlePasswordPolicyChange('requireLowercase', e.target.checked) }), label: "\u5C0F\u6587\u5B57\u3092\u542B\u3080" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.passwordPolicy.requireNumbers, onChange: (e) => handlePasswordPolicyChange('requireNumbers', e.target.checked) }), label: "\u6570\u5B57\u3092\u542B\u3080" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.passwordPolicy.requireSpecialChars, onChange: (e) => handlePasswordPolicyChange('requireSpecialChars', e.target.checked) }), label: "\u7279\u6B8A\u6587\u5B57\u3092\u542B\u3080" })] })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u6709\u52B9\u671F\u9650\u30FB\u5C65\u6B74" }), _jsxs(CardContent, { children: [_jsx(TextField, { fullWidth: true, label: "\u30D1\u30B9\u30EF\u30FC\u30C9\u6709\u52B9\u671F\u9650\uFF08\u65E5\uFF09", type: "number", value: localSettings.passwordPolicy.maxAge, onChange: (e) => handlePasswordPolicyChange('maxAge', parseInt(e.target.value)), helperText: "0\u3067\u7121\u671F\u9650", sx: { mb: 2 } }), _jsx(TextField, { fullWidth: true, label: "\u30D1\u30B9\u30EF\u30FC\u30C9\u5C65\u6B74\u4FDD\u6301\u6570", type: "number", value: localSettings.passwordPolicy.historyCount, onChange: (e) => handlePasswordPolicyChange('historyCount', parseInt(e.target.value)), helperText: "\u904E\u53BB\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u5229\u7528\u3092\u9632\u3050", sx: { mb: 2 } })] })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u30A2\u30AB\u30A6\u30F3\u30C8\u30ED\u30C3\u30AF\u30A2\u30A6\u30C8" }), _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, label: "\u30ED\u30C3\u30AF\u30A2\u30A6\u30C8\u8A66\u884C\u56DE\u6570", type: "number", value: localSettings.passwordPolicy.lockoutAttempts, onChange: (e) => handlePasswordPolicyChange('lockoutAttempts', parseInt(e.target.value)), helperText: "\u5931\u6557\u56DE\u6570\u306E\u4E0A\u9650" }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, label: "\u30ED\u30C3\u30AF\u30A2\u30A6\u30C8\u671F\u9593\uFF08\u5206\uFF09", type: "number", value: localSettings.passwordPolicy.lockoutDuration, onChange: (e) => handlePasswordPolicyChange('lockoutDuration', parseInt(e.target.value)), helperText: "\u81EA\u52D5\u89E3\u9664\u307E\u3067\u306E\u6642\u9593" }) })] }) })] }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(AccessTimeIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\u30BB\u30C3\u30B7\u30E7\u30F3\u7BA1\u7406" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsx(TextField, { fullWidth: true, label: "\u6700\u5927\u30BB\u30C3\u30B7\u30E7\u30F3\u6642\u9593\uFF08\u6642\u9593\uFF09", type: "number", value: localSettings.session.maxSessionTime, onChange: (e) => handleSessionChange('maxSessionTime', parseInt(e.target.value)), helperText: "\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u6700\u5927\u7D99\u7D9A\u6642\u9593", sx: { mb: 2 } }), _jsx(TextField, { fullWidth: true, label: "\u975E\u30A2\u30AF\u30C6\u30A3\u30D6\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\uFF08\u5206\uFF09", type: "number", value: localSettings.session.inactivityTimeout, onChange: (e) => handleSessionChange('inactivityTimeout', parseInt(e.target.value)), helperText: "\u64CD\u4F5C\u304C\u306A\u3044\u5834\u5408\u306E\u81EA\u52D5\u30ED\u30B0\u30A2\u30A6\u30C8\u6642\u9593" })] }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormGroup, { children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.session.multipleSessionsAllowed, onChange: (e) => handleSessionChange('multipleSessionsAllowed', e.target.checked) }), label: "\u8907\u6570\u30BB\u30C3\u30B7\u30E7\u30F3\u8A31\u53EF" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.session.requireReauthentication, onChange: (e) => handleSessionChange('requireReauthentication', e.target.checked) }), label: "\u91CD\u8981\u64CD\u4F5C\u6642\u306E\u518D\u8A8D\u8A3C\u8981\u6C42" })] }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(ShieldIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "2\u8981\u7D20\u8A8D\u8A3C" }), _jsx(Chip, { label: localSettings.twoFactorAuth.enabled ? '有効' : '無効', color: localSettings.twoFactorAuth.enabled ? 'success' : 'error', size: "small", sx: { ml: 2 } })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.twoFactorAuth.enabled, onChange: (e) => handleTwoFactorChange('enabled', e.target.checked) }), label: "2\u8981\u7D20\u8A8D\u8A3C\u3092\u6709\u52B9\u5316" }) }), localSettings.twoFactorAuth.enabled && (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.twoFactorAuth.required, onChange: (e) => handleTwoFactorChange('required', e.target.checked) }), label: "\u3059\u3079\u3066\u306E\u30E6\u30FC\u30B6\u30FC\u306B2\u8981\u7D20\u8A8D\u8A3C\u3092\u5FC5\u9808\u5316" }) }), _jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u5229\u7528\u53EF\u80FD\u306A\u8A8D\u8A3C\u65B9\u6CD5" }), _jsxs(List, { children: [_jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(VpnKeyIcon, {}) }), _jsx(ListItemText, { primary: "\u8A8D\u8A3C\u30A2\u30D7\u30EA\uFF08TOTP\uFF09", secondary: "Google Authenticator\u3001Authy\u7B49" })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(VpnKeyIcon, {}) }), _jsx(ListItemText, { primary: "SMS\u8A8D\u8A3C", secondary: "\u643A\u5E2F\u96FB\u8A71\u3078\u306E\u8A8D\u8A3C\u30B3\u30FC\u30C9\u9001\u4FE1" })] }), _jsxs(ListItem, { children: [_jsx(ListItemIcon, { children: _jsx(VpnKeyIcon, {}) }), _jsx(ListItemText, { primary: "\u30E1\u30FC\u30EB\u8A8D\u8A3C", secondary: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3078\u306E\u8A8D\u8A3C\u30B3\u30FC\u30C9\u9001\u4FE1" })] })] })] })] }))] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(BlockIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "IP\u30A2\u30AF\u30BB\u30B9\u5236\u9650" }), _jsx(Chip, { label: localSettings.ipAccess.enabled ? '有効' : '無効', color: localSettings.ipAccess.enabled ? 'success' : 'error', size: "small", sx: { ml: 2 } })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.ipAccess.enabled, onChange: (e) => handleIpAccessChange('enabled', e.target.checked) }), label: "IP\u30A2\u30AF\u30BB\u30B9\u5236\u9650\u3092\u6709\u52B9\u5316" }) }), localSettings.ipAccess.enabled && (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u8A31\u53EF\u30EA\u30B9\u30C8\uFF08\u30DB\u30EF\u30A4\u30C8\u30EA\u30B9\u30C8\uFF09", action: _jsx(Button, { size: "small", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                                                            setIpListType('whitelist');
                                                                            setIpDialogOpen(true);
                                                                        }, children: "\u8FFD\u52A0" }) }), _jsx(CardContent, { children: localSettings.ipAccess.whitelist.length === 0 ? (_jsx(Typography, { color: "text.secondary", children: "\u8A31\u53EF\u3055\u308C\u305FIP\u30A2\u30C9\u30EC\u30B9\u306F\u3042\u308A\u307E\u305B\u3093" })) : (_jsx(List, { children: localSettings.ipAccess.whitelist.map((ip, index) => (_jsx(ListItem, { secondaryAction: _jsx(IconButton, { edge: "end", onClick: () => removeIpAddress(ip, 'whitelist'), children: _jsx(DeleteIcon, {}) }), children: _jsx(ListItemText, { primary: ip }) }, index))) })) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u62D2\u5426\u30EA\u30B9\u30C8\uFF08\u30D6\u30E9\u30C3\u30AF\u30EA\u30B9\u30C8\uFF09", action: _jsx(Button, { size: "small", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                                                            setIpListType('blacklist');
                                                                            setIpDialogOpen(true);
                                                                        }, children: "\u8FFD\u52A0" }) }), _jsx(CardContent, { children: localSettings.ipAccess.blacklist.length === 0 ? (_jsx(Typography, { color: "text.secondary", children: "\u62D2\u5426\u3055\u308C\u305FIP\u30A2\u30C9\u30EC\u30B9\u306F\u3042\u308A\u307E\u305B\u3093" })) : (_jsx(List, { children: localSettings.ipAccess.blacklist.map((ip, index) => (_jsx(ListItem, { secondaryAction: _jsx(IconButton, { edge: "end", onClick: () => removeIpAddress(ip, 'blacklist'), children: _jsx(DeleteIcon, {}) }), children: _jsx(ListItemText, { primary: ip }) }, index))) })) })] }) })] }))] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Alert, { severity: "warning", icon: _jsx(WarningIcon, {}), children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u8A2D\u5B9A\u306E\u6CE8\u610F\u4E8B\u9805" }), _jsxs(Typography, { variant: "body2", children: ["\u2022 \u30D1\u30B9\u30EF\u30FC\u30C9\u30DD\u30EA\u30B7\u30FC\u306E\u5909\u66F4\u306F\u65E2\u5B58\u30E6\u30FC\u30B6\u30FC\u306E\u6B21\u56DE\u30ED\u30B0\u30A4\u30F3\u6642\u304B\u3089\u9069\u7528\u3055\u308C\u307E\u3059", _jsx("br", {}), "\u2022 IP\u30A2\u30AF\u30BB\u30B9\u5236\u9650\u3092\u6709\u52B9\u306B\u3059\u308B\u524D\u306B\u3001\u7BA1\u7406\u8005\u306EIP\u30A2\u30C9\u30EC\u30B9\u3092\u8A31\u53EF\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044", _jsx("br", {}), "\u2022 2\u8981\u7D20\u8A8D\u8A3C\u3092\u5FC5\u9808\u5316\u3059\u308B\u3068\u3001\u3059\u3079\u3066\u306E\u30E6\u30FC\u30B6\u30FC\u304C\u8A2D\u5B9A\u3092\u5B8C\u4E86\u3059\u308B\u307E\u3067\u30ED\u30B0\u30A4\u30F3\u3067\u304D\u306A\u304F\u306A\u308A\u307E\u3059"] })] }) })] }), _jsxs(Dialog, { open: ipDialogOpen, onClose: () => setIpDialogOpen(false), children: [_jsxs(DialogTitle, { children: ["IP\u30A2\u30C9\u30EC\u30B9\u3092", ipListType === 'whitelist' ? '許可リスト' : '拒否リスト', "\u306B\u8FFD\u52A0"] }), _jsx(DialogContent, { children: _jsx(TextField, { autoFocus: true, fullWidth: true, label: "IP\u30A2\u30C9\u30EC\u30B9", value: newIpAddress, onChange: (e) => setNewIpAddress(e.target.value), placeholder: "192.168.1.100 \u307E\u305F\u306F 192.168.1.0/24", helperText: "\u5358\u4E00IP\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306FCIDR\u8A18\u6CD5\u3067\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u7BC4\u56F2\u3092\u6307\u5B9A", sx: { mt: 1 } }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setIpDialogOpen(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: addIpAddress, variant: "contained", children: "\u8FFD\u52A0" })] })] })] }));
};
export default SecuritySettings;
