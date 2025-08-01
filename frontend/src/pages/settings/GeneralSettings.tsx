/**
 * 一般設定ページ
 * システム基本情報、タイムゾーン、言語・地域設定、テーマ設定
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Avatar,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  FormGroup,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  Upload as UploadIcon,
  Preview as PreviewIcon,
  RestoreFromTrash as RestoreIcon,
} from '@mui/icons-material';

import { SystemSettings } from '../../hooks/useSystemSettings';

interface GeneralSettingsProps {
  settings: SystemSettings['general'];
}

const timezones = [
  'Asia/Tokyo',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Australia/Sydney',
];

const languages = [
  { code: 'ja', name: '日本語' },
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
];

const countries = [
  { code: 'JP', name: '日本' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
];

const currencies = [
  { code: 'JPY', name: '日本円 (¥)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
];

const dateFormats = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY年MM月DD日',
];

const timeFormats = [
  '24時間形式 (HH:mm)',
  '12時間形式 (h:mm AM/PM)',
];

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleSystemInfoChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      systemInfo: {
        ...prev.systemInfo,
        [field]: value,
      },
    }));
  };

  const handleTimezoneChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      timezone: {
        ...prev.timezone,
        [field]: value,
      },
    }));
  };

  const handleLocaleChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      locale: {
        ...prev.locale,
        [field]: value,
      },
    }));
  };

  const handleThemeChange = (field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value,
      },
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        handleThemeChange('logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetTheme = () => {
    setLocalSettings(prev => ({
      ...prev,
      theme: {
        logo: '',
        favicon: '',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        darkMode: false,
        customCss: '',
      },
    }));
    setLogoPreview(null);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        一般設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        システムの基本情報、タイムゾーン、言語設定、テーマをカスタマイズできます
      </Typography>

      <Grid container spacing={3}>
        {/* システム基本情報 */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">システム基本情報</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="システム名"
                    value={localSettings.systemInfo.systemName}
                    onChange={(e) => handleSystemInfoChange('systemName', e.target.value)}
                    required
                    helperText="組織内で表示されるシステム名"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="バージョン"
                    value={localSettings.systemInfo.version}
                    onChange={(e) => handleSystemInfoChange('version', e.target.value)}
                    helperText="現在のシステムバージョン"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="組織名"
                    value={localSettings.systemInfo.organization}
                    onChange={(e) => handleSystemInfoChange('organization', e.target.value)}
                    helperText="運用している組織・企業名"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="連絡先メールアドレス"
                    type="email"
                    value={localSettings.systemInfo.contactEmail}
                    onChange={(e) => handleSystemInfoChange('contactEmail', e.target.value)}
                    required
                    helperText="システム管理者の連絡先"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="システム説明"
                    multiline
                    rows={3}
                    value={localSettings.systemInfo.description}
                    onChange={(e) => handleSystemInfoChange('description', e.target.value)}
                    helperText="システムの概要・目的"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* タイムゾーン設定 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">タイムゾーン設定</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>タイムゾーン</InputLabel>
                    <Select
                      value={localSettings.timezone.timezone}
                      onChange={(e) => handleTimezoneChange('timezone', e.target.value)}
                      label="タイムゾーン"
                    >
                      {timezones.map((tz) => (
                        <MenuItem key={tz} value={tz}>
                          {tz}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>日付形式</InputLabel>
                    <Select
                      value={localSettings.timezone.dateFormat}
                      onChange={(e) => handleTimezoneChange('dateFormat', e.target.value)}
                      label="日付形式"
                    >
                      {dateFormats.map((format) => (
                        <MenuItem key={format} value={format}>
                          {format}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>時刻形式</InputLabel>
                    <Select
                      value={localSettings.timezone.timeFormat}
                      onChange={(e) => handleTimezoneChange('timeFormat', e.target.value)}
                      label="時刻形式"
                    >
                      {timeFormats.map((format) => (
                        <MenuItem key={format} value={format}>
                          {format}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl>
                    <FormLabel>週の開始日</FormLabel>
                    <RadioGroup
                      value={localSettings.timezone.firstDayOfWeek}
                      onChange={(e) => handleTimezoneChange('firstDayOfWeek', e.target.value)}
                      row
                    >
                      <FormControlLabel value="monday" control={<Radio />} label="月曜日" />
                      <FormControlLabel value="sunday" control={<Radio />} label="日曜日" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 言語・地域設定 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LanguageIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">言語・地域設定</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>言語</InputLabel>
                    <Select
                      value={localSettings.locale.language}
                      onChange={(e) => handleLocaleChange('language', e.target.value)}
                      label="言語"
                    >
                      {languages.map((lang) => (
                        <MenuItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>国・地域</InputLabel>
                    <Select
                      value={localSettings.locale.country}
                      onChange={(e) => handleLocaleChange('country', e.target.value)}
                      label="国・地域"
                    >
                      {countries.map((country) => (
                        <MenuItem key={country.code} value={country.code}>
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>通貨</InputLabel>
                    <Select
                      value={localSettings.locale.currency}
                      onChange={(e) => handleLocaleChange('currency', e.target.value)}
                      label="通貨"
                    >
                      {currencies.map((currency) => (
                        <MenuItem key={currency.code} value={currency.code}>
                          {currency.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="数値形式"
                    value={localSettings.locale.numberFormat}
                    onChange={(e) => handleLocaleChange('numberFormat', e.target.value)}
                    helperText="例: 1,234.56"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* テーマ・外観設定 */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PaletteIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">システムロゴ・テーマ</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* ロゴ設定 */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="システムロゴ" />
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={logoPreview || localSettings.theme.logo}
                          sx={{ width: 64, height: 64, mr: 2 }}
                        >
                          <PaletteIcon />
                        </Avatar>
                        <Box>
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadIcon />}
                            sx={{ mb: 1 }}
                          >
                            ロゴをアップロード
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </Button>
                          <Typography variant="caption" display="block">
                            推奨サイズ: 128×128px
                          </Typography>
                        </Box>
                      </Box>
                      <TextField
                        fullWidth
                        label="ファビコンURL"
                        value={localSettings.theme.favicon}
                        onChange={(e) => handleThemeChange('favicon', e.target.value)}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* カラーテーマ */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="カラーテーマ" />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="プライマリカラー"
                            type="color"
                            value={localSettings.theme.primaryColor}
                            onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="セカンダリカラー"
                            type="color"
                            value={localSettings.theme.secondaryColor}
                            onChange={(e) => handleThemeChange('secondaryColor', e.target.value)}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={localSettings.theme.darkMode}
                                onChange={(e) => handleThemeChange('darkMode', e.target.checked)}
                              />
                            }
                            label="ダークモード"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* カスタムCSS */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="カスタムCSS" />
                    <CardContent>
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        value={localSettings.theme.customCss}
                        onChange={(e) => handleThemeChange('customCss', e.target.value)}
                        helperText="カスタムスタイルを適用できます（上級者向け）"
                        placeholder="/* カスタムCSSをここに記述 */"
                      />
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<PreviewIcon />}
                          size="small"
                        >
                          プレビュー
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<RestoreIcon />}
                          onClick={resetTheme}
                          size="small"
                        >
                          テーマをリセット
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* プレビュー */}
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              設定プレビュー
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`言語: ${languages.find(l => l.code === localSettings.locale.language)?.name}`} size="small" />
              <Chip label={`タイムゾーン: ${localSettings.timezone.timezone}`} size="small" />
              <Chip label={`日付形式: ${localSettings.timezone.dateFormat}`} size="small" />
              <Chip label={`テーマ: ${localSettings.theme.darkMode ? 'ダーク' : 'ライト'}`} size="small" />
            </Box>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GeneralSettings;