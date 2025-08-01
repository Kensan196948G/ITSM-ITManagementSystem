/**
 * システム監視設定ページ
 * ログ設定、パフォーマンス監視、アラート設定、システムヘルス
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Alert,
} from '@mui/material';
import { MonitorHeart as MonitorIcon } from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface MonitoringSettingsProps {
  settings: SystemSettings['monitoring'];
}

const MonitoringSettings: React.FC<MonitoringSettingsProps> = ({ settings }) => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        システム監視
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ログ、パフォーマンス監視、アラート設定を管理します
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="システム監視設定" 
              avatar={<MonitorIcon color="primary" />}
            />
            <CardContent>
              <Alert severity="info">
                システム監視設定機能は実装中です。詳細な設定画面は今後のバージョンで提供予定です。
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringSettings;