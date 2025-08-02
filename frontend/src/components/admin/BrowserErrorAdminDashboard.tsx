import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Error as ErrorIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  Emergency as EmergencyIcon,
  TrendingUp as TrendingUpIcon,
  AutoMode as AutoModeIcon
} from '@mui/icons-material';

// Services
import { errorDetectionEngine } from '../../services/errorDetectionEngine';
import { autoRepairEngine } from '../../services/autoRepairEngine';
import { validationSystem } from '../../services/validationSystem';
import { InfiniteLoopMonitor, defaultInfiniteLoopConfig } from '../../services/infiniteLoopMonitor';

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BrowserErrorAdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [infiniteLoopMonitor, setInfiniteLoopMonitor] = useState<InfiniteLoopMonitor | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    errorDetection: false,
    autoRepair: false,
    infiniteLoop: false,
    validation: false
  });
  
  const [statistics, setStatistics] = useState({
    totalErrors: 0,
    fixedErrors: 0,
    activeMonitoring: false,
    successRate: 0,
    averageFixTime: 0,
    loopSessions: 0
  });

  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // 初期化
  useEffect(() => {
    const monitor = new InfiniteLoopMonitor(
      errorDetectionEngine,
      autoRepairEngine,
      validationSystem,
      defaultInfiniteLoopConfig
    );

    // イベントリスナーの設定
    monitor.onIterationComplete((iteration) => {
      console.log('反復完了:', iteration);
      updateStatistics();
    });

    monitor.onErrorFixed((error, repair) => {
      console.log('エラー修復:', error.id);
      updateStatistics();
    });

    monitor.onEmergencyStop((reason, session) => {
      console.log('緊急停止:', reason);
      setSystemStatus(prev => ({ ...prev, infiniteLoop: false }));
    });

    monitor.onSuccess((session) => {
      console.log('成功完了:', session.id);
      setSystemStatus(prev => ({ ...prev, infiniteLoop: false }));
    });

    setInfiniteLoopMonitor(monitor);
    updateStatistics();

    // 定期的な統計更新
    const interval = setInterval(updateStatistics, 5000);

    return () => {
      clearInterval(interval);
      monitor.dispose();
    };
  }, []);

  // 統計情報の更新
  const updateStatistics = () => {
    if (!infiniteLoopMonitor) return;

    const repairStats = autoRepairEngine.getRepairStatistics();
    const loopStats = infiniteLoopMonitor.getStatistics();
    const currentLoopSession = infiniteLoopMonitor.getCurrentSession();

    setStatistics({
      totalErrors: repairStats.total,
      fixedErrors: repairStats.successful,
      activeMonitoring: infiniteLoopMonitor.isMonitoringActive(),
      successRate: repairStats.successRate,
      averageFixTime: 2.5, // 実装要
      loopSessions: loopStats.totalSessions
    });

    setCurrentSession(currentLoopSession);
    setSessionHistory(infiniteLoopMonitor.getSessionHistory());
  };

  // 無限ループ監視の開始/停止
  const toggleInfiniteLoop = async () => {
    if (!infiniteLoopMonitor) return;

    if (systemStatus.infiniteLoop) {
      infiniteLoopMonitor.stopInfiniteLoop();
      setSystemStatus(prev => ({ ...prev, infiniteLoop: false }));
    } else {
      try {
        await infiniteLoopMonitor.startInfiniteLoop('http://192.168.3.135:3000');
        setSystemStatus(prev => ({ ...prev, infiniteLoop: true }));
      } catch (error) {
        console.error('無限ループ開始エラー:', error);
      }
    }
  };

  // エラー検知の開始/停止
  const toggleErrorDetection = async () => {
    try {
      if (systemStatus.errorDetection) {
        errorDetectionEngine.stopMonitoring();
        setSystemStatus(prev => ({ ...prev, errorDetection: false }));
      } else {
        await errorDetectionEngine.startMonitoring();
        setSystemStatus(prev => ({ ...prev, errorDetection: true }));
      }
    } catch (error) {
      console.error('エラー検知切り替えエラー:', error);
    }
  };

  // レポートの表示
  const showReport = (report: any) => {
    setSelectedReport(report);
    setReportDialogOpen(true);
  };

  // レポートのダウンロード
  const downloadReport = (report: any) => {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-monitor-report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 2 }} />
          ブラウザエラー監視システム 管理ダッシュボード
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setConfigDialogOpen(true)}
          >
            設定
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={updateStatistics}
          >
            更新
          </Button>
        </Box>
      </Box>

      {/* システム状態概要 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="error">
                    {statistics.totalErrors}
                  </Typography>
                  <Typography variant="body2">総エラー数</Typography>
                </Box>
                <ErrorIcon color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="success.main">
                    {statistics.fixedErrors}
                  </Typography>
                  <Typography variant="body2">修復済み</Typography>
                </Box>
                <CheckCircleIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="info.main">
                    {statistics.successRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">修復成功率</Typography>
                </Box>
                <TrendingUpIcon color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="warning.main">
                    {statistics.loopSessions}
                  </Typography>
                  <Typography variant="body2">ループセッション</Typography>
                </Box>
                <AutoModeIcon color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* システム制御パネル */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            システム制御
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={systemStatus.errorDetection}
                    onChange={toggleErrorDetection}
                    color="primary"
                  />
                }
                label="エラー検知"
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant={systemStatus.infiniteLoop ? "contained" : "outlined"}
                  color={systemStatus.infiniteLoop ? "error" : "primary"}
                  startIcon={systemStatus.infiniteLoop ? <StopIcon /> : <PlayIcon />}
                  onClick={toggleInfiniteLoop}
                  size="small"
                >
                  {systemStatus.infiniteLoop ? '停止' : '開始'}
                </Button>
                <Typography variant="body2">無限ループ監視</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              {statistics.activeMonitoring && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    監視状態
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* メインコンテンツタブ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="admin dashboard tabs"
        >
          <Tab label="ダッシュボード" icon={<DashboardIcon />} />
          <Tab label="ライブ監視" icon={<VisibilityIcon />} />
          <Tab label="修復履歴" icon={<BuildIcon />} />
          <Tab label="レポート" icon={<AssessmentIcon />} />
          <Tab label="設定" icon={<SettingsIcon />} />
        </Tabs>
      </Box>

      {/* ダッシュボードタブ */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* 現在のセッション情報 */}
          {currentSession && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    現在のセッション
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        セッションID: {currentSession.id}
                      </Typography>
                      <Typography variant="body2">
                        ステータス: 
                        <Chip 
                          label={currentSession.status} 
                          color={currentSession.status === 'running' ? 'primary' : 'default'}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2">
                        開始時刻: {currentSession.startTime.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        反復回数: {currentSession.iterations.length}
                      </Typography>
                      <Typography variant="body2">
                        検出エラー: {currentSession.totalErrors}
                      </Typography>
                      <Typography variant="body2">
                        修復成功: {currentSession.successfulRepairs}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* 統計チャート領域（将来実装） */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  エラー推移
                </Typography>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    チャートエリア（将来実装）
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 最近のアクティビティ */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  最近のアクティビティ
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="エラー修復完了"
                      secondary="2分前"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="新しいエラーを検出"
                      secondary="5分前"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AutoModeIcon color="info" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="無限ループ監視開始"
                      secondary="10分前"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ライブ監視タブ */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert 
              severity={statistics.activeMonitoring ? "info" : "warning"}
              action={
                <Button 
                  color="inherit" 
                  size="small"
                  onClick={toggleErrorDetection}
                >
                  {statistics.activeMonitoring ? '停止' : '開始'}
                </Button>
              }
            >
              {statistics.activeMonitoring 
                ? 'システムは現在監視中です' 
                : 'システム監視が停止しています'
              }
            </Alert>
          </Grid>

          {/* リアルタイム統計 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  リアルタイム統計
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <CircularProgress 
                        variant="determinate" 
                        value={statistics.successRate} 
                        size={80}
                      />
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {statistics.successRate.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2">
                        修復成功率
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error">
                        {statistics.totalErrors}
                      </Typography>
                      <Typography variant="body2">
                        総エラー数
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {statistics.fixedErrors}
                      </Typography>
                      <Typography variant="body2">
                        修復済み
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {statistics.averageFixTime}s
                      </Typography>
                      <Typography variant="body2">
                        平均修復時間
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* 修復履歴タブ */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              修復履歴
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>時刻</TableCell>
                    <TableCell>エラータイプ</TableCell>
                    <TableCell>ソース</TableCell>
                    <TableCell>修復状態</TableCell>
                    <TableCell>試行回数</TableCell>
                    <TableCell>アクション</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* 修復履歴のサンプルデータ */}
                  {[1, 2, 3, 4, 5].map((item) => (
                    <TableRow key={item}>
                      <TableCell>
                        {new Date(Date.now() - item * 300000).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="JavaScript Error" 
                          color="error" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        /src/components/Dashboard.tsx
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item % 2 === 0 ? "成功" : "失敗"} 
                          color={item % 2 === 0 ? "success" : "error"}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{item}</TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* レポートタブ */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    セッションレポート
                  </Typography>
                  <Button
                    startIcon={<DownloadIcon />}
                    variant="outlined"
                    size="small"
                  >
                    すべてダウンロード
                  </Button>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>セッションID</TableCell>
                        <TableCell>開始時刻</TableCell>
                        <TableCell>ステータス</TableCell>
                        <TableCell>反復回数</TableCell>
                        <TableCell>修復成功率</TableCell>
                        <TableCell>アクション</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessionHistory.slice(0, 10).map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            {session.id.substring(0, 12)}...
                          </TableCell>
                          <TableCell>
                            {session.startTime.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={session.status}
                              color={
                                session.status === 'success' ? 'success' :
                                session.status === 'emergency_stop' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{session.iterations.length}</TableCell>
                          <TableCell>
                            {session.totalRepairs > 0 
                              ? ((session.successfulRepairs / session.totalRepairs) * 100).toFixed(1)
                              : '0'
                            }%
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small"
                              onClick={() => showReport(session)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => downloadReport(session)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* 設定タブ */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  監視設定
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="自動修復を有効にする"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="修復後の内部検証を有効にする"
                  />
                  <FormControlLabel
                    control={<Switch />}
                    label="緊急停止を有効にする"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="リアルタイム通知を有効にする"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  パフォーマンス設定
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2">
                    監視間隔: 5秒
                  </Typography>
                  <Typography variant="body2">
                    最大反復回数: 50回
                  </Typography>
                  <Typography variant="body2">
                    成功閾値: 3回連続
                  </Typography>
                  <Typography variant="body2">
                    タイムアウト: 30秒
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* レポート詳細ダイアログ */}
      <Dialog 
        open={reportDialogOpen} 
        onClose={() => setReportDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          セッション詳細レポート
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Typography variant="h6" gutterBottom>
                セッション: {selectedReport.id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                実行時間: {selectedReport.startTime.toLocaleString()} - 
                {selectedReport.endTime?.toLocaleString() || '実行中'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                ステータス: {selectedReport.status}
              </Typography>
              <Typography variant="body2" gutterBottom>
                最終レポート: {selectedReport.finalReport}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                反復詳細
              </Typography>
              <List>
                {selectedReport.iterations?.map((iteration: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`反復 ${iteration.number}: ${iteration.summary}`}
                      secondary={`エラー: ${iteration.errorsDetected.length}, 修復: ${iteration.successfulRepairs}/${iteration.repairSessions.length}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>
            閉じる
          </Button>
          {selectedReport && (
            <Button 
              onClick={() => downloadReport(selectedReport)}
              startIcon={<DownloadIcon />}
            >
              ダウンロード
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BrowserErrorAdminDashboard;