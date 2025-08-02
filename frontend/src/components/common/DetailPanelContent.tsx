import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Button,
  TextField,
  Collapse,
  Alert,
  Skeleton,
} from '@mui/material'
import {
  Person as PersonIcon,
  Assignment as TicketIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
  Attachment as AttachmentIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Priority as PriorityIcon,
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import { 
  DetailPanelContentProps, 
  DetailPanelItem, 
  TicketDetail, 
  UserDetail,
  Priority,
  TicketStatus 
} from '../../types'
import { priorityColors, statusColors } from '../../theme/theme'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`detail-tabpanel-${index}`}
    aria-labelledby={`detail-tab-${index}`}
    {...other}
  >
    {value === index && <Box>{children}</Box>}
  </div>
)

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

const getPriorityColor = (priority: Priority): string => {
  return priorityColors[priority] || priorityColors.medium
}

const getStatusColor = (status: TicketStatus): string => {
  return statusColors[status] || statusColors.open
}

export const DetailPanelContent: React.FC<DetailPanelContentProps> = ({
  item,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const [tabValue, setTabValue] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [editData, setEditData] = useState<any>(item.data)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleEditToggle = () => {
    if (isEditing) {
      setEditData(item.data) // 編集をキャンセル
    }
    setIsEditing(!isEditing)
  }

  const handleSave = () => {
    if (onEdit) {
      onEdit({ ...item, data: editData })
    }
    setIsEditing(false)
  }

  // チケット詳細の表示
  const renderTicketDetails = (ticket: TicketDetail) => (
    <Box>
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="チケット詳細タブ">
        <Tab label="概要" icon={<TicketIcon />} />
        <Tab label="履歴" icon={<HistoryIcon />} />
        <Tab label="コメント" icon={<CommentIcon />} />
        <Tab label="関連情報" icon={<AttachmentIcon />} />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ p: 2 }}>
          {/* 基本情報 */}
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title="基本情報"
              action={
                <Box>
                  <IconButton onClick={handleEditToggle} size="small">
                    {isEditing ? <CancelIcon /> : <EditIcon />}
                  </IconButton>
                  {isEditing && (
                    <IconButton onClick={handleSave} size="small" color="primary">
                      <SaveIcon />
                    </IconButton>
                  )}
                </Box>
              }
            />
            <CardContent>
              <Box sx={{ display: 'grid', gap: 2 }}>
                {isEditing ? (
                  <TextField
                    label="タイトル"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    fullWidth
                  />
                ) : (
                  <Typography variant="h6" gutterBottom>
                    {ticket.title}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={ticket.status}
                    sx={{ backgroundColor: getStatusColor(ticket.status), color: 'white' }}
                    size="small"
                  />
                  <Chip
                    label={ticket.priority}
                    sx={{ backgroundColor: getPriorityColor(ticket.priority), color: 'white' }}
                    size="small"
                  />
                  <Chip label={ticket.category} variant="outlined" size="small" />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  作成日: {formatDate(ticket.createdAt)}
                </Typography>

                {ticket.assigneeName && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="action" />
                    <Typography variant="body2">
                      担当者: {ticket.assigneeName}
                    </Typography>
                  </Box>
                )}

                {ticket.slaDeadline && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="action" />
                    <Typography variant="body2">
                      SLA期限: {formatDate(ticket.slaDeadline)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 説明 */}
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title="説明"
              action={
                <IconButton onClick={() => toggleSection('description')} size="small">
                  {expandedSections.description ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              }
            />
            <Collapse in={expandedSections.description !== false}>
              <CardContent>
                {isEditing ? (
                  <TextField
                    label="説明"
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    multiline
                    rows={4}
                    fullWidth
                  />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {ticket.description}
                  </Typography>
                )}
              </CardContent>
            </Collapse>
          </Card>

          {/* カスタムフィールド */}
          {ticket.customFields && ticket.customFields.length > 0 && (
            <Card>
              <CardHeader title="カスタムフィールド" />
              <CardContent>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  {ticket.customFields.map((field, index) => (
                    <Box key={index}>
                      <Typography variant="subtitle2" gutterBottom>
                        {field.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {String(field.value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ p: 2 }}>
          {/* 履歴 */}
          {ticket.history && ticket.history.length > 0 ? (
            <List>
              {ticket.history.map((entry, index) => (
                <ListItem key={entry.id} divider={index < ticket.history!.length - 1}>
                  <ListItemIcon>
                    <TimelineIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2" component="span">
                          {entry.action}
                        </Typography>
                        {entry.field && (
                          <Typography variant="caption" sx={{ ml: 1 }}>
                            ({entry.field}: {entry.oldValue} → {entry.newValue})
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {formatDate(entry.timestamp)} - {entry.userName}
                        </Typography>
                        {entry.comment && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {entry.comment}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              履歴はありません
            </Typography>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 2 }}>
          {/* コメント */}
          {ticket.comments && ticket.comments.length > 0 ? (
            <List>
              {ticket.comments.map((comment, index) => (
                <ListItem key={comment.id} divider={index < ticket.comments!.length - 1}>
                  <ListItemIcon>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {comment.authorName.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={comment.authorName}
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {formatDate(comment.createdAt)}
                          {comment.isInternal && (
                            <Chip label="内部" size="small" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {comment.content}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              コメントはありません
            </Typography>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box sx={{ p: 2 }}>
          {/* 添付ファイル */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardHeader title="添付ファイル" />
              <CardContent>
                <List dense>
                  {ticket.attachments.map((attachment) => (
                    <ListItemButton key={attachment.id}>
                      <ListItemIcon>
                        <AttachmentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={attachment.originalName}
                        secondary={`${(attachment.size / 1024).toFixed(1)} KB`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* 関連チケット */}
          {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
            <Card>
              <CardHeader title="関連チケット" />
              <CardContent>
                <List dense>
                  {ticket.relatedTickets.map((relatedTicket) => (
                    <ListItemButton key={relatedTicket.id}>
                      <ListItemIcon>
                        <TicketIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={relatedTicket.title}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={relatedTicket.status}
                              size="small"
                              sx={{ 
                                backgroundColor: getStatusColor(relatedTicket.status), 
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                            <Chip
                              label={relatedTicket.priority}
                              size="small"
                              sx={{ 
                                backgroundColor: getPriorityColor(relatedTicket.priority), 
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      </TabPanel>
    </Box>
  )

  // ユーザー詳細の表示
  const renderUserDetails = (user: UserDetail) => (
    <Box sx={{ p: 2 }}>
      {/* プロフィール */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ width: 56, height: 56 }}>
              {(user.firstName?.[0] || user.name?.[0] || user.username?.[0] || '?').toUpperCase()}
            </Avatar>
          }
          title={user.name || `${user.firstName} ${user.lastName}` || user.username}
          subheader={user.role}
          action={
            <IconButton onClick={handleEditToggle} size="small">
              <EditIcon />
            </IconButton>
          }
        />
        <CardContent>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="body2">
              <strong>メール:</strong> {user.email}
            </Typography>
            <Typography variant="body2">
              <strong>部署:</strong> {user.department}
            </Typography>
            {user.phone && (
              <Typography variant="body2">
                <strong>電話:</strong> {user.phone}
              </Typography>
            )}
            {user.lastLogin && (
              <Typography variant="body2">
                <strong>最終ログイン:</strong> {formatDate(user.lastLogin)}
              </Typography>
            )}
            <Chip
              label={user.isActive ? 'アクティブ' : '非アクティブ'}
              color={user.isActive ? 'success' : 'error'}
              size="small"
              sx={{ width: 'fit-content' }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* 統計情報 */}
      {user.statistics && (
        <Card sx={{ mb: 2 }}>
          <CardHeader title="パフォーマンス統計" />
          <CardContent>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  割り当てチケット数: {user.statistics.totalTicketsAssigned}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(user.statistics.totalTicketsResolved / user.statistics.totalTicketsAssigned) * 100} 
                />
              </Box>
              <Typography variant="body2">
                平均解決時間: {user.statistics.averageResolutionTime.toFixed(1)}時間
              </Typography>
              <Typography variant="body2">
                SLA遵守率: {user.statistics.slaComplianceRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                現在の作業負荷: {user.statistics.currentWorkload}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 担当チケット */}
      {user.assignedTickets && user.assignedTickets.length > 0 && (
        <Card>
          <CardHeader title="担当チケット" />
          <CardContent>
            <List dense>
              {user.assignedTickets.slice(0, 5).map((ticket) => (
                <ListItemButton key={ticket.id}>
                  <ListItemText
                    primary={ticket.title}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={ticket.status}
                          size="small"
                          sx={{ 
                            backgroundColor: getStatusColor(ticket.status), 
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                        <Chip
                          label={ticket.priority}
                          size="small"
                          sx={{ 
                            backgroundColor: getPriorityColor(ticket.priority), 
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
            {user.assignedTickets.length > 5 && (
              <Button size="small" sx={{ mt: 1 }}>
                さらに表示 ({user.assignedTickets.length - 5}件)
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )

  // コンテンツのレンダリング
  const renderContent = () => {
    switch (item.type) {
      case 'ticket':
      case 'incident':
      case 'problem':
        return renderTicketDetails(item.data as TicketDetail)
      case 'user':
        return renderUserDetails(item.data as UserDetail)
      case 'dashboard':
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              ダッシュボード要素の詳細表示機能は開発中です
            </Alert>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(item.data, null, 2)}
            </pre>
          </Box>
        )
      default:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              未対応のアイテムタイプ: {item.type}
            </Typography>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(item.data, null, 2)}
            </pre>
          </Box>
        )
    }
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {renderContent()}
    </Box>
  )
}

export default DetailPanelContent