/**
 * インシデント一覧ページ
 * ITIL準拠のインシデント管理機能を提供
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Alert,
  Tooltip,
  Badge,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  BugReport as IncidentIcon,
  ErrorOutline,
  PauseCircleOutline,
  CheckCircleOutline,
  TrendingUp,
  Assignment,
} from '@mui/icons-material'
import ContentArea from '../../components/layout/ContentArea'

// インシデントデータの型定義
interface Incident {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  category: string
  assignee: string
  reporter: string
  createdAt: string
  updatedAt: string
  slaStatus: 'within' | 'warning' | 'breached'
  affectedServices: string[]
}

// モックデータ
const mockIncidents: Incident[] = [
  {
    id: 'INC-001',
    title: 'Webサーバーの応答時間が遅い',
    description: 'メインWebサーバーの応答時間が通常の5倍になっている',
    severity: 'high',
    status: 'in_progress',
    category: 'Performance',
    assignee: '田中 太郎',
    reporter: '佐藤 花子',
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-01-15T10:45:00Z',
    slaStatus: 'warning',
    affectedServices: ['Webサイト', 'API'],
  },
  {
    id: 'INC-002',
    title: 'データベース接続エラー',
    description: 'メインデータベースへの接続が断続的に失敗している',
    severity: 'critical',
    status: 'open',
    category: 'Database',
    assignee: '',
    reporter: '山田 次郎',
    createdAt: '2024-01-15T11:20:00Z',
    updatedAt: '2024-01-15T11:20:00Z',
    slaStatus: 'within',
    affectedServices: ['CRM', 'データベース'],
  },
  {
    id: 'INC-003',
    title: 'メール送信機能の不具合',
    description: '自動メール送信が動作していない',
    severity: 'medium',
    status: 'resolved',
    category: 'Email',
    assignee: '鈴木 一郎',
    reporter: '高橋 美咲',
    createdAt: '2024-01-14T14:15:00Z',
    updatedAt: '2024-01-15T08:30:00Z',
    slaStatus: 'within',
    affectedServices: ['メール'],
  },
]

const IncidentList: React.FC = () => {
  const navigate = useNavigate()
  const [incidents] = useState<Incident[]>(mockIncidents)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null)

  // フィルタリングと検索
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = searchQuery === '' || 
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter
      const matchesStatus = statusFilter === 'all' || incident.status === statusFilter
      
      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [incidents, searchQuery, severityFilter, statusFilter])

  // 重要度のカラーマッピング
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'success'
      default: return 'default'
    }
  }

  // ステータスのアイコンとカラー
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'open':
        return { icon: <ErrorOutline />, color: 'error', label: 'オープン' }
      case 'in_progress':
        return { icon: <TrendingUp />, color: 'warning', label: '対応中' }
      case 'pending':
        return { icon: <PauseCircleOutline />, color: 'info', label: '保留中' }
      case 'resolved':
        return { icon: <CheckCircleOutline />, color: 'success', label: '解決済み' }
      case 'closed':
        return { icon: <Assignment />, color: 'default', label: 'クローズ' }
      default:
        return { icon: <ErrorOutline />, color: 'default', label: status }
    }
  }

  // SLAステータスの表示
  const getSLAChip = (slaStatus: string) => {
    switch (slaStatus) {
      case 'within':
        return <Chip label="SLA内" size="small" color="success" variant="outlined" />
      case 'warning':
        return <Chip label="警告" size="small" color="warning" variant="outlined" />
      case 'breached':
        return <Chip label="SLA違反" size="small" color="error" variant="outlined" />
      default:
        return null
    }
  }

  // メニューハンドラー
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, incidentId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedIncident(incidentId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedIncident(null)
  }

  const handleEdit = () => {
    if (selectedIncident) {
      navigate(`/incidents/${selectedIncident}/edit`)
    }
    handleMenuClose()
  }

  const handleAssign = () => {
    // TODO: アサイン機能の実装
    handleMenuClose()
  }

  const handleEscalate = () => {
    // TODO: エスカレーション機能の実装
    handleMenuClose()
  }

  // 統計データ
  const stats = useMemo(() => {
    const total = incidents.length
    const critical = incidents.filter(i => i.severity === 'critical').length
    const open = incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length
    const slaBreached = incidents.filter(i => i.slaStatus === 'breached').length
    
    return { total, critical, open, slaBreached }
  }, [incidents])

  const pageActions = (
    <Stack direction="row" spacing={2}>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/incidents/create')}
      >
        新規インシデント
      </Button>
    </Stack>
  )

  return (
    <ContentArea
      pageTitle="インシデント管理"
      pageDescription="システムインシデントの管理と追跡"
      actions={pageActions}
    >
      {/* 統計情報 */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ minWidth: 120 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h4" color="primary">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              総件数
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 120 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h4" color="error">
              {stats.critical}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              クリティカル
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 120 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h4" color="warning.main">
              {stats.open}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              オープン
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 120 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h4" color="error">
              {stats.slaBreached}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SLA違反
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* 検索とフィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="インシデントを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>重要度</InputLabel>
              <Select
                value={severityFilter}
                label="重要度"
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="critical">クリティカル</MenuItem>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="low">低</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="open">オープン</MenuItem>
                <MenuItem value="in_progress">対応中</MenuItem>
                <MenuItem value="pending">保留</MenuItem>
                <MenuItem value="resolved">解決済み</MenuItem>
                <MenuItem value="closed">クローズ</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* インシデント一覧テーブル */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>タイトル</TableCell>
                <TableCell>重要度</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>カテゴリ</TableCell>
                <TableCell>担当者</TableCell>
                <TableCell>SLA</TableCell>
                <TableCell>作成日時</TableCell>
                <TableCell>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredIncidents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((incident) => {
                  const statusDisplay = getStatusDisplay(incident.status)
                  return (
                    <TableRow 
                      key={incident.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {incident.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {incident.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {incident.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={incident.severity.toUpperCase()}
                          size="small"
                          color={getSeverityColor(incident.severity) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={statusDisplay.icon}
                          label={statusDisplay.label}
                          size="small"
                          color={statusDisplay.color as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{incident.category}</TableCell>
                      <TableCell>
                        {incident.assignee || (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            未割り当て
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {getSLAChip(incident.slaStatus)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(incident.createdAt).toLocaleString('ja-JP')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMenuOpen(e, incident.id)
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredIncidents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / ${count}件`
          }
        />
      </Card>

      {/* アクションメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Assignment sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem onClick={handleAssign}>
          <TrendingUp sx={{ mr: 1 }} />
          アサイン
        </MenuItem>
        <MenuItem onClick={handleEscalate}>
          <ErrorOutline sx={{ mr: 1 }} />
          エスカレーション
        </MenuItem>
      </Menu>
    </ContentArea>
  )
}

export default IncidentList