import React, { useState, useCallback, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  IconButton,
  TextField,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Tabs,
  Tab,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Assignment as RoleIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  Build as TechnicianIcon,
  Visibility as ViewerIcon,
  Lock as RestrictedIcon,
} from '@mui/icons-material'

// Types
interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
  level: 'read' | 'write' | 'admin'
  category: string
  requiresApproval?: boolean
  isSystemCritical?: boolean
}

interface Role {
  id: string
  name: string
  displayName: string
  description: string
  permissions: string[]
  isSystemRole: boolean
  userCount: number
  createdAt: string
  updatedAt: string
}

interface RoleAssignment {
  userId: string
  roleId: string
  assignedBy: string
  assignedAt: string
  expiresAt?: string
  isTemporary: boolean
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`rbac-tabpanel-${index}`}
    aria-labelledby={`rbac-tab-${index}`}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
)

// Mock data
const mockPermissions: Permission[] = [
  // User Management
  { id: 'user:view', name: 'ユーザー閲覧', description: 'ユーザー情報を閲覧できます', resource: 'user', action: 'view', level: 'read', category: 'user' },
  { id: 'user:create', name: 'ユーザー作成', description: '新しいユーザーを作成できます', resource: 'user', action: 'create', level: 'write', category: 'user' },
  { id: 'user:update', name: 'ユーザー更新', description: 'ユーザー情報を更新できます', resource: 'user', action: 'update', level: 'write', category: 'user' },
  { id: 'user:delete', name: 'ユーザー削除', description: 'ユーザーを削除できます', resource: 'user', action: 'delete', level: 'admin', category: 'user', requiresApproval: true },
  { id: 'user:manage_roles', name: '役割管理', description: 'ユーザーの役割を管理できます', resource: 'user', action: 'manage_roles', level: 'admin', category: 'user', requiresApproval: true },
  
  // Ticket Management  
  { id: 'ticket:view', name: 'チケット閲覧', description: 'チケットを閲覧できます', resource: 'ticket', action: 'view', level: 'read', category: 'ticket' },
  { id: 'ticket:create', name: 'チケット作成', description: '新しいチケットを作成できます', resource: 'ticket', action: 'create', level: 'write', category: 'ticket' },
  { id: 'ticket:update', name: 'チケット更新', description: 'チケット情報を更新できます', resource: 'ticket', action: 'update', level: 'write', category: 'ticket' },
  { id: 'ticket:delete', name: 'チケット削除', description: 'チケットを削除できます', resource: 'ticket', action: 'delete', level: 'admin', category: 'ticket' },
  { id: 'ticket:assign', name: 'チケット割り当て', description: 'チケットを担当者に割り当てできます', resource: 'ticket', action: 'assign', level: 'write', category: 'ticket' },
  { id: 'ticket:close', name: 'チケット完了', description: 'チケットを完了にできます', resource: 'ticket', action: 'close', level: 'write', category: 'ticket' },
  
  // Report Management
  { id: 'report:view', name: 'レポート閲覧', description: 'レポートを閲覧できます', resource: 'report', action: 'view', level: 'read', category: 'report' },
  { id: 'report:create', name: 'レポート作成', description: 'レポートを作成できます', resource: 'report', action: 'create', level: 'write', category: 'report' },
  { id: 'report:export', name: 'レポート出力', description: 'レポートを出力できます', resource: 'report', action: 'export', level: 'write', category: 'report' },
  
  // System Management
  { id: 'system:config', name: 'システム設定', description: 'システム設定を変更できます', resource: 'system', action: 'config', level: 'admin', category: 'system', isSystemCritical: true, requiresApproval: true },
  { id: 'system:backup', name: 'バックアップ管理', description: 'システムバックアップを管理できます', resource: 'system', action: 'backup', level: 'admin', category: 'system', isSystemCritical: true },
  { id: 'system:audit', name: '監査ログ閲覧', description: '監査ログを閲覧できます', resource: 'system', action: 'audit', level: 'admin', category: 'system' },
  { id: 'system:maintenance', name: 'メンテナンス', description: 'システムメンテナンスを実行できます', resource: 'system', action: 'maintenance', level: 'admin', category: 'system', isSystemCritical: true, requiresApproval: true },
]

const mockRoles: Role[] = [
  {
    id: 'admin',
    name: 'admin',
    displayName: 'システム管理者',
    description: 'システム全体の管理権限を持ちます',
    permissions: mockPermissions.map(p => p.id),
    isSystemRole: true,
    userCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-08-01T00:00:00Z',
  },
  {
    id: 'manager',
    name: 'manager',
    displayName: 'マネージャー',
    description: 'チーム管理とレポート権限を持ちます',
    permissions: [
      'user:view', 'user:update',
      'ticket:view', 'ticket:create', 'ticket:update', 'ticket:assign', 'ticket:close',
      'report:view', 'report:create', 'report:export',
    ],
    isSystemRole: true,
    userCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-07-15T00:00:00Z',
  },
  {
    id: 'technician',
    name: 'technician',
    displayName: 'テクニシャン',
    description: 'チケット処理の権限を持ちます',
    permissions: [
      'ticket:view', 'ticket:create', 'ticket:update', 'ticket:close',
      'report:view',
    ],
    isSystemRole: true,
    userCount: 12,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-07-30T00:00:00Z',
  },
  {
    id: 'viewer',
    name: 'viewer',
    displayName: '閲覧者',
    description: '閲覧権限のみを持ちます',
    permissions: [
      'ticket:view',
      'report:view',
    ],
    isSystemRole: true,
    userCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-08-01T00:00:00Z',
  },
]

interface RBACManagerProps {
  userId?: string
  currentUserRole?: string
  onPermissionChange?: (userId: string, permissions: string[]) => void
  onRoleChange?: (userId: string, roleId: string) => void
}

const RBACManager: React.FC<RBACManagerProps> = ({
  userId,
  currentUserRole = 'admin',
  onPermissionChange,
  onRoleChange,
}) => {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [customPermissions, setCustomPermissions] = useState<string[]>([])
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [createRoleDialog, setCreateRoleDialog] = useState(false)
  const [deleteRoleDialog, setDeleteRoleDialog] = useState<Role | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    user: true,
    ticket: true,
    report: false,
    system: false,
  })

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const categories: Record<string, Permission[]> = {}
    mockPermissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = []
      }
      categories[permission.category].push(permission)
    })
    return categories
  }, [])

  const categoryConfig = {
    user: { label: 'ユーザー管理', icon: PeopleIcon, color: '#1976d2' },
    ticket: { label: 'チケット管理', icon: RoleIcon, color: '#388e3c' },
    report: { label: 'レポート', icon: VerifiedIcon, color: '#f57c00' },
    system: { label: 'システム設定', icon: SecurityIcon, color: '#d32f2f' },
  }

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case 'admin': return AdminIcon
      case 'manager': return ManagerIcon
      case 'technician': return TechnicianIcon
      case 'viewer': return ViewerIcon
      default: return RoleIcon
    }
  }

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case 'admin': return 'error'
      case 'manager': return 'warning'
      case 'technician': return 'info'
      case 'viewer': return 'default'
      default: return 'primary'
    }
  }

  const handleRoleSelect = useCallback((roleId: string) => {
    setSelectedRole(roleId)
    const role = mockRoles.find(r => r.id === roleId)
    if (role) {
      setCustomPermissions(role.permissions)
    }
  }, [])

  const handlePermissionToggle = useCallback((permissionId: string) => {
    setCustomPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId)
      } else {
        return [...prev, permissionId]
      }
    })
  }, [])

  const handleSavePermissions = useCallback(() => {
    if (userId && onPermissionChange) {
      onPermissionChange(userId, customPermissions)
    }
  }, [userId, customPermissions, onPermissionChange])

  const handleApplyRole = useCallback(() => {
    if (userId && selectedRole && onRoleChange) {
      onRoleChange(userId, selectedRole)
    }
  }, [userId, selectedRole, onRoleChange])

  const getCategoryExpansion = (category: string) => expandedCategories[category] || false

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const getPermissionLevelChip = (level: Permission['level']) => {
    const config = {
      read: { label: '読み取り', color: 'success' as const },
      write: { label: '書き込み', color: 'warning' as const },
      admin: { label: '管理者', color: 'error' as const },
    }
    return <Chip label={config[level].label} size="small" color={config[level].color} />
  }

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="役割管理" />
          <Tab label="詳細権限設定" />
          <Tab label="役割作成・編集" />
        </Tabs>
      </Box>

      {/* 役割管理タブ */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                利用可能な役割
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                {mockRoles.map((role) => {
                  const RoleIcon = getRoleIcon(role.id)
                  return (
                    <ListItem
                      key={role.id}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: selectedRole === role.id ? 'action.selected' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => handleRoleSelect(role.id)}
                    >
                      <ListItemIcon>
                        <Badge badgeContent={role.userCount} color="primary">
                          <RoleIcon />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {role.displayName}
                            {role.isSystemRole && (
                              <Chip label="システム" size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={role.description}
                      />
                    </ListItem>
                  )
                })}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            {selectedRole ? (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Typography variant="h6">
                    役割の詳細: {mockRoles.find(r => r.id === selectedRole)?.displayName}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleApplyRole}
                    disabled={!userId}
                  >
                    適用
                  </Button>
                </Box>
                <Divider sx={{ mb: 3 }} />

                {Object.entries(permissionsByCategory).map(([category, permissions]) => {
                  const config = categoryConfig[category as keyof typeof categoryConfig]
                  const CategoryIcon = config.icon
                  const rolePermissions = mockRoles.find(r => r.id === selectedRole)?.permissions || []
                  const categoryPermissions = permissions.filter(p => rolePermissions.includes(p.id))

                  return (
                    <Accordion
                      key={category}
                      expanded={getCategoryExpansion(category)}
                      onChange={() => toggleCategoryExpansion(category)}
                      sx={{ mb: 1 }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CategoryIcon sx={{ color: config.color }} />
                          <Typography sx={{ fontWeight: 600 }}>
                            {config.label}
                          </Typography>
                          <Chip
                            label={`${categoryPermissions.length}/${permissions.length}`}
                            size="small"
                            color={categoryPermissions.length === permissions.length ? 'success' : 'default'}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {permissions.map((permission) => {
                            const hasPermission = rolePermissions.includes(permission.id)
                            return (
                              <ListItem key={permission.id}>
                                <ListItemIcon>
                                  {hasPermission ? (
                                    <CheckCircleIcon color="success" />
                                  ) : (
                                    <UncheckedIcon color="disabled" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {permission.name}
                                      {getPermissionLevelChip(permission.level)}
                                      {permission.requiresApproval && (
                                        <Tooltip title="承認が必要な権限です">
                                          <WarningIcon color="warning" fontSize="small" />
                                        </Tooltip>
                                      )}
                                      {permission.isSystemCritical && (
                                        <Tooltip title="システム重要権限です">
                                          <RestrictedIcon color="error" fontSize="small" />
                                        </Tooltip>
                                      )}
                                    </Box>
                                  }
                                  secondary={permission.description}
                                />
                              </ListItem>
                            )
                          })}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )
                })}
              </Paper>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <SecurityIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  役割を選択してください
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  左側から役割を選択して、詳細な権限を確認できます
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* 詳細権限設定タブ */}
      <TabPanel value={activeTab} index={1}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>詳細権限設定</AlertTitle>
          個別の権限を細かく設定できます。システム重要権限や承認が必要な権限にご注意ください。
        </Alert>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justify: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              個別権限設定
            </Typography>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSavePermissions}
              disabled={!userId}
            >
              権限を保存
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {Object.entries(permissionsByCategory).map(([category, permissions]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig]
            const CategoryIcon = config.icon
            const selectedCount = permissions.filter(p => customPermissions.includes(p.id)).length

            return (
              <Accordion
                key={category}
                expanded={getCategoryExpansion(category)}
                onChange={() => toggleCategoryExpansion(category)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CategoryIcon sx={{ color: config.color }} />
                    <Typography sx={{ fontWeight: 600 }}>
                      {config.label}
                    </Typography>
                    <Chip
                      label={`${selectedCount}/${permissions.length}`}
                      size="small"
                      color={selectedCount === permissions.length ? 'success' : selectedCount > 0 ? 'warning' : 'default'}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    {permissions.map((permission) => (
                      <Box key={permission.id} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={customPermissions.includes(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id)}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {permission.name}
                                </Typography>
                                {getPermissionLevelChip(permission.level)}
                                {permission.requiresApproval && (
                                  <Tooltip title="この権限の付与には承認が必要です">
                                    <WarningIcon color="warning" fontSize="small" />
                                  </Tooltip>
                                )}
                                {permission.isSystemCritical && (
                                  <Tooltip title="システム重要権限です。慎重に設定してください">
                                    <RestrictedIcon color="error" fontSize="small" />
                                  </Tooltip>
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {permission.description}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Paper>
      </TabPanel>

      {/* 役割作成・編集タブ */}
      <TabPanel value={activeTab} index={2}>
        <Stack spacing={3}>
          <Card>
            <CardHeader
              title="既存の役割"
              action={
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateRoleDialog(true)}
                >
                  新しい役割を作成
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                {mockRoles.map((role) => {
                  const RoleIcon = getRoleIcon(role.id)
                  return (
                    <Grid item xs={12} sm={6} md={4} key={role.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <RoleIcon />
                            <Typography variant="h6">
                              {role.displayName}
                            </Typography>
                            {role.isSystemRole && (
                              <Chip label="システム" size="small" variant="outlined" />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {role.description}
                          </Typography>
                          <Box sx={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">
                              ユーザー数: {role.userCount}人
                            </Typography>
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => setEditingRole(role)}
                                disabled={role.isSystemRole}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => setDeleteRoleDialog(role)}
                                disabled={role.isSystemRole || role.userCount > 0}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </TabPanel>

      {/* 役割作成ダイアログ */}
      <Dialog
        open={createRoleDialog}
        onClose={() => setCreateRoleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新しい役割を作成</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="役割名"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="説明"
              multiline
              rows={3}
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoleDialog(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // 役割作成ロジック
              setCreateRoleDialog(false)
            }}
            disabled={!newRoleName.trim()}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>

      {/* 役割削除確認ダイアログ */}
      <Dialog
        open={Boolean(deleteRoleDialog)}
        onClose={() => setDeleteRoleDialog(null)}
      >
        <DialogTitle>役割を削除</DialogTitle>
        <DialogContent>
          <Typography>
            役割「{deleteRoleDialog?.displayName}」を削除しますか？
            この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRoleDialog(null)}>
            キャンセル
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              // 役割削除ロジック
              setDeleteRoleDialog(null)
            }}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default RBACManager