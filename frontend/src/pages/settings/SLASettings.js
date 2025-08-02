import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, Card, CardContent, CardHeader, Grid, Alert, } from '@mui/material';
import { Timer as TimerIcon } from '@mui/icons-material';
const SLASettings = ({ settings }) => {
    return (_jsxs(Box, { sx: { maxWidth: 1200, mx: 'auto' }, children: [_jsx(Typography, { variant: "h5", gutterBottom: true, children: "SLA\u8A2D\u5B9A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "\u30B5\u30FC\u30D3\u30B9\u30EC\u30D9\u30EB\u5408\u610F\u3001\u55B6\u696D\u6642\u9593\u3001\u30A8\u30B9\u30AB\u30EC\u30FC\u30B7\u30E7\u30F3\u8A2D\u5B9A\u3092\u7BA1\u7406\u3057\u307E\u3059" }), _jsx(Grid, { container: true, spacing: 3, children: _jsx(Grid, { item: true, xs: 12, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "SLA\u8A2D\u5B9A", avatar: _jsx(TimerIcon, { color: "primary" }) }), _jsx(CardContent, { children: _jsx(Alert, { severity: "info", children: "SLA\u8A2D\u5B9A\u6A5F\u80FD\u306F\u5B9F\u88C5\u4E2D\u3067\u3059\u3002\u8A73\u7D30\u306A\u8A2D\u5B9A\u753B\u9762\u306F\u4ECA\u5F8C\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u63D0\u4F9B\u4E88\u5B9A\u3067\u3059\u3002" }) })] }) }) })] }));
};
export default SLASettings;
