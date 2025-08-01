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
  IconButton,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  History as HistoryIcon,
  Assignment as TicketIcon,
  Notifications as NotificationIcon,
  VpnKey as PasswordIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import type { User, UserRole, Ticket } from '../../types'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`user-tabpanel-${index}`}
    aria-labelledby={`user-tab-${index}`}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
)

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null)
  const [deactivateDialog, setDeactivateDialog] = useState(false)
  const [tabValue, setTabValue] = useState(0)

  // Mock data - 実際の実装ではAPIから取得
  const mockUser: User = {
    id: id || '1',
    firstName: '太郎',
    lastName: '山田',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
    role: 'admin',
    department: 'IT部',
    manager: '佐藤花子',
    isActive: true,
    lastLogin: '2025-08-01T09:30:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2025-08-01T09:30:00Z',
    permissions: [
      'user:view', 'user:create', 'user:update', 'user:delete',
      'ticket:view', 'ticket:create', 'ticket:update', 'ticket:delete', 'ticket:assign',
      'report:view', 'report:create', 'report:export',
      'system:config', 'system:backup', 'system:audit',
    ],
  }

  const mockUserTickets: Ticket[] = [
    {
      id: '1',
      title: 'サーバー応答速度低下',
      description: 'Webサーバーの応答速度が著しく低下',
      status: 'in_progress',
      priority: 'critical',
      category: 'Infrastructure',
      assigneeId: mockUser.id,
      assigneeName: `${mockUser.lastName} ${mockUser.firstName}`,
      reporterId: '2',
      reporterName: '田中一郎',
      createdAt: '2025-08-01T10:30:00Z',
      updatedAt: '2025-08-01T11:00:00Z',
    },
    {
      id: '2',
      title: 'メール送信エラー',
      description: 'メール送信時にSMTPエラーが発生',
      status: 'resolved',
      priority: 'high',
      category: 'Email',
      assigneeId: mockUser.id,
      assigneeName: `${mockUser.lastName} ${mockUser.firstName}`,
      reporterId: '3',
      reporterName: '佐藤花子',
      createdAt: '2025-07-30T09:15:00Z',
      updatedAt: '2025-07-31T14:45:00Z',
    },
  ]

  const mockLoginHistory = [
    { date: '2025-08-01T09:30:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
    { date: '2025-07-31T18:45:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
    { date: '2025-07-31T08:15:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
    { date: '2025-07-30T17:30:00Z', ip: '192.168.1.101', userAgent: 'Firefox 89.0', success: false },
    { date: '2025-07-30T09:00:00Z', ip: '192.168.1.100', userAgent: 'Chrome 91.0', success: true },
  ]

  const getRoleChip = (role: UserRole) => {
    const roleConfig = {
      admin: { label: '管理者', color: 'error' },
      manager: { label: 'マネージャー', color: 'warning' },
      operator: { label: 'オペレーター', color: 'info' },
      viewer: { label: '閲覧者', color: 'default' },
    }
    const config = roleConfig[role]
    return (
      <Chip
        label={config.label}
        color={config.color as any}
        variant="outlined"
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

  const getPermissionGroups = () => {
    const groups = {
      user: { label: 'ユーザー管理', permissions: [] as string[] },
      ticket: { label: 'チケット管理', permissions: [] as string[] },
      report: { label: 'レポート', permissions: [] as string[] },
      system: { label: 'システム設定', permissions: [] as string[] },
    }

    mockUser.permissions?.forEach(permission => {
      const [category] = permission.split(':')
      if (groups[category as keyof typeof groups]) {
        groups[category as keyof typeof groups].permissions.push(permission)
      }
    })

    return groups
  }

  const handleToggleActive = () => {
    // Handle user activation/deactivation
    console.log('Toggle user active status')
    setDeactivateDialog(false)
  }

  const handleDeleteUser = () => {
    // Handle user deletion
    console.log('Delete user')
    navigate('/users')
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge
            color={mockUser.isActive ? 'success' : 'error'}
            variant="dot"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Avatar sx={{ width: 80, height: 80, fontSize: '2rem' }}>
              {mockUser.lastName.charAt(0)}
            </Avatar>
          </Badge>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {mockUser.lastName} {mockUser.firstName}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {mockUser.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {getRoleChip(mockUser.role)}
              <Chip
                label={mockUser.isActive ? 'アクティブ' : '無効'}
                color={mockUser.isActive ? 'success' : 'default'}
                icon={mockUser.isActive ? <ActiveIcon /> : <BlockIcon />}
              />
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/users/${mockUser.id}/edit`)}
          >
            編集
          </Button>
          <IconButton onClick={(e) => setMoreAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Status alert */}
      {!mockUser.isActive && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          このユーザーは現在無効になっています。システムにアクセスできません。
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="基本情報" />
          <Tab label="担当チケット" />
          <Tab label="権限設定" />
          <Tab label="ログイン履歴" />
        </Tabs>
      </Box>

      {/* 基本情報タブ */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                個人情報
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      氏名
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {mockUser.lastName} {mockUser.firstName}
                  </Typography>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      メールアドレス
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {mockUser.email}
                  </Typography>
                </Box>

                {mockUser.phone && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        電話番号
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {mockUser.phone}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      部署
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {mockUser.department}
                  </Typography>
                </Box>

                {mockUser.manager && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        上司・マネージャー
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {mockUser.manager}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                システム情報
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <SecurityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      役割
                    </Typography>
                  </Box>
                  {getRoleChip(mockUser.role)}
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    アカウント状態
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={mockUser.isActive ? 'アクティブ' : '無効'}
                      color={mockUser.isActive ? 'success' : 'default'}
                      icon={mockUser.isActive ? <ActiveIcon /> : <BlockIcon />}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={mockUser.isActive}
                          onChange={() => setDeactivateDialog(true)}
                        />
                      }
                      label={mockUser.isActive ? '有効' : '無効'}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    作成日時
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(mockUser.createdAt)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    最終更新
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(mockUser.updatedAt)}
                  </Typography>
                </Box>

                {mockUser.lastLogin && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      最終ログイン
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(mockUser.lastLogin)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* 担当チケットタブ */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            担当チケット ({mockUserTickets.length}件)
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>タイトル</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>優先度</TableCell>
                  <TableCell>作成日</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockUserTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <TableCell>#{ticket.id}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.status}
                        size="small"
                        color={ticket.status === 'resolved' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.priority}
                        size="small"
                        color={ticket.priority === 'critical' ? 'error' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* 権限設定タブ */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            権限設定
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            {Object.entries(getPermissionGroups()).map(([groupKey, group]) => (
              <Grid item xs={12} sm={6} key={groupKey}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      {group.label}
                    </Typography>
                    <List dense>
                      {group.permissions.map((permission) => (
                        <ListItem key={permission}>
                          <ListItemIcon>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText primary={permission} />
                        </ListItem>
                      ))}
                      {group.permissions.length === 0 && (
                        <ListItem>
                          <ListItemText
                            primary="権限なし"
                            primaryTypographyProps={{ color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </TabPanel>

      {/* ログイン履歴タブ */}
      <TabPanel value={tabValue} index={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            ログイン履歴
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>日時</TableCell>
                  <TableCell>IPアドレス</TableCell>
                  <TableCell>ユーザーエージェント</TableCell>
                  <TableCell>結果</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockLoginHistory.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(log.date)}</TableCell>
                    <TableCell>{log.ip}</TableCell>
                    <TableCell>{log.userAgent}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.success ? '成功' : '失敗'}
                        size="small"
                        color={log.success ? 'success' : 'error'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* More actions menu */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
      >
        <MenuItem onClick={() => { setMoreAnchor(null); setDeactivateDialog(true) }}>
          <BlockIcon sx={{ mr: 2 }} />
          {mockUser.isActive ? 'ユーザーを無効化' : 'ユーザーを有効化'}
        </MenuItem>
        <MenuItem onClick={() => setMoreAnchor(null)}>
          <PasswordIcon sx={{ mr: 2 }} />
          パスワードリセット
        </MenuItem>
        <MenuItem onClick={() => setMoreAnchor(null)}>
          <NotificationIcon sx={{ mr: 2 }} />
          通知設定
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setMoreAnchor(null); handleDeleteUser() }}>
          <DeleteIcon sx={{ mr: 2, color: 'error.main' }} />
          <Typography color="error">ユーザーを削除</Typography>
        </MenuItem>
      </Menu>

      {/* Deactivate confirmation dialog */}
      <Dialog
        open={deactivateDialog}
        onClose={() => setDeactivateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {mockUser.isActive ? 'ユーザーを無効化' : 'ユーザーを有効化'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {mockUser.isActive 
              ? 'このユーザーを無効化しますか？無効化すると、ユーザーはシステムにアクセスできなくなります。'
              : 'このユーザーを有効化しますか？有効化すると、ユーザーは再びシステムにアクセスできるようになります。'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleToggleActive}
            color={mockUser.isActive ? 'error' : 'primary'}
            variant="contained"
          >
            {mockUser.isActive ? '無効化' : '有効化'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UserDetail