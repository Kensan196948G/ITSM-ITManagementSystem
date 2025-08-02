import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Chip, Paper, Grid, LinearProgress, IconButton, Tooltip, Alert, Button, FormControlLabel, Switch, Divider, Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, TimelineOppositeContent, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, CheckCircle as CheckCircleIcon, Build as BuildIcon, Visibility as VisibilityIcon, Refresh as RefreshIcon, Clear as ClearIcon, Download as DownloadIcon, FilterList as FilterListIcon, Timeline as TimelineIcon } from '@mui/icons-material';
const RealtimeErrorReport = () => {
    const [activities, setActivities] = useState([]);
    const [filteredActivities, setFilteredActivities] = useState([]);
    const [filterOptions, setFilterOptions] = useState({
        errorTypes: ['error', 'warning', 'info'],
        severities: ['critical', 'high', 'medium', 'low'],
        timeRange: 60, // 1時間
        showFixed: true,
        showUnfixed: true,
        autoRefresh: true
    });
    const [stats, setStats] = useState({
        totalErrors: 0,
        activeErrors: 0,
        fixedErrors: 0,
        repairRate: 0,
        lastUpdate: new Date()
    });
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const refreshInterval = useRef(null);
    // 初期化とリアルタイム更新
    useEffect(() => {
        generateMockActivities();
        if (filterOptions.autoRefresh) {
            refreshInterval.current = setInterval(() => {
                updateActivities();
            }, 5000); // 5秒間隔で更新
        }
        return () => {
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, [filterOptions.autoRefresh]);
    // フィルタリング
    useEffect(() => {
        applyFilters();
    }, [activities, filterOptions]);
    // モックアクティビティの生成
    const generateMockActivities = () => {
        const mockActivities = [];
        const now = new Date();
        // 過去1時間のアクティビティを生成
        for (let i = 0; i < 20; i++) {
            const timestamp = new Date(now.getTime() - Math.random() * 3600000); // 1時間以内
            const activityTypes = ['error_detected', 'repair_started', 'repair_completed', 'validation_completed', 'system_event'];
            const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
            let activity;
            switch (type) {
                case 'error_detected':
                    activity = {
                        id: `activity-${i}`,
                        type,
                        timestamp,
                        title: 'エラーを検出',
                        description: `JavaScript Error: Cannot read properties of undefined`,
                        severity: Math.random() > 0.7 ? 'critical' : Math.random() > 0.5 ? 'high' : 'medium',
                        relatedError: {
                            id: `error-${i}`,
                            type: 'error',
                            severity: 'high',
                            message: 'Cannot read properties of undefined (reading \'map\')',
                            source: 'http://192.168.3.135:3000/src/components/Dashboard.tsx',
                            timestamp,
                            url: 'http://192.168.3.135:3000',
                            fixed: false,
                            fixAttempts: 0,
                            autoFixable: true,
                            category: 'javascript'
                        }
                    };
                    break;
                case 'repair_started':
                    activity = {
                        id: `activity-${i}`,
                        type,
                        timestamp,
                        title: '修復開始',
                        description: 'undefined プロパティエラーの自動修復を開始',
                        severity: 'info'
                    };
                    break;
                case 'repair_completed':
                    const success = Math.random() > 0.3;
                    activity = {
                        id: `activity-${i}`,
                        type,
                        timestamp,
                        title: success ? '修復完了' : '修復失敗',
                        description: success
                            ? 'Optional chaining とフォールバック値を追加しました'
                            : '修復に失敗しました。手動での確認が必要です。',
                        severity: success ? 'info' : 'medium'
                    };
                    break;
                case 'validation_completed':
                    const validationPassed = Math.random() > 0.2;
                    activity = {
                        id: `activity-${i}`,
                        type,
                        timestamp,
                        title: '検証完了',
                        description: validationPassed
                            ? '全ての検証テストに合格しました'
                            : '一部の検証テストで問題が発見されました',
                        severity: validationPassed ? 'info' : 'medium'
                    };
                    break;
                default:
                    activity = {
                        id: `activity-${i}`,
                        type: 'system_event',
                        timestamp,
                        title: 'システムイベント',
                        description: '無限ループ監視が開始されました',
                        severity: 'info'
                    };
            }
            mockActivities.push(activity);
        }
        // タイムスタンプでソート
        mockActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(mockActivities);
        updateStats(mockActivities);
    };
    // アクティビティの更新（新しいエラーの追加をシミュレート）
    const updateActivities = () => {
        const now = new Date();
        // 10%の確率で新しいアクティビティを追加
        if (Math.random() > 0.9) {
            const newActivity = {
                id: `activity-${Date.now()}`,
                type: 'error_detected',
                timestamp: now,
                title: '新しいエラーを検出',
                description: `React Hook useEffect has a missing dependency`,
                severity: 'medium',
                relatedError: {
                    id: `error-${Date.now()}`,
                    type: 'warning',
                    severity: 'medium',
                    message: 'React Hook useEffect has a missing dependency: \'fetchData\'',
                    source: 'http://192.168.3.135:3000/src/components/UserList.tsx',
                    timestamp: now,
                    url: 'http://192.168.3.135:3000',
                    fixed: false,
                    fixAttempts: 0,
                    autoFixable: true,
                    category: 'javascript'
                }
            };
            setActivities(prev => [newActivity, ...prev].slice(0, 50)); // 最新50件を保持
        }
        setStats(prev => ({ ...prev, lastUpdate: now }));
    };
    // 統計の更新
    const updateStats = (activities) => {
        const errorActivities = activities.filter(a => a.type === 'error_detected');
        const repairCompletedActivities = activities.filter(a => a.type === 'repair_completed');
        const successfulRepairs = repairCompletedActivities.filter(a => a.description.includes('完了') || a.description.includes('成功'));
        setStats({
            totalErrors: errorActivities.length,
            activeErrors: errorActivities.filter(a => !repairCompletedActivities.some(r => r.title.includes('完了'))).length,
            fixedErrors: successfulRepairs.length,
            repairRate: repairCompletedActivities.length > 0
                ? (successfulRepairs.length / repairCompletedActivities.length) * 100
                : 0,
            lastUpdate: new Date()
        });
    };
    // フィルタの適用
    const applyFilters = () => {
        let filtered = activities;
        // 時間範囲フィルタ
        const cutoffTime = new Date(Date.now() - filterOptions.timeRange * 60 * 1000);
        filtered = filtered.filter(activity => activity.timestamp > cutoffTime);
        // 重要度フィルタ
        filtered = filtered.filter(activity => filterOptions.severities.includes(activity.severity));
        // 修復状態フィルタ
        if (!filterOptions.showFixed || !filterOptions.showUnfixed) {
            filtered = filtered.filter(activity => {
                const isFixed = activity.relatedError?.fixed === true ||
                    activity.type === 'repair_completed' &&
                        activity.description.includes('完了');
                return (filterOptions.showFixed && isFixed) ||
                    (filterOptions.showUnfixed && !isFixed);
            });
        }
        setFilteredActivities(filtered);
    };
    // アクティビティの詳細表示
    const showActivityDetail = (activity) => {
        setSelectedActivity(activity);
        setDetailDialogOpen(true);
    };
    // アクティビティのクリア
    const clearActivities = () => {
        setActivities([]);
        setFilteredActivities([]);
        updateStats([]);
    };
    // レポートのエクスポート
    const exportReport = () => {
        const report = {
            timestamp: new Date().toISOString(),
            statistics: stats,
            activities: filteredActivities,
            filters: filterOptions
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    // アイコンの取得
    const getActivityIcon = (activity) => {
        switch (activity.type) {
            case 'error_detected':
                return activity.severity === 'critical' ?
                    _jsx(ErrorIcon, { color: "error" }) :
                    _jsx(WarningIcon, { color: "warning" });
            case 'repair_started':
                return _jsx(BuildIcon, { color: "info" });
            case 'repair_completed':
                return activity.description.includes('完了') ?
                    _jsx(CheckCircleIcon, { color: "success" }) :
                    _jsx(ErrorIcon, { color: "error" });
            case 'validation_completed':
                return activity.description.includes('合格') ?
                    _jsx(CheckCircleIcon, { color: "success" }) :
                    _jsx(WarningIcon, { color: "warning" });
            default:
                return _jsx(InfoIcon, { color: "info" });
        }
    };
    // 重要度の色の取得
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'default';
            default: return 'default';
        }
    };
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsxs(Typography, { variant: "h5", sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(TimelineIcon, { sx: { mr: 1 } }), "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u30A8\u30E9\u30FC\u30EC\u30DD\u30FC\u30C8"] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Tooltip, { title: "\u30D5\u30A3\u30EB\u30BF\u8A2D\u5B9A", children: _jsx(IconButton, { onClick: () => setFilterDialogOpen(true), children: _jsx(FilterListIcon, {}) }) }), _jsx(Tooltip, { title: "\u624B\u52D5\u66F4\u65B0", children: _jsx(IconButton, { onClick: () => updateActivities(), children: _jsx(RefreshIcon, {}) }) }), _jsx(Tooltip, { title: "\u30AF\u30EA\u30A2", children: _jsx(IconButton, { onClick: clearActivities, children: _jsx(ClearIcon, {}) }) }), _jsx(Tooltip, { title: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8", children: _jsx(IconButton, { onClick: exportReport, children: _jsx(DownloadIcon, {}) }) })] })] }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", color: "error", children: stats.totalErrors }), _jsx(Typography, { variant: "body2", children: "\u7DCF\u30A8\u30E9\u30FC\u6570" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", color: "warning.main", children: stats.activeErrors }), _jsx(Typography, { variant: "body2", children: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30A8\u30E9\u30FC" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", color: "success.main", children: stats.fixedErrors }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6E08\u307F" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsxs(Typography, { variant: "h4", color: "info.main", children: [stats.repairRate.toFixed(1), "%"] }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6210\u529F\u7387" })] }) })] }), _jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h6", children: "\u76E3\u8996\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(FormControlLabel, { control: _jsx(Switch, { checked: filterOptions.autoRefresh, onChange: (e) => setFilterOptions(prev => ({
                                                    ...prev,
                                                    autoRefresh: e.target.checked
                                                })) }), label: "\u81EA\u52D5\u66F4\u65B0" }), _jsxs(Typography, { variant: "body2", color: "textSecondary", children: ["\u6700\u7D42\u66F4\u65B0: ", stats.lastUpdate.toLocaleTimeString()] })] })] }), filterOptions.autoRefresh && (_jsx(LinearProgress, { sx: { mt: 1 } }))] }) }), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3 (", filteredActivities.length, "\u4EF6)"] }), filteredActivities.length === 0 ? (_jsx(Alert, { severity: "info", children: "\u30D5\u30A3\u30EB\u30BF\u6761\u4EF6\u306B\u4E00\u81F4\u3059\u308B\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u304C\u3042\u308A\u307E\u305B\u3093" })) : (_jsx(Timeline, { children: filteredActivities.map((activity, index) => (_jsxs(TimelineItem, { children: [_jsx(TimelineOppositeContent, { color: "textSecondary", children: activity.timestamp.toLocaleTimeString() }), _jsxs(TimelineSeparator, { children: [_jsx(TimelineDot, { children: getActivityIcon(activity) }), index < filteredActivities.length - 1 && _jsx(TimelineConnector, {})] }), _jsx(TimelineContent, { children: _jsx(Card, { variant: "outlined", sx: { mb: 1 }, children: _jsx(CardContent, { sx: { p: 2, '&:last-child': { pb: 2 } }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 'bold' }, children: activity.title }), _jsx(Typography, { variant: "body2", color: "textSecondary", sx: { mt: 0.5 }, children: activity.description }), _jsxs(Box, { sx: { mt: 1, display: 'flex', gap: 1 }, children: [_jsx(Chip, { label: activity.type.replace('_', ' '), size: "small", variant: "outlined" }), _jsx(Chip, { label: activity.severity, size: "small", color: getSeverityColor(activity.severity) })] })] }), _jsx(IconButton, { size: "small", onClick: () => showActivityDetail(activity), children: _jsx(VisibilityIcon, {}) })] }) }) }) })] }, activity.id))) }))] }) }), _jsxs(Dialog, { open: filterDialogOpen, onClose: () => setFilterDialogOpen(false), children: [_jsx(DialogTitle, { children: "\u30D5\u30A3\u30EB\u30BF\u8A2D\u5B9A" }), _jsx(DialogContent, { children: _jsxs(Box, { sx: { pt: 1 }, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u91CD\u8981\u5EA6" }), _jsx(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }, children: ['critical', 'high', 'medium', 'low'].map((severity) => (_jsx(Chip, { label: severity, color: filterOptions.severities.includes(severity) ? 'primary' : 'default', onClick: () => {
                                            setFilterOptions(prev => ({
                                                ...prev,
                                                severities: prev.severities.includes(severity)
                                                    ? prev.severities.filter(s => s !== severity)
                                                    : [...prev.severities, severity]
                                            }));
                                        } }, severity))) }), _jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u8868\u793A\u30AA\u30D7\u30B7\u30E7\u30F3" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: filterOptions.showFixed, onChange: (e) => setFilterOptions(prev => ({
                                            ...prev,
                                            showFixed: e.target.checked
                                        })) }), label: "\u4FEE\u5FA9\u6E08\u307F\u30A8\u30E9\u30FC\u3092\u8868\u793A" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: filterOptions.showUnfixed, onChange: (e) => setFilterOptions(prev => ({
                                            ...prev,
                                            showUnfixed: e.target.checked
                                        })) }), label: "\u672A\u4FEE\u5FA9\u30A8\u30E9\u30FC\u3092\u8868\u793A" })] }) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setFilterDialogOpen(false), children: "\u9069\u7528" }) })] }), _jsxs(Dialog, { open: detailDialogOpen, onClose: () => setDetailDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u8A73\u7D30" }), _jsx(DialogContent, { children: selectedActivity && (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: selectedActivity.title }), _jsx(Typography, { variant: "body1", gutterBottom: true, children: selectedActivity.description }), _jsx(Divider, { sx: { my: 2 } }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsxs(Grid, { item: true, xs: 6, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u30BF\u30A4\u30D7" }), _jsx(Typography, { variant: "body1", children: selectedActivity.type })] }), _jsxs(Grid, { item: true, xs: 6, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u91CD\u8981\u5EA6" }), _jsx(Chip, { label: selectedActivity.severity, color: getSeverityColor(selectedActivity.severity), size: "small" })] }), _jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u767A\u751F\u6642\u523B" }), _jsx(Typography, { variant: "body1", children: selectedActivity.timestamp.toLocaleString() })] })] }), selectedActivity.relatedError && (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u95A2\u9023\u30A8\u30E9\u30FC\u60C5\u5831" }), _jsxs(Paper, { sx: { p: 2, backgroundColor: 'grey.100' }, children: [_jsxs(Typography, { variant: "body2", children: ["\u30E1\u30C3\u30BB\u30FC\u30B8: ", selectedActivity.relatedError.message] }), _jsxs(Typography, { variant: "body2", children: ["\u30BD\u30FC\u30B9: ", selectedActivity.relatedError.source] }), _jsxs(Typography, { variant: "body2", children: ["\u30AB\u30C6\u30B4\u30EA: ", selectedActivity.relatedError.category] })] })] }))] })) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setDetailDialogOpen(false), children: "\u9589\u3058\u308B" }) })] })] }));
};
export default RealtimeErrorReport;
