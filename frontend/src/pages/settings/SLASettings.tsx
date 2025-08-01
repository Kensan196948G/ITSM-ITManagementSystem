/**
 * SLA設定ページ
 * 優先度別SLA、営業時間設定、エスカレーション設定、SLA例外管理
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Alert,
} from '@mui/material';
import { Timer as TimerIcon } from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface SLASettingsProps {
  settings: SystemSettings['sla'];
}

const SLASettings: React.FC<SLASettingsProps> = ({ settings }) => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        SLA設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        サービスレベル合意、営業時間、エスカレーション設定を管理します
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="SLA設定" 
              avatar={<TimerIcon color="primary" />}
            />
            <CardContent>
              <Alert severity="info">
                SLA設定機能は実装中です。詳細な設定画面は今後のバージョンで提供予定です。
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SLASettings;