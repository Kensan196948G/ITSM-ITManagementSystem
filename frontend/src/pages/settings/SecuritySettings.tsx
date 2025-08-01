/**
 * セキュリティ設定ページ
 * パスワードポリシー、セッション管理、2要素認証、IPアクセス制限
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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormGroup,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Lock as PasswordIcon,
  AccessTime as AccessTimeIcon,
  Shield as ShieldIcon,
  Block as BlockIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface SecuritySettingsProps {
  settings: SystemSettings['security'];
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ settings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [ipDialogOpen, setIpDialogOpen] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [ipListType, setIpListType] = useState<'whitelist' | 'blacklist'>('whitelist');

  const handlePasswordPolicyChange = (field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      passwordPolicy: {
        ...prev.passwordPolicy,
        [field]: value,
      },
    }));
  };

  const handleSessionChange = (field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      session: {
        ...prev.session,
        [field]: value,
      },
    }));
  };

  const handleTwoFactorChange = (field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      twoFactorAuth: {
        ...prev.twoFactorAuth,
        [field]: value,
      },
    }));
  };

  const handleIpAccessChange = (field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      ipAccess: {
        ...prev.ipAccess,
        [field]: value,
      },
    }));
  };

  const addIpAddress = () => {
    if (!newIpAddress.trim()) return;
    
    const listKey = ipListType;
    setLocalSettings(prev => ({
      ...prev,
      ipAccess: {
        ...prev.ipAccess,
        [listKey]: [...prev.ipAccess[listKey], newIpAddress.trim()],
      },
    }));
    
    setNewIpAddress('');
    setIpDialogOpen(false);
  };

  const removeIpAddress = (ip: string, listType: 'whitelist' | 'blacklist') => {
    setLocalSettings(prev => ({
      ...prev,
      ipAccess: {
        ...prev.ipAccess,
        [listType]: prev.ipAccess[listType].filter(item => item !== ip),
      },
    }));
  };

  const getPasswordStrengthLevel = () => {
    const policy = localSettings.passwordPolicy;
    let score = 0;
    
    if (policy.minLength >= 8) score += 1;
    if (policy.requireUppercase) score += 1;
    if (policy.requireLowercase) score += 1;
    if (policy.requireNumbers) score += 1;
    if (policy.requireSpecialChars) score += 1;
    if (policy.maxAge > 0 && policy.maxAge <= 90) score += 1;
    
    if (score <= 2) return { level: 'weak', color: 'error' };
    if (score <= 4) return { level: 'medium', color: 'warning' };
    return { level: 'strong', color: 'success' };
  };

  const passwordStrength = getPasswordStrengthLevel();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        セキュリティ設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        システムのセキュリティポリシーとアクセス制御を管理します
      </Typography>

      <Grid container spacing={3}>
        {/* パスワードポリシー */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PasswordIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">パスワードポリシー</Typography>
                <Chip
                  label={`強度: ${passwordStrength.level}`}
                  color={passwordStrength.color as any}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="基本要件" />
                    <CardContent>
                      <Box sx={{ mb: 2 }}>
                        <Typography gutterBottom>最小文字数: {localSettings.passwordPolicy.minLength}</Typography>
                        <Slider
                          value={localSettings.passwordPolicy.minLength}
                          onChange={(_, value) => handlePasswordPolicyChange('minLength', value)}
                          min={4}
                          max={32}
                          marks
                          valueLabelDisplay="auto"
                        />
                      </Box>
                      
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={localSettings.passwordPolicy.requireUppercase}
                              onChange={(e) => handlePasswordPolicyChange('requireUppercase', e.target.checked)}
                            />
                          }
                          label="大文字を含む"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={localSettings.passwordPolicy.requireLowercase}
                              onChange={(e) => handlePasswordPolicyChange('requireLowercase', e.target.checked)}
                            />
                          }
                          label="小文字を含む"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={localSettings.passwordPolicy.requireNumbers}
                              onChange={(e) => handlePasswordPolicyChange('requireNumbers', e.target.checked)}
                            />
                          }
                          label="数字を含む"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={localSettings.passwordPolicy.requireSpecialChars}
                              onChange={(e) => handlePasswordPolicyChange('requireSpecialChars', e.target.checked)}
                            />
                          }
                          label="特殊文字を含む"
                        />
                      </FormGroup>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="有効期限・履歴" />
                    <CardContent>
                      <TextField
                        fullWidth
                        label="パスワード有効期限（日）"
                        type="number"
                        value={localSettings.passwordPolicy.maxAge}
                        onChange={(e) => handlePasswordPolicyChange('maxAge', parseInt(e.target.value))}
                        helperText="0で無期限"
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="パスワード履歴保持数"
                        type="number"
                        value={localSettings.passwordPolicy.historyCount}
                        onChange={(e) => handlePasswordPolicyChange('historyCount', parseInt(e.target.value))}
                        helperText="過去のパスワード再利用を防ぐ"
                        sx={{ mb: 2 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="アカウントロックアウト" />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="ロックアウト試行回数"
                            type="number"
                            value={localSettings.passwordPolicy.lockoutAttempts}
                            onChange={(e) => handlePasswordPolicyChange('lockoutAttempts', parseInt(e.target.value))}
                            helperText="失敗回数の上限"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="ロックアウト期間（分）"
                            type="number"
                            value={localSettings.passwordPolicy.lockoutDuration}
                            onChange={(e) => handlePasswordPolicyChange('lockoutDuration', parseInt(e.target.value))}
                            helperText="自動解除までの時間"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* セッション管理 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">セッション管理</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="最大セッション時間（時間）"
                    type="number"
                    value={localSettings.session.maxSessionTime}
                    onChange={(e) => handleSessionChange('maxSessionTime', parseInt(e.target.value))}
                    helperText="セッションの最大継続時間"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="非アクティブタイムアウト（分）"
                    type="number"
                    value={localSettings.session.inactivityTimeout}
                    onChange={(e) => handleSessionChange('inactivityTimeout', parseInt(e.target.value))}
                    helperText="操作がない場合の自動ログアウト時間"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.session.multipleSessionsAllowed}
                          onChange={(e) => handleSessionChange('multipleSessionsAllowed', e.target.checked)}
                        />
                      }
                      label="複数セッション許可"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.session.requireReauthentication}
                          onChange={(e) => handleSessionChange('requireReauthentication', e.target.checked)}
                        />
                      }
                      label="重要操作時の再認証要求"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 2要素認証 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShieldIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">2要素認証</Typography>
                <Chip
                  label={localSettings.twoFactorAuth.enabled ? '有効' : '無効'}
                  color={localSettings.twoFactorAuth.enabled ? 'success' : 'error'}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings.twoFactorAuth.enabled}
                        onChange={(e) => handleTwoFactorChange('enabled', e.target.checked)}
                      />
                    }
                    label="2要素認証を有効化"
                  />
                </Grid>
                
                {localSettings.twoFactorAuth.enabled && (
                  <>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={localSettings.twoFactorAuth.required}
                            onChange={(e) => handleTwoFactorChange('required', e.target.checked)}
                          />
                        }
                        label="すべてのユーザーに2要素認証を必須化"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        利用可能な認証方法
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <VpnKeyIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="認証アプリ（TOTP）"
                            secondary="Google Authenticator、Authy等"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <VpnKeyIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="SMS認証"
                            secondary="携帯電話への認証コード送信"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <VpnKeyIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="メール認証"
                            secondary="メールアドレスへの認証コード送信"
                          />
                        </ListItem>
                      </List>
                    </Grid>
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* IPアクセス制限 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BlockIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">IPアクセス制限</Typography>
                <Chip
                  label={localSettings.ipAccess.enabled ? '有効' : '無効'}
                  color={localSettings.ipAccess.enabled ? 'success' : 'error'}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings.ipAccess.enabled}
                        onChange={(e) => handleIpAccessChange('enabled', e.target.checked)}
                      />
                    }
                    label="IPアクセス制限を有効化"
                  />
                </Grid>
                
                {localSettings.ipAccess.enabled && (
                  <>
                    {/* ホワイトリスト */}
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardHeader
                          title="許可リスト（ホワイトリスト）"
                          action={
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                setIpListType('whitelist');
                                setIpDialogOpen(true);
                              }}
                            >
                              追加
                            </Button>
                          }
                        />
                        <CardContent>
                          {localSettings.ipAccess.whitelist.length === 0 ? (
                            <Typography color="text.secondary">
                              許可されたIPアドレスはありません
                            </Typography>
                          ) : (
                            <List>
                              {localSettings.ipAccess.whitelist.map((ip, index) => (
                                <ListItem
                                  key={index}
                                  secondaryAction={
                                    <IconButton
                                      edge="end"
                                      onClick={() => removeIpAddress(ip, 'whitelist')}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  }
                                >
                                  <ListItemText primary={ip} />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* ブラックリスト */}
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardHeader
                          title="拒否リスト（ブラックリスト）"
                          action={
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                setIpListType('blacklist');
                                setIpDialogOpen(true);
                              }}
                            >
                              追加
                            </Button>
                          }
                        />
                        <CardContent>
                          {localSettings.ipAccess.blacklist.length === 0 ? (
                            <Typography color="text.secondary">
                              拒否されたIPアドレスはありません
                            </Typography>
                          ) : (
                            <List>
                              {localSettings.ipAccess.blacklist.map((ip, index) => (
                                <ListItem
                                  key={index}
                                  secondaryAction={
                                    <IconButton
                                      edge="end"
                                      onClick={() => removeIpAddress(ip, 'blacklist')}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  }
                                >
                                  <ListItemText primary={ip} />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* セキュリティ警告 */}
        <Grid item xs={12}>
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="subtitle2" gutterBottom>
              セキュリティ設定の注意事項
            </Typography>
            <Typography variant="body2">
              • パスワードポリシーの変更は既存ユーザーの次回ログイン時から適用されます<br/>
              • IPアクセス制限を有効にする前に、管理者のIPアドレスを許可リストに追加してください<br/>
              • 2要素認証を必須化すると、すべてのユーザーが設定を完了するまでログインできなくなります
            </Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* IPアドレス追加ダイアログ */}
      <Dialog open={ipDialogOpen} onClose={() => setIpDialogOpen(false)}>
        <DialogTitle>
          IPアドレスを{ipListType === 'whitelist' ? '許可リスト' : '拒否リスト'}に追加
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="IPアドレス"
            value={newIpAddress}
            onChange={(e) => setNewIpAddress(e.target.value)}
            placeholder="192.168.1.100 または 192.168.1.0/24"
            helperText="単一IPアドレスまたはCIDR記法でネットワーク範囲を指定"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIpDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={addIpAddress} variant="contained">
            追加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecuritySettings;