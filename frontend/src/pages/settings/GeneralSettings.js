import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 一般設定ページ
 * システム基本情報、タイムゾーン、言語・地域設定、テーマ設定
 */
import React, { useState } from 'react';
import { Box, Typography, Grid, TextField, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Button, Card, CardContent, CardHeader, Avatar, Alert, Accordion, AccordionSummary, AccordionDetails, Chip, RadioGroup, Radio, FormLabel, } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Info as InfoIcon, Schedule as ScheduleIcon, Language as LanguageIcon, Palette as PaletteIcon, Upload as UploadIcon, Preview as PreviewIcon, RestoreFromTrash as RestoreIcon, } from '@mui/icons-material';
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
const GeneralSettings = ({ settings }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [logoPreview, setLogoPreview] = useState(null);
    const handleSystemInfoChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            systemInfo: {
                ...prev.systemInfo,
                [field]: value,
            },
        }));
    };
    const handleTimezoneChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            timezone: {
                ...prev.timezone,
                [field]: value,
            },
        }));
    };
    const handleLocaleChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            locale: {
                ...prev.locale,
                [field]: value,
            },
        }));
    };
    const handleThemeChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            theme: {
                ...prev.theme,
                [field]: value,
            },
        }));
    };
    const handleLogoUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
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
    return (_jsxs(Box, { sx: { maxWidth: 1200, mx: 'auto' }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u4E00\u822C\u8A2D\u5B9A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "\u30B7\u30B9\u30C6\u30E0\u306E\u57FA\u672C\u60C5\u5831\u3001\u30BF\u30A4\u30E0\u30BE\u30FC\u30F3\u3001\u8A00\u8A9E\u8A2D\u5B9A\u3001\u30C6\u30FC\u30DE\u3092\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u3067\u304D\u307E\u3059" }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { defaultExpanded: true, children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(InfoIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\u30B7\u30B9\u30C6\u30E0\u57FA\u672C\u60C5\u5831" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "\u30B7\u30B9\u30C6\u30E0\u540D", value: localSettings.systemInfo.systemName, onChange: (e) => handleSystemInfoChange('systemName', e.target.value), required: true, helperText: "\u7D44\u7E54\u5185\u3067\u8868\u793A\u3055\u308C\u308B\u30B7\u30B9\u30C6\u30E0\u540D" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "\u30D0\u30FC\u30B8\u30E7\u30F3", value: localSettings.systemInfo.version, onChange: (e) => handleSystemInfoChange('version', e.target.value), helperText: "\u73FE\u5728\u306E\u30B7\u30B9\u30C6\u30E0\u30D0\u30FC\u30B8\u30E7\u30F3" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "\u7D44\u7E54\u540D", value: localSettings.systemInfo.organization, onChange: (e) => handleSystemInfoChange('organization', e.target.value), helperText: "\u904B\u7528\u3057\u3066\u3044\u308B\u7D44\u7E54\u30FB\u4F01\u696D\u540D" }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "\u9023\u7D61\u5148\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", type: "email", value: localSettings.systemInfo.contactEmail, onChange: (e) => handleSystemInfoChange('contactEmail', e.target.value), required: true, helperText: "\u30B7\u30B9\u30C6\u30E0\u7BA1\u7406\u8005\u306E\u9023\u7D61\u5148" }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u30B7\u30B9\u30C6\u30E0\u8AAC\u660E", multiline: true, rows: 3, value: localSettings.systemInfo.description, onChange: (e) => handleSystemInfoChange('description', e.target.value), helperText: "\u30B7\u30B9\u30C6\u30E0\u306E\u6982\u8981\u30FB\u76EE\u7684" }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(ScheduleIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\u30BF\u30A4\u30E0\u30BE\u30FC\u30F3\u8A2D\u5B9A" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u30BF\u30A4\u30E0\u30BE\u30FC\u30F3" }), _jsx(Select, { value: localSettings.timezone.timezone, onChange: (e) => handleTimezoneChange('timezone', e.target.value), label: "\u30BF\u30A4\u30E0\u30BE\u30FC\u30F3", children: timezones.map((tz) => (_jsx(MenuItem, { value: tz, children: tz }, tz))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u65E5\u4ED8\u5F62\u5F0F" }), _jsx(Select, { value: localSettings.timezone.dateFormat, onChange: (e) => handleTimezoneChange('dateFormat', e.target.value), label: "\u65E5\u4ED8\u5F62\u5F0F", children: dateFormats.map((format) => (_jsx(MenuItem, { value: format, children: format }, format))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u6642\u523B\u5F62\u5F0F" }), _jsx(Select, { value: localSettings.timezone.timeFormat, onChange: (e) => handleTimezoneChange('timeFormat', e.target.value), label: "\u6642\u523B\u5F62\u5F0F", children: timeFormats.map((format) => (_jsx(MenuItem, { value: format, children: format }, format))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { children: [_jsx(FormLabel, { children: "\u9031\u306E\u958B\u59CB\u65E5" }), _jsxs(RadioGroup, { value: localSettings.timezone.firstDayOfWeek, onChange: (e) => handleTimezoneChange('firstDayOfWeek', e.target.value), row: true, children: [_jsx(FormControlLabel, { value: "monday", control: _jsx(Radio, {}), label: "\u6708\u66DC\u65E5" }), _jsx(FormControlLabel, { value: "sunday", control: _jsx(Radio, {}), label: "\u65E5\u66DC\u65E5" })] })] }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(LanguageIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\u8A00\u8A9E\u30FB\u5730\u57DF\u8A2D\u5B9A" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u8A00\u8A9E" }), _jsx(Select, { value: localSettings.locale.language, onChange: (e) => handleLocaleChange('language', e.target.value), label: "\u8A00\u8A9E", children: languages.map((lang) => (_jsx(MenuItem, { value: lang.code, children: lang.name }, lang.code))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u56FD\u30FB\u5730\u57DF" }), _jsx(Select, { value: localSettings.locale.country, onChange: (e) => handleLocaleChange('country', e.target.value), label: "\u56FD\u30FB\u5730\u57DF", children: countries.map((country) => (_jsx(MenuItem, { value: country.code, children: country.name }, country.code))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u901A\u8CA8" }), _jsx(Select, { value: localSettings.locale.currency, onChange: (e) => handleLocaleChange('currency', e.target.value), label: "\u901A\u8CA8", children: currencies.map((currency) => (_jsx(MenuItem, { value: currency.code, children: currency.name }, currency.code))) })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsx(TextField, { fullWidth: true, label: "\u6570\u5024\u5F62\u5F0F", value: localSettings.locale.numberFormat, onChange: (e) => handleLocaleChange('numberFormat', e.target.value), helperText: "\u4F8B: 1,234.56" }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Accordion, { children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(PaletteIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\u30B7\u30B9\u30C6\u30E0\u30ED\u30B4\u30FB\u30C6\u30FC\u30DE" })] }) }), _jsx(AccordionDetails, { children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u30B7\u30B9\u30C6\u30E0\u30ED\u30B4" }), _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [_jsx(Avatar, { src: logoPreview || localSettings.theme.logo, sx: { width: 64, height: 64, mr: 2 }, children: _jsx(PaletteIcon, {}) }), _jsxs(Box, { children: [_jsxs(Button, { variant: "outlined", component: "label", startIcon: _jsx(UploadIcon, {}), sx: { mb: 1 }, children: ["\u30ED\u30B4\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9", _jsx("input", { type: "file", hidden: true, accept: "image/*", onChange: handleLogoUpload })] }), _jsx(Typography, { variant: "caption", display: "block", children: "\u63A8\u5968\u30B5\u30A4\u30BA: 128\u00D7128px" })] })] }), _jsx(TextField, { fullWidth: true, label: "\u30D5\u30A1\u30D3\u30B3\u30F3URL", value: localSettings.theme.favicon, onChange: (e) => handleThemeChange('favicon', e.target.value), size: "small" })] })] }) }), _jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u30AB\u30E9\u30FC\u30C6\u30FC\u30DE" }), _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { fullWidth: true, label: "\u30D7\u30E9\u30A4\u30DE\u30EA\u30AB\u30E9\u30FC", type: "color", value: localSettings.theme.primaryColor, onChange: (e) => handleThemeChange('primaryColor', e.target.value), size: "small" }) }), _jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { fullWidth: true, label: "\u30BB\u30AB\u30F3\u30C0\u30EA\u30AB\u30E9\u30FC", type: "color", value: localSettings.theme.secondaryColor, onChange: (e) => handleThemeChange('secondaryColor', e.target.value), size: "small" }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Switch, { checked: localSettings.theme.darkMode, onChange: (e) => handleThemeChange('darkMode', e.target.checked) }), label: "\u30C0\u30FC\u30AF\u30E2\u30FC\u30C9" }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u30AB\u30B9\u30BF\u30E0CSS" }), _jsxs(CardContent, { children: [_jsx(TextField, { fullWidth: true, multiline: true, rows: 6, value: localSettings.theme.customCss, onChange: (e) => handleThemeChange('customCss', e.target.value), helperText: "\u30AB\u30B9\u30BF\u30E0\u30B9\u30BF\u30A4\u30EB\u3092\u9069\u7528\u3067\u304D\u307E\u3059\uFF08\u4E0A\u7D1A\u8005\u5411\u3051\uFF09", placeholder: "/* \u30AB\u30B9\u30BF\u30E0CSS\u3092\u3053\u3053\u306B\u8A18\u8FF0 */" }), _jsxs(Box, { sx: { mt: 2, display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(PreviewIcon, {}), size: "small", children: "\u30D7\u30EC\u30D3\u30E5\u30FC" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(RestoreIcon, {}), onClick: resetTheme, size: "small", children: "\u30C6\u30FC\u30DE\u3092\u30EA\u30BB\u30C3\u30C8" })] })] })] }) })] }) })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Alert, { severity: "info", sx: { mt: 2 }, children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u8A2D\u5B9A\u30D7\u30EC\u30D3\u30E5\u30FC" }), _jsxs(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap' }, children: [_jsx(Chip, { label: `言語: ${languages.find(l => l.code === localSettings.locale.language)?.name}`, size: "small" }), _jsx(Chip, { label: `タイムゾーン: ${localSettings.timezone.timezone}`, size: "small" }), _jsx(Chip, { label: `日付形式: ${localSettings.timezone.dateFormat}`, size: "small" }), _jsx(Chip, { label: `テーマ: ${localSettings.theme.darkMode ? 'ダーク' : 'ライト'}`, size: "small" })] })] }) })] })] }));
};
export default GeneralSettings;
