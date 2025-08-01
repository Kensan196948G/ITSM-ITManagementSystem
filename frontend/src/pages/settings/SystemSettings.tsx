/**
 * システム設定メインページ
 * 各設定カテゴリへのナビゲーションと共通機能を提供
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Timer as TimerIcon,
  Timeline as WorkFlowIcon,
  Storage as StorageIcon,
  Link as IntegrationIcon,
  MonitorHeart as MonitorIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

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

const SystemSettings: React.FC = () => {
  const { category = 'general' } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    settings,
    loading,
    error,
    isDirty,
    loadSettings,
    saveSettings,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSystemSettings();

  const [activeTab, setActiveTab] = useState(category);
  const [showHistory, setShowHistory] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    setActiveTab(category);
  }, [category]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
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
      if (!currentCategory || !settings) return;

      await saveSettings(activeTab as any, settings[activeTab as keyof typeof settings]);
      
      setSnackbar({
        open: true,
        message: `${currentCategory.label}の設定を保存しました`,
        severity: 'success'
      });
    } catch (err) {
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
      if (!currentCategory) return;

      await resetSettings(activeTab as any);
      
      setSnackbar({
        open: true,
        message: `${currentCategory.label}をデフォルト値にリセットしました`,
        severity: 'info'
      });
    } catch (err) {
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
    } catch (err) {
      setSnackbar({
        open: true,
        message: '設定のエクスポートに失敗しました',
        severity: 'error'
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importSettings(file);
      setSnackbar({
        open: true,
        message: '設定をインポートしました',
        severity: 'success'
      });
    } catch (err) {
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
    if (!settings) return null;

    switch (activeTab) {
      case 'general':
        return <GeneralSettings settings={settings.general} />;
      case 'security':
        return <SecuritySettings settings={settings.security} />;
      case 'notifications':
        return <NotificationSettings settings={settings.notifications} />;
      case 'sla':
        return <SLASettings settings={settings.sla} />;
      case 'workflows':
        return <WorkflowSettings settings={settings.workflows} />;
      case 'data':
        return <DataSettings settings={settings.data} />;
      case 'integrations':
        return <IntegrationSettings settings={settings.integrations} />;
      case 'monitoring':
        return <MonitoringSettings settings={settings.monitoring} />;
      default:
        return <Typography>設定ページが見つかりません</Typography>;
    }
  };

  const currentCategory = settingCategories.find(cat => cat.id === activeTab);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ cursor: 'pointer' }}
          >
            ダッシュボード
          </Link>
          <Typography color="text.primary">システム設定</Typography>
          {currentCategory && (
            <Typography color="text.primary">{currentCategory.label}</Typography>
          )}
        </Breadcrumbs>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              システム設定
            </Typography>
            {currentCategory && (
              <Typography variant="body1" color="text.secondary">
                {currentCategory.description}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isDirty && (
              <Chip
                icon={<WarningIcon />}
                label="未保存の変更があります"
                color="warning"
                size="small"
              />
            )}
            
            <Tooltip title="履歴を表示">
              <IconButton onClick={() => setShowHistory(true)}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="設定をエクスポート">
              <IconButton onClick={handleExport}>
                <ExportIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="設定をインポート">
              <IconButton component="label">
                <ImportIcon />
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleImport}
                />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="設定を再読み込み">
              <IconButton onClick={loadSettings} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={loading}
              sx={{ ml: 1 }}
            >
              リセット
            </Button>
            
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={loading || !isDirty}
            >
              保存
            </Button>
          </Box>
        </Box>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* サイドタブ */}
        <Paper
          elevation={0}
          sx={{
            width: 280,
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <Tabs
            orientation="vertical"
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                left: 0,
                right: 'auto',
              },
            }}
          >
            {settingCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Tab
                  key={category.id}
                  value={category.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <IconComponent sx={{ mr: 2, fontSize: 20 }} />
                      <Box sx={{ textAlign: 'left', flex: 1 }}>
                        <Typography variant="subtitle2">
                          {category.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{
                    minHeight: 72,
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    px: 2,
                    py: 1.5,
                  }}
                />
              );
            })}
          </Tabs>
        </Paper>

        {/* メインコンテンツ */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderSettingContent()
          )}
        </Box>
      </Box>

      {/* 未保存変更確認ダイアログ */}
      <Dialog open={showUnsavedDialog} onClose={handleUnsavedDialogCancel}>
        <DialogTitle>未保存の変更があります</DialogTitle>
        <DialogContent>
          <Typography>
            現在の設定に未保存の変更があります。
            変更を破棄して他のページに移動しますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUnsavedDialogCancel}>
            キャンセル
          </Button>
          <Button onClick={handleUnsavedDialogConfirm} color="warning">
            変更を破棄
          </Button>
        </DialogActions>
      </Dialog>

      {/* 履歴ダイアログ */}
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>設定変更履歴</DialogTitle>
        <DialogContent>
          <SettingsHistory category={activeTab} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;