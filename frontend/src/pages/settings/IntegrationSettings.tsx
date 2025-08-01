/**
 * 統合設定ページ
 * API設定、LDAP/AD連携、外部システム連携、Webhook管理
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
import { Link as IntegrationIcon } from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface IntegrationSettingsProps {
  settings: SystemSettings['integrations'];
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({ settings }) => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        統合設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        API、LDAP/AD連携、外部システム統合を設定します
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="統合設定" 
              avatar={<IntegrationIcon color="primary" />}
            />
            <CardContent>
              <Alert severity="info">
                統合設定機能は実装中です。詳細な設定画面は今後のバージョンで提供予定です。
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IntegrationSettings;