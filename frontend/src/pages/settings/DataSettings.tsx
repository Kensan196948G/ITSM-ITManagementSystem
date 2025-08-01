/**
 * データ管理設定ページ
 * データベース設定、バックアップ設定、データ保持ポリシー、データエクスポート
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
import { Storage as StorageIcon } from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface DataSettingsProps {
  settings: SystemSettings['data'];
}

const DataSettings: React.FC<DataSettingsProps> = ({ settings }) => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        データ管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        データベース、バックアップ、データ保持ポリシーを管理します
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="データ管理設定" 
              avatar={<StorageIcon color="primary" />}
            />
            <CardContent>
              <Alert severity="info">
                データ管理設定機能は実装中です。詳細な設定画面は今後のバージョンで提供予定です。
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataSettings;