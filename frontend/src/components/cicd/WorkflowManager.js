import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Grid, Typography, Card, CardContent, CardActions, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, useTheme, useMediaQuery, Stack, Collapse, List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction, Avatar, alpha, Tooltip, } from '@mui/material';
import { PlayArrow as PlayIcon, Stop as StopIcon, Refresh as RefreshIcon, Edit as EditIcon, Add as AddIcon, Schedule as ScheduleIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, CheckCircle as SuccessIcon, Error as ErrorIcon, Pause as PauseIcon, Build as BuildIcon, CloudQueue as CloudIcon, Code as CodeIcon, AutoFixHigh as AutoFixIcon, Visibility as ViewIcon, History as HistoryIcon, MonitorHeart as MonitorIcon, } from '@mui/icons-material';
import ContentArea from '../layout/ContentArea';
const WorkflowManager = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [workflows, setWorkflows] = useState([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    // モックデータ
    useEffect(() => {
        const mockWorkflows = [
            {
                id: 'auto-repair-workflow',
                name: 'CI/CD自動修復ワークフロー',
                description: '無限ループ検知と自動修復を実行するメインワークフロー',
                status: 'running',
                enabled: true,
                lastRun: '2025-08-02T15:49:54',
                nextRun: '2025-08-02T16:19:54',
                runCount: 146,
                successCount: 142,
                failureCount: 4,
                averageDuration: 90,
                trigger: 'auto-repair',
                schedule: '*/30 * * * *',
                branch: 'main',
                repository: 'ITSM-ITmanagementSystem',
                autoRetry: true,
                maxRetries: 3,
                timeoutMinutes: 30,
                steps: [
                    {
                        id: 'detect-errors',
                        name: 'エラー検知',
                        type: 'repair',
                        status: 'success',
                        duration: 15,
                        startTime: '2025-08-02T15:49:54',
                        endTime: '2025-08-02T15:50:09',
                        command: 'python error_monitor.py --scan',
                    },
                    {
                        id: 'run-tests',
                        name: 'テスト実行',
                        type: 'test',
                        status: 'success',
                        duration: 45,
                        startTime: '2025-08-02T15:50:09',
                        endTime: '2025-08-02T15:50:54',
                        command: 'pytest tests/',
                    },
                    {
                        id: 'apply-fixes',
                        name: '修復適用',
                        type: 'repair',
                        status: 'running',
                        startTime: '2025-08-02T15:50:54',
                        command: 'python auto_repair.py --fix',
                    },
                    {
                        id: 'verify-fixes',
                        name: '修復確認',
                        type: 'test',
                        status: 'pending',
                        command: 'pytest tests/ --verify',
                    },
                ],
            },
            {
                id: 'backend-ci',
                name: 'バックエンドCI/CDパイプライン',
                description: 'バックエンドコードのビルド、テスト、デプロイ',
                status: 'success',
                enabled: true,
                lastRun: '2025-08-02T15:30:00',
                runCount: 89,
                successCount: 86,
                failureCount: 3,
                averageDuration: 180,
                trigger: 'webhook',
                branch: 'main',
                repository: 'ITSM-ITmanagementSystem',
                autoRetry: true,
                maxRetries: 2,
                timeoutMinutes: 15,
                steps: [
                    {
                        id: 'checkout',
                        name: 'コードチェックアウト',
                        type: 'build',
                        status: 'success',
                        duration: 10,
                    },
                    {
                        id: 'install-deps',
                        name: '依存関係インストール',
                        type: 'build',
                        status: 'success',
                        duration: 45,
                    },
                    {
                        id: 'run-tests',
                        name: 'テスト実行',
                        type: 'test',
                        status: 'success',
                        duration: 120,
                    },
                    {
                        id: 'build-app',
                        name: 'アプリビルド',
                        type: 'build',
                        status: 'success',
                        duration: 30,
                    },
                ],
            },
            {
                id: 'frontend-ci',
                name: 'フロントエンドCI/CDパイプライン',
                description: 'React アプリケーションのビルドとデプロイ',
                status: 'idle',
                enabled: true,
                lastRun: '2025-08-02T15:25:00',
                runCount: 73,
                successCount: 71,
                failureCount: 2,
                averageDuration: 95,
                trigger: 'webhook',
                branch: 'main',
                repository: 'ITSM-ITmanagementSystem',
                autoRetry: false,
                maxRetries: 1,
                timeoutMinutes: 10,
                steps: [
                    {
                        id: 'checkout',
                        name: 'コードチェックアウト',
                        type: 'build',
                        status: 'success',
                        duration: 8,
                    },
                    {
                        id: 'install-deps',
                        name: 'npm install',
                        type: 'build',
                        status: 'success',
                        duration: 35,
                    },
                    {
                        id: 'run-tests',
                        name: 'ユニットテスト',
                        type: 'test',
                        status: 'success',
                        duration: 25,
                    },
                    {
                        id: 'build-app',
                        name: 'プロダクションビルド',
                        type: 'build',
                        status: 'success',
                        duration: 27,
                    },
                ],
            },
        ];
        setWorkflows(mockWorkflows);
    }, []);
    const getStatusColor = (status) => {
        switch (status) {
            case 'running': return theme.palette.info.main;
            case 'success': return theme.palette.success.main;
            case 'failed': return theme.palette.error.main;
            case 'paused': return theme.palette.warning.main;
            case 'pending': return theme.palette.grey[500];
            default: return theme.palette.grey[500];
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'running': return _jsx(PlayIcon, {});
            case 'success': return _jsx(SuccessIcon, {});
            case 'failed': return _jsx(ErrorIcon, {});
            case 'paused': return _jsx(PauseIcon, {});
            case 'pending': return _jsx(ScheduleIcon, {});
            default: return _jsx(ScheduleIcon, {});
        }
    };
    const getStepIcon = (type) => {
        switch (type) {
            case 'build': return _jsx(BuildIcon, {});
            case 'test': return _jsx(CodeIcon, {});
            case 'deploy': return _jsx(CloudIcon, {});
            case 'repair': return _jsx(AutoFixIcon, {});
            case 'notify': return _jsx(MonitorIcon, {});
            default: return _jsx(BuildIcon, {});
        }
    };
    const handleWorkflowAction = useCallback((workflowId, action) => {
        setWorkflows(prev => prev.map(w => {
            if (w.id === workflowId) {
                switch (action) {
                    case 'start':
                        return { ...w, status: 'running' };
                    case 'stop':
                    case 'pause':
                        return { ...w, status: 'paused' };
                    case 'retry':
                        return { ...w, status: 'running', runCount: w.runCount + 1 };
                    default:
                        return w;
                }
            }
            return w;
        }));
        console.log(`ワークフロー ${workflowId} で ${action} を実行`);
    }, []);
    const handleToggleEnabled = useCallback((workflowId) => {
        setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, enabled: !w.enabled } : w));
    }, []);
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 実際の実装ではAPIコール
        }
        finally {
            setRefreshing(false);
        }
    }, []);
    const pageActions = (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(RefreshIcon, {}), onClick: handleRefresh, disabled: refreshing, size: isMobile ? 'small' : 'medium', children: "\u66F4\u65B0" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => setCreateDialogOpen(true), size: isMobile ? 'small' : 'medium', children: "\u65B0\u898F\u4F5C\u6210" })] }));
    return (_jsxs(ContentArea, { pageTitle: "\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u7BA1\u7406", pageDescription: "CI/CD\u81EA\u52D5\u4FEE\u5FA9\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u306E\u8A2D\u5B9A\u3068\u7BA1\u7406", actions: pageActions, showBreadcrumbs: true, children: [_jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }, children: _jsx(BuildIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h5", sx: { fontWeight: 700 }, children: workflows.length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u7DCF\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u6570" })] })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }, children: _jsx(PlayIcon, {}) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "h5", sx: { fontWeight: 700 }, children: workflows.filter(w => w.status === 'running').length }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5B9F\u884C\u4E2D" })] })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }, children: _jsx(SuccessIcon, {}) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "h5", sx: { fontWeight: 700 }, children: [Math.round(workflows.reduce((acc, w) => acc + (w.successCount / w.runCount * 100), 0) / workflows.length), "%"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5E73\u5747\u6210\u529F\u7387" })] })] }) }) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Avatar, { sx: { bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }, children: _jsx(ScheduleIcon, {}) }), _jsxs(Box, { children: [_jsxs(Typography, { variant: "h5", sx: { fontWeight: 700 }, children: [Math.round(workflows.reduce((acc, w) => acc + w.averageDuration, 0) / workflows.length), "s"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5E73\u5747\u5B9F\u884C\u6642\u9593" })] })] }) }) }) })] }), _jsx(Grid, { container: true, spacing: 3, children: workflows.map((workflow) => (_jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsxs(Card, { sx: { height: '100%' }, children: [_jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, flex: 1 }, children: [_jsx(Avatar, { sx: {
                                                            bgcolor: alpha(getStatusColor(workflow.status), 0.1),
                                                            color: getStatusColor(workflow.status),
                                                        }, children: getStatusIcon(workflow.status) }), _jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Typography, { variant: "h6", noWrap: true, children: workflow.name }), _jsx(Typography, { variant: "body2", color: "text.secondary", noWrap: true, children: workflow.description })] })] }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(Chip, { label: workflow.status.toUpperCase(), size: "small", sx: {
                                                            bgcolor: alpha(getStatusColor(workflow.status), 0.1),
                                                            color: getStatusColor(workflow.status),
                                                            fontWeight: 600,
                                                        } }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: workflow.enabled, onChange: () => handleToggleEnabled(workflow.id), size: "small" }), label: "", sx: { m: 0 } })] })] }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u5B9F\u884C\u56DE\u6570: ", workflow.runCount] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u6210\u529F\u7387: ", Math.round((workflow.successCount / workflow.runCount) * 100), "%"] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u6700\u7D42\u5B9F\u884C: ", workflow.lastRun ? new Date(workflow.lastRun).toLocaleString('ja-JP') : 'なし'] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u5E73\u5747\u5B9F\u884C\u6642\u9593: ", workflow.averageDuration, "\u79D2"] })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Button, { size: "small", onClick: () => setDetailsOpen(detailsOpen === workflow.id ? null : workflow.id), endIcon: detailsOpen === workflow.id ? _jsx(ExpandLessIcon, {}) : _jsx(ExpandMoreIcon, {}), children: "\u30B9\u30C6\u30C3\u30D7\u8A73\u7D30" }), _jsx(Collapse, { in: detailsOpen === workflow.id, children: _jsx(List, { dense: true, sx: { mt: 1 }, children: workflow.steps.map((step, index) => (_jsxs(ListItem, { sx: { pl: 0 }, children: [_jsx(ListItemIcon, { sx: { minWidth: 36 }, children: _jsx(Avatar, { sx: {
                                                                        width: 24,
                                                                        height: 24,
                                                                        bgcolor: alpha(getStatusColor(step.status), 0.1),
                                                                        color: getStatusColor(step.status),
                                                                    }, children: getStepIcon(step.type) }) }), _jsx(ListItemText, { primary: step.name, secondary: step.command, primaryTypographyProps: { fontSize: '0.875rem' }, secondaryTypographyProps: { fontSize: '0.75rem' } }), _jsx(ListItemSecondaryAction, { children: _jsx(Chip, { label: step.status, size: "small", sx: {
                                                                        bgcolor: alpha(getStatusColor(step.status), 0.1),
                                                                        color: getStatusColor(step.status),
                                                                        fontSize: '0.75rem',
                                                                    } }) })] }, step.id))) }) })] })] }), _jsxs(CardActions, { sx: { justifyContent: 'space-between', px: 2, pb: 2 }, children: [_jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", startIcon: _jsx(PlayIcon, {}), onClick: () => handleWorkflowAction(workflow.id, 'start'), disabled: workflow.status === 'running' || !workflow.enabled, children: "\u5B9F\u884C" }), _jsx(Button, { size: "small", startIcon: _jsx(StopIcon, {}), onClick: () => handleWorkflowAction(workflow.id, 'stop'), disabled: workflow.status !== 'running', children: "\u505C\u6B62" }), _jsx(Button, { size: "small", startIcon: _jsx(RefreshIcon, {}), onClick: () => handleWorkflowAction(workflow.id, 'retry'), disabled: !workflow.enabled, children: "\u518D\u5B9F\u884C" })] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Tooltip, { title: "\u5C65\u6B74\u8868\u793A", children: _jsx(IconButton, { size: "small", children: _jsx(HistoryIcon, {}) }) }), _jsx(Tooltip, { title: "\u30ED\u30B0\u8868\u793A", children: _jsx(IconButton, { size: "small", children: _jsx(ViewIcon, {}) }) }), _jsx(Tooltip, { title: "\u8A2D\u5B9A\u7DE8\u96C6", children: _jsx(IconButton, { size: "small", onClick: () => {
                                                        setSelectedWorkflow(workflow);
                                                        setEditDialogOpen(true);
                                                    }, children: _jsx(EditIcon, {}) }) })] })] })] }) }, workflow.id))) }), _jsxs(Dialog, { open: createDialogOpen, onClose: () => setCreateDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u65B0\u898F\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u4F5C\u6210" }), _jsx(DialogContent, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u65B0\u3057\u3044CI/CD\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002" }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setCreateDialogOpen(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { variant: "contained", children: "\u4F5C\u6210" })] })] }), _jsxs(Dialog, { open: editDialogOpen, onClose: () => setEditDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u7DE8\u96C6" }), _jsx(DialogContent, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u8A2D\u5B9A\u3092\u7DE8\u96C6\u3057\u307E\u3059\u3002" }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setEditDialogOpen(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { variant: "contained", children: "\u4FDD\u5B58" })] })] })] }));
};
export default WorkflowManager;
