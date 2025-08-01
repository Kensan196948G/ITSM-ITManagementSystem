import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Grid,
  Card,
  CardContent,
  Avatar,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
} from '@mui/material'
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Export as ExportIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as DepartmentIcon,
  Security as RoleIcon,
  Schedule as LastLoginIcon,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import type { User, UserFilters, UserRole } from '../../types'

const UserList: React.FC = () => {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null)
  const [filters, setFilters] = useState<UserFilters>({})

  // Mock data - 実際の実装ではAPIから取得
  const mockUsers: User[] = [
    {
      id: '1',
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
      permissions: ['user:create', 'user:update', 'user:delete', 'ticket:create', 'ticket:update'],
    },
    {
      id: '2',
      firstName: '花子',
      lastName: '佐藤',
      email: 'sato@example.com',
      phone: '090-2345-6789',
      role: 'manager',
      department: 'IT部',
      isActive: true,
      lastLogin: '2025-08-01T08:45:00Z',
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2025-08-01T08:45:00Z',
      permissions: ['ticket:create', 'ticket:update', 'ticket:assign'],
    },
    {
      id: '3',
      firstName: '一郎',
      lastName: '田中',
      email: 'tanaka@example.com',
      phone: '090-3456-7890',
      role: 'operator',
      department: 'サポート部',
      manager: '佐藤花子',
      isActive: true,
      lastLogin: '2025-08-01T10:15:00Z',
      createdAt: '2024-03-10T10:00:00Z',
      updatedAt: '2025-08-01T10:15:00Z',
      permissions: ['ticket:create', 'ticket:update'],
    },
    {
      id: '4',
      firstName: '次郎',
      lastName: '鈴木',
      email: 'suzuki@example.com',
      phone: '090-4567-8901',
      role: 'viewer',
      department: '営業部',
      manager: '高橋三郎',
      isActive: false,
      lastLogin: '2025-07-28T16:30:00Z',
      createdAt: '2024-04-05T10:00:00Z',
      updatedAt: '2025-07-28T16:30:00Z',
      permissions: ['ticket:view'],
    },
    {
      id: '5',
      firstName: '三郎',
      lastName: '高橋',
      email: 'takahashi@example.com',
      phone: '090-5678-9012',
      role: 'manager',
      department: '営業部',
      isActive: true,
      lastLogin: '2025-07-31T18:00:00Z',
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2025-07-31T18:00:00Z',
      permissions: ['ticket:create', 'ticket:update', 'user:view'],
    },
  ]

  const filteredUsers = mockUsers.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!user.firstName.toLowerCase().includes(query) &&
          !user.lastName.toLowerCase().includes(query) &&
          !user.email.toLowerCase().includes(query) &&
          !user.department.toLowerCase().includes(query)) {
        return false
      }
    }
    if (filters.role?.length && !filters.role.includes(user.role)) {
      return false
    }
    if (filters.department?.length && !filters.department.includes(user.department)) {
      return false
    }
    if (filters.isActive !== undefined && user.isActive !== filters.isActive) {
      return false
    }
    return true
  })

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
        size="small"
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

  const getLastLoginStatus = (lastLogin?: string) => {
    if (!lastLogin) return { color: 'grey', text: '未ログイン' }
    
    const now = new Date()
    const loginDate = new Date(lastLogin)
    const diffHours = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 1) return { color: 'success', text: '1時間以内' }
    if (diffHours < 24) return { color: 'info', text: '24時間以内' }
    if (diffHours < 168) return { color: 'warning', text: '1週間以内' }
    return { color: 'error', text: '1週間以上前' }
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '名前',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {params.row.lastName.charAt(0)}
          </Avatar>
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
              }}
              onClick={() => navigate(`/users/${params.row.id}`)}
            >
              {params.row.lastName} {params.row.firstName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: '役割',
      width: 130,
      renderCell: (params: GridRenderCellParams) => getRoleChip(params.value),
    },
    {
      field: 'department',
      headerName: '部署',
      width: 120,
    },
    {
      field: 'isActive',
      headerName: 'ステータス',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'アクティブ' : '無効'}
          size="small"
          color={params.value ? 'success' : 'default'}
          icon={params.value ? <ActiveIcon /> : <BlockIcon />}
        />
      ),
    },
    {
      field: 'lastLogin',
      headerName: '最終ログイン',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const status = getLastLoginStatus(params.value)
        return (
          <Tooltip title={params.value ? formatDate(params.value) : '未ログイン'}>
            <Chip
              label={status.text}
              size="small"
              color={status.color as any}
              variant="outlined"
            />
          </Tooltip>
        )
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/users/${params.row.id}`)
          }}
        >
          <EditIcon />
        </IconButton>
      ),
    },
  ]

  const UserCard: React.FC<{ user: User }> = ({ user }) => {
    const lastLoginStatus = getLastLoginStatus(user.lastLogin)
    
    return (
      <Card
        sx={{
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 4,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out',
          },
        }}
        onClick={() => navigate(`/users/${user.id}`)}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge
                color={user.isActive ? 'success' : 'error'}
                variant="dot"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <Avatar sx={{ width: 56, height: 56, fontSize: '1.5rem' }}>
                  {user.lastName.charAt(0)}
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {user.lastName} {user.firstName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {getRoleChip(user.role)}
            <Chip
              label={user.isActive ? 'アクティブ' : '無効'}
              size="small"
              color={user.isActive ? 'success' : 'default'}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <DepartmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  部署
                </Typography>
              </Box>
              <Typography variant="body2">
                {user.department}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <LastLoginIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  最終ログイン
                </Typography>
              </Box>
              <Chip
                label={lastLoginStatus.text}
                size="small"
                color={lastLoginStatus.color as any}
                variant="outlined"
              />
            </Grid>
          </Grid>

          {user.phone && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {user.phone}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    )
  }

  const departments = [...new Set(mockUsers.map(user => user.department))]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          ユーザー管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/users/create')}
          size="large"
        >
          新規ユーザー作成
        </Button>
      </Box>

      {/* 検索・フィルター */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="ユーザーを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>役割</InputLabel>
              <Select
                multiple
                value={filters.role || []}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value as UserRole[] }))}
                input={<OutlinedInput label="役割" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="admin">管理者</MenuItem>
                <MenuItem value="manager">マネージャー</MenuItem>
                <MenuItem value="operator">オペレーター</MenuItem>
                <MenuItem value="viewer">閲覧者</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>部署</InputLabel>
              <Select
                multiple
                value={filters.department || []}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value as string[] }))}
                input={<OutlinedInput label="部署" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.isActive ?? true}
                  onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="アクティブのみ"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Tooltip title="表示モード切替">
                <IconButton
                  onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                >
                  {viewMode === 'table' ? <ViewModuleIcon /> : <ViewListIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="更新">
                <IconButton>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="エクスポート">
                <IconButton>
                  <ExportIcon />
                </IconButton>
              </Tooltip>
              <IconButton onClick={(e) => setMoreAnchor(e.currentTarget)}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ユーザー統計 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {mockUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総ユーザー数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                {mockUsers.filter(u => u.isActive).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                アクティブユーザー
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                {mockUsers.filter(u => u.role === 'admin').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                管理者
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                {departments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                部署数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ユーザー一覧 */}
      {viewMode === 'table' ? (
        <Paper sx={{ height: 600 }}>
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            checkboxSelection
            disableSelectionOnClick
            onRowClick={(params) => navigate(`/users/${params.id}`)}
            sx={{
              '& .MuiDataGrid-row:hover': {
                cursor: 'pointer',
              },
            }}
          />
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredUsers.map((user) => (
            <Grid item xs={12} sm={6} md={4} key={user.id}>
              <UserCard user={user} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* More actions menu */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
      >
        <MenuItem onClick={() => setMoreAnchor(null)}>
          <ExportIcon sx={{ mr: 2 }} />
          CSV エクスポート
        </MenuItem>
        <MenuItem onClick={() => setMoreAnchor(null)}>
          <EmailIcon sx={{ mr: 2 }} />
          一括メール送信
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default UserList