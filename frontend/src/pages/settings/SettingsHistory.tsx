/**
 * 設定変更履歴コンポーネント
 * 設定変更の履歴を表示・管理
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  History as HistoryIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import { useSystemSettings, SettingHistory } from '../../hooks/useSystemSettings';

interface SettingsHistoryProps {
  category?: string;
}

const SettingsHistory: React.FC<SettingsHistoryProps> = ({ category }) => {
  const { loadHistory, loading, error } = useSystemSettings();
  const [history, setHistory] = useState<SettingHistory[]>([]);
  const [filterCategory, setFilterCategory] = useState(category || '');
  const [filterUser, setFilterUser] = useState('');
  const [sortBy, setSortBy] = useState('changedAt');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        await loadHistory(filterCategory);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    };

    fetchHistory();
  }, [loadHistory, filterCategory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getCategoryLabel = (cat: string) => {
    const categories: Record<string, string> = {
      general: '一般設定',
      security: 'セキュリティ設定',
      notifications: '通知設定',
      sla: 'SLA設定',
      workflows: 'ワークフロー設定',
      data: 'データ管理',
      integrations: '統合設定',
      monitoring: 'システム監視',
    };
    return categories[cat] || cat;
  };

  const getSeverityColor = (category: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      security: 'error',
      general: 'primary',
      notifications: 'info',
      sla: 'warning',
      workflows: 'secondary',
      data: 'success',
      integrations: 'info',
      monitoring: 'warning',
    };
    return colors[category] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          設定変更履歴
        </Typography>
      </Box>

      {/* フィルター */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>カテゴリ</InputLabel>
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            label="カテゴリ"
          >
            <MenuItem value="">すべて</MenuItem>
            <MenuItem value="general">一般設定</MenuItem>
            <MenuItem value="security">セキュリティ設定</MenuItem>
            <MenuItem value="notifications">通知設定</MenuItem>
            <MenuItem value="sla">SLA設定</MenuItem>
            <MenuItem value="workflows">ワークフロー設定</MenuItem>
            <MenuItem value="data">データ管理</MenuItem>
            <MenuItem value="integrations">統合設定</MenuItem>
            <MenuItem value="monitoring">システム監視</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="ユーザーで絞り込み"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          sx={{ minWidth: 150 }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>並び順</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="並び順"
          >
            <MenuItem value="changedAt">更新日時</MenuItem>
            <MenuItem value="category">カテゴリ</MenuItem>
            <MenuItem value="changedBy">ユーザー</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 履歴テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>日時</TableCell>
              <TableCell>カテゴリ</TableCell>
              <TableCell>設定項目</TableCell>
              <TableCell>変更者</TableCell>
              <TableCell>変更前</TableCell>
              <TableCell>変更後</TableCell>
              <TableCell>理由</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    変更履歴がありません
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {formatDate(item.changedAt)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(item.category)}
                      color={getSeverityColor(item.category)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.setting}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {item.changedBy}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {typeof item.oldValue === 'object' 
                        ? JSON.stringify(item.oldValue).substring(0, 50) + '...'
                        : String(item.oldValue).substring(0, 50)
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {typeof item.newValue === 'object' 
                        ? JSON.stringify(item.newValue).substring(0, 50) + '...'
                        : String(item.newValue).substring(0, 50)
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.reason || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {history.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button variant="outlined" size="small">
            さらに読み込む
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SettingsHistory;