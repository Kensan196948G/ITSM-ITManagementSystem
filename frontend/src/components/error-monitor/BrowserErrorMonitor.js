import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Switch, FormControlLabel, Alert, LinearProgress, Chip, Grid, Paper, List, ListItem, ListItemText, ListItemIcon, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Badge, Tooltip, IconButton } from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon, PlayArrow as PlayIcon, Stop as StopIcon, Refresh as RefreshIcon, BugReport as BugReportIcon, Build as BuildIcon, Visibility as VisibilityIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
// MCP Playwright サービス
import { MCPPlaywrightErrorDetector, defaultConfig } from '../../services/mcpPlaywrightErrorDetector';
import { InfiniteLoopController, defaultInfiniteLoopConfig } from '../../services/infiniteLoopController';
import { AutoRepairEngine } from '../../services/autoRepairEngine';
import { ValidationSystem } from '../../services/validationSystem';
const BrowserErrorMonitor = ({ targetUrl = 'http://192.168.3.135:3000', autoStart = false, onErrorDetected, onErrorFixed, onInfiniteLoopStarted, onInfiniteLoopStopped }) => {
    // MCP Playwright サービスインスタンス
    const mcpDetector = useRef(null);
    const infiniteLoopController = useRef(null);
    const autoRepairEngine = useRef(null);
    const validationSystem = useRef(null);
    // 状態管理
    const [isMonitoring, setIsMonitoring] = useState(autoStart);
    const [errors, setErrors] = useState([]);
    const [stats, setStats] = useState({
        totalErrors: 0,
        fixedErrors: 0,
        activeMonitoring: false,
        lastCheck: new Date(),
        cycleCount: 0,
        successRate: 0,
        infiniteLoopActive: false,
        currentIteration: 0,
        healthScore: 100,
        activeBrowsers: 0,
        systemUptime: 0
    });
    const [isFixing, setIsFixing] = useState(false);
    const [selectedError, setSelectedError] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [autoFix, setAutoFix] = useState(true);
    const [infiniteLoop, setInfiniteLoop] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initializationError, setInitializationError] = useState(null);
    const [expandedAccordion, setExpandedAccordion] = useState(false);
    const monitoringInterval = useRef(null);
    const systemStartTime = useRef(new Date());
    // システム初期化
    const initializeSystem = async () => {
        if (isInitializing)
            return;
        setIsInitializing(true);
        setInitializationError(null);
        try {
            console.log('🚀 MCP Playwright システムを初期化中...');
            // MCP Playwright エラー検知器を作成
            const detectorConfig = {
                ...defaultConfig,
                targetUrls: [targetUrl, `${targetUrl}/admin`],
                monitoringInterval: 5000,
                browsers: ['chromium', 'firefox'],
            };
            mcpDetector.current = new MCPPlaywrightErrorDetector(detectorConfig);
            await mcpDetector.current.initialize();
            // 自動修復エンジンを初期化
            autoRepairEngine.current = new AutoRepairEngine();
            // 検証システムを初期化
            validationSystem.current = new ValidationSystem();
            // 無限ループコントローラーを初期化
            infiniteLoopController.current = new InfiniteLoopController(detectorConfig, defaultInfiniteLoopConfig);
            console.log('✅ MCP Playwright システムの初期化完了');
        }
        catch (error) {
            console.error('❌ システム初期化エラー:', error);
            setInitializationError(error instanceof Error ? error.message : 'システム初期化に失敗しました');
        }
        finally {
            setIsInitializing(false);
        }
    };
    // エラー検知関数（実際のMCP Playwrightを使用）
    const detectErrors = async () => {
        if (!mcpDetector.current) {
            console.warn('⚠️ MCP Playwright エラー検知器が初期化されていません');
            return;
        }
        try {
            // MCP Playwright からエラー状況を取得
            const detectorStatus = mcpDetector.current.getStatus();
            const recentErrors = detectorStatus.recentErrors;
            // BrowserError を ExtendedBrowserError に変換
            const extendedErrors = recentErrors.map(error => ({
                ...error,
                fixed: false,
                fixAttempts: 0,
                validationPassed: false,
                repairHistory: []
            }));
            // 新しいエラーのみを追加
            const newErrors = extendedErrors.filter(newError => !errors.some(existingError => existingError.id === newError.id));
            if (newErrors.length > 0) {
                setErrors(prev => [...prev, ...newErrors]);
                newErrors.forEach(error => onErrorDetected?.(error));
                console.log(`🔍 新しいエラー ${newErrors.length} 件を検知しました`);
                // 自動修復が有効な場合は修復を開始
                if (autoFix && !isFixing) {
                    await startAutoFix(newErrors);
                }
            }
            // 統計情報を更新
            updateSystemStats();
        }
        catch (error) {
            console.error('❌ エラー検知に失敗:', error);
        }
    };
    // システム統計情報を更新
    const updateSystemStats = () => {
        if (!mcpDetector.current)
            return;
        const detectorStatus = mcpDetector.current.getStatus();
        const loopStatus = infiniteLoopController.current?.getStatus();
        const repairStats = autoRepairEngine.current?.getRepairStatistics();
        const systemUptime = Date.now() - systemStartTime.current.getTime();
        const healthScore = calculateSystemHealthScore();
        setStats(prev => ({
            ...prev,
            lastCheck: new Date(),
            cycleCount: detectorStatus.totalErrors,
            totalErrors: detectorStatus.totalErrors,
            fixedErrors: repairStats?.successfulRepairs || 0,
            successRate: repairStats?.successRate ? parseFloat(repairStats.successRate.replace('%', '')) : 0,
            activeMonitoring: detectorStatus.isMonitoring,
            infiniteLoopActive: loopStatus?.isRunning || false,
            currentIteration: loopStatus?.currentIteration || 0,
            healthScore,
            activeBrowsers: detectorStatus.activeBrowsers,
            systemUptime
        }));
    };
    // システム健康度スコアを計算
    const calculateSystemHealthScore = () => {
        const errorPenalty = errors.filter(e => !e.fixed).length * 5;
        const fixedBonus = errors.filter(e => e.fixed).length * 2;
        const uptimeFactor = Math.min(stats.systemUptime / (1000 * 60 * 60), 1) * 10; // 最大1時間で10ポイント
        const score = Math.max(0, Math.min(100, 100 - errorPenalty + fixedBonus + uptimeFactor));
        return score;
    };
    // 自動修復処理（実際のMCP Playwrightを使用）
    const startAutoFix = async (errorsToFix) => {
        if (isFixing || !autoRepairEngine.current)
            return;
        const targetErrors = errorsToFix || errors.filter(e => !e.fixed);
        if (targetErrors.length === 0)
            return;
        setIsFixing(true);
        console.log(`🔧 ${targetErrors.length} 件のエラーの自動修復を開始...`);
        try {
            for (const errorToFix of targetErrors) {
                try {
                    console.log(`🔄 修復中: ${errorToFix.message}`);
                    // 実際の修復を実行
                    const repairResult = await autoRepairEngine.current.repairError(errorToFix);
                    // エラー状態を更新
                    setErrors(prev => prev.map(error => error.id === errorToFix.id
                        ? {
                            ...error,
                            fixed: repairResult.success,
                            fixAttempts: (error.fixAttempts || 0) + 1,
                            repairHistory: [
                                ...(error.repairHistory || []),
                                `${repairResult.success ? '成功' : '失敗'}: ${repairResult.description || 'N/A'}`
                            ]
                        }
                        : error));
                    if (repairResult.success) {
                        console.log(`✅ 修復成功: ${errorToFix.message}`);
                        // 検証を実行
                        if (validationSystem.current) {
                            const validationResult = await validationSystem.current.validateAfterRepair(errorToFix);
                            if (validationResult) {
                                setErrors(prev => prev.map(error => error.id === errorToFix.id
                                    ? { ...error, validationPassed: validationResult.overallScore > 80 }
                                    : error));
                            }
                        }
                        onErrorFixed?.(errorToFix);
                    }
                    else {
                        console.log(`❌ 修復失敗: ${errorToFix.message} - ${repairResult.error || 'unknown error'}`);
                    }
                    // 修復間隔
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (error) {
                    console.error(`❌ エラー修復中に例外発生:`, error);
                }
            }
        }
        finally {
            setIsFixing(false);
            updateSystemStats();
            console.log('🔧 自動修復プロセス完了');
        }
    };
    // 監視開始/停止
    const toggleMonitoring = async () => {
        if (!mcpDetector.current) {
            console.warn('⚠️ システムが初期化されていません');
            return;
        }
        try {
            if (isMonitoring) {
                // 監視停止
                console.log('🛑 監視を停止中...');
                await mcpDetector.current.stopMonitoring();
                if (monitoringInterval.current) {
                    clearInterval(monitoringInterval.current);
                    monitoringInterval.current = null;
                }
                setStats(prev => ({ ...prev, activeMonitoring: false }));
                console.log('✅ 監視を停止しました');
            }
            else {
                // 監視開始
                console.log('🔍 監視を開始中...');
                await mcpDetector.current.startMonitoring();
                // 定期的な統計更新
                monitoringInterval.current = setInterval(() => {
                    detectErrors();
                    updateSystemStats();
                }, 5000);
                setStats(prev => ({ ...prev, activeMonitoring: true }));
                // 即座に実行
                await detectErrors();
                console.log('✅ 監視を開始しました');
            }
            setIsMonitoring(!isMonitoring);
        }
        catch (error) {
            console.error('❌ 監視状態の切り替えに失敗:', error);
        }
    };
    // 無限ループモードの切り替え
    const toggleInfiniteLoop = async () => {
        if (!infiniteLoopController.current) {
            console.warn('⚠️ 無限ループコントローラーが初期化されていません');
            return;
        }
        try {
            if (infiniteLoop) {
                // 無限ループ停止
                console.log('🛑 無限ループを停止中...');
                await infiniteLoopController.current.stopInfiniteLoop();
                setStats(prev => ({ ...prev, infiniteLoopActive: false }));
                onInfiniteLoopStopped?.();
                console.log('✅ 無限ループを停止しました');
            }
            else {
                // 無限ループ開始
                console.log('🔄 無限ループを開始中...');
                await infiniteLoopController.current.startInfiniteLoop();
                setStats(prev => ({ ...prev, infiniteLoopActive: true }));
                onInfiniteLoopStarted?.();
                console.log('✅ 無限ループを開始しました');
                // 監視も開始していない場合は開始
                if (!isMonitoring) {
                    await toggleMonitoring();
                }
            }
            setInfiniteLoop(!infiniteLoop);
        }
        catch (error) {
            console.error('❌ 無限ループ状態の切り替えに失敗:', error);
        }
    };
    // 手動修復
    const fixError = async (error) => {
        setIsFixing(true);
        try {
            console.log(`🔧 手動修復を開始: ${error.message}`);
            await startAutoFix([error]);
        }
        catch (error) {
            console.error('❌ 手動修復に失敗:', error);
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
