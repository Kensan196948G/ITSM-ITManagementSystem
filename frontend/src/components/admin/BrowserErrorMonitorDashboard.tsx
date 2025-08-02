/**
 * ブラウザエラー監視管理者ダッシュボード
 * MCP Playwrightエラー検知・修復システムの管理画面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Accessibility as AccessibilityIcon,
} from '@mui/icons-material';

// サービスのインポート（実際の実装では適切なパスに調整）
import { MCPPlaywrightErrorDetector, BrowserError, defaultConfig } from '../../services/mcpPlaywrightErrorDetector';
import { InfiniteLoopController, LoopStatus, LoopIteration, defaultInfiniteLoopConfig } from '../../services/infiniteLoopController';
import { ValidationSystem, ValidationReport } from '../../services/validationSystem';

interface DashboardState {
  isMonitoring: boolean;
  detectorStatus: any;
  loopStatus: LoopStatus | null;
  validationReport: ValidationReport | null;
  loading: boolean;
  error: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const BrowserErrorMonitorDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    isMonitoring: false,
    detectorStatus: null,
    loopStatus: null,
    validationReport: null,
    loading: false,
    error: null,
  });

  const [tabValue, setTabValue] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<BrowserError | null>(null);

  // システムインスタンス（実際の実装では適切な依存性注入が必要）
  const [detector] = useState(() => new MCPPlaywrightErrorDetector(defaultConfig));
  const [loopController] = useState(() => new InfiniteLoopController(defaultConfig, defaultInfiniteLoopConfig));
  const [validationSystem] = useState(() => new ValidationSystem());

  /**
   * データを更新
   */
  const updateData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const detectorStatus = detector.getStatus();
      const loopStatus = loopController.getStatus();
      const validationReport = validationSystem.getLatestValidationResult();

      setState(prev => ({
        ...prev,
        detectorStatus,
        loopStatus,
        validationReport,
        isMonitoring: detectorStatus.isMonitoring,
        loading: false,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `データ更新エラー: ${error.message}`,
        loading: false,
      }));
    }
  }, [detector, loopController, validationSystem]);

  /**
   * 監視を開始
   */
  const startMonitoring = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await detector.initialize();
      await detector.startMonitoring();
      await loopController.startInfiniteLoop();

      setState(prev => ({ ...prev, isMonitoring: true, loading: false }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `監視開始エラー: ${error.message}`,
        loading: false,
      }));
    }
  };

  /**
   * 監視を停止
   */
  const stopMonitoring = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await detector.stopMonitoring();
      await loopController.stopInfiniteLoop();

      setState(prev => ({ ...prev, isMonitoring: false, loading: false }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `監視停止エラー: ${error.message}`,
        loading: false,
      }));
    }
  };

  /**
   * データを定期的に更新
   */
  useEffect(() => {
    updateData();
    
    const interval = setInterval(updateData, 5000); // 5秒ごとに更新
    
    return () => clearInterval(interval);
  }, [updateData]);

  /**
   * エラー詳細を表示
   */
  const showErrorDetails = (error: BrowserError) => {
    setSelectedError(error);
    setDetailsOpen(true);
  };

  /**
   * レポートをダウンロード
   */
  const downloadReport = (type: 'detector' | 'validation' | 'loop') => {
    try {
      let data: any;
      let filename: string;

      switch (type) {
        case 'detector':
          data = detector.generateReport();
          filename = `detector-report-${new Date().toISOString()}.json`;
          break;
        case 'validation':
          data = state.validationReport;
          filename = `validation-report-${new Date().toISOString()}.json`;
          break;
        case 'loop':
          data = {
            status: state.loopStatus,
            iterations: loopController.getIterationHistory(),
          };
          filename = `loop-report-${new Date().toISOString()}.json`;
          break;
        default:
          return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `レポートダウンロードエラー: ${error.message}`,
      }));
    }
  };

  /**
   * ヘルススコアの色を取得
   */
  const getHealthScoreColor = (score: number): string => {
    if (score >= 90) return '#4caf50'; // green
    if (score >= 70) return '#ff9800'; // orange  
    if (score >= 50) return '#f44336'; // red
    return '#9e9e9e'; // grey
  };

  /**
   * ステータスチップのプロパティを取得
   */
  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'running':
      case 'passed':
        return { color: 'success' as const, icon: <CheckCircleIcon /> };
      case 'warning':
        return { color: 'warning' as const, icon: <WarningIcon /> };
      case 'failed':
      case 'error':
        return { color: 'error' as const, icon: <ErrorIcon /> };
      default:
        return { color: 'default' as const, icon: <InfoIcon /> };
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          🔍 ブラウザエラー監視システム
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={state.isMonitoring}
                onChange={state.isMonitoring ? stopMonitoring : startMonitoring}
                disabled={state.loading}
                color="primary"
              />
            }
            label={state.isMonitoring ? '監視中' : '停止中'}
          />
          
          <Tooltip title="データを更新">
            <IconButton onClick={updateData} disabled={state.loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="設定">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* エラー表示 */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
          <AlertTitle>エラー</AlertTitle>
          {state.error}
        </Alert>
      )}

      {/* ローディング */}
      {state.loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* ステータスカード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    監視ステータス
                  </Typography>
                  <Typography variant="h6">
                    {state.isMonitoring ? '🟢 アクティブ' : '🔴 停止中'}
                  </Typography>
                </Box>
                <BugReportIcon color={state.isMonitoring ? 'success' : 'disabled'} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    検知エラー数
                  </Typography>
                  <Typography variant="h6">
                    {state.detectorStatus?.totalErrors || 0}
                  </Typography>
                </Box>
                <ErrorIcon color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    修復成功数
                  </Typography>
                  <Typography variant="h6">
                    {state.detectorStatus?.successfulRepairs || 0}
                  </Typography>
                </Box>
                <BuildIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    ヘルススコア
                  </Typography>
                  <Typography variant="h6" sx={{ color: getHealthScoreColor(state.loopStatus?.overallHealthScore || 0) }}>
                    {state.loopStatus?.overallHealthScore?.toFixed(1) || 'N/A'}
                  </Typography>
                </Box>
                <SpeedIcon />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タブナビゲーション */}
      <Card>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} variant="scrollable">
          <Tab label="📊 リアルタイム監視" icon={<TimelineIcon />} iconPosition="start" />
          <Tab label="🔧 エラー・修復状況" icon={<BuildIcon />} iconPosition="start" />
          <Tab label="✅ 検証結果" icon={<CheckCircleIcon />} iconPosition="start" />
          <Tab label="🔄 ループ制御" icon={<RefreshIcon />} iconPosition="start" />
          <Tab label="📈 パフォーマンス" icon={<SpeedIcon />} iconPosition="start" />
        </Tabs>

        {/* リアルタイム監視タブ */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader 
                  title="🔍 リアルタイム監視状況" 
                  action={
                    <Button
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadReport('detector')}
                      size="small"
                    >
                      レポート
                    </Button>
                  }
                />
                <CardContent>
                  {state.detectorStatus?.recentErrors?.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>時刻</TableCell>
                            <TableCell>タイプ</TableCell>
                            <TableCell>レベル</TableCell>
                            <TableCell>メッセージ</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {state.detectorStatus.recentErrors.map((error: BrowserError) => (
                            <TableRow key={error.id}>
                              <TableCell>
                                {new Date(error.timestamp).toLocaleTimeString()}
                              </TableCell>
                              <TableCell>
                                <Chip label={error.type} size="small" />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  {...getStatusChipProps(error.level)}
                                  label={error.level}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {error.message}
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => showErrorDetails(error)}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="success">
                      <AlertTitle>✅ システム正常</AlertTitle>
                      現在、エラーは検出されていません。
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="📈 統計情報" />
                <CardContent>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><BugReportIcon /></ListItemIcon>
                      <ListItemText 
                        primary="アクティブブラウザ"
                        secondary={state.detectorStatus?.activeBrowsers || 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><VisibilityIcon /></ListItemIcon>
                      <ListItemText 
                        primary="監視中ページ"
                        secondary={state.detectorStatus?.activePages || 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><BuildIcon /></ListItemIcon>
                      <ListItemText 
                        primary="総修復数"
                        secondary={state.detectorStatus?.totalRepairs || 0}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* エラー・修復状況タブ */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="🔧 最近の修復活動" />
                <CardContent>
                  {state.detectorStatus?.recentRepairs?.length > 0 ? (
                    <Box>
                      {state.detectorStatus.recentRepairs.map((repair: any, index: number) => (
                        <Accordion key={index}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Chip 
                                {...getStatusChipProps(repair.success ? 'passed' : 'failed')}
                                label={repair.success ? '成功' : '失敗'}
                                size="small"
                              />
                              <Typography sx={{ flexGrow: 1 }}>
                                {repair.description || repair.type}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {new Date(repair.timestamp).toLocaleString()}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                              {JSON.stringify(repair, null, 2)}
                            </pre>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      修復活動はまだありません。
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 検証結果タブ */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader 
                  title="✅ 最新検証結果"
                  action={
                    <Button
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadReport('validation')}
                      size="small"
                      disabled={!state.validationReport}
                    >
                      レポート
                    </Button>
                  }
                />
                <CardContent>
                  {state.validationReport ? (
                    <Box>
                      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <Chip 
                          {...getStatusChipProps(state.validationReport.status)}
                          label={state.validationReport.status}
                        />
                        <Typography variant="h6">
                          スコア: {state.validationReport.overallScore.toFixed(1)}/100
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {state.validationReport.passedTests}/{state.validationReport.totalTests} テスト合格
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        {Object.entries(state.validationReport.summary).map(([category, data]) => (
                          <Grid item xs={6} sm={4} key={category}>
                            <Card variant="outlined">
                              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="h6" sx={{ color: getHealthScoreColor(data.score) }}>
                                  {data.score.toFixed(0)}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {category}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {data.passed}/{data.total}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>

                      {state.validationReport.recommendations.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            💡 推奨事項
                          </Typography>
                          <List dense>
                            {state.validationReport.recommendations.map((rec, index) => (
                              <ListItem key={index}>
                                <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
                                <ListItemText primary={rec} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      検証結果がありません。システムを開始してください。
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="🎯 品質メトリクス" />
                <CardContent>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><AccessibilityIcon /></ListItemIcon>
                      <ListItemText 
                        primary="アクセシビリティ"
                        secondary={`${state.validationReport?.summary.accessibility.score.toFixed(0) || 'N/A'}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SpeedIcon /></ListItemIcon>
                      <ListItemText 
                        primary="パフォーマンス"
                        secondary={`${state.validationReport?.summary.performance.score.toFixed(0) || 'N/A'}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SecurityIcon /></ListItemIcon>
                      <ListItemText 
                        primary="セキュリティ"
                        secondary={`${state.validationReport?.summary.security.score.toFixed(0) || 'N/A'}%`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ループ制御タブ */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="🔄 無限ループ制御システム"
                  action={
                    <Button
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadReport('loop')}
                      size="small"
                    >
                      レポート
                    </Button>
                  }
                />
                <CardContent>
                  {state.loopStatus ? (
                    <Box>
                      <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="h6" color="primary">
                            {state.loopStatus.currentIteration}
                          </Typography>
                          <Typography variant="caption">
                            現在のイテレーション
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="h6" color="success.main">
                            {state.loopStatus.totalRepairsSuccessful}
                          </Typography>
                          <Typography variant="caption">
                            成功した修復
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="h6" color="error.main">
                            {state.loopStatus.totalErrorsDetected}
                          </Typography>
                          <Typography variant="caption">
                            検出エラー総数
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="h6" sx={{ color: getHealthScoreColor(state.loopStatus.overallHealthScore) }}>
                            {state.loopStatus.overallHealthScore.toFixed(1)}
                          </Typography>
                          <Typography variant="caption">
                            全体ヘルススコア
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          実行時間: {Math.floor(state.loopStatus.elapsedTime / 60000)}分
                          {Math.floor((state.loopStatus.elapsedTime % 60000) / 1000)}秒
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((state.loopStatus.currentIteration / 1000) * 100, 100)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      {state.loopStatus.lastIteration && (
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              最新イテレーション結果
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="body2" color="textSecondary">
                                  エラー検知数
                                </Typography>
                                <Typography variant="h6">
                                  {state.loopStatus.lastIteration.errorsDetected}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="body2" color="textSecondary">
                                  修復試行数
                                </Typography>
                                <Typography variant="h6">
                                  {state.loopStatus.lastIteration.repairsAttempted}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="body2" color="textSecondary">
                                  修復成功数
                                </Typography>
                                <Typography variant="h6">
                                  {state.loopStatus.lastIteration.repairsSuccessful}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="body2" color="textSecondary">
                                  ヘルススコア
                                </Typography>
                                <Typography variant="h6" sx={{ color: getHealthScoreColor(state.loopStatus.lastIteration.healthScore) }}>
                                  {state.loopStatus.lastIteration.healthScore.toFixed(1)}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      ループ制御システムが実行されていません。
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* パフォーマンスタブ */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="📈 システムパフォーマンス" />
                <CardContent>
                  <Alert severity="info">
                    パフォーマンス分析機能は実装中です。
                    現在の基本メトリクスは他のタブで確認できます。
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* エラー詳細ダイアログ */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          🔍 エラー詳細情報
        </DialogTitle>
        <DialogContent>
          {selectedError && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    エラーID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedError.id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    発生時刻
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedError.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                メッセージ
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                {selectedError.message}
              </Typography>

              {selectedError.stackTrace && (
                <>
                  <Typography variant="h6" gutterBottom>
                    スタックトレース
                  </Typography>
                  <pre style={{ 
                    fontSize: '0.8rem', 
                    overflow: 'auto', 
                    backgroundColor: '#f5f5f5', 
                    padding: '1rem', 
                    borderRadius: '4px' 
                  }}>
                    {selectedError.stackTrace}
                  </pre>
                </>
              )}

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                コンテキスト情報
              </Typography>
              <pre style={{ 
                fontSize: '0.8rem', 
                overflow: 'auto', 
                backgroundColor: '#f5f5f5', 
                padding: '1rem', 
                borderRadius: '4px' 
              }}>
                {JSON.stringify(selectedError.context, null, 2)}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 設定ダイアログ */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          ⚙️ システム設定
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            設定変更機能は実装中です。
            現在はデフォルト設定で動作しています。
          </Alert>
          
          <Typography variant="h6" gutterBottom>
            監視対象URL
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="http://192.168.3.135:3000" secondary="メインアプリケーション" />
            </ListItem>
            <ListItem>
              <ListItemText primary="http://192.168.3.135:3000/admin" secondary="管理者ダッシュボード" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};