import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * システム設定メインページ
 * 各設定カテゴリへのナビゲーションと共通機能を提供
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Paper, Typography, Tabs, Tab, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Breadcrumbs, Link, Chip, IconButton, Tooltip, } from '@mui/material';
import { Settings as SettingsIcon, Security as SecurityIcon, Notifications as NotificationsIcon, Timer as TimerIcon, Timeline as WorkFlowIcon, Storage as StorageIcon, Link as IntegrationIcon, MonitorHeart as MonitorIcon, Save as SaveIcon, Refresh as RefreshIcon, History as HistoryIcon, FileDownload as ExportIcon, FileUpload as ImportIcon, Warning as WarningIcon, } from '@mui/icons-material';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import GeneralSettings from './GeneralSettings';
import SecuritySettings from './SecuritySettings';
import NotificationSettings from './NotificationSettings';
import SLASettings from './SLASettings';
import WorkflowSettings from './WorkflowSettings';
import DataSettings from './DataSettings';
import IntegrationSettings from './IntegrationSettings';
import MonitoringSettings from './MonitoringSettings';
import SettingsHistory from './SettingsHistory';
const settingCategories = [
    {
        id: 'general',
        label: '一般設定',
        icon: SettingsIcon,
        description: 'システム基本情報、タイムゾーン、言語・地域設定',
    },
    {
        id: 'security',
        label: 'セキュリティ設定',
        icon: SecurityIcon,
        description: 'パスワードポリシー、セッション管理、2要素認証',
    },
    {
        id: 'notifications',
        label: '通知設定',
        icon: NotificationsIcon,
        description: 'メール、SMS、Webhook、通知テンプレート',
    },
    {
        id: 'sla',
        label: 'SLA設定',
        icon: TimerIcon,
        description: '優先度別SLA、営業時間、エスカレーション設定',
    },
    {
        id: 'workflows',
        label: 'ワークフロー設定',
        icon: WorkFlowIcon,
        description: 'インシデント、問題管理、変更管理ワークフロー',
    },
    {
        id: 'data',
        label: 'データ管理',
        icon: StorageIcon,
        description: 'データベース設定、バックアップ、データ保持ポリシー',
    },
    {
        id: 'integrations',
        label: '統合設定',
        icon: IntegrationIcon,
        description: 'API設定、LDAP/AD連携、外部システム連携',
    },
    {
        id: 'monitoring',
        label: 'システム監視',
        icon: MonitorIcon,
        description: 'ログ設定、パフォーマンス監視、アラート設定',
    },
];
const SystemSettings = () => {
    const { category = 'general' } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { settings, loading, error, isDirty, loadSettings, saveSettings, resetSettings, exportSettings, importSettings, } = useSystemSettings();
    const [activeTab, setActiveTab] = useState(category);
    const [showHistory, setShowHistory] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingTab, setPendingTab] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });
    useEffect(() => {
        setActiveTab(category);
    }, [category]);
    const handleTabChange = (event, newValue) => {
        if (isDirty) {
            setPendingTab(newValue);
            setShowUnsavedDialog(true);
            return;
        }
        setActiveTab(newValue);
        navigate(`/settings/${newValue}`);
    };
    const handleSave = async () => {
        try {
            const currentCategory = settingCategories.find(cat => cat.id === activeTab);
            if (!currentCategory || !settings)
                return;
            await saveSettings(activeTab, settings[activeTab]);
            setSnackbar({
                open: true,
                message: `${currentCategory.label}の設定を保存しました`,
                severity: 'success'
            });
        }
        catch (err) {
            setSnackbar({
                open: true,
                message: '設定の保存に失敗しました',
                severity: 'error'
            });
        }
    };
    const handleReset = async () => {
        try {
            const currentCategory = settingCategories.find(cat => cat.id === activeTab);
            if (!currentCategory)
                return;
            await resetSettings(activeTab);
            setSnackbar({
                open: true,
                message: `${currentCategory.label}をデフォルト値にリセットしました`,
                severity: 'info'
            });
        }
        catch (err) {
            setSnackbar({
                open: true,
                message: '設定のリセットに失敗しました',
                severity: 'error'
            });
        }
    };
    const handleExport = async () => {
        try {
            await exportSettings();
            setSnackbar({
                open: true,
                message: '設定をエクスポートしました',
                severity: 'success'
            });
        }
        catch (err) {
            setSnackbar({
                open: true,
                message: '設定のエクスポートに失敗しました',
                severity: 'error'
            });
        }
    };
    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        try {
            await importSettings(file);
            setSnackbar({
                open: true,
                message: '設定をインポートしました',
                severity: 'success'
            });
        }
        catch (err) {
            setSnackbar({
                open: true,
                message: '設定のインポートに失敗しました',
                severity: 'error'
            });
        }
    };
    const handleUnsavedDialogConfirm = () => {
        setShowUnsavedDialog(false);
        if (pendingTab) {
            setActiveTab(pendingTab);
            navigate(`/settings/${pendingTab}`);
            setPendingTab(null);
        }
    };
    const handleUnsavedDialogCancel = () => {
        setShowUnsavedDialog(false);
        setPendingTab(null);
    };
    const renderSettingContent = () => {
        if (!settings)
            return null;
        switch (activeTab) {
            case 'general':
                return _jsx(GeneralSettings, { settings: settings.general });
            case 'security':
                return _jsx(SecuritySettings, { settings: settings.security });
            case 'notifications':
                return _jsx(NotificationSettings, { settings: settings.notifications });
            case 'sla':
                return _jsx(SLASettings, { settings: settings.sla });
            case 'workflows':
                return _jsx(WorkflowSettings, { settings: settings.workflows });
            case 'data':
                return _jsx(DataSettings, { settings: settings.data });
            case 'integrations':
                return _jsx(IntegrationSettings, { settings: settings.integrations });
            case 'monitoring':
                return _jsx(MonitoringSettings, { settings: settings.monitoring });
            default:
                return _jsx(Typography, { children: "\u8A2D\u5B9A\u30DA\u30FC\u30B8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
        }
    };
    const currentCategory = settingCategories.find(cat => cat.id === activeTab);
    return (_jsxs(Box, { sx: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs(Box, { sx: { p: 3, borderBottom: 1, borderColor: 'divider' }, children: [_jsxs(Breadcrumbs, { "aria-label": "breadcrumb", sx: { mb: 2 }, children: [_jsx(Link, { underline: "hover", color: "inherit", onClick: () => navigate('/dashboard'), sx: { cursor: 'pointer' }, children: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9" }), _jsx(Typography, { color: "text.primary", children: "\u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A" }), currentCategory && (_jsx(Typography, { color: "text.primary", children: currentCategory.label }))] }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "\u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A" }), currentCategory && (_jsx(Typography, { variant: "body1", color: "text.secondary", children: currentCategory.description }))] }), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' }, children: [isDirty && (_jsx(Chip, { icon: _jsx(WarningIcon, {}), label: "\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059", color: "warning", size: "small" })), _jsx(Tooltip, { title: "\u5C65\u6B74\u3092\u8868\u793A", children: _jsx(IconButton, { onClick: () => setShowHistory(true), children: _jsx(HistoryIcon, {}) }) }), _jsx(Tooltip, { title: "\u8A2D\u5B9A\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8", children: _jsx(IconButton, { onClick: handleExport, children: _jsx(ExportIcon, {}) }) }), _jsx(Tooltip, { title: "\u8A2D\u5B9A\u3092\u30A4\u30F3\u30DD\u30FC\u30C8", children: _jsxs(IconButton, { component: "label", children: [_jsx(ImportIcon, {}), _jsx("input", { type: "file", hidden: true, accept: ".json", onChange: handleImport })] }) }), _jsx(Tooltip, { title: "\u8A2D\u5B9A\u3092\u518D\u8AAD\u307F\u8FBC\u307F", children: _jsx(IconButton, { onClick: loadSettings, disabled: loading, children: _jsx(RefreshIcon, {}) }) }), _jsx(Button, { variant: "outlined", onClick: handleReset, disabled: loading, sx: { ml: 1 }, children: "\u30EA\u30BB\u30C3\u30C8" }), _jsx(Button, { variant: "contained", startIcon: loading ? _jsx(CircularProgress, { size: 16 }) : _jsx(SaveIcon, {}), onClick: handleSave, disabled: loading || !isDirty, children: "\u4FDD\u5B58" })] })] })] }), error && (_jsx(Alert, { severity: "error", sx: { m: 2 }, children: error })), _jsxs(Box, { sx: { flex: 1, display: 'flex', overflow: 'hidden' }, children: [_jsx(Paper, { elevation: 0, sx: {
                            width: 280,
                            borderRight: 1,
                            borderColor: 'divider',
                            overflow: 'auto',
                        }, children: _jsx(Tabs, { orientation: "vertical", value: activeTab, onChange: handleTabChange, sx: {
                                '& .MuiTabs-indicator': {
                                    left: 0,
                                    right: 'auto',
                                },
                            }, children: settingCategories.map((category) => {
                                const IconComponent = category.icon;
                                return (_jsx(Tab, { value: category.id, label: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', width: '100%' }, children: [_jsx(IconComponent, { sx: { mr: 2, fontSize: 20 } }), _jsxs(Box, { sx: { textAlign: 'left', flex: 1 }, children: [_jsx(Typography, { variant: "subtitle2", children: category.label }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: category.description })] })] }), sx: {
                                        minHeight: 72,
                                        alignItems: 'flex-start',
                                        justifyContent: 'flex-start',
                                        textAlign: 'left',
                                        px: 2,
                                        py: 1.5,
                                    } }, category.id));
                            }) }) }), _jsx(Box, { sx: { flex: 1, overflow: 'auto', p: 3 }, children: loading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 4 }, children: _jsx(CircularProgress, {}) })) : (renderSettingContent()) })] }), _jsxs(Dialog, { open: showUnsavedDialog, onClose: handleUnsavedDialogCancel, children: [_jsx(DialogTitle, { children: "\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059" }), _jsx(DialogContent, { children: _jsx(Typography, { children: "\u73FE\u5728\u306E\u8A2D\u5B9A\u306B\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002 \u5909\u66F4\u3092\u7834\u68C4\u3057\u3066\u4ED6\u306E\u30DA\u30FC\u30B8\u306B\u79FB\u52D5\u3057\u307E\u3059\u304B\uFF1F" }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleUnsavedDialogCancel, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: handleUnsavedDialogConfirm, color: "warning", children: "\u5909\u66F4\u3092\u7834\u68C4" })] })] }), _jsxs(Dialog, { open: showHistory, onClose: () => setShowHistory(false), maxWidth: "lg", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u8A2D\u5B9A\u5909\u66F4\u5C65\u6B74" }), _jsx(DialogContent, { children: _jsx(SettingsHistory, { category: activeTab }) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setShowHistory(false), children: "\u9589\u3058\u308B" }) })] }), _jsx(Snackbar, { open: snackbar.open, autoHideDuration: 6000, onClose: () => setSnackbar(prev => ({ ...prev, open: false })), children: _jsx(Alert, { onClose: () => setSnackbar(prev => ({ ...prev, open: false })), severity: snackbar.severity, sx: { width: '100%' }, children: snackbar.message }) })] }));
};
export default SystemSettings;
