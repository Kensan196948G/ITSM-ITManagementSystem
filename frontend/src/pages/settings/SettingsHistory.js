import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 設定変更履歴コンポーネント
 * 設定変更の履歴を表示・管理
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField, FormControl, InputLabel, Select, MenuItem, Button, Alert, CircularProgress, } from '@mui/material';
import { History as HistoryIcon, Person as PersonIcon, Schedule as ScheduleIcon, } from '@mui/icons-material';
import { useSystemSettings } from '../../hooks/useSystemSettings';
const SettingsHistory = ({ category }) => {
    const { loadHistory, loading, error } = useSystemSettings();
    const [history, setHistory] = useState([]);
    const [filterCategory, setFilterCategory] = useState(category || '');
    const [filterUser, setFilterUser] = useState('');
    const [sortBy, setSortBy] = useState('changedAt');
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                await loadHistory(filterCategory);
            }
            catch (err) {
                console.error('Failed to load history:', err);
            }
        };
        fetchHistory();
    }, [loadHistory, filterCategory]);
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ja-JP');
    };
    const getCategoryLabel = (cat) => {
        const categories = {
            general: '一般設定',
            security: 'セキュリティ設定',
            notifications: '通知設定',
            sla: 'SLA設定',
            workflows: 'ワークフロー設定',
            data: 'データ管理',
            integrations: '統合設定',
            monitoring: 'システム監視',
        };
        return categories[cat] || cat;
    };
    const getSeverityColor = (category) => {
        const colors = {
            security: 'error',
            general: 'primary',
            notifications: 'info',
            sla: 'warning',
            workflows: 'secondary',
            data: 'success',
            integrations: 'info',
            monitoring: 'warning',
        };
        return colors[category] || 'default';
    };
    if (loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 4 }, children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsx(Alert, { severity: "error", sx: { m: 2 }, children: error }));
    }
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 3 }, children: [_jsx(HistoryIcon, { sx: { mr: 1, color: 'primary.main' } }), _jsx(Typography, { variant: "h6", children: "\u8A2D\u5B9A\u5909\u66F4\u5C65\u6B74" })] }), _jsxs(Box, { sx: { display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }, children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 150 }, children: [_jsx(InputLabel, { children: "\u30AB\u30C6\u30B4\u30EA" }), _jsxs(Select, { value: filterCategory, onChange: (e) => setFilterCategory(e.target.value), label: "\u30AB\u30C6\u30B4\u30EA", children: [_jsx(MenuItem, { value: "", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "general", children: "\u4E00\u822C\u8A2D\u5B9A" }), _jsx(MenuItem, { value: "security", children: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u8A2D\u5B9A" }), _jsx(MenuItem, { value: "notifications", children: "\u901A\u77E5\u8A2D\u5B9A" }), _jsx(MenuItem, { value: "sla", children: "SLA\u8A2D\u5B9A" }), _jsx(MenuItem, { value: "workflows", children: "\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u8A2D\u5B9A" }), _jsx(MenuItem, { value: "data", children: "\u30C7\u30FC\u30BF\u7BA1\u7406" }), _jsx(MenuItem, { value: "integrations", children: "\u7D71\u5408\u8A2D\u5B9A" }), _jsx(MenuItem, { value: "monitoring", children: "\u30B7\u30B9\u30C6\u30E0\u76E3\u8996" })] })] }), _jsx(TextField, { size: "small", label: "\u30E6\u30FC\u30B6\u30FC\u3067\u7D5E\u308A\u8FBC\u307F", value: filterUser, onChange: (e) => setFilterUser(e.target.value), sx: { minWidth: 150 } }), _jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [_jsx(InputLabel, { children: "\u4E26\u3073\u9806" }), _jsxs(Select, { value: sortBy, onChange: (e) => setSortBy(e.target.value), label: "\u4E26\u3073\u9806", children: [_jsx(MenuItem, { value: "changedAt", children: "\u66F4\u65B0\u65E5\u6642" }), _jsx(MenuItem, { value: "category", children: "\u30AB\u30C6\u30B4\u30EA" }), _jsx(MenuItem, { value: "changedBy", children: "\u30E6\u30FC\u30B6\u30FC" })] })] })] }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u65E5\u6642" }), _jsx(TableCell, { children: "\u30AB\u30C6\u30B4\u30EA" }), _jsx(TableCell, { children: "\u8A2D\u5B9A\u9805\u76EE" }), _jsx(TableCell, { children: "\u5909\u66F4\u8005" }), _jsx(TableCell, { children: "\u5909\u66F4\u524D" }), _jsx(TableCell, { children: "\u5909\u66F4\u5F8C" }), _jsx(TableCell, { children: "\u7406\u7531" })] }) }), _jsx(TableBody, { children: history.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, sx: { textAlign: 'center', py: 4 }, children: _jsx(Typography, { color: "text.secondary", children: "\u5909\u66F4\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093" }) }) })) : (history.map((item) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(ScheduleIcon, { sx: { mr: 1, fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", children: formatDate(item.changedAt) })] }) }), _jsx(TableCell, { children: _jsx(Chip, { label: getCategoryLabel(item.category), color: getSeverityColor(item.category), size: "small" }) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", children: item.setting }) }), _jsx(TableCell, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(PersonIcon, { sx: { mr: 1, fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", children: item.changedBy })] }) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: typeof item.oldValue === 'object'
                                                ? JSON.stringify(item.oldValue).substring(0, 50) + '...'
                                                : String(item.oldValue).substring(0, 50) }) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", children: typeof item.newValue === 'object'
                                                ? JSON.stringify(item.newValue).substring(0, 50) + '...'
                                                : String(item.newValue).substring(0, 50) }) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", children: item.reason || '-' }) })] }, item.id)))) })] }) }), history.length > 0 && (_jsx(Box, { sx: { mt: 2, display: 'flex', justifyContent: 'center' }, children: _jsx(Button, { variant: "outlined", size: "small", children: "\u3055\u3089\u306B\u8AAD\u307F\u8FBC\u3080" }) }))] }));
};
export default SettingsHistory;
