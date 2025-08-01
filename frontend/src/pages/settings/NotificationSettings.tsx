/**
 * 通知設定ページ
 * メール設定、SMS設定、Webhook設定、通知テンプレート
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Link as WebhookIcon,
  Description as DescriptionIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Notifications as NotificationsIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface NotificationSettingsProps {
  settings: SystemSettings['notifications'];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ settings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState(0);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const handleEmailChange = (field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        [field]: value,
      },
    }));
  };

  const handleSmsChange = (field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      sms: {
        ...prev.sms,
        [field]: value,
      },
    }));
  };

  const handleWebhookAdd = (webhook: any) => {
    const newWebhook = {
      ...webhook,
      id: Date.now().toString(),
    };
    
    setLocalSettings(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
        endpoints: [...prev.webhook.endpoints, newWebhook],
      },
    }));
  };

  const handleWebhookEdit = (id: string, webhook: any) => {
    setLocalSettings(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
        endpoints: prev.webhook.endpoints.map(ep => 
          ep.id === id ? { ...webhook, id } : ep
        ),
      },
    }));
  };

  const handleWebhookDelete = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
        endpoints: prev.webhook.endpoints.filter(ep => ep.id !== id),
      },
    }));
  };

  const handleTemplateAdd = (template: any) => {
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
    };
    
    setLocalSettings(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate],
    }));
  };

  const handleTemplateEdit = (id: string, template: any) => {
    setLocalSettings(prev => ({
      ...prev,
      templates: prev.templates.map(t => 
        t.id === id ? { ...template, id } : t
      ),
    }));
  };

  const handleTemplateDelete = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== id),
    }));
  };

  const testEmailConnection = async () => {
    // テストメール送信のロジック
    console.log('Testing email connection...');
  };

  const availableEvents = [
    'incident.created',
    'incident.updated',
    'incident.resolved',
    'problem.created',
    'problem.resolved',
    'change.approved',
    'change.implemented',
    'sla.breach',
    'system.maintenance',
  ];

  const smsProviders = [
    { value: 'twilio', label: 'Twilio' },
    { value: 'aws-sns', label: 'AWS SNS' },
    { value: 'nexmo', label: 'Vonage (Nexmo)' },
    { value: 'other', label: 'その他' },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        通知設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        メール、SMS、Webhook通知とテンプレートを管理します
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<EmailIcon />} 
            label="メール設定" 
            iconPosition="start"
          />
          <Tab 
            icon={<SmsIcon />} 
            label="SMS設定" 
            iconPosition="start"
          />
          <Tab 
            icon={<WebhookIcon />} 
            label="Webhook設定" 
            iconPosition="start"
          />
          <Tab 
            icon={<DescriptionIcon />} 
            label="通知テンプレート" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* メール設定 */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="SMTP設定"
                action={
                  <Button
                    variant="outlined"
                    startIcon={<SendIcon />}
                    onClick={() => setTestEmailDialogOpen(true)}
                  >
                    テスト送信
                  </Button>
                }
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTPホスト"
                      value={localSettings.email.smtpHost}
                      onChange={(e) => handleEmailChange('smtpHost', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTPポート"
                      type="number"
                      value={localSettings.email.smtpPort}
                      onChange={(e) => handleEmailChange('smtpPort', parseInt(e.target.value))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="ユーザー名"
                      value={localSettings.email.smtpUsername}
                      onChange={(e) => handleEmailChange('smtpUsername', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="パスワード"
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={localSettings.email.smtpPassword}
                      onChange={(e) => handleEmailChange('smtpPassword', e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          >
                            {showSmtpPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.email.useSSL}
                          onChange={(e) => handleEmailChange('useSSL', e.target.checked)}
                        />
                      }
                      label="SSL使用"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.email.useTLS}
                          onChange={(e) => handleEmailChange('useTLS', e.target.checked)}
                        />
                      }
                      label="TLS使用"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader title="送信者設定" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="送信者メールアドレス"
                      type="email"
                      value={localSettings.email.fromAddress}
                      onChange={(e) => handleEmailChange('fromAddress', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="送信者名"
                      value={localSettings.email.fromName}
                      onChange={(e) => handleEmailChange('fromName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="返信先メールアドレス"
                      type="email"
                      value={localSettings.email.replyToAddress}
                      onChange={(e) => handleEmailChange('replyToAddress', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* SMS設定 */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="SMS設定" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>プロバイダー</InputLabel>
                      <Select
                        value={localSettings.sms.provider}
                        onChange={(e) => handleSmsChange('provider', e.target.value)}
                        label="プロバイダー"
                      >
                        {smsProviders.map((provider) => (
                          <MenuItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="APIキー"
                      type="password"
                      value={localSettings.sms.apiKey}
                      onChange={(e) => handleSmsChange('apiKey', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="送信者番号"
                      value={localSettings.sms.fromNumber}
                      onChange={(e) => handleSmsChange('fromNumber', e.target.value)}
                      helperText="国際形式 (例: +81901234567)"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                SMS設定について
              </Typography>
              <Typography variant="body2">
                • SMS送信にはプロバイダーとの契約が必要です<br/>
                • 送信コストがかかる場合がありますので、適切な制限を設けてください<br/>
                • 緊急度の高い通知のみSMSを使用することをお勧めします
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Webhook設定 */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="Webhook エンドポイント"
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingWebhook(null);
                      setWebhookDialogOpen(true);
                    }}
                  >
                    新規追加
                  </Button>
                }
              />
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>名前</TableCell>
                        <TableCell>URL</TableCell>
                        <TableCell>イベント</TableCell>
                        <TableCell>ステータス</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {localSettings.webhook.endpoints.map((endpoint) => (
                        <TableRow key={endpoint.id}>
                          <TableCell>{endpoint.name}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {endpoint.url}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {endpoint.events.slice(0, 2).map((event) => (
                                <Chip key={event} label={event} size="small" />
                              ))}
                              {endpoint.events.length > 2 && (
                                <Chip label={`+${endpoint.events.length - 2}`} size="small" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={endpoint.active ? 'アクティブ' : '非アクティブ'}
                              color={endpoint.active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingWebhook(endpoint);
                                setWebhookDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleWebhookDelete(endpoint.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {localSettings.webhook.endpoints.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Webhookエンドポイントが登録されていません
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* 通知テンプレート */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="通知テンプレート"
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateDialogOpen(true);
                    }}
                  >
                    新規作成
                  </Button>
                }
              />
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>名前</TableCell>
                        <TableCell>タイプ</TableCell>
                        <TableCell>件名</TableCell>
                        <TableCell>更新日</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {localSettings.templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>{template.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={template.type}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{template.subject}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingTemplate(template);
                                setTemplateDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleTemplateDelete(template.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {localSettings.templates.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    通知テンプレートが作成されていません
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* テストメール送信ダイアログ */}
      <Dialog open={testEmailDialogOpen} onClose={() => setTestEmailDialogOpen(false)}>
        <DialogTitle>テストメール送信</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="送信先メールアドレス"
            type="email"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestEmailDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={testEmailConnection} variant="contained">
            送信
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationSettings;