import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, Grid, Alert, AlertTitle, Card, CardContent, Divider, Chip, LinearProgress, Autocomplete, FormHelperText, } from '@mui/material';
import { Save as SaveIcon, CloudUpload as UploadIcon, Delete as DeleteIcon, Info as InfoIcon, } from '@mui/icons-material';
import { priorityColors } from '../../theme/theme';
const CreateTicket = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        category: '',
        assigneeId: '',
        attachments: [],
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState([]);
    // Mock data - 実際の実装ではAPIから取得
    const categories = [
        'Infrastructure',
        'Network',
        'Hardware',
        'Software',
        'Email',
        'Security',
        'License',
        'Database',
        'Application',
        'Other',
    ];
    const assignees = [
        { id: '1', name: '山田太郎', department: 'IT部' },
        { id: '2', name: '佐藤花子', department: 'IT部' },
        { id: '3', name: '田中一郎', department: 'IT部' },
        { id: '4', name: '高橋三郎', department: 'セキュリティ部' },
    ];
    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'タイトルは必須です';
        }
        else if (formData.title.length > 200) {
            newErrors.title = 'タイトルは200文字以内で入力してください';
        }
        if (!formData.description.trim()) {
            newErrors.description = '説明は必須です';
        }
        else if (formData.description.length > 5000) {
            newErrors.description = '説明は5000文字以内で入力してください';
        }
        if (!formData.category) {
            newErrors.category = 'カテゴリは必須です';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        try {
            // API call simulation
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Success - redirect to ticket list
            navigate('/tickets', {
                state: { message: 'チケットが正常に作成されました' }
            });
        }
        catch (error) {
            console.error('Error creating ticket:', error);
            setErrors({ submit: 'チケットの作成に失敗しました。もう一度お試しください。' });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files || []);
        const validFiles = files.filter(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setErrors(prev => ({ ...prev, attachments: 'ファイルサイズは10MB以下にしてください' }));
                return false;
            }
            return true;
        });
        setAttachments(prev => [...prev, ...validFiles]);
        setErrors(prev => ({ ...prev, attachments: '' }));
    };
    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const getPriorityInfo = (priority) => {
        const info = {
            critical: {
                label: '緊急',
                description: '業務に重大な影響を与える問題（2時間以内の対応が必要）',
                color: priorityColors.critical,
            },
            high: {
                label: '高',
                description: '業務に影響を与える問題（8時間以内の対応が必要）',
                color: priorityColors.high,
            },
            medium: {
                label: '中',
                description: '通常の問題（24時間以内の対応が必要）',
                color: priorityColors.medium,
            },
            low: {
                label: '低',
                description: '軽微な問題（72時間以内の対応が必要）',
                color: priorityColors.low,
            },
        };
        return info[priority];
    };
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h4", sx: { fontWeight: 600 }, children: "\u65B0\u898F\u30C1\u30B1\u30C3\u30C8\u4F5C\u6210" }), _jsx(Button, { variant: "outlined", onClick: () => navigate('/tickets'), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" })] }), isSubmitting && _jsx(LinearProgress, { sx: { mb: 2 } }), errors.submit && (_jsxs(Alert, { severity: "error", sx: { mb: 3 }, children: [_jsx(AlertTitle, { children: "\u30A8\u30E9\u30FC" }), errors.submit] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, md: 8, children: _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u57FA\u672C\u60C5\u5831" }), _jsx(Divider, { sx: { mb: 3 } }), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, label: "\u30BF\u30A4\u30C8\u30EB *", value: formData.title, onChange: (e) => setFormData(prev => ({ ...prev, title: e.target.value })), error: !!errors.title, helperText: errors.title, placeholder: "\u554F\u984C\u306E\u6982\u8981\u3092\u7C21\u6F54\u306B\u8A18\u8F09\u3057\u3066\u304F\u3060\u3055\u3044", inputProps: { maxLength: 200 } }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, multiline: true, rows: 6, label: "\u8AAC\u660E *", value: formData.description, onChange: (e) => setFormData(prev => ({ ...prev, description: e.target.value })), error: !!errors.description, helperText: errors.description || `${formData.description.length}/5000文字`, placeholder: "\u554F\u984C\u306E\u8A73\u7D30\u306A\u8AAC\u660E\u3001\u767A\u751F\u72B6\u6CC1\u3001\u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\u306A\u3069\u3092\u8A18\u8F09\u3057\u3066\u304F\u3060\u3055\u3044", inputProps: { maxLength: 5000 } }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsxs(FormControl, { fullWidth: true, error: !!errors.category, children: [_jsx(InputLabel, { children: "\u30AB\u30C6\u30B4\u30EA *" }), _jsx(Select, { value: formData.category, onChange: (e) => setFormData(prev => ({ ...prev, category: e.target.value })), label: "\u30AB\u30C6\u30B4\u30EA *", children: categories.map((category) => (_jsx(MenuItem, { value: category, children: category }, category))) }), errors.category && _jsx(FormHelperText, { children: errors.category })] }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(Autocomplete, { options: assignees, getOptionLabel: (option) => `${option.name} (${option.department})`, value: assignees.find(a => a.id === formData.assigneeId) || null, onChange: (_, value) => setFormData(prev => ({ ...prev, assigneeId: value?.id || '' })), renderInput: (params) => (_jsx(TextField, { ...params, label: "\u62C5\u5F53\u8005", placeholder: "\u62C5\u5F53\u8005\u3092\u9078\u629E\uFF08\u7A7A\u767D\u306E\u5834\u5408\u306F\u81EA\u52D5\u5272\u5F53\uFF09" })) }) }), _jsxs(Grid, { item: true, xs: 12, children: [_jsx(Typography, { variant: "subtitle1", gutterBottom: true, children: "\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB" }), _jsx("input", { type: "file", multiple: true, onChange: handleFileUpload, style: { display: 'none' }, id: "file-upload", accept: ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.log" }), _jsx("label", { htmlFor: "file-upload", children: _jsx(Button, { variant: "outlined", component: "span", startIcon: _jsx(UploadIcon, {}), sx: { mb: 2 }, children: "\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u629E" }) }), errors.attachments && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: errors.attachments })), attachments.length > 0 && (_jsx(Box, { children: attachments.map((file, index) => (_jsx(Chip, { label: `${file.name} (${formatFileSize(file.size)})`, onDelete: () => removeAttachment(index), deleteIcon: _jsx(DeleteIcon, {}), sx: { m: 0.5 } }, index))) })), _jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "\u6700\u59275\u30D5\u30A1\u30A4\u30EB\u3001\u5404\u30D5\u30A1\u30A4\u30EB10MB\u4EE5\u4E0B\u3002\u5BFE\u5FDC\u5F62\u5F0F: JPG, PNG, PDF, DOC, TXT, LOG" })] })] })] }) }), _jsxs(Grid, { item: true, xs: 12, md: 4, children: [_jsx(Card, { sx: { mb: 3 }, children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u512A\u5148\u5EA6 *" }), _jsx(FormControl, { fullWidth: true, children: _jsx(Select, { value: formData.priority, onChange: (e) => setFormData(prev => ({ ...prev, priority: e.target.value })), children: ['critical', 'high', 'medium', 'low'].map((priority) => {
                                                            const info = getPriorityInfo(priority);
                                                            return (_jsx(MenuItem, { value: priority, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', width: '100%' }, children: [_jsx(Box, { sx: {
                                                                                width: 12,
                                                                                height: 12,
                                                                                borderRadius: '50%',
                                                                                bgcolor: info.color,
                                                                                mr: 1,
                                                                            } }), info.label] }) }, priority));
                                                        }) }) }), _jsxs(Box, { sx: { mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', mb: 1 }, children: [_jsx(InfoIcon, { sx: { fontSize: 16, color: 'info.main', mr: 0.5 } }), _jsxs(Typography, { variant: "subtitle2", children: [getPriorityInfo(formData.priority).label, " \u512A\u5148\u5EA6"] })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: getPriorityInfo(formData.priority).description })] })] }) }), _jsx(Card, { children: _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30D8\u30EB\u30D7" }), _jsx(Typography, { variant: "body2", color: "text.secondary", paragraph: true, children: "\u30C1\u30B1\u30C3\u30C8\u4F5C\u6210\u6642\u306E\u30DD\u30A4\u30F3\u30C8\uFF1A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", component: "div", children: "\u2022 \u554F\u984C\u3092\u518D\u73FE\u3059\u308B\u624B\u9806\u3092\u8A73\u3057\u304F\u8A18\u8F09 \u2022 \u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u3042\u308C\u3070\u6B63\u78BA\u306B\u8A18\u8F09 \u2022 \u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u304C\u3042\u308B\u3068\u89E3\u6C7A\u304C\u65E9\u304F\u306A\u308A\u307E\u3059 \u2022 \u5F71\u97FF\u7BC4\u56F2\uFF08\u4F55\u4EBA\u304F\u3089\u3044\u304C\u56F0\u3063\u3066\u3044\u308B\u304B\uFF09\u3092\u8A18\u8F09" })] }) })] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }, children: [_jsx(Button, { variant: "outlined", onClick: () => navigate('/tickets'), disabled: isSubmitting, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx(Button, { type: "submit", variant: "contained", startIcon: _jsx(SaveIcon, {}), disabled: isSubmitting, size: "large", children: isSubmitting ? '作成中...' : 'チケットを作成' })] })] })] }));
};
export default CreateTicket;
