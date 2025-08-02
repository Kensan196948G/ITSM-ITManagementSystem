import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 通知設定ページ
 * メール設定、SMS設定、Webhook設定、通知テンプレート
 */
import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Switch, FormControlLabel, Card, CardContent, CardHeader, Button, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, FormControl, InputLabel, Select, MenuItem, Alert, Tabs, Tab, } from '@mui/material';
import { Email as EmailIcon, Sms as SmsIcon, Link as WebhookIcon, Description as DescriptionIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Send as SendIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, } from '@mui/icons-material';
const TabPanel = ({ children, value, index }) => {
    return (_jsx("div", { role: "tabpanel", hidden: value !== index, children: value === index && _jsx(Box, { sx: { p: 3 }, children: children }) }));
};
const NotificationSettings = ({ settings }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState(0);
    const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const handleEmailChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            email: {
                ...prev.email,
                [field]: value,
            },
        }));
    };
    const handleSmsChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            sms: {
                ...prev.sms,
                [field]: value,
            },
        }));
    };
    const handleWebhookAdd = (webhook) => {
        const newWebhook = {
            ...webhook,
            id: Date.now().toString(),
        };
        setLocalSettings(prev => ({
            ...prev,
            webhook: {
                ...prev.webhook,
                endpoints: [...prev.webhook.endpoints, newWebhook],
            },
        }));
    };
    const handleWebhookEdit = (id, webhook) => {
        setLocalSettings(prev => ({
            ...prev,
            webhook: {
                ...prev.webhook,
                endpoints: prev.webhook.endpoints.map(ep => ep.id === id ? { ...webhook, id } : ep),
            },
        }));
    };
    const handleWebhookDelete = (id) => {
        setLocalSettings(prev => ({
            ...prev,
            webhook: {
                ...prev.webhook,
                endpoints: prev.webhook.endpoints.filter(ep => ep.id !== id),
            },
        }));
    };
    const handleTemplateAdd = (template) => {
        const newTemplate = {
            ...template,
            id: Date.now().toString(),
        };
        setLocalSettings(prev => ({
            ...prev,
            templates: [...prev.templates, newTemplate],
        }));
    };
    const handleTemplateEdit = (id, template) => {
        setLocalSettings(prev => ({
            ...prev,
            templates: prev.templates.map(t => t.id === id ? { ...template, id } : t),
        }));
    };
    const handleTemplateDelete = (id) => {
        setLocalSettings(prev => ({
            ...prev,
            templates: prev.templates.filter(t => t.id !== id),
        }));
    };
    const testEmailConnection = async () => {
        // テストメール送信のロジック
        console.log('Testing email connection...');
    };
    const availableEvents = [
        'incident.created',
        'incident.updated',
        'incident.resolved',
        'problem.created',
        'problem.resolved',
        'change.approved',
        'change.implemented',
        'sla.breach',
        'system.maintenance',
    ];
    const smsProviders = [
        { value: 'twilio', label: 'Twilio' },
        { value: 'aws-sns', label: 'AWS SNS' },
        { value: 'nexmo', label: 'Vonage (Nexmo)' },
        { value: 'other', label: 'その他' },
    ];
    return (_jsxs(Box, { sx: { maxWidth: 1200, mx: 'auto' }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u901A\u77E5\u8A2D\u5B9A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "\u30E1\u30FC\u30EB\u3001SMS\u3001Webhook\u901A\u77E5\u3068\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u3092\u7BA1\u7406\u3057\u307E\u3059" }), _jsx(Paper, { sx: { mb: 3 }, children: _jsxs(Tabs, { value: activeTab, onChange: (_, newValue) => setActiveTab(newValue), children: [_jsx(Tab, { icon: _jsx(EmailIcon, {}), label: "\u30E1\u30FC\u30EB\u8A2D\u5B9A", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(SmsIcon, {}), label: "SMS\u8A2D\u5B9A", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(WebhookIcon, {}), label: "Webhook\u8A2D\u5B9A", iconPosition: "start" }), _jsx(Tab, { icon: _jsx(DescriptionIcon, {}), label: "\u901A\u77E5\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8", iconPosition: "start" })] }) }), _jsx(TabPanel, { value: activeTab, index: 0, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "SMTP\u8A2D\u5B9A", action: _jsx(Button, { variant: "outlined", startIcon: _jsx(SendIcon, {}), onClick: () => setTestEmailDialogOpen(true), children: "\u30C6\u30B9\u30C8\u9001\u4FE1" }) }), _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "SMTP\u30DB\u30B9\u30C8", value: localSettings.email.smtpHost, onChange: (e) => handleEmailChange('smtpHost', e.target.value), required: true }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "SMTP\u30DD\u30FC\u30C8", type: "number", value: localSettings.email.smtpPort, onChange: (e) => handleEmailChange('smtpPort', parseInt(e.target.value)), required: true }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "\u30E6\u30FC\u30B6\u30FC\u540D", value: localSettings.email.smtpUsername, onChange: (e) => handleEmailChange('smtpUsername', e.target.value) }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "\u30D1\u30B9\u30EF\u30FC\u30C9", type: showSmtpPassword ? 'text' : 'password', value: localSettings.email.smtpPassword, onChange: (e) => handleEmailChange('smtpPassword', e.target.value), InputProps: {
                                                            endAdornment: (_jsx(IconButton, { onClick: () => setShowSmtpPassword(!showSmtpPassword), children: showSmtpPassword ? _jsx(VisibilityOffIcon, {}) : _jsx(VisibilityIcon, {}) })),
                                                        } }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.email.useSSL, onChange: (e) => handleEmailChange('useSSL', e.target.checked) }), label: "SSL\u4F7F\u7528" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.email.useTLS, onChange: (e) => handleEmailChange('useTLS', e.target.checked) }), label: "TLS\u4F7F\u7528" }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u9001\u4FE1\u8005\u8A2D\u5B9A" }), _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, label: "\u9001\u4FE1\u8005\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", type: "email", value: localSettings.email.fromAddress, onChange: (e) => handleEmailChange('fromAddress', e.target.value), required: true }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, label: "\u9001\u4FE1\u8005\u540D", value: localSettings.email.fromName, onChange: (e) => handleEmailChange('fromName', e.target.value) }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, label: "\u8FD4\u4FE1\u5148\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", type: "email", value: localSettings.email.replyToAddress, onChange: (e) => handleEmailChange('replyToAddress', e.target.value) }) })] }) })] }) })] }) }), _jsx(TabPanel, { value: activeTab, index: 1, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "SMS\u8A2D\u5B9A" }), _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, md: 4, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC" }), _jsx(Select, { value: localSettings.sms.provider, onChange: (e) => handleSmsChange('provider', e.target.value), label: "\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC", children: smsProviders.map((provider) => (_jsx(MenuItem, { value: provider.value, children: provider.label }, provider.value))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, label: "API\u30AD\u30FC", type: "password", value: localSettings.sms.apiKey, onChange: (e) => handleSmsChange('apiKey', e.target.value) }) }), _jsx(Grid, { item: true, xs: 12, md: 4, children: _jsx(TextField, { fullWidth: true, label: "\u9001\u4FE1\u8005\u756A\u53F7", value: localSettings.sms.fromNumber, onChange: (e) => handleSmsChange('fromNumber', e.target.value), helperText: "\u56FD\u969B\u5F62\u5F0F (\u4F8B: +81901234567)" }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Alert, { severity: "info", children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "SMS\u8A2D\u5B9A\u306B\u3064\u3044\u3066" }), _jsxs(Typography, { variant: "body2", children: ["\u2022 SMS\u9001\u4FE1\u306B\u306F\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u3068\u306E\u5951\u7D04\u304C\u5FC5\u8981\u3067\u3059", _jsx("br", {}), "\u2022 \u9001\u4FE1\u30B3\u30B9\u30C8\u304C\u304B\u304B\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u306E\u3067\u3001\u9069\u5207\u306A\u5236\u9650\u3092\u8A2D\u3051\u3066\u304F\u3060\u3055\u3044", _jsx("br", {}), "\u2022 \u7DCA\u6025\u5EA6\u306E\u9AD8\u3044\u901A\u77E5\u306E\u307FSMS\u3092\u4F7F\u7528\u3059\u308B\u3053\u3068\u3092\u304A\u52E7\u3081\u3057\u307E\u3059"] })] }) })] }) }), _jsx(TabPanel, { value: activeTab, index: 2, children: _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "Webhook \u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8", action: _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                            setEditingWebhook(null);
                                            setWebhookDialogOpen(true);
                                        }, children: "\u65B0\u898F\u8FFD\u52A0" }) }), _jsxs(CardContent, { children: [_jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u540D\u524D" }), _jsx(TableCell, { children: "URL" }), _jsx(TableCell, { children: "\u30A4\u30D9\u30F3\u30C8" }), _jsx(TableCell, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx(TableCell, { children: "\u64CD\u4F5C" })] }) }), _jsx(TableBody, { children: localSettings.webhook.endpoints.map((endpoint) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: endpoint.name }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", sx: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }, children: endpoint.url }) }), _jsx(TableCell, { children: _jsxs(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: [endpoint.events.slice(0, 2).map((event) => (_jsx(Chip, { label: event, size: "small" }, event))), endpoint.events.length > 2 && (_jsx(Chip, { label: `+${endpoint.events.length - 2}`, size: "small" }))] }) }), _jsx(TableCell, { children: _jsx(Chip, { label: endpoint.active ? 'アクティブ' : '非アクティブ', color: endpoint.active ? 'success' : 'default', size: "small" }) }), _jsxs(TableCell, { children: [_jsx(IconButton, { size: "small", onClick: () => {
                                                                                setEditingWebhook(endpoint);
                                                                                setWebhookDialogOpen(true);
                                                                            }, children: _jsx(EditIcon, {}) }), _jsx(IconButton, { size: "small", onClick: () => handleWebhookDelete(endpoint.id), children: _jsx(DeleteIcon, {}) })] })] }, endpoint.id))) })] }) }), localSettings.webhook.endpoints.length === 0 && (_jsx(Typography, { color: "text.secondary", sx: { textAlign: 'center', py: 4 }, children: "Webhook\u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093" }))] })] }) }) }) }), _jsx(TabPanel, { value: activeTab, index: 3, children: _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u901A\u77E5\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8", action: _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => {
                                            setEditingTemplate(null);
                                            setTemplateDialogOpen(true);
                                        }, children: "\u65B0\u898F\u4F5C\u6210" }) }), _jsxs(CardContent, { children: [_jsx(TableContainer, { children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u540D\u524D" }), _jsx(TableCell, { children: "\u30BF\u30A4\u30D7" }), _jsx(TableCell, { children: "\u4EF6\u540D" }), _jsx(TableCell, { children: "\u66F4\u65B0\u65E5" }), _jsx(TableCell, { children: "\u64CD\u4F5C" })] }) }), _jsx(TableBody, { children: localSettings.templates.map((template) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: template.name }), _jsx(TableCell, { children: _jsx(Chip, { label: template.type, variant: "outlined", size: "small" }) }), _jsx(TableCell, { children: template.subject }), _jsx(TableCell, { children: "-" }), _jsxs(TableCell, { children: [_jsx(IconButton, { size: "small", onClick: () => {
                                                                                setEditingTemplate(template);
                                                                                setTemplateDialogOpen(true);
                                                                            }, children: _jsx(EditIcon, {}) }), _jsx(IconButton, { size: "small", onClick: () => handleTemplateDelete(template.id), children: _jsx(DeleteIcon, {}) })] })] }, template.id))) })] }) }), localSettings.templates.length === 0 && (_jsx(Typography, { color: "text.secondary", sx: { textAlign: 'center', py: 4 }, children: "\u901A\u77E5\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u304C\u4F5C\u6210\u3055\u308C\u3066\u3044\u307E\u305B\u3093" }))] })] }) }) }) }), _jsxs(Dialog, { open: testEmailDialogOpen, onClose: () => setTestEmailDialogOpen(false), children: [_jsx(DialogTitle, { children: "\u30C6\u30B9\u30C8\u30E1\u30FC\u30EB\u9001\u4FE1" }), _jsx(DialogContent, { children: _jsx(TextField, { autoFocus: true, fullWidth: true, label: "\u9001\u4FE1\u5148\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", type: "email", sx: { mt: 1 } }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setTestEmailDialogOpen(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: testEmailConnection, variant: "contained", children: "\u9001\u4FE1" })] })] })] }));
};
export default NotificationSettings;
