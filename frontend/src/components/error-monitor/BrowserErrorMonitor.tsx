import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Badge,
  Tooltip,
  IconButton,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkCheckIcon,
  Code as CodeIcon,
  Screenshot as ScreenshotIcon
} from '@mui/icons-material';

// MCP Playwright サービス
import { MCPPlaywrightErrorDetector, BrowserError, defaultConfig } from '../../services/mcpPlaywrightErrorDetector';
import { InfiniteLoopController, defaultInfiniteLoopConfig } from '../../services/infiniteLoopController';
import { AutoRepairEngine } from '../../services/autoRepairEngine';
import { ValidationSystem } from '../../services/validationSystem';

interface ExtendedBrowserError extends BrowserError {
  fixed?: boolean;
  fixAttempts?: number;
  validationPassed?: boolean;
  repairHistory?: string[];
}

interface MonitoringStats {
  totalErrors: number;
  fixedErrors: number;
  activeMonitoring: boolean;
  lastCheck: Date;
  cycleCount: number;
  successRate: number;
  infiniteLoopActive: boolean;
  currentIteration: number;
  healthScore: number;
  activeBrowsers: number;
  systemUptime: number;
}

interface BrowserErrorMonitorProps {
  targetUrl?: string;
  autoStart?: boolean;
  onErrorDetected?: (error: ExtendedBrowserError) => void;
  onErrorFixed?: (error: ExtendedBrowserError) => void;
  onInfiniteLoopStarted?: () => void;
  onInfiniteLoopStopped?: () => void;
}

const BrowserErrorMonitor: React.FC<BrowserErrorMonitorProps> = ({
  targetUrl = 'http://192.168.3.135:3000',
  autoStart = false,
  onErrorDetected,
  onErrorFixed,
  onInfiniteLoopStarted,
  onInfiniteLoopStopped
}) => {
  // MCP Playwright サービスインスタンス
  const mcpDetector = useRef<MCPPlaywrightErrorDetector | null>(null);
  const infiniteLoopController = useRef<InfiniteLoopController | null>(null);
  const autoRepairEngine = useRef<AutoRepairEngine | null>(null);
  const validationSystem = useRef<ValidationSystem | null>(null);

  // 状態管理
  const [isMonitoring, setIsMonitoring] = useState(autoStart);
  const [errors, setErrors] = useState<ExtendedBrowserError[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
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
  const [selectedError, setSelectedError] = useState<ExtendedBrowserError | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [autoFix, setAutoFix] = useState(true);
  const [infiniteLoop, setInfiniteLoop] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);
  
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);
  const systemStartTime = useRef<Date>(new Date());

  // システム初期化
  const initializeSystem = async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    setInitializationError(null);

    try {
      console.log('🚀 MCP Playwright システムを初期化中...');

      // MCP Playwright エラー検知器を作成
      const detectorConfig = {
        ...defaultConfig,
        targetUrls: [targetUrl, `${targetUrl}/admin`],
        monitoringInterval: 5000,
        browsers: ['chromium', 'firefox'] as const,
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

    } catch (error) {
      console.error('❌ システム初期化エラー:', error);
      setInitializationError(error instanceof Error ? error.message : 'システム初期化に失敗しました');
    } finally {
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
      const extendedErrors: ExtendedBrowserError[] = recentErrors.map(error => ({
        ...error,
        fixed: false,
        fixAttempts: 0,
        validationPassed: false,
        repairHistory: []
      }));

      // 新しいエラーのみを追加
      const newErrors = extendedErrors.filter(
        newError => !errors.some(existingError => existingError.id === newError.id)
      );

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

    } catch (error) {
      console.error('❌ エラー検知に失敗:', error);
    }
  };

  // システム統計情報を更新
  const updateSystemStats = () => {
    if (!mcpDetector.current) return;

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
  const calculateSystemHealthScore = (): number => {
    const errorPenalty = errors.filter(e => !e.fixed).length * 5;
    const fixedBonus = errors.filter(e => e.fixed).length * 2;
    const uptimeFactor = Math.min(stats.systemUptime / (1000 * 60 * 60), 1) * 10; // 最大1時間で10ポイント
    
    const score = Math.max(0, Math.min(100, 100 - errorPenalty + fixedBonus + uptimeFactor));
    return score;
  };

  // 自動修復処理（実際のMCP Playwrightを使用）
  const startAutoFix = async (errorsToFix?: ExtendedBrowserError[]) => {
    if (isFixing || !autoRepairEngine.current) return;

    const targetErrors = errorsToFix || errors.filter(e => !e.fixed);
    if (targetErrors.length === 0) return;

    setIsFixing(true);
    console.log(`🔧 ${targetErrors.length} 件のエラーの自動修復を開始...`);

    try {
      for (const errorToFix of targetErrors) {
        try {
          console.log(`🔄 修復中: ${errorToFix.message}`);

          // 実際の修復を実行
          const repairResult = await autoRepairEngine.current.repairError(errorToFix);

          // エラー状態を更新
          setErrors(prev => prev.map(error => 
            error.id === errorToFix.id 
              ? { 
                  ...error, 
                  fixed: repairResult.success,
                  fixAttempts: (error.fixAttempts || 0) + 1,
                  repairHistory: [
                    ...(error.repairHistory || []),
                    `${repairResult.success ? '成功' : '失敗'}: ${repairResult.description || 'N/A'}`
                  ]
                }
              : error
          ));

          if (repairResult.success) {
            console.log(`✅ 修復成功: ${errorToFix.message}`);
            
            // 検証を実行
            if (validationSystem.current) {
              const validationResult = await validationSystem.current.validateAfterRepair(errorToFix);
              
              if (validationResult) {
                setErrors(prev => prev.map(error => 
                  error.id === errorToFix.id 
                    ? { ...error, validationPassed: validationResult.overallScore > 80 }
                    : error
                ));
              }
            }

            onErrorFixed?.(errorToFix);
          } else {
            console.log(`❌ 修復失敗: ${errorToFix.message} - ${repairResult.error || 'unknown error'}`);
          }

          // 修復間隔
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ エラー修復中に例外発生:`, error);
        }
      }
    } finally {
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
      } else {
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
    } catch (error) {
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
      } else {
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
    } catch (error) {
      console.error('❌ 無限ループ状態の切り替えに失敗:', error);
    }
  };

  // 手動修復
  const fixError = async (error: ExtendedBrowserError) => {
    setIsFixing(true);
    try {
      console.log(`🔧 手動修復を開始: ${error.message}`);
      await startAutoFix([error]);
    } catch (error) {
      console.error('❌ 手動修復に失敗:', error);
    } finally {
      setIsFixing(false);
    }
  };

  // エラー詳細表示
  const showErrorDetails = (error: ExtendedBrowserError) => {
    setSelectedError(error);
    setDetailsOpen(true);
  };

  // エラー統計のリセット
  const resetStats = async () => {
    try {
      console.log('🔄 統計情報をリセット中...');
      
      // システムを停止
      if (isMonitoring) {
        await toggleMonitoring();
      }
      if (infiniteLoop) {
        await toggleInfiniteLoop();
      }
      
      // 状態をリセット
      setErrors([]);
      setStats({
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
      
      systemStartTime.current = new Date();
      console.log('✅ 統計情報をリセットしました');
      
    } catch (error) {
      console.error('❌ 統計リセットに失敗:', error);
    }
  };

  // アコーディオンの展開制御
  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  // 時間フォーマット関数
  const formatUptime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}日 ${hours % 24}時間 ${minutes % 60}分`;
    } else if (hours > 0) {
      return `${hours}時間 ${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  // エラータイプアイコンを取得
  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'console': return <CodeIcon />;
      case 'network': return <NetworkCheckIcon />;
      case 'javascript': return <BugReportIcon />;
      case 'security': return <SecurityIcon />;
      case 'accessibility': return <VisibilityIcon />;
      default: return <ErrorIcon />;
    }
  };

  // 初期化とクリーンアップ
  useEffect(() => {
    // システムを初期化
    initializeSystem();

    return () => {
      // クリーンアップ
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
      
      // サービスをクリーンアップ
      if (mcpDetector.current) {
        mcpDetector.current.stopMonitoring().catch(console.error);
      }
      if (infiniteLoopController.current) {
        infiniteLoopController.current.stopInfiniteLoop().catch(console.error);
      }
    };
  }, []);

  // 自動開始
  useEffect(() => {
    if (autoStart && !isMonitoring && mcpDetector.current) {
      toggleMonitoring();
    }
  }, [autoStart, mcpDetector.current]);

  // 統計情報の定期更新
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(updateSystemStats, 2000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const unfixedErrors = errors.filter(e => !e.fixed);
  const criticalErrors = errors.filter(e => e.type === 'error' && !e.fixed);

  return (
    <Box sx={{ p: 3 }}>
      {/* メインコントロールパネル */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <BugReportIcon sx={{ mr: 1 }} />
            ブラウザエラー検知・修復システム
          </Typography>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant={isMonitoring ? "contained" : "outlined"}
                  color={isMonitoring ? "error" : "primary"}
                  startIcon={isMonitoring ? <StopIcon /> : <PlayIcon />}
                  onClick={toggleMonitoring}
                  disabled={isFixing}
                >
                  {isMonitoring ? '監視停止' : '監視開始'}
                </Button>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoFix}
                      onChange={(e) => setAutoFix(e.target.checked)}
                      disabled={isFixing}
                    />
                  }
                  label="自動修復"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={infiniteLoop}
                      onChange={toggleInfiniteLoop}
                      disabled={isFixing}
                    />
                  }
                  label="無限ループ"
                />
                
                <IconButton onClick={resetStats} disabled={isFixing}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="textSecondary">
                監視対象: {targetUrl}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                最終チェック: {stats.lastCheck.toLocaleTimeString()}
              </Typography>
            </Grid>
          </Grid>
          
          {isFixing && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                エラーを自動修復中...
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 統計情報 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error">
              {stats.totalErrors}
            </Typography>
            <Typography variant="body2">総エラー数</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {stats.fixedErrors}
            </Typography>
            <Typography variant="body2">修復済み</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {unfixedErrors.length}
            </Typography>
            <Typography variant="body2">未修復</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {stats.successRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2">修復成功率</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 進行状況 */}
      {isMonitoring && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              監視状況
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 2 }}>
                サイクル: {stats.cycleCount}
              </Typography>
              <Chip 
                icon={stats.activeMonitoring ? <VisibilityIcon /> : <StopIcon />}
                label={stats.activeMonitoring ? "監視中" : "停止中"}
                color={stats.activeMonitoring ? "success" : "default"}
                size="small"
              />
            </Box>
            <LinearProgress 
              variant="indeterminate" 
              sx={{ 
                height: 6, 
                borderRadius: 3,
                display: stats.activeMonitoring ? 'block' : 'none'
              }} 
            />
          </CardContent>
        </Card>
      )}

      {/* エラーリスト */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              検出されたエラー
            </Typography>
            {criticalErrors.length > 0 && (
              <Badge badgeContent={criticalErrors.length} color="error">
                <ErrorIcon />
              </Badge>
            )}
          </Box>
          
          {errors.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              現在エラーは検出されていません
            </Alert>
          ) : (
            <List>
              {errors.map((error) => (
                <ListItem
                  key={error.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: error.fixed ? 'success.light' : 'background.paper'
                  }}
                >
                  <ListItemIcon>
                    {error.fixed ? (
                      <CheckCircleIcon color="success" />
                    ) : error.type === 'error' ? (
                      <ErrorIcon color="error" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {error.message}
                        </Typography>
                        <Chip
                          label={error.type}
                          size="small"
                          color={error.type === 'error' ? 'error' : 'warning'}
                        />
                        {error.fixAttempts > 0 && (
                          <Chip
                            label={`修復試行: ${error.fixAttempts}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {error.source}
                        </Typography>
                        <Typography variant="caption">
                          {error.timestamp.toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="詳細表示">
                      <IconButton onClick={() => showErrorDetails(error)}>
                        <AssessmentIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {!error.fixed && (
                      <Tooltip title="手動修復">
                        <IconButton 
                          onClick={() => fixError(error)}
                          disabled={isFixing}
                        >
                          <BuildIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* エラー詳細ダイアログ */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          エラー詳細情報
        </DialogTitle>
        <DialogContent>
          {selectedError && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedError.message}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ソース: {selectedError.source}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                発生時刻: {selectedError.timestamp.toLocaleString()}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                タイプ: {selectedError.type}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                修復試行回数: {selectedError.fixAttempts}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ステータス: {selectedError.fixed ? '修復済み' : '未修復'}
              </Typography>
              
              {selectedError.stack && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    スタックトレース:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedError.stack}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedError && !selectedError.fixed && (
            <Button 
              onClick={() => {
                fixError(selectedError);
                setDetailsOpen(false);
              }}
              startIcon={<BuildIcon />}
              disabled={isFixing}
            >
              修復実行
            </Button>
          )}
          <Button onClick={() => setDetailsOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BrowserErrorMonitor;