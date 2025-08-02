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
  IconButton
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
  Settings as SettingsIcon
} from '@mui/icons-material';

interface ConsoleError {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: Date;
  stack?: string;
  fixed: boolean;
  fixAttempts: number;
}

interface MonitoringStats {
  totalErrors: number;
  fixedErrors: number;
  activeMonitoring: boolean;
  lastCheck: Date;
  cycleCount: number;
  successRate: number;
}

interface BrowserErrorMonitorProps {
  targetUrl?: string;
  autoStart?: boolean;
  onErrorDetected?: (error: ConsoleError) => void;
  onErrorFixed?: (error: ConsoleError) => void;
}

const BrowserErrorMonitor: React.FC<BrowserErrorMonitorProps> = ({
  targetUrl = 'http://192.168.3.135:3000',
  autoStart = false,
  onErrorDetected,
  onErrorFixed
}) => {
  const [isMonitoring, setIsMonitoring] = useState(autoStart);
  const [errors, setErrors] = useState<ConsoleError[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    totalErrors: 0,
    fixedErrors: 0,
    activeMonitoring: false,
    lastCheck: new Date(),
    cycleCount: 0,
    successRate: 0
  });
  const [isFixing, setIsFixing] = useState(false);
  const [selectedError, setSelectedError] = useState<ConsoleError | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [autoFix, setAutoFix] = useState(true);
  const [infiniteLoop, setInfiniteLoop] = useState(false);
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);
  const fixingQueue = useRef<ConsoleError[]>([]);

  // エラー検知関数
  const detectErrors = async () => {
    try {
      // Playwright による実際のページ検査をシミュレート
      const mockErrors: ConsoleError[] = [
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
      const newErrors = mockErrors.filter(
        mockError => !errors.some(existingError => existingError.message === mockError.message)
      );

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

    } catch (error) {
      console.error('Error detection failed:', error);
    }
  };

  // 自動修復処理
  const startAutoFix = async () => {
    if (isFixing || fixingQueue.current.length === 0) return;

    setIsFixing(true);

    while (fixingQueue.current.length > 0) {
      const errorToFix = fixingQueue.current.shift();
      if (!errorToFix) break;

      try {
        // エラー修復のシミュレート
        await new Promise(resolve => setTimeout(resolve, 2000)); // 修復時間をシミュレート

        // 修復成功の確率をシミュレート
        const fixSuccess = Math.random() > 0.3; // 70%の成功率

        setErrors(prev => prev.map(error => 
          error.id === errorToFix.id 
            ? { 
                ...error, 
                fixed: fixSuccess,
                fixAttempts: error.fixAttempts + 1
              }
            : error
        ));

        if (fixSuccess) {
          setStats(prev => ({
            ...prev,
            fixedErrors: prev.fixedErrors + 1,
            successRate: prev.totalErrors > 0 ? ((prev.fixedErrors + 1) / prev.totalErrors) * 100 : 100
          }));
          onErrorFixed?.(errorToFix);
        } else if (errorToFix.fixAttempts < 3) {
          // 修復失敗時は再試行キューに追加
          fixingQueue.current.push({
            ...errorToFix,
            fixAttempts: errorToFix.fixAttempts + 1
          });
        }

      } catch (error) {
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
    } else {
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
  const fixError = async (error: ConsoleError) => {
    setIsFixing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setErrors(prev => prev.map(e => 
        e.id === error.id 
          ? { ...e, fixed: true, fixAttempts: e.fixAttempts + 1 }
          : e
      ));
      
      setStats(prev => ({
        ...prev,
        fixedErrors: prev.fixedErrors + 1,
        successRate: prev.totalErrors > 0 ? ((prev.fixedErrors + 1) / prev.totalErrors) * 100 : 100
      }));
      
      onErrorFixed?.(error);
    } catch (error) {
      console.error('Manual fix failed:', error);
    } finally {
      setIsFixing(false);
    }
  };

  // エラー詳細表示
  const showErrorDetails = (error: ConsoleError) => {
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