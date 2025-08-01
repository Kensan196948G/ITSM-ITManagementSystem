import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  Grid,
  Card,
  CardContent,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  // Timeline components removed - use alternative layout
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import {
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
  Flag as FlagIcon,
  Assignment as AssignmentIcon,
  Comment as CommentIcon,
  Attachment as AttachmentIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material'
import { priorityColors, statusColors } from '../../theme/theme'
import type { Ticket, Priority, TicketStatus } from '../../types'

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  // const navigate = useNavigate() // Commented out temporarily
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null)

  // Mock data - 実際の実装ではAPIから取得
  const mockTicket: Ticket = {
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
  }

  const getPriorityChip = (priority: Priority) => {
    const color = priorityColors[priority]
    const labels = {
      critical: '緊急',
      high: '高',
      medium: '中',
      low: '低',
    }
    return (
      <Chip
        label={labels[priority]}
        size="small"
        sx={{
          bgcolor: `${color}20`,
          color: color,
          fontWeight: 600,
        }}
      />
    )
  }

  const getStatusChip = (status: TicketStatus) => {
    const color = statusColors[status]
    const labels = {
      open: '未対応',
      in_progress: '対応中',
      resolved: '解決済み',
      closed: '完了',
      on_hold: '保留中',
    }
    return (
      <Chip
        label={labels[status]}
        size="small"
        sx={{
          bgcolor: `${color}20`,
          color: color,
          fontWeight: 500,
        }}
      />
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleStatusChange = (newStatus: TicketStatus) => {
    // Handle status change
    console.log('Changing status to:', newStatus)
    setMoreAnchor(null)
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    
    // Add comment logic here
    console.log('Adding comment:', commentText)
    setCommentText('')
  }

  const timelineItems = [
    {
      time: mockTicket.createdAt,
      author: mockTicket.reporterName,
      action: 'チケットを作成',
      icon: <AssignmentIcon />,
      color: 'primary',
    },
    ...(mockTicket.comments?.map(comment => ({
      time: comment.createdAt,
      author: comment.authorName,
      action: comment.isInternal ? '内部コメントを追加' : 'コメントを追加',
      content: comment.content,
      icon: <CommentIcon />,
      color: comment.isInternal ? 'warning' : 'info',
    })) || []),
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            チケット #{mockTicket.id}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            {mockTicket.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {getPriorityChip(mockTicket.priority)}
            {getStatusChip(mockTicket.status)}
            {mockTicket.tags?.map(tag => (
              <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditDialogOpen(true)}
          >
            編集
          </Button>
          <IconButton onClick={(e) => setMoreAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>

      {/* SLA Alert */}
      {mockTicket.slaDeadline && new Date(mockTicket.slaDeadline) < new Date() && (
        <Alert severity="error" sx={{ mb: 3 }}>
          SLA期限を超過しています: {formatDate(mockTicket.slaDeadline)}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main content */}
        <Grid item xs={12} md={8}>
          {/* Description */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              詳細説明
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {mockTicket.description}
            </Typography>
          </Paper>

          {/* Attachments */}
          {mockTicket.attachments && mockTicket.attachments.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                添付ファイル
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {mockTicket.attachments.map(attachment => (
                  <Grid item xs={12} sm={6} key={attachment.id}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AttachmentIcon color="primary" />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap>
                              {attachment.originalName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(attachment.size)} • 
                              アップロード: {attachment.uploadedBy}
                            </Typography>
                          </Box>
                          <IconButton size="small">
                            <DownloadIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Comments */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              コメント・作業ログ
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box>
              {timelineItems.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', mb: 3 }}>
                  <Box sx={{ mr: 2, mt: 0.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: `${item.color}.light` }}>
                      {item.icon}
                    </Avatar>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {item.author}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.time)}
                      </Typography>
                    </Box>
                    {('content' in item) && item.content && (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {item.content}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Add comment */}
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="コメントを追加"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="作業内容、進捗状況、発見事項などを記入..."
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => setCommentText('')}
                  disabled={!commentText.trim()}
                >
                  クリア
                </Button>
                <Button
                  variant="contained"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                >
                  コメント追加
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              チケット情報
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    担当者
                  </Typography>
                </Box>
                {mockTicket.assigneeName ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {mockTicket.assigneeName.charAt(0)}
                    </Avatar>
                    <Typography variant="body2">
                      {mockTicket.assigneeName}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    未割当
                  </Typography>
                )}
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    報告者
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {mockTicket.reporterName}
                </Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <CategoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    カテゴリ
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {mockTicket.category}
                </Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <FlagIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    優先度
                  </Typography>
                </Box>
                {getPriorityChip(mockTicket.priority)}
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    作成日時
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {formatDate(mockTicket.createdAt)}
                </Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    最終更新
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {formatDate(mockTicket.updatedAt)}
                </Typography>
              </Box>

              {mockTicket.slaDeadline && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      SLA期限
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color={new Date(mockTicket.slaDeadline) < new Date() ? 'error' : 'text.primary'}
                  >
                    {formatDate(mockTicket.slaDeadline)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Quick actions */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              クイックアクション
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<CheckIcon />}
                onClick={() => handleStatusChange('resolved')}
                disabled={mockTicket.status === 'resolved'}
              >
                解決済みにする
              </Button>
              <Button
                variant="outlined"
                startIcon={<PauseIcon />}
                onClick={() => handleStatusChange('on_hold')}
                disabled={mockTicket.status === 'on_hold'}
              >
                一時保留
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={() => handleStatusChange('closed')}
                disabled={mockTicket.status === 'closed'}
              >
                クローズ
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* More actions menu */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
      >
        <MenuItem onClick={() => setMoreAnchor(null)}>
          エクスポート
        </MenuItem>
        <MenuItem onClick={() => setMoreAnchor(null)}>
          履歴を表示
        </MenuItem>
        <MenuItem onClick={() => setMoreAnchor(null)}>
          関連チケット
        </MenuItem>
      </Menu>

      {/* Edit dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>チケット編集</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            チケット編集機能は今後実装予定です。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TicketDetail