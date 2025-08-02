import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Grid,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Button,
  FormControlLabel,
  Switch,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Build as BuildIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  BugReport as BugReportIcon,
  AutoMode as AutoModeIcon
} from '@mui/icons-material';

import { BrowserError } from '../../services/errorDetectionEngine';
import { RepairSession } from '../../services/autoRepairEngine';
import { ValidationReport } from '../../services/validationSystem';

interface ErrorActivity {
  id: string;
  type: 'error_detected' | 'repair_started' | 'repair_completed' | 'validation_completed' | 'system_event';
  timestamp: Date;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  relatedError?: BrowserError;
  relatedRepair?: RepairSession;
  relatedValidation?: ValidationReport;
  metadata?: any;
}

interface FilterOptions {
  errorTypes: string[];
  severities: string[];
  timeRange: number; // minutes
  showFixed: boolean;
  showUnfixed: boolean;
  autoRefresh: boolean;
}

const RealtimeErrorReport: React.FC = () => {
  const [activities, setActivities] = useState<ErrorActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ErrorActivity[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
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

  const [selectedActivity, setSelectedActivity] = useState<ErrorActivity | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

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
    const mockActivities: ErrorActivity[] = [];
    const now = new Date();

    // 過去1時間のアクティビティを生成
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 3600000); // 1時間以内
      const activityTypes = ['error_detected', 'repair_started', 'repair_completed', 'validation_completed', 'system_event'];
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)] as any;
      
      let activity: ErrorActivity;

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
      const newActivity: ErrorActivity = {
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
  const updateStats = (activities: ErrorActivity[]) => {
    const errorActivities = activities.filter(a => a.type === 'error_detected');
    const repairCompletedActivities = activities.filter(a => a.type === 'repair_completed');
    const successfulRepairs = repairCompletedActivities.filter(a => 
      a.description.includes('完了') || a.description.includes('成功')
    );

    setStats({
      totalErrors: errorActivities.length,
      activeErrors: errorActivities.filter(a => 
        !repairCompletedActivities.some(r => r.title.includes('完了'))
      ).length,
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
    filtered = filtered.filter(activity => 
      filterOptions.severities.includes(activity.severity)
    );

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
  const showActivityDetail = (activity: ErrorActivity) => {
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
  const getActivityIcon = (activity: ErrorActivity) => {
    switch (activity.type) {
      case 'error_detected':
        return activity.severity === 'critical' ? 
          <ErrorIcon color="error" /> : 
          <WarningIcon color="warning" />;
      case 'repair_started':
        return <BuildIcon color="info" />;
      case 'repair_completed':
        return activity.description.includes('完了') ? 
          <CheckCircleIcon color="success" /> : 
          <ErrorIcon color="error" />;
      case 'validation_completed':
        return activity.description.includes('合格') ? 
          <CheckCircleIcon color="success" /> : 
          <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // 重要度の色の取得
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <TimelineIcon sx={{ mr: 1 }} />
          リアルタイムエラーレポート
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="フィルタ設定">
            <IconButton onClick={() => setFilterDialogOpen(true)}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="手動更新">
            <IconButton onClick={() => updateActivities()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="クリア">
            <IconButton onClick={clearActivities}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="エクスポート">
            <IconButton onClick={exportReport}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 統計サマリー */}
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
            <Typography variant="h4" color="warning.main">
              {stats.activeErrors}
            </Typography>
            <Typography variant="body2">アクティブエラー</Typography>
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
            <Typography variant="h4" color="info.main">
              {stats.repairRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2">修復成功率</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 自動更新設定 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              監視ステータス
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filterOptions.autoRefresh}
                    onChange={(e) => setFilterOptions(prev => ({ 
                      ...prev, 
                      autoRefresh: e.target.checked 
                    }))}
                  />
                }
                label="自動更新"
              />
              <Typography variant="body2" color="textSecondary">
                最終更新: {stats.lastUpdate.toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>
          {filterOptions.autoRefresh && (
            <LinearProgress sx={{ mt: 1 }} />
          )}
        </CardContent>
      </Card>

      {/* アクティビティタイムライン */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            アクティビティタイムライン ({filteredActivities.length}件)
          </Typography>
          
          {filteredActivities.length === 0 ? (
            <Alert severity="info">
              フィルタ条件に一致するアクティビティがありません
            </Alert>
          ) : (
            <Stack spacing={2}>
              {filteredActivities.map((activity, index) => (
                <Card key={activity.id} variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                        <Box sx={{ mt: 0.5 }}>
                          {getActivityIcon(activity)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {activity.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {activity.timestamp.toLocaleTimeString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            {activity.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip 
                              label={activity.type.replace('_', ' ')} 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={activity.severity} 
                              size="small" 
                              color={getSeverityColor(activity.severity) as any}
                            />
                          </Box>
                        </Box>
                      </Box>
                      <IconButton 
                        size="small"
                        onClick={() => showActivityDetail(activity)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* フィルタ設定ダイアログ */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)}>
        <DialogTitle>フィルタ設定</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              重要度
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {['critical', 'high', 'medium', 'low'].map((severity) => (
                <Chip
                  key={severity}
                  label={severity}
                  color={filterOptions.severities.includes(severity) ? 'primary' : 'default'}
                  onClick={() => {
                    setFilterOptions(prev => ({
                      ...prev,
                      severities: prev.severities.includes(severity)
                        ? prev.severities.filter(s => s !== severity)
                        : [...prev.severities, severity]
                    }));
                  }}
                />
              ))}
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              表示オプション
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={filterOptions.showFixed}
                  onChange={(e) => setFilterOptions(prev => ({ 
                    ...prev, 
                    showFixed: e.target.checked 
                  }))}
                />
              }
              label="修復済みエラーを表示"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={filterOptions.showUnfixed}
                  onChange={(e) => setFilterOptions(prev => ({ 
                    ...prev, 
                    showUnfixed: e.target.checked 
                  }))}
                />
              }
              label="未修復エラーを表示"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>
            適用
          </Button>
        </DialogActions>
      </Dialog>

      {/* アクティビティ詳細ダイアログ */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          アクティビティ詳細
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedActivity.title}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedActivity.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    タイプ
                  </Typography>
                  <Typography variant="body1">
                    {selectedActivity.type}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    重要度
                  </Typography>
                  <Chip 
                    label={selectedActivity.severity}
                    color={getSeverityColor(selectedActivity.severity) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    発生時刻
                  </Typography>
                  <Typography variant="body1">
                    {selectedActivity.timestamp.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              {selectedActivity.relatedError && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    関連エラー情報
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                    <Typography variant="body2">
                      メッセージ: {selectedActivity.relatedError.message}
                    </Typography>
                    <Typography variant="body2">
                      ソース: {selectedActivity.relatedError.source}
                    </Typography>
                    <Typography variant="body2">
                      カテゴリ: {selectedActivity.relatedError.category}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RealtimeErrorReport;