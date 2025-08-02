import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Switch, FormControlLabel, Alert, LinearProgress, Chip, Grid, Paper, List, ListItem, ListItemText, ListItemIcon, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Badge, Tooltip, IconButton } from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon, PlayArrow as PlayIcon, Stop as StopIcon, Refresh as RefreshIcon, BugReport as BugReportIcon, Build as BuildIcon, Visibility as VisibilityIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
const BrowserErrorMonitor = ({ targetUrl = 'http://192.168.3.135:3000', autoStart = false, onErrorDetected, onErrorFixed }) => {
    const [isMonitoring, setIsMonitoring] = useState(autoStart);
    const [errors, setErrors] = useState([]);
    const [stats, setStats] = useState({
        totalErrors: 0,
        fixedErrors: 0,
        activeMonitoring: false,
        lastCheck: new Date(),
        cycleCount: 0,
        successRate: 0
    });
    const [isFixing, setIsFixing] = useState(false);
    const [selectedError, setSelectedError] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [autoFix, setAutoFix] = useState(true);
    const [infiniteLoop, setInfiniteLoop] = useState(false);
    const monitoringInterval = useRef(null);
    const fixingQueue = useRef([]);
    // エラー検知関数
    const detectErrors = async () => {
        try {
            // Playwright による実際のページ検査をシミュレート
            const mockErrors = [
                {
                    id: `error-${Date.now()}-1`,
                    type: 'error',
                    message: 'TypeError: Cannot read property of undefined',
                    source: 'http://192.168.3.135:3000/assets/index.js:123:45',
                    timestamp: new Date(),
                    stack: 'at Component.render (index.js:123:45)\nat ReactDOM.render (react-dom.js:456:78)',
                    fixed: false,
                    fixAttempts: 0
                },
                {
                    id: `error-${Date.now()}-2`,
                    type: 'warning',
                    message: 'React Hook useEffect has a missing dependency',
                    source: 'http://192.168.3.135:3000/components/Dashboard.tsx:89:12',
                    timestamp: new Date(),
                    fixed: false,
                    fixAttempts: 0
                }
            ];
            // 新しいエラーのみを追加
            const newErrors = mockErrors.filter(mockError => !errors.some(existingError => existingError.message === mockError.message));
            if (newErrors.length > 0) {
                setErrors(prev => [...prev, ...newErrors]);
                newErrors.forEach(error => onErrorDetected?.(error));
                if (autoFix) {
                    fixingQueue.current.push(...newErrors);
                    if (!isFixing) {
                        startAutoFix();
                    }
                }
            }
            setStats(prev => ({
                ...prev,
                lastCheck: new Date(),
                cycleCount: prev.cycleCount + 1,
                totalErrors: prev.totalErrors + newErrors.length,
                successRate: prev.totalErrors > 0 ? (prev.fixedErrors / prev.totalErrors) * 100 : 100
            }));
        }
        catch (error) {
            console.error('Error detection failed:', error);
        }
    };
    // 自動修復処理
    const startAutoFix = async () => {
        if (isFixing || fixingQueue.current.length === 0)
            return;
        setIsFixing(true);
        while (fixingQueue.current.length > 0) {
            const errorToFix = fixingQueue.current.shift();
            if (!errorToFix)
                break;
            try {
                // エラー修復のシミュレート
                await new Promise(resolve => setTimeout(resolve, 2000)); // 修復時間をシミュレート
                // 修復成功の確率をシミュレート
                const fixSuccess = Math.random() > 0.3; // 70%の成功率
                setErrors(prev => prev.map(error => error.id === errorToFix.id
                    ? {
                        ...error,
                        fixed: fixSuccess,
                        fixAttempts: error.fixAttempts + 1
                    }
                    : error));
                if (fixSuccess) {
                    setStats(prev => ({
                        ...prev,
                        fixedErrors: prev.fixedErrors + 1,
                        successRate: prev.totalErrors > 0 ? ((prev.fixedErrors + 1) / prev.totalErrors) * 100 : 100
                    }));
                    onErrorFixed?.(errorToFix);
                }
                else if (errorToFix.fixAttempts < 3) {
                    // 修復失敗時は再試行キューに追加
                    fixingQueue.current.push({
                        ...errorToFix,
                        fixAttempts: errorToFix.fixAttempts + 1
                    });
                }
            }
            catch (error) {
                console.error('Auto-fix failed:', error);
            }
        }
        setIsFixing(false);
    };
    // 監視開始/停止
    const toggleMonitoring = () => {
        if (isMonitoring) {
            if (monitoringInterval.current) {
                clearInterval(monitoringInterval.current);
                monitoringInterval.current = null;
            }
            setStats(prev => ({ ...prev, activeMonitoring: false }));
        }
        else {
            monitoringInterval.current = setInterval(detectErrors, 5000);
            setStats(prev => ({ ...prev, activeMonitoring: true }));
            detectErrors(); // 即座に実行
        }
        setIsMonitoring(!isMonitoring);
    };
    // 無限ループモードの切り替え
    const toggleInfiniteLoop = () => {
        setInfiniteLoop(!infiniteLoop);
        if (!infiniteLoop && !isMonitoring) {
            toggleMonitoring();
        }
    };
    // 手動修復
    const fixError = async (error) => {
        setIsFixing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setErrors(prev => prev.map(e => e.id === error.id
                ? { ...e, fixed: true, fixAttempts: e.fixAttempts + 1 }
                : e));
            setStats(prev => ({
                ...prev,
                fixedErrors: prev.fixedErrors + 1,
                successRate: prev.totalErrors > 0 ? ((prev.fixedErrors + 1) / prev.totalErrors) * 100 : 100
            }));
            onErrorFixed?.(error);
        }
        catch (error) {
            console.error('Manual fix failed:', error);
        }
        finally {
            setIsFixing(false);
        }
    };
    // エラー詳細表示
    const showErrorDetails = (error) => {
        setSelectedError(error);
        setDetailsOpen(true);
    };
    // エラー統計のリセット
    const resetStats = () => {
        setErrors([]);
        setStats({
            totalErrors: 0,
            fixedErrors: 0,
            activeMonitoring: isMonitoring,
            lastCheck: new Date(),
            cycleCount: 0,
            successRate: 0
        });
        fixingQueue.current = [];
    };
    // コンポーネントのクリーンアップ
    useEffect(() => {
        return () => {
            if (monitoringInterval.current) {
                clearInterval(monitoringInterval.current);
            }
        };
    }, []);
    // 無限ループモードでの自動再開
    useEffect(() => {
        if (infiniteLoop && !isMonitoring && errors.filter(e => !e.fixed).length === 0) {
            const timeout = setTimeout(() => {
                if (!isMonitoring) {
                    toggleMonitoring();
                }
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [infiniteLoop, isMonitoring, errors]);
    const unfixedErrors = errors.filter(e => !e.fixed);
    const criticalErrors = errors.filter(e => e.type === 'error' && !e.fixed);
    return (_jsxs(Box, { sx: { p: 3 }, children: [_jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsxs(Typography, { variant: "h5", gutterBottom: true, sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(BugReportIcon, { sx: { mr: 1 } }), "\u30D6\u30E9\u30A6\u30B6\u30A8\u30E9\u30FC\u691C\u77E5\u30FB\u4FEE\u5FA9\u30B7\u30B9\u30C6\u30E0"] }), _jsxs(Grid, { container: true, spacing: 3, alignItems: "center", children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Box, { sx: { display: 'flex', gap: 2, flexWrap: 'wrap' }, children: [_jsx(Button, { variant: isMonitoring ? "contained" : "outlined", color: isMonitoring ? "error" : "primary", startIcon: isMonitoring ? _jsx(StopIcon, {}) : _jsx(PlayIcon, {}), onClick: toggleMonitoring, disabled: isFixing, children: isMonitoring ? '監視停止' : '監視開始' }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: autoFix, onChange: (e) => setAutoFix(e.target.checked), disabled: isFixing }), label: "\u81EA\u52D5\u4FEE\u5FA9" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: infiniteLoop, onChange: toggleInfiniteLoop, disabled: isFixing }), label: "\u7121\u9650\u30EB\u30FC\u30D7" }), _jsx(IconButton, { onClick: resetStats, disabled: isFixing, children: _jsx(RefreshIcon, {}) })] }) }), _jsxs(Grid, { item: true, xs: 12, md: 6, children: [_jsxs(Typography, { variant: "body2", color: "textSecondary", children: ["\u76E3\u8996\u5BFE\u8C61: ", targetUrl] }), _jsxs(Typography, { variant: "body2", color: "textSecondary", children: ["\u6700\u7D42\u30C1\u30A7\u30C3\u30AF: ", stats.lastCheck.toLocaleTimeString()] })] })] }), isFixing && (_jsx(Box, { sx: { mt: 2 }, children: _jsxs(Alert, { severity: "info", sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(CircularProgress, { size: 20, sx: { mr: 1 } }), "\u30A8\u30E9\u30FC\u3092\u81EA\u52D5\u4FEE\u5FA9\u4E2D..."] }) }))] }) }), _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [_jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", color: "error", children: stats.totalErrors }), _jsx(Typography, { variant: "body2", children: "\u7DCF\u30A8\u30E9\u30FC\u6570" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", color: "success.main", children: stats.fixedErrors }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6E08\u307F" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsx(Typography, { variant: "h4", color: "warning.main", children: unfixedErrors.length }), _jsx(Typography, { variant: "body2", children: "\u672A\u4FEE\u5FA9" })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: _jsxs(Paper, { sx: { p: 2, textAlign: 'center' }, children: [_jsxs(Typography, { variant: "h4", color: "info.main", children: [stats.successRate.toFixed(1), "%"] }), _jsx(Typography, { variant: "body2", children: "\u4FEE\u5FA9\u6210\u529F\u7387" })] }) })] }), isMonitoring && (_jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u76E3\u8996\u72B6\u6CC1" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsxs(Typography, { variant: "body2", sx: { mr: 2 }, children: ["\u30B5\u30A4\u30AF\u30EB: ", stats.cycleCount] }), _jsx(Chip, { icon: stats.activeMonitoring ? _jsx(VisibilityIcon, {}) : _jsx(StopIcon, {}), label: stats.activeMonitoring ? "監視中" : "停止中", color: stats.activeMonitoring ? "success" : "default", size: "small" })] }), _jsx(LinearProgress, { variant: "indeterminate", sx: {
                                height: 6,
                                borderRadius: 3,
                                display: stats.activeMonitoring ? 'block' : 'none'
                            } })] }) })), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [_jsx(Typography, { variant: "h6", children: "\u691C\u51FA\u3055\u308C\u305F\u30A8\u30E9\u30FC" }), criticalErrors.length > 0 && (_jsx(Badge, { badgeContent: criticalErrors.length, color: "error", children: _jsx(ErrorIcon, {}) }))] }), errors.length === 0 ? (_jsx(Alert, { severity: "success", icon: _jsx(CheckCircleIcon, {}), children: "\u73FE\u5728\u30A8\u30E9\u30FC\u306F\u691C\u51FA\u3055\u308C\u3066\u3044\u307E\u305B\u3093" })) : (_jsx(List, { children: errors.map((error) => (_jsxs(ListItem, { sx: {
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    mb: 1,
                                    backgroundColor: error.fixed ? 'success.light' : 'background.paper'
                                }, children: [_jsx(ListItemIcon, { children: error.fixed ? (_jsx(CheckCircleIcon, { color: "success" })) : error.type === 'error' ? (_jsx(ErrorIcon, { color: "error" })) : (_jsx(WarningIcon, { color: "warning" })) }), _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Typography, { variant: "body1", children: error.message }), _jsx(Chip, { label: error.type, size: "small", color: error.type === 'error' ? 'error' : 'warning' }), error.fixAttempts > 0 && (_jsx(Chip, { label: `修復試行: ${error.fixAttempts}`, size: "small", variant: "outlined" }))] }), secondary: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: error.source }), _jsx(Typography, { variant: "caption", children: error.timestamp.toLocaleString() })] }) }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Tooltip, { title: "\u8A73\u7D30\u8868\u793A", children: _jsx(IconButton, { onClick: () => showErrorDetails(error), children: _jsx(AssessmentIcon, {}) }) }), !error.fixed && (_jsx(Tooltip, { title: "\u624B\u52D5\u4FEE\u5FA9", children: _jsx(IconButton, { onClick: () => fixError(error), disabled: isFixing, children: _jsx(BuildIcon, {}) }) }))] })] }, error.id))) }))] }) }), _jsxs(Dialog, { open: detailsOpen, onClose: () => setDetailsOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u30A8\u30E9\u30FC\u8A73\u7D30\u60C5\u5831" }), _jsx(DialogContent, { children: selectedError && (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: selectedError.message }), _jsxs(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: ["\u30BD\u30FC\u30B9: ", selectedError.source] }), _jsxs(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: ["\u767A\u751F\u6642\u523B: ", selectedError.timestamp.toLocaleString()] }), _jsxs(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: ["\u30BF\u30A4\u30D7: ", selectedError.type] }), _jsxs(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: ["\u4FEE\u5FA9\u8A66\u884C\u56DE\u6570: ", selectedError.fixAttempts] }), _jsxs(Typography, { variant: "body2", color: "textSecondary", gutterBottom: true, children: ["\u30B9\u30C6\u30FC\u30BF\u30B9: ", selectedError.fixed ? '修復済み' : '未修復'] }), selectedError.stack && (_jsxs(Box, { sx: { mt: 2 }, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u30B9\u30BF\u30C3\u30AF\u30C8\u30EC\u30FC\u30B9:" }), _jsx(Paper, { sx: { p: 2, backgroundColor: 'grey.100' }, children: _jsx(Typography, { variant: "body2", component: "pre", sx: { whiteSpace: 'pre-wrap' }, children: selectedError.stack }) })] }))] })) }), _jsxs(DialogActions, { children: [selectedError && !selectedError.fixed && (_jsx(Button, { onClick: () => {
                                    fixError(selectedError);
                                    setDetailsOpen(false);
                                }, startIcon: _jsx(BuildIcon, {}), disabled: isFixing, children: "\u4FEE\u5FA9\u5B9F\u884C" })), _jsx(Button, { onClick: () => setDetailsOpen(false), children: "\u9589\u3058\u308B" })] })] })] }));
};
export default BrowserErrorMonitor;
