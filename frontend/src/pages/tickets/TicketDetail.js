import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Button, Chip, Avatar, Divider, Grid, Card, CardContent, TextField, IconButton, Menu, MenuItem, 
// Timeline components removed - use alternative layout
Alert, Dialog, DialogTitle, DialogContent, DialogActions, } from '@mui/material';
import { Edit as EditIcon, MoreVert as MoreVertIcon, Person as PersonIcon, Schedule as ScheduleIcon, Category as CategoryIcon, Flag as FlagIcon, Assignment as AssignmentIcon, Comment as CommentIcon, Attachment as AttachmentIcon, Download as DownloadIcon, Close as CloseIcon, Check as CheckIcon, Pause as PauseIcon, } from '@mui/icons-material';
import { priorityColors, statusColors } from '../../theme/theme';
const TicketDetail = () => {
    const { id } = useParams();
    // const navigate = useNavigate() // Commented out temporarily
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [moreAnchor, setMoreAnchor] = useState(null);
    // Mock data - 実際の実装ではAPIから取得
    const mockTicket = {
        id: id || '1',
        title: 'サーバー応答速度低下',
        description: 'Webサーバーの応答速度が著しく低下しています。特に午前中のピーク時間帯において、レスポンスタイムが通常の3倍以上になっています。影響範囲は全社的で、約200名のユーザーが業務に支障をきたしています。',
        status: 'in_progress',
        priority: 'critical',
        category: 'Infrastructure',
        assigneeId: '1',
        assigneeName: '山田太郎',
        reporterId: '2',
        reporterName: '田中一郎',
        createdAt: '2025-08-01T10:30:00Z',
        updatedAt: '2025-08-01T11:00:00Z',
        slaDeadline: '2025-08-01T12:30:00Z',
        estimatedResolutionTime: 2,
        tags: ['urgent', 'server', 'performance'],
        attachments: [
            {
                id: '1',
                fileName: 'server-logs.txt',
                originalName: 'server-logs.txt',
                mimeType: 'text/plain',
                size: 2048,
                url: '/attachments/server-logs.txt',
                uploadedBy: '田中一郎',
                createdAt: '2025-08-01T10:30:00Z',
                updatedAt: '2025-08-01T10:30:00Z',
            },
            {
                id: '2',
                fileName: 'error-screenshot.png',
                originalName: 'error-screenshot.png',
                mimeType: 'image/png',
                size: 156789,
                url: '/attachments/error-screenshot.png',
                uploadedBy: '田中一郎',
                createdAt: '2025-08-01T10:32:00Z',
                updatedAt: '2025-08-01T10:32:00Z',
            },
        ],
        comments: [
            {
                id: '1',
                content: 'チケットを確認しました。サーバーログを確認し、原因調査を開始します。',
                authorId: '1',
                authorName: '山田太郎',
                isInternal: false,
                createdAt: '2025-08-01T10:45:00Z',
                updatedAt: '2025-08-01T10:45:00Z',
            },
            {
                id: '2',
                content: 'データベース接続プールの設定に問題があることが判明。修正作業を開始します。',
                authorId: '1',
                authorName: '山田太郎',
                isInternal: true,
                createdAt: '2025-08-01T11:15:00Z',
                updatedAt: '2025-08-01T11:15:00Z',
            },
        ],
    };
    const getPriorityChip = (priority) => {
        const color = priorityColors[priority];
        const labels = {
            critical: '緊急',
            high: '高',
            medium: '中',
            low: '低',
        };
        return (_jsx(Chip, { label: labels[priority], size: "small", sx: {
                bgcolor: `${color}20`,
                color: color,
                fontWeight: 600,
            } }));
    };
    const getStatusChip = (status) => {
        const color = statusColors[status];
        const labels = {
            open: '未対応',
            in_progress: '対応中',
            resolved: '解決済み',
            closed: '完了',
            on_hold: '保留中',
        };
        return (_jsx(Chip, { label: labels[status], size: "small", sx: {
                bgcolor: `${color}20`,
                color: color,
                fontWeight: 500,
            } }));
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const handleStatusChange = (newStatus) => {
        // Handle status change
        console.log('Changing status to:', newStatus);
        setMoreAnchor(null);
    };
    const handleAddComment = () => {
        if (!commentText.trim())
            return;
        // Add comment logic here
        console.log('Adding comment:', commentText);
        setCommentText('');
    };
    const timelineItems = [
        {
            time: mockTicket.createdAt,
            author: mockTicket.reporterName,
            action: 'チケットを作成',
            icon: _jsx(AssignmentIcon, {}),
            color: 'primary',
        },
        ...(mockTicket.comments?.map(comment => ({
            time: comment.createdAt,
            author: comment.authorName,
            action: comment.isInternal ? '内部コメントを追加' : 'コメントを追加',
            content: comment.content,
            icon: _jsx(CommentIcon, {}),
            color: comment.isInternal ? 'warning' : 'info',
        })) || []),
    ];
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }, children: [_jsxs(Box, { children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: ["\u30C1\u30B1\u30C3\u30C8 #", mockTicket.id] }), _jsx(Typography, { variant: "h4", sx: { fontWeight: 600, mb: 1 }, children: mockTicket.title }), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' }, children: [getPriorityChip(mockTicket.priority), getStatusChip(mockTicket.status), mockTicket.tags?.map(tag => (_jsx(Chip, { label: `#${tag}`, size: "small", variant: "outlined" }, tag)))] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(EditIcon, {}), onClick: () => setEditDialogOpen(true), children: "\u7DE8\u96C6" }), _jsx(IconButton, { onClick: (e) => setMoreAnchor(e.currentTarget), children: _jsx(MoreVertIcon, {}) })] })] }), mockTicket.slaDeadline && new Date(mockTicket.slaDeadline) < new Date() && (_jsxs(Alert, { severity: "error", sx: { mb: 3 }, children: ["SLA\u671F\u9650\u3092\u8D85\u904E\u3057\u3066\u3044\u307E\u3059: ", formatDate(mockTicket.slaDeadline)] })), _jsxs(Grid, { container: true, spacing: 3, children: [_jsxs(Grid, { item: true, xs: 12, md: 8, children: [_jsxs(Paper, { sx: { p: 3, mb: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u8A73\u7D30\u8AAC\u660E" }), _jsx(Divider, { sx: { mb: 2 } }), _jsx(Typography, { variant: "body1", sx: { whiteSpace: 'pre-wrap' }, children: mockTicket.description })] }), mockTicket.attachments && mockTicket.attachments.length > 0 && (_jsxs(Paper, { sx: { p: 3, mb: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB" }), _jsx(Divider, { sx: { mb: 2 } }), _jsx(Grid, { container: true, spacing: 2, children: mockTicket.attachments.map(attachment => (_jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(Card, { variant: "outlined", children: _jsx(CardContent, { sx: { p: 2 }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(AttachmentIcon, { color: "primary" }), _jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Typography, { variant: "subtitle2", noWrap: true, children: attachment.originalName }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatFileSize(attachment.size), " \u2022 \u30A2\u30C3\u30D7\u30ED\u30FC\u30C9: ", attachment.uploadedBy] })] }), _jsx(IconButton, { size: "small", children: _jsx(DownloadIcon, {}) })] }) }) }) }, attachment.id))) })] })), _jsxs(Paper, { sx: { p: 3, mb: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30B3\u30E1\u30F3\u30C8\u30FB\u4F5C\u696D\u30ED\u30B0" }), _jsx(Divider, { sx: { mb: 2 } }), _jsx(Box, { children: timelineItems.map((item, index) => (_jsxs(Box, { sx: { display: 'flex', mb: 3 }, children: [_jsx(Box, { sx: { mr: 2, mt: 0.5 }, children: _jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: `${item.color}.light` }, children: item.icon }) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600 }, children: item.author }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: item.action }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: formatDate(item.time) })] }), ('content' in item) && item.content && (_jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-wrap' }, children: item.content }))] })] }, index))) }), _jsxs(Box, { sx: { mt: 3 }, children: [_jsx(TextField, { fullWidth: true, multiline: true, rows: 3, label: "\u30B3\u30E1\u30F3\u30C8\u3092\u8FFD\u52A0", value: commentText, onChange: (e) => setCommentText(e.target.value), placeholder: "\u4F5C\u696D\u5185\u5BB9\u3001\u9032\u6357\u72B6\u6CC1\u3001\u767A\u898B\u4E8B\u9805\u306A\u3069\u3092\u8A18\u5165...", sx: { mb: 2 } }), _jsxs(Box, { sx: { display: 'flex', gap: 1, justifyContent: 'flex-end' }, children: [_jsx(Button, { variant: "outlined", onClick: () => setCommentText(''), disabled: !commentText.trim(), children: "\u30AF\u30EA\u30A2" }), _jsx(Button, { variant: "contained", onClick: handleAddComment, disabled: !commentText.trim(), children: "\u30B3\u30E1\u30F3\u30C8\u8FFD\u52A0" })] })] })] })] }), _jsxs(Grid, { item: true, xs: 12, md: 4, children: [_jsxs(Paper, { sx: { p: 3, mb: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30C1\u30B1\u30C3\u30C8\u60C5\u5831" }), _jsx(Divider, { sx: { mb: 2 } }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(PersonIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u62C5\u5F53\u8005" })] }), mockTicket.assigneeName ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Avatar, { sx: { width: 24, height: 24, fontSize: '0.75rem' }, children: mockTicket.assigneeName.charAt(0) }), _jsx(Typography, { variant: "body2", children: mockTicket.assigneeName })] })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u672A\u5272\u5F53" }))] }), _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(PersonIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u5831\u544A\u8005" })] }), _jsx(Typography, { variant: "body2", children: mockTicket.reporterName })] }), _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(CategoryIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30AB\u30C6\u30B4\u30EA" })] }), _jsx(Typography, { variant: "body2", children: mockTicket.category })] }), _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(FlagIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u512A\u5148\u5EA6" })] }), getPriorityChip(mockTicket.priority)] }), _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(ScheduleIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u4F5C\u6210\u65E5\u6642" })] }), _jsx(Typography, { variant: "body2", children: formatDate(mockTicket.createdAt) })] }), _jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(ScheduleIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u6700\u7D42\u66F4\u65B0" })] }), _jsx(Typography, { variant: "body2", children: formatDate(mockTicket.updatedAt) })] }), mockTicket.slaDeadline && (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }, children: [_jsx(ScheduleIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "SLA\u671F\u9650" })] }), _jsx(Typography, { variant: "body2", color: new Date(mockTicket.slaDeadline) < new Date() ? 'error' : 'text.primary', children: formatDate(mockTicket.slaDeadline) })] }))] })] }), _jsxs(Paper, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u30AF\u30A4\u30C3\u30AF\u30A2\u30AF\u30B7\u30E7\u30F3" }), _jsx(Divider, { sx: { mb: 2 } }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(CheckIcon, {}), onClick: () => handleStatusChange('resolved'), disabled: mockTicket.status === 'resolved', children: "\u89E3\u6C7A\u6E08\u307F\u306B\u3059\u308B" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(PauseIcon, {}), onClick: () => handleStatusChange('on_hold'), disabled: mockTicket.status === 'on_hold', children: "\u4E00\u6642\u4FDD\u7559" }), _jsx(Button, { variant: "outlined", startIcon: _jsx(CloseIcon, {}), onClick: () => handleStatusChange('closed'), disabled: mockTicket.status === 'closed', children: "\u30AF\u30ED\u30FC\u30BA" })] })] })] })] }), _jsxs(Menu, { anchorEl: moreAnchor, open: Boolean(moreAnchor), onClose: () => setMoreAnchor(null), children: [_jsx(MenuItem, { onClick: () => setMoreAnchor(null), children: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8" }), _jsx(MenuItem, { onClick: () => setMoreAnchor(null), children: "\u5C65\u6B74\u3092\u8868\u793A" }), _jsx(MenuItem, { onClick: () => setMoreAnchor(null), children: "\u95A2\u9023\u30C1\u30B1\u30C3\u30C8" })] }), _jsxs(Dialog, { open: editDialogOpen, onClose: () => setEditDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u30C1\u30B1\u30C3\u30C8\u7DE8\u96C6" }), _jsx(DialogContent, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u30C1\u30B1\u30C3\u30C8\u7DE8\u96C6\u6A5F\u80FD\u306F\u4ECA\u5F8C\u5B9F\u88C5\u4E88\u5B9A\u3067\u3059\u3002" }) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setEditDialogOpen(false), children: "\u9589\u3058\u308B" }) })] })] }));
};
export default TicketDetail;
