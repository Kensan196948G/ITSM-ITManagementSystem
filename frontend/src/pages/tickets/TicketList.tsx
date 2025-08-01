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
  Stack,
  Divider,
  Pagination,
  Tooltip,
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { priorityColors, statusColors } from '../../theme/theme'
import type { Ticket, TicketFilters, Priority, TicketStatus } from '../../types'

const TicketList: React.FC = () => {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null)
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState<TicketFilters>({})

  // Mock data - 実際の実装ではAPIから取得
  const mockTickets: Ticket[] = [
    {
      id: '1',
      title: 'サーバー応答速度低下',
      description: 'Webサーバーの応答速度が著しく低下しています',
      status: 'open',
      priority: 'critical',
      category: 'Infrastructure',
      assigneeId: '1',
      assigneeName: '山田太郎',
      reporterId: '2',
      reporterName: '田中一郎',
      createdAt: '2025-08-01T10:30:00Z',
      updatedAt: '2025-08-01T11:00:00Z',
      slaDeadline: '2025-08-01T12:30:00Z',
      tags: ['urgent', 'server'],
    },
    {
      id: '2',
      title: 'メール送信エラー',
      description: 'メール送信時にSMTPエラーが発生',
      status: 'in_progress',
      priority: 'high',
      category: 'Email',
      assigneeId: '3',
      assigneeName: '佐藤花子',
      reporterId: '4',
      reporterName: '鈴木次郎',
      createdAt: '2025-08-01T09:15:00Z',
      updatedAt: '2025-08-01T10:45:00Z',
      tags: ['email', 'smtp'],
    },
    {
      id: '3',
      title: 'プリンター接続不良',
      description: 'オフィスプリンターに接続できない',
      status: 'resolved',
      priority: 'medium',
      category: 'Hardware',
      assigneeId: '5',
      assigneeName: '高橋三郎',
      reporterId: '6',
      reporterName: '渡辺四郎',
      createdAt: '2025-08-01T08:00:00Z',
      updatedAt: '2025-08-01T10:30:00Z',
      tags: ['printer', 'hardware'],
    },
    {
      id: '4',
      title: 'VPN接続問題',
      description: '在宅勤務でVPNに接続できない',
      status: 'open',
      priority: 'high',
      category: 'Network',
      reporterId: '7',
      reporterName: '伊藤五郎',
      createdAt: '2025-08-01T07:45:00Z',
      updatedAt: '2025-08-01T07:45:00Z',
      tags: ['vpn', 'remote'],
    },
    {
      id: '5',
      title: 'ソフトウェアライセンス期限',
      description: 'Adobe Creative Suiteのライセンスが期限切れ',
      status: 'on_hold',
      priority: 'low',
      category: 'License',
      assigneeId: '8',
      assigneeName: '中村六郎',
      reporterId: '9',
      reporterName: '小林七郎',
      createdAt: '2025-07-31T16:00:00Z',
      updatedAt: '2025-08-01T09:00:00Z',
      tags: ['license', 'adobe'],
    },
  ]

  const filteredTickets = mockTickets.filter(ticket => {
    if (searchQuery && !ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filters.status?.length && !filters.status.includes(ticket.status)) {
      return false
    }
    if (filters.priority?.length && !filters.priority.includes(ticket.priority)) {
      return false
    }
    return true
  })

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

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          #{params.value}
        </Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'タイトル',
      width: 280,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' },
            }}
            onClick={() => navigate(`/tickets/${params.row.id}`)}
          >
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.description}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 120,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.value),
    },
    {
      field: 'priority',
      headerName: '優先度',
      width: 100,
      renderCell: (params: GridRenderCellParams) => getPriorityChip(params.value),
    },
    {
      field: 'assigneeName',
      headerName: '担当者',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
              {params.value.charAt(0)}
            </Avatar>
            <Typography variant="body2">{params.value}</Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            未割当
          </Typography>
        )
      ),
    },
    {
      field: 'createdAt',
      headerName: '作成日時',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {formatDate(params.value)}
        </Typography>
      ),
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
            // Handle individual ticket actions
          }}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ]

  const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => (
    <Card
      sx={{
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out',
        },
      }}
      onClick={() => navigate(`/tickets/${ticket.id}`)}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              #{ticket.id}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {ticket.title}
            </Typography>
          </Box>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {ticket.description}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {getPriorityChip(ticket.priority)}
          {getStatusChip(ticket.status)}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                担当者
              </Typography>
            </Box>
            <Typography variant="body2">
              {ticket.assigneeName || '未割当'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                作成日時
              </Typography>
            </Box>
            <Typography variant="body2">
              {formatDate(ticket.createdAt)}
            </Typography>
          </Grid>
        </Grid>

        {ticket.slaDeadline && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 16, color: 'warning.dark' }} />
              <Typography variant="caption" color="warning.dark">
                SLA期限: {formatDate(ticket.slaDeadline)}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          チケット管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tickets/create')}
          size="large"
        >
          新規チケット作成
        </Button>
      </Box>

      {/* 検索・フィルター */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="チケットを検索..."
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
              <InputLabel>ステータス</InputLabel>
              <Select
                name="status"
                multiple
                value={filters.status || []}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TicketStatus[] }))}
                input={<OutlinedInput label="ステータス" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="open">未対応</MenuItem>
                <MenuItem value="in_progress">対応中</MenuItem>
                <MenuItem value="resolved">解決済み</MenuItem>
                <MenuItem value="closed">完了</MenuItem>
                <MenuItem value="on_hold">保留中</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>優先度</InputLabel>
              <Select
                name="priority"
                multiple
                value={filters.priority || []}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as Priority[] }))}
                input={<OutlinedInput label="優先度" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="critical">緊急</MenuItem>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="low">低</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
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

      {/* チケット一覧 */}
      {viewMode === 'table' ? (
        <Paper sx={{ height: 600 }}>
          <DataGrid
            rows={filteredTickets}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { pageSize: pageSize },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            onPaginationModelChange={(model) => setPageSize(model.pageSize)}
            checkboxSelection
            disableRowSelectionOnClick
            onRowClick={(params) => navigate(`/tickets/${params.id}`)}
            sx={{
              '& .MuiDataGrid-row:hover': {
                cursor: 'pointer',
              },
            }}
          />
        </Paper>
      ) : (
        <Box>
          <Grid container spacing={3}>
            {filteredTickets.map((ticket) => (
              <Grid item xs={12} sm={6} md={4} key={ticket.id}>
                <TicketCard ticket={ticket} />
              </Grid>
            ))}
          </Grid>
          
          {filteredTickets.length > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={Math.ceil(filteredTickets.length / pageSize)}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </Box>
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
          <FilterIcon sx={{ mr: 2 }} />
          高度なフィルター
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default TicketList