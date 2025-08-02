import React, { useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Typography,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  AdminPanelSettings as AdminIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

// コンポーネントのインポート
import BrowserErrorMonitor from '../components/error-monitor/BrowserErrorMonitor';
import BrowserErrorAdminDashboard from '../components/admin/BrowserErrorAdminDashboard';
import RealtimeErrorReport from '../components/error-monitor/RealtimeErrorReport';

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
      id={`monitor-tabpanel-${index}`}
      aria-labelledby={`monitor-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const BrowserErrorMonitorPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    autoStart: false,
    enableNotifications: true,
    debugMode: false,
    maxConcurrentRepairs: 3,
    monitoringInterval: 5000
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSystemInitialization = () => {
    setIsInitialized(true);
    console.log('ブラウザエラー監視システムを初期化しました');
  };

  const handleSettingsSave = () => {
    console.log('設定を保存しました:', systemSettings);
    setSettingsOpen(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ページヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ display: 'flex', alignItems: 'center' }}
          aria-label="MCP Playwright WebUI ブラウザエラー検知・修復システム"
        >
          <SecurityIcon 
            sx={{ mr: 2, fontSize: 40 }} 
            aria-hidden="true"
            color="primary"
          />
          MCP Playwright WebUI ブラウザエラー検知・修復システム
        </Typography>
        <Typography 
          variant="h6" 
          color="textSecondary" 
          gutterBottom
          aria-label="監視対象URL: http://192.168.3.135:3000"
        >
          http://192.168.3.135:3000 での自動エラー検知・修復・検証システム
        </Typography>
        
        {!isInitialized && (
          <Alert 
            severity="warning" 
            sx={{ mt: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleSystemInitialization}
                aria-label="システムを初期化"
                aria-describedby="init-help-text"
              >
                初期化
              </Button>
            }
            role="status"
            aria-live="polite"
          >
            システムが初期化されていません。初期化ボタンをクリックして開始してください。
            <Typography 
              variant="srOnly" 
              id="init-help-text"
            >
              初期化により、ブラウザエラー検知システムとMCP Playwrightが起動されます
            </Typography>
          </Alert>
        )}
        
        {isInitialized && (
          <Alert 
            severity="success" 
            sx={{ mt: 2 }}
            role="status"
            aria-live="polite"
          >
            システムは正常に初期化されました。監視を開始できます。
          </Alert>
        )}
      </Box>

      {/* システム概要 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          システム概要
        </Typography>
        <Typography variant="body1" paragraph>
          このシステムは以下の機能を提供します：
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>ブラウザの開発者コンソールエラーの自動検知</li>
          <li>検知されたエラーの自動修復処理</li>
          <li>修復後の内部検証システム</li>
          <li>エラーが出力されなくなるまでの無限ループ実行</li>
          <li>リアルタイム監視とレポート生成</li>
          <li>管理者向けダッシュボードとコントロールパネル</li>
        </Box>
      </Paper>

      {/* メインタブナビゲーション */}
      <Paper sx={{ mb: 2 }} elevation={2}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="ブラウザエラー監視システムのタブ"
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '1rem',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&.Mui-selected': {
                fontWeight: 'bold',
              },
            },
          }}
        >
          <Tab 
            label="エラー監視" 
            icon={<MonitorIcon aria-hidden="true" />} 
            id="monitor-tab-0"
            aria-controls="monitor-tabpanel-0"
            aria-label="エラー監視タブ - リアルタイムでブラウザエラーを監視"
          />
          <Tab 
            label="管理ダッシュボード" 
            icon={<AdminIcon aria-hidden="true" />} 
            id="monitor-tab-1"
            aria-controls="monitor-tabpanel-1"
            aria-label="管理ダッシュボードタブ - システム全体の監視と制御"
          />
          <Tab 
            label="リアルタイムレポート" 
            icon={<ReportIcon aria-hidden="true" />} 
            id="monitor-tab-2"
            aria-controls="monitor-tabpanel-2"
            aria-label="リアルタイムレポートタブ - エラー検知と修復の履歴表示"
          />
        </Tabs>
      </Paper>

      {/* タブコンテンツ */}
      
      {/* エラー監視タブ */}
      <TabPanel value={tabValue} index={0}>
        <Paper 
          sx={{ p: { xs: 2, sm: 3 } }} 
          elevation={1}
          role="region"
          aria-labelledby="error-monitor-heading"
        >
          <Typography 
            variant="h5" 
            gutterBottom
            id="error-monitor-heading"
            component="h2"
          >
            ブラウザエラー監視システム
          </Typography>
          <Typography 
            variant="body2" 
            color="textSecondary" 
            gutterBottom
            aria-describedby="error-monitor-description"
          >
            リアルタイムでブラウザのコンソールエラーを監視し、自動修復を実行します。
          </Typography>
          <Box
            sx={{
              mt: 2,
              '& > *': {
                width: '100%',
              },
            }}
          >
            <BrowserErrorMonitor
              targetUrl="http://192.168.3.135:3000"
              autoStart={systemSettings.autoStart}
              onErrorDetected={(error) => {
                console.log('エラー検知:', error);
                if (systemSettings.enableNotifications) {
                  // 通知処理（実装要）
                }
              }}
              onErrorFixed={(error) => {
                console.log('エラー修復:', error);
                if (systemSettings.enableNotifications) {
                  // 通知処理（実装要）
                }
              }}
              onInfiniteLoopStarted={() => {
                console.log('無限ループ監視開始');
              }}
              onInfiniteLoopStopped={() => {
                console.log('無限ループ監視停止');
              }}
            />
          </Box>
        </Paper>
      </TabPanel>

      {/* 管理ダッシュボードタブ */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom>
            管理者ダッシュボード
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            システム全体の監視、制御、設定を行います。
          </Typography>
          <BrowserErrorAdminDashboard />
        </Paper>
      </TabPanel>

      {/* リアルタイムレポートタブ */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom>
            リアルタイムエラーレポート
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            エラーの検知、修復、検証の履歴をリアルタイムで表示します。
          </Typography>
          <RealtimeErrorReport />
        </Paper>
      </TabPanel>

      {/* 設定ダイアログ */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          システム設定
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              一般設定
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={systemSettings.autoStart}
                  onChange={(e) => setSystemSettings(prev => ({ 
                    ...prev, 
                    autoStart: e.target.checked 
                  }))}
                />
              }
              label="システム開始時に自動で監視を開始"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={systemSettings.enableNotifications}
                  onChange={(e) => setSystemSettings(prev => ({ 
                    ...prev, 
                    enableNotifications: e.target.checked 
                  }))}
                />
              }
              label="エラー検知・修復時の通知を有効にする"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={systemSettings.debugMode}
                  onChange={(e) => setSystemSettings(prev => ({ 
                    ...prev, 
                    debugMode: e.target.checked 
                  }))}
                />
              }
              label="デバッグモードを有効にする"
            />

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              パフォーマンス設定
            </Typography>
            
            <Typography variant="body2" gutterBottom>
              最大同時修復数: {systemSettings.maxConcurrentRepairs}
            </Typography>
            
            <Typography variant="body2" gutterBottom>
              監視間隔: {systemSettings.monitoringInterval}ms
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSettingsSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* フッター情報 */}
      <Paper sx={{ p: 2, mt: 4, backgroundColor: 'grey.50' }}>
        <Typography variant="body2" color="textSecondary" align="center">
          MCP Playwright WebUI ブラウザエラー検知・修復システム v1.0.0
          <br />
          対象URL: http://192.168.3.135:3000 | バックエンドAPI: http://192.168.3.135:8000
          <br />
          React/Material-UI ベース | WAI-ARIA準拠 | レスポンシブデザイン対応
        </Typography>
      </Paper>
    </Container>
  );
};

export default BrowserErrorMonitorPage;