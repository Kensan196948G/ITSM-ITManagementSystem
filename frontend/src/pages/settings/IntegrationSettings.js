import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 統合設定ページ
 * API設定、LDAP/AD連携、外部システム連携、Webhook管理
 */
import React from 'react';
import { Box, Typography, Card, CardContent, CardHeader, Grid, Alert, } from '@mui/material';
import { Link as IntegrationIcon } from '@mui/icons-material';
const IntegrationSettings = ({ settings }) => {
    return (_jsxs(Box, { sx: { maxWidth: 1200, mx: 'auto' }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "\u7D71\u5408\u8A2D\u5B9A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "API\u3001LDAP/AD\u9023\u643A\u3001\u5916\u90E8\u30B7\u30B9\u30C6\u30E0\u7D71\u5408\u3092\u8A2D\u5B9A\u3057\u307E\u3059" }), _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\u7D71\u5408\u8A2D\u5B9A", avatar: _jsx(IntegrationIcon, { color: "primary" }) }), _jsx(CardContent, { children: _jsx(Alert, { severity: "info", children: "\u7D71\u5408\u8A2D\u5B9A\u6A5F\u80FD\u306F\u5B9F\u88C5\u4E2D\u3067\u3059\u3002\u8A73\u7D30\u306A\u8A2D\u5B9A\u753B\u9762\u306F\u4ECA\u5F8C\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u63D0\u4F9B\u4E88\u5B9A\u3067\u3059\u3002" }) })] }) }) })] }));
};
export default IntegrationSettings;
