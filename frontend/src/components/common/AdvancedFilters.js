import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, Box, Typography, OutlinedInput, FormControlLabel, Checkbox, IconButton, Tooltip, Tabs, Tab, List, ListItem, ListItemText, ListItemSecondaryAction, } from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon, FilterAlt as FilterIcon, Delete as DeleteIcon, Bookmark as BookmarkIcon, } from '@mui/icons-material';
const AdvancedFilters = ({ open, onClose, onApply, filterType, initialFilters = {}, savedFilters = [], onSaveFilter, onLoadFilter, onDeleteFilter, }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [filterName, setFilterName] = useState('');
    const [activeTab, setActiveTab] = useState(0); // 0: 基本, 1: 高度, 2: 保存済み
    const handleApply = () => {
        onApply(filters);
        onClose();
    };
    const handleReset = () => {
        setFilters({});
    };
    const handleClose = () => {
        setFilters(initialFilters);
        onClose();
    };
    const renderBasicTicketFilters = () => {
        const ticketFilters = filters;
        return (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs(Select, { multiple: true, value: ticketFilters.status || [], onChange: (e) => setFilters(prev => ({ ...prev, status: e.target.value })), input: _jsx(OutlinedInput, { label: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => {
                                        const statusLabels = {
                                            open: '未対応',
                                            in_progress: '対応中',
                                            resolved: '解決済み',
                                            closed: '完了',
                                            on_hold: '保留中',
                                        };
                                        return (_jsx(Chip, { label: statusLabels[value], size: "small" }, value));
                                    }) })), children: [_jsx(MenuItem, { value: "open", children: "\u672A\u5BFE\u5FDC" }), _jsx(MenuItem, { value: "in_progress", children: "\u5BFE\u5FDC\u4E2D" }), _jsx(MenuItem, { value: "resolved", children: "\u89E3\u6C7A\u6E08\u307F" }), _jsx(MenuItem, { value: "closed", children: "\u5B8C\u4E86" }), _jsx(MenuItem, { value: "on_hold", children: "\u4FDD\u7559\u4E2D" })] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u512A\u5148\u5EA6" }), _jsxs(Select, { multiple: true, value: ticketFilters.priority || [], onChange: (e) => setFilters(prev => ({ ...prev, priority: e.target.value })), input: _jsx(OutlinedInput, { label: "\u512A\u5148\u5EA6" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => {
                                        const priorityLabels = {
                                            critical: '緊急',
                                            high: '高',
                                            medium: '中',
                                            low: '低',
                                        };
                                        return (_jsx(Chip, { label: priorityLabels[value], size: "small" }, value));
                                    }) })), children: [_jsx(MenuItem, { value: "critical", children: "\u7DCA\u6025" }), _jsx(MenuItem, { value: "high", children: "\u9AD8" }), _jsx(MenuItem, { value: "medium", children: "\u4E2D" }), _jsx(MenuItem, { value: "low", children: "\u4F4E" })] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u30AB\u30C6\u30B4\u30EA" }), _jsxs(Select, { multiple: true, value: ticketFilters.category || [], onChange: (e) => setFilters(prev => ({ ...prev, category: e.target.value })), input: _jsx(OutlinedInput, { label: "\u30AB\u30C6\u30B4\u30EA" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => (_jsx(Chip, { label: value, size: "small" }, value))) })), children: [_jsx(MenuItem, { value: "Infrastructure", children: "Infrastructure" }), _jsx(MenuItem, { value: "Network", children: "Network" }), _jsx(MenuItem, { value: "Hardware", children: "Hardware" }), _jsx(MenuItem, { value: "Software", children: "Software" }), _jsx(MenuItem, { value: "Email", children: "Email" }), _jsx(MenuItem, { value: "Security", children: "Security" }), _jsx(MenuItem, { value: "License", children: "License" }), _jsx(MenuItem, { value: "Database", children: "Database" })] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u691C\u7D22\u30AD\u30FC\u30EF\u30FC\u30C9", placeholder: "\u30BF\u30A4\u30C8\u30EB\u3084\u8AAC\u660E\u3067\u691C\u7D22", value: ticketFilters.search || '', onChange: (e) => setFilters(prev => ({ ...prev, search: e.target.value })) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u4F5C\u6210\u958B\u59CB\u65E5", type: "date", value: ticketFilters.dateFrom ? ticketFilters.dateFrom.split('T')[0] : '', onChange: (e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })), InputLabelProps: {
                            shrink: true,
                        } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u4F5C\u6210\u7D42\u4E86\u65E5", type: "date", value: ticketFilters.dateTo ? ticketFilters.dateTo.split('T')[0] : '', onChange: (e) => setFilters(prev => ({ ...prev, dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })), InputLabelProps: {
                            shrink: true,
                        } }) })] }));
    };
    const renderAdvancedTicketFilters = () => {
        const ticketFilters = filters;
        return (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, children: _jsxs(FormControl, { component: "fieldset", children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "\u691C\u7D22\u5BFE\u8C61\u30D5\u30A3\u30FC\u30EB\u30C9" }), _jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 1 }, children: ['title', 'description', 'comments'].map((field) => {
                                    const fieldLabels = {
                                        title: 'タイトル',
                                        description: '説明',
                                        comments: 'コメント'
                                    };
                                    return (_jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: ticketFilters.searchFields?.includes(field) ?? true, onChange: (e) => {
                                                const currentFields = ticketFilters.searchFields || ['title', 'description', 'comments'];
                                                const newFields = e.target.checked
                                                    ? [...currentFields, field]
                                                    : currentFields.filter(f => f !== field);
                                                setFilters(prev => ({ ...prev, searchFields: newFields }));
                                            }, size: "small" }), label: fieldLabels[field] }, field));
                                }) })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u671F\u9650\u958B\u59CB\u65E5", type: "date", value: ticketFilters.dueDateFrom ? ticketFilters.dueDateFrom.split('T')[0] : '', onChange: (e) => setFilters(prev => ({ ...prev, dueDateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })), InputLabelProps: {
                            shrink: true,
                        } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u671F\u9650\u7D42\u4E86\u65E5", type: "date", value: ticketFilters.dueDateTo ? ticketFilters.dueDateTo.split('T')[0] : '', onChange: (e) => setFilters(prev => ({ ...prev, dueDateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })), InputLabelProps: {
                            shrink: true,
                        } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "SLA\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs(Select, { value: ticketFilters.slaStatus || '', onChange: (e) => setFilters(prev => ({ ...prev, slaStatus: e.target.value || undefined })), label: "SLA\u30B9\u30C6\u30FC\u30BF\u30B9", children: [_jsx(MenuItem, { value: "", children: "\u3059\u3079\u3066" }), _jsx(MenuItem, { value: "compliant", children: "\u9075\u5B88" }), _jsx(MenuItem, { value: "at_risk", children: "\u30EA\u30B9\u30AF" }), _jsx(MenuItem, { value: "violated", children: "\u9055\u53CD" })] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { fullWidth: true, label: "\u6700\u7D42\u66F4\u65B0\u65E5\u6570\uFF08\u4EE5\u5185\uFF09", type: "number", value: ticketFilters.lastUpdatedDays || '', onChange: (e) => setFilters(prev => ({ ...prev, lastUpdatedDays: e.target.value ? parseInt(e.target.value) : undefined })), placeholder: "\u4F8B: 7\uFF087\u65E5\u4EE5\u5185\uFF09" }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: ticketFilters.hasAttachments ?? false, onChange: (e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked || undefined })) }), label: "\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB\u304C\u3042\u308B\u30C1\u30B1\u30C3\u30C8\u306E\u307F" }) })] }));
    };
    const renderSavedFilters = () => {
        return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u4FDD\u5B58\u6E08\u307F\u30D5\u30A3\u30EB\u30BF\u30FC" }), _jsx(List, { children: savedFilters.map((savedFilter) => (_jsxs(ListItem, { button: true, onClick: () => {
                            if (onLoadFilter) {
                                onLoadFilter(savedFilter.id);
                                setFilters(savedFilter.filters);
                            }
                        }, sx: {
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
                            '&:hover': {
                                bgcolor: 'action.hover',
                            },
                        }, children: [_jsx(BookmarkIcon, { sx: { mr: 2, color: 'primary.main' } }), _jsx(ListItemText, { primary: savedFilter.name, secondary: `${savedFilter.type === 'ticket' ? 'チケット' : 'ユーザー'}フィルター - ${new Date(savedFilter.createdAt).toLocaleDateString('ja-JP')}` }), _jsx(ListItemSecondaryAction, { children: onDeleteFilter && (_jsx(IconButton, { edge: "end", onClick: (e) => {
                                        e.stopPropagation();
                                        onDeleteFilter(savedFilter.id);
                                    }, size: "small", children: _jsx(DeleteIcon, {}) })) })] }, savedFilter.id))) }), savedFilters.length === 0 && (_jsx(Typography, { variant: "body2", color: "text.secondary", textAlign: "center", sx: { py: 4 }, children: "\u4FDD\u5B58\u3055\u308C\u305F\u30D5\u30A3\u30EB\u30BF\u30FC\u306F\u3042\u308A\u307E\u305B\u3093" }))] }));
    };
    const renderUserFilters = () => {
        const userFilters = filters;
        return (_jsxs(_Fragment, { children: [_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u5F79\u5272" }), _jsxs(Select, { multiple: true, value: userFilters.role || [], onChange: (e) => setFilters(prev => ({ ...prev, role: e.target.value })), input: _jsx(OutlinedInput, { label: "\u5F79\u5272" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => {
                                        const roleLabels = {
                                            admin: '管理者',
                                            manager: 'マネージャー',
                                            operator: 'オペレーター',
                                            viewer: '閲覧者',
                                        };
                                        return (_jsx(Chip, { label: roleLabels[value], size: "small" }, value));
                                    }) })), children: [_jsx(MenuItem, { value: "admin", children: "\u7BA1\u7406\u8005" }), _jsx(MenuItem, { value: "manager", children: "\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC" }), _jsx(MenuItem, { value: "operator", children: "\u30AA\u30DA\u30EC\u30FC\u30BF\u30FC" }), _jsx(MenuItem, { value: "viewer", children: "\u95B2\u89A7\u8005" })] })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "\u90E8\u7F72" }), _jsxs(Select, { multiple: true, value: userFilters.department || [], onChange: (e) => setFilters(prev => ({ ...prev, department: e.target.value })), input: _jsx(OutlinedInput, { label: "\u90E8\u7F72" }), renderValue: (selected) => (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 }, children: selected.map((value) => (_jsx(Chip, { label: value, size: "small" }, value))) })), children: [_jsx(MenuItem, { value: "IT\u90E8", children: "IT\u90E8" }), _jsx(MenuItem, { value: "\u55B6\u696D\u90E8", children: "\u55B6\u696D\u90E8" }), _jsx(MenuItem, { value: "\u30B5\u30DD\u30FC\u30C8\u90E8", children: "\u30B5\u30DD\u30FC\u30C8\u90E8" }), _jsx(MenuItem, { value: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u90E8", children: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u90E8" }), _jsx(MenuItem, { value: "\u4EBA\u4E8B\u90E8", children: "\u4EBA\u4E8B\u90E8" })] })] }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u691C\u7D22\u30AD\u30FC\u30EF\u30FC\u30C9", placeholder: "\u540D\u524D\u3001\u30E1\u30FC\u30EB\u3001\u90E8\u7F72\u3067\u691C\u7D22", value: userFilters.search || '', onChange: (e) => setFilters(prev => ({ ...prev, search: e.target.value })) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: userFilters.isActive ?? true, onChange: (e) => setFilters(prev => ({ ...prev, isActive: e.target.checked })) }), label: "\u30A2\u30AF\u30C6\u30A3\u30D6\u30E6\u30FC\u30B6\u30FC\u306E\u307F\u8868\u793A" }) })] }));
    };
    return (_jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(FilterIcon, {}), _jsxs(Typography, { variant: "h6", children: ["\u9AD8\u5EA6\u306A\u30D5\u30A3\u30EB\u30BF\u30FC (", filterType === 'ticket' ? 'チケット' : 'ユーザー', ")"] })] }), _jsx(Tooltip, { title: "\u9589\u3058\u308B", children: _jsx(IconButton, { onClick: handleClose, size: "small", children: _jsx(CloseIcon, {}) }) })] }) }), _jsxs(DialogContent, { children: [_jsxs(Tabs, { value: activeTab, onChange: (_, newValue) => setActiveTab(newValue), sx: { borderBottom: 1, borderColor: 'divider', mb: 2 }, children: [_jsx(Tab, { label: "\u57FA\u672C\u30D5\u30A3\u30EB\u30BF\u30FC" }), _jsx(Tab, { label: "\u9AD8\u5EA6\u30D5\u30A3\u30EB\u30BF\u30FC", disabled: filterType !== 'ticket' }), _jsx(Tab, { label: "\u4FDD\u5B58\u6E08\u307F\u30D5\u30A3\u30EB\u30BF\u30FC", disabled: !savedFilters.length })] }), activeTab === 0 && (_jsx(Grid, { container: true, spacing: 2, children: filterType === 'ticket' ? renderBasicTicketFilters() : renderUserFilters() })), activeTab === 1 && filterType === 'ticket' && (_jsx(Grid, { container: true, spacing: 2, children: renderAdvancedTicketFilters() })), activeTab === 2 && (_jsx(Box, { children: renderSavedFilters() }))] }), _jsx(DialogActions, { sx: { px: 3, pb: 3 }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', width: '100%' }, children: [_jsx(Box, { children: onSaveFilter && (_jsx(Button, { onClick: () => setShowSaveDialog(true), color: "primary", variant: "outlined", children: "\u30D5\u30A3\u30EB\u30BF\u30FC\u3092\u4FDD\u5B58" })) }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { onClick: handleReset, startIcon: _jsx(RefreshIcon, {}), color: "inherit", children: "\u30EA\u30BB\u30C3\u30C8" }), _jsx(Button, { onClick: handleClose, color: "inherit", children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: handleApply, variant: "contained", startIcon: _jsx(FilterIcon, {}), children: "\u30D5\u30A3\u30EB\u30BF\u30FC\u3092\u9069\u7528" })] })] }) }), _jsxs(Dialog, { open: showSaveDialog, onClose: () => setShowSaveDialog(false), children: [_jsx(DialogTitle, { children: "\u30D5\u30A3\u30EB\u30BF\u30FC\u3092\u4FDD\u5B58" }), _jsx(DialogContent, { children: _jsx(TextField, { fullWidth: true, label: "\u30D5\u30A3\u30EB\u30BF\u30FC\u540D", value: filterName, onChange: (e) => setFilterName(e.target.value), placeholder: "\u4F8B: \u7DCA\u6025\u30C1\u30B1\u30C3\u30C8\u7528\u30D5\u30A3\u30EB\u30BF\u30FC", sx: { mt: 2 } }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setShowSaveDialog(false), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { onClick: () => {
                                    if (filterName.trim() && onSaveFilter) {
                                        onSaveFilter(filterName.trim(), filters);
                                        setFilterName('');
                                        setShowSaveDialog(false);
                                    }
                                }, variant: "contained", disabled: !filterName.trim(), children: "\u4FDD\u5B58" })] })] })] }));
};
export default AdvancedFilters;
