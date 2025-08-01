/**
 * ワークフロー設定ページ
 * インシデント、問題管理、変更管理、承認フローワークフロー
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
import { Timeline as WorkFlowIcon } from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface WorkflowSettingsProps {
  settings: SystemSettings['workflows'];
}

const WorkflowSettings: React.FC<WorkflowSettingsProps> = ({ settings }) => {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        ワークフロー設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        インシデント、問題管理、変更管理のワークフローを設定します
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="ワークフロー設定" 
              avatar={<WorkFlowIcon color="primary" />}
            />
            <CardContent>
              <Alert severity="info">
                ワークフロー設定機能は実装中です。詳細な設定画面は今後のバージョンで提供予定です。
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkflowSettings;