import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, CardHeader, Chip, List, ListItem, ListItemText, ListItemIcon, ListItemButton, Avatar, LinearProgress, Tabs, Tab, IconButton, Button, TextField, Collapse, Alert, } from '@mui/material';
import { Person as PersonIcon, Assignment as TicketIcon, History as HistoryIcon, Comment as CommentIcon, Attachment as AttachmentIcon, Timeline as TimelineIcon, Schedule as ScheduleIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, } from '@mui/icons-material';
import { priorityColors, statusColors } from '../../theme/theme';
const TabPanel = ({ children, value, index, ...other }) => (_jsx("div", { role: "tabpanel", hidden: value !== index, id: `detail-tabpanel-${index}`, "aria-labelledby": `detail-tab-${index}`, ...other, children: value === index && _jsx(Box, { children: children }) }));
const formatDate = (dateString) => {
    try {
        return new Date(dateString).toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    catch {
        return dateString;
    }
};
const getPriorityHighColor = (priority) => {
    return priorityColors[priority] || priorityColors.medium;
};
const getStatusColor = (status) => {
    return statusColors[status] || statusColors.open;
};
export const DetailPanelContent = ({ item, onEdit, onDelete, onRefresh, }) => {
    const [tabValue, setTabValue] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});
    const [editData, setEditData] = useState(item.data);
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };
    const handleEditToggle = () => {
        if (isEditing) {
            setEditData(item.data); // 編集をキャンセル
        }
        setIsEditing(!isEditing);
    };
    const handleSave = () => {
        if (onEdit) {
            onEdit({ ...item, data: editData });
        }
        setIsEditing(false);
    };
    // チケット詳細の表示
    const renderTicketDetails = (ticket) => (_jsxs(Box, { children: [_jsxs(Tabs, { value: tabValue, onChange: handleTabChange, "aria-label": "\u30C1\u30B1\u30C3\u30C8\u8A73\u7D30\u30BF\u30D6", children: [_jsx(Tab, { label: "\u6982\u8981", icon: _jsx(TicketIcon, {}) }), _jsx(Tab, { label: "\u5C65\u6B74", icon: _jsx(HistoryIcon, {}) }), _jsx(Tab, { label: "\u30B3\u30E1\u30F3\u30C8", icon: _jsx(CommentIcon, {}) }), _jsx(Tab, { label: "\u95A2\u9023\u60C5\u5831", icon: _jsx(AttachmentIcon, {}) })] }), _jsx(TabPanel, { value: tabValue, index: 0, children: _jsxs(Box, { sx: { p: 2 }, children: [_jsxs(Card, { sx: { mb: 2 }, children: [_jsx(CardHeader, { title: "\u57FA\u672C\u60C5\u5831", action: _jsxs(Box, { children: [_jsx(IconButton, { onClick: handleEditToggle, size: "small", children: isEditing ? _jsx(CancelIcon, {}) : _jsx(EditIcon, {}) }), isEditing && (_jsx(IconButton, { onClick: handleSave, size: "small", color: "primary", children: _jsx(SaveIcon, {}) }))] }) }), _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'grid', gap: 2 }, children: [isEditing ? (_jsx(TextField, { label: "\u30BF\u30A4\u30C8\u30EB", value: editData.title || '', onChange: (e) => setEditData({ ...editData, title: e.target.value }), fullWidth: true })) : (_jsx(Typography, { variant: "h6", gutterBottom: true, children: ticket.title })), _jsxs(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap' }, children: [_jsx(Chip, { label: ticket.status, sx: { backgroundColor: getStatusColor(ticket.status), color: 'white' }, size: "small" }), _jsx(Chip, { label: ticket.priority, sx: { backgroundColor: getPriorityHighColor(ticket.priority), color: 'white' }, size: "small" }), _jsx(Chip, { label: ticket.category, variant: "outlined", size: "small" })] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u4F5C\u6210\u65E5: ", formatDate(ticket.createdAt)] }), ticket.assigneeName && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(PersonIcon, { color: "action" }), _jsxs(Typography, { variant: "body2", children: ["\u62C5\u5F53\u8005: ", ticket.assigneeName] })] })), ticket.slaDeadline && (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(ScheduleIcon, { color: "action" }), _jsxs(Typography, { variant: "body2", children: ["SLA\u671F\u9650: ", formatDate(ticket.slaDeadline)] })] }))] }) })] }), _jsxs(Card, { sx: { mb: 2 }, children: [_jsx(CardHeader, { title: "\u8AAC\u660E", action: _jsx(IconButton, { onClick: () => toggleSection('description'), size: "small", children: expandedSections.description ? _jsx(ExpandLessIcon, {}) : _jsx(ExpandMoreIcon, {}) }) }), _jsx(Collapse, { in: expandedSections.description !== false, children: _jsx(CardContent, { children: isEditing ? (_jsx(TextField, { label: "\u8AAC\u660E", value: editData.description || '', onChange: (e) => setEditData({ ...editData, description: e.target.value }), multiline: true, rows: 4, fullWidth: true })) : (_jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-wrap' }, children: ticket.description })) }) })] }), ticket.customFields && ticket.customFields.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: "\u30AB\u30B9\u30BF\u30E0\u30D5\u30A3\u30FC\u30EB\u30C9" }), _jsx(CardContent, { children: _jsx(Box, { sx: { display: 'grid', gap: 2 }, children: ticket.customFields.map((field, index) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: field.label }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: String(field.value) })] }, index))) }) })] }))] }) }), _jsx(TabPanel, { value: tabValue, index: 1, children: _jsx(Box, { sx: { p: 2 }, children: ticket.history && ticket.history.length > 0 ? (_jsx(List, { children: ticket.history.map((entry, index) => (_jsxs(ListItem, { divider: index < ticket.history.length - 1, children: [_jsx(ListItemIcon, { children: _jsx(TimelineIcon, {}) }), _jsx(ListItemText, { primary: _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", component: "span", children: entry.action }), entry.field && (_jsxs(Typography, { variant: "caption", sx: { ml: 1 }, children: ["(", entry.field, ": ", entry.oldValue, " \u2192 ", entry.newValue, ")"] }))] }), secondary: _jsxs(Box, { children: [_jsxs(Typography, { variant: "caption", children: [formatDate(entry.timestamp), " - ", entry.userName] }), entry.comment && (_jsx(Typography, { variant: "body2", sx: { mt: 0.5 }, children: entry.comment }))] }) })] }, entry.id))) })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { textAlign: 'center', py: 4 }, children: "\u5C65\u6B74\u306F\u3042\u308A\u307E\u305B\u3093" })) }) }), _jsx(TabPanel, { value: tabValue, index: 2, children: _jsx(Box, { sx: { p: 2 }, children: ticket.comments && ticket.comments.length > 0 ? (_jsx(List, { children: ticket.comments.map((comment, index) => (_jsxs(ListItem, { divider: index < ticket.comments.length - 1, children: [_jsx(ListItemIcon, { children: _jsx(Avatar, { sx: { width: 32, height: 32 }, children: comment.authorName.charAt(0) }) }), _jsx(ListItemText, { primary: comment.authorName, secondary: _jsxs(Box, { children: [_jsxs(Typography, { variant: "caption", children: [formatDate(comment.createdAt), comment.isInternal && (_jsx(Chip, { label: "\u5185\u90E8", size: "small", sx: { ml: 1 } }))] }), _jsx(Typography, { variant: "body2", sx: { mt: 0.5 }, children: comment.content })] }) })] }, comment.id))) })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { textAlign: 'center', py: 4 }, children: "\u30B3\u30E1\u30F3\u30C8\u306F\u3042\u308A\u307E\u305B\u3093" })) }) }), _jsx(TabPanel, { value: tabValue, index: 3, children: _jsxs(Box, { sx: { p: 2 }, children: [ticket.attachments && ticket.attachments.length > 0 && (_jsxs(Card, { sx: { mb: 2 }, children: [_jsx(CardHeader, { title: "\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB" }), _jsx(CardContent, { children: _jsx(List, { dense: true, children: ticket.attachments.map((attachment) => (_jsxs(ListItemButton, { children: [_jsx(ListItemIcon, { children: _jsx(AttachmentIcon, {}) }), _jsx(ListItemText, { primary: attachment.originalName, secondary: `${(attachment.size / 1024).toFixed(1)} KB` })] }, attachment.id))) }) })] })), ticket.relatedTickets && ticket.relatedTickets.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: "\u95A2\u9023\u30C1\u30B1\u30C3\u30C8" }), _jsx(CardContent, { children: _jsx(List, { dense: true, children: ticket.relatedTickets.map((relatedTicket) => (_jsxs(ListItemButton, { children: [_jsx(ListItemIcon, { children: _jsx(TicketIcon, {}) }), _jsx(ListItemText, { primary: relatedTicket.title, secondary: _jsxs(Box, { sx: { display: 'flex', gap: 1, mt: 0.5 }, children: [_jsx(Chip, { label: relatedTicket.status, size: "small", sx: {
                                                                    backgroundColor: getStatusColor(relatedTicket.status),
                                                                    color: 'white',
                                                                    fontSize: '0.7rem'
                                                                } }), _jsx(Chip, { label: relatedTicket.priority, size: "small", sx: {
                                                                    backgroundColor: getPriorityHighColor(relatedTicket.priority),
                                                                    color: 'white',
                                                                    fontSize: '0.7rem'
                                                                } })] }) })] }, relatedTicket.id))) }) })] }))] }) })] }));
    // ユーザー詳細の表示
    const renderUserDetails = (user) => (_jsxs(Box, { sx: { p: 2 }, children: [_jsxs(Card, { sx: { mb: 2 }, children: [_jsx(CardHeader, { avatar: _jsx(Avatar, { sx: { width: 56, height: 56 }, children: (user.firstName?.[0] || user.name?.[0] || user.username?.[0] || '?').toUpperCase() }), title: user.name || `${user.firstName} ${user.lastName}` || user.username, subheader: user.role, action: _jsx(IconButton, { onClick: handleEditToggle, size: "small", children: _jsx(EditIcon, {}) }) }), _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'grid', gap: 2 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "\u30E1\u30FC\u30EB:" }), " ", user.email] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "\u90E8\u7F72:" }), " ", user.department] }), user.phone && (_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "\u96FB\u8A71:" }), " ", user.phone] })), user.lastLogin && (_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "\u6700\u7D42\u30ED\u30B0\u30A4\u30F3:" }), " ", formatDate(user.lastLogin)] })), _jsx(Chip, { label: user.isActive ? 'アクティブ' : '非アクティブ', color: user.isActive ? 'success' : 'error', size: "small", sx: { width: 'fit-content' } })] }) })] }), user.statistics && (_jsxs(Card, { sx: { mb: 2 }, children: [_jsx(CardHeader, { title: "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u7D71\u8A08" }), _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'grid', gap: 2 }, children: [_jsxs(Box, { children: [_jsxs(Typography, { variant: "body2", gutterBottom: true, children: ["\u5272\u308A\u5F53\u3066\u30C1\u30B1\u30C3\u30C8\u6570: ", user.statistics.totalTicketsAssigned] }), _jsx(LinearProgress, { variant: "determinate", value: (user.statistics.totalTicketsResolved / user.statistics.totalTicketsAssigned) * 100 })] }), _jsxs(Typography, { variant: "body2", children: ["\u5E73\u5747\u89E3\u6C7A\u6642\u9593: ", user.statistics.averageResolutionTime.toFixed(1), "\u6642\u9593"] }), _jsxs(Typography, { variant: "body2", children: ["SLA\u9075\u5B88\u7387: ", user.statistics.slaComplianceRate.toFixed(1), "%"] }), _jsxs(Typography, { variant: "body2", children: ["\u73FE\u5728\u306E\u4F5C\u696D\u8CA0\u8377: ", user.statistics.currentWorkload] })] }) })] })), user.assignedTickets && user.assignedTickets.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: "\u62C5\u5F53\u30C1\u30B1\u30C3\u30C8" }), _jsxs(CardContent, { children: [_jsx(List, { dense: true, children: user.assignedTickets.slice(0, 5).map((ticket) => (_jsx(ListItemButton, { children: _jsx(ListItemText, { primary: ticket.title, secondary: _jsxs(Box, { sx: { display: 'flex', gap: 1, mt: 0.5 }, children: [_jsx(Chip, { label: ticket.status, size: "small", sx: {
                                                        backgroundColor: getStatusColor(ticket.status),
                                                        color: 'white',
                                                        fontSize: '0.7rem'
                                                    } }), _jsx(Chip, { label: ticket.priority, size: "small", sx: {
                                                        backgroundColor: getPriorityHighColor(ticket.priority),
                                                        color: 'white',
                                                        fontSize: '0.7rem'
                                                    } })] }) }) }, ticket.id))) }), user.assignedTickets.length > 5 && (_jsxs(Button, { size: "small", sx: { mt: 1 }, children: ["\u3055\u3089\u306B\u8868\u793A (", user.assignedTickets.length - 5, "\u4EF6)"] }))] })] }))] }));
    // コンテンツのレンダリング
    const renderContent = () => {
        switch (item.type) {
            case 'ticket':
            case 'incident':
            case 'problem':
                return renderTicketDetails(item.data);
            case 'user':
                return renderUserDetails(item.data);
            case 'dashboard':
                return (_jsxs(Box, { sx: { p: 2 }, children: [_jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u8981\u7D20\u306E\u8A73\u7D30\u8868\u793A\u6A5F\u80FD\u306F\u958B\u767A\u4E2D\u3067\u3059" }), _jsx("pre", { style: { fontSize: '12px', overflow: 'auto' }, children: JSON.stringify(item.data, null, 2) })] }));
            default:
                return (_jsxs(Box, { sx: { p: 2 }, children: [_jsxs(Typography, { variant: "body1", gutterBottom: true, children: ["\u672A\u5BFE\u5FDC\u306E\u30A2\u30A4\u30C6\u30E0\u30BF\u30A4\u30D7: ", item.type] }), _jsx("pre", { style: { fontSize: '12px', overflow: 'auto' }, children: JSON.stringify(item.data, null, 2) })] }));
        }
    };
    return (_jsx(Box, { sx: { height: '100%', overflow: 'auto' }, children: renderContent() }));
};
export default DetailPanelContent;
