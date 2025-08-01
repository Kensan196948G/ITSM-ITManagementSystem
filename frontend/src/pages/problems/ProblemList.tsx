/**
 * 問題管理一覧ページ
 * ITIL準拠の問題管理機能を提供
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
  LinearProgress,
  Avatar,
  AvatarGroup,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  SearchOff as ProblemIcon,
  FolderOpen,
  FindInPage,
  FolderOff,
  MoreVert as MoreVertIcon,
  Psychology,
  Assignment,
  Group,
  TrendingUp,
  CheckCircle,
} from '@mui/icons-material'
import ContentArea from '../../components/layout/ContentArea'

// 問題データの型定義
interface Problem {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'investigation' | 'known_error' | 'closed'
  category: string
  assignedTeam: string
  assignedMembers: string[]
  relatedIncidents: string[]
  rootCause: string
  workaround: string
  createdAt: string
  updatedAt: string
  investigationProgress: number
  affectedServices: string[]
}

// モックデータ
const mockProblems: Problem[] = [
  {
    id: 'PRB-001',
    title: 'データベース接続タイムアウトの根本原因',
    description: '定期的に発生するデータベース接続タイムアウトエラーの根本原因を特定する',
    priority: 'high',
    status: 'investigation',
    category: 'Database',
    assignedTeam: 'データベースチーム',
    assignedMembers: ['田中太郎', '佐藤花子'],
    relatedIncidents: ['INC-001', 'INC-005', 'INC-012'],
    rootCause: '',
    workaround: 'コネクションプールサイズを一時的に増加',
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    investigationProgress: 65,
    affectedServices: ['CRM', 'データベース'],
  },
  {
    id: 'PRB-002',
    title: 'メール送信遅延の問題',
    description: 'システムからのメール送信が遅延する問題の調査',
    priority: 'medium',
    status: 'known_error',
    category: 'Email',
    assignedTeam: 'インフラチーム',
    assignedMembers: ['山田次郎'],
    relatedIncidents: ['INC-003', 'INC-008'],
    rootCause: 'SMTPサーバーの設定不備とキュー処理の問題',
    workaround: 'メール送信の優先度調整機能を使用',
    createdAt: '2024-01-08T11:20:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    investigationProgress: 100,
    affectedServices: ['メール', '通知システム'],
  },
  {
    id: 'PRB-003',
    title: 'Webサーバーパフォーマンス劣化',
    description: 'ピーク時間帯のWebサーバーパフォーマンス劣化',
    priority: 'critical',
    status: 'open',
    category: 'Performance',
    assignedTeam: 'Webチーム',
    assignedMembers: ['鈴木一郎', '高橋美咲', '中村隆'],
    relatedIncidents: ['INC-002', 'INC-006', 'INC-009', 'INC-011'],
    rootCause: '',
    workaround: 'ロードバランサーの設定調整',
    createdAt: '2024-01-12T13:15:00Z',
    updatedAt: '2024-01-15T09:20:00Z',
    investigationProgress: 30,
    affectedServices: ['Webサイト', 'API', 'モバイルアプリ'],
  },
]

const ProblemList: React.FC = () => {
  const navigate = useNavigate()
  const [problems] = useState<Problem[]>(mockProblems)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null)

  // フィルタリングと検索
  const filteredProblems = useMemo(() => {
    return problems.filter(problem => {
      const matchesSearch = searchQuery === '' || 
        problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        problem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        problem.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesPriority = priorityFilter === 'all' || problem.priority === priorityFilter
      const matchesStatus = statusFilter === 'all' || problem.status === statusFilter
      
      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [problems, searchQuery, priorityFilter, statusFilter])

  // 優先度のカラーマッピング
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error'
      case 'high': return 'warning' 
      case 'medium': return 'info'
      case 'low': return 'success'
      default: return 'default'
    }
  }

  // ステータスの表示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'open':
        return { icon: <FolderOpen />, color: 'error', label: 'オープン' }
      case 'investigation':
        return { icon: <FindInPage />, color: 'warning', label: '調査中' }
      case 'known_error':
        return { icon: <Psychology />, color: 'info', label: '既知エラー' }
      case 'closed':
        return { icon: <FolderOff />, color: 'success', label: 'クローズ' }
      default:
        return { icon: <FolderOpen />, color: 'default', label: status }
    }
  }

  // 調査進捗の色
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'success'
    if (progress >= 50) return 'warning'
    return 'error'
  }

  // メニューハンドラー
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, problemId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedProblem(problemId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedProblem(null)
  }

  const handleEdit = () => {
    if (selectedProblem) {
      navigate(`/problems/${selectedProblem}/edit`)
    }
    handleMenuClose()
  }

  const handleRCA = () => {
    if (selectedProblem) {
      navigate(`/problems/${selectedProblem}/rca`)
    }
    handleMenuClose()
  }

  const handleKnownError = () => {
    // TODO: 既知エラー登録機能の実装
    handleMenuClose()
  }

  // 統計データ
  const stats = useMemo(() => {
    const total = problems.length
    const critical = problems.filter(p => p.priority === 'critical').length
    const investigating = problems.filter(p => p.status === 'investigation').length
    const knownErrors = problems.filter(p => p.status === 'known_error').length
    
    return { total, critical, investigating, knownErrors }
  }, [problems])

  const pageActions = (
    <Stack direction="row" spacing={2}>
      <Button
        variant="outlined"
        startIcon={<Psychology />}
        onClick={() => navigate('/problems/rca')}
      >
        RCA分析
      </Button>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/problems/create')}
      >
        新規問題登録
      </Button>
    </Stack>
  )

  return (
    <ContentArea
      pageTitle="問題管理"
      pageDescription="システム問題の根本原因分析と管理"
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
              総問題数
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
              {stats.investigating}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              調査中
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 120 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h4" color="info.main">
              {stats.knownErrors}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              既知エラー
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* 検索とフィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="問題を検索..."
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
              <InputLabel>優先度</InputLabel>
              <Select
                value={priorityFilter}
                label="優先度"
                onChange={(e) => setPriorityFilter(e.target.value)}
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
                <MenuItem value="investigation">調査中</MenuItem>
                <MenuItem value="known_error">既知エラー</MenuItem>
                <MenuItem value="closed">クローズ</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* 問題一覧テーブル */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>タイトル</TableCell>
                <TableCell>優先度</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>担当チーム</TableCell>
                <TableCell>調査進捗</TableCell>
                <TableCell>関連インシデント</TableCell>
                <TableCell>作成日時</TableCell>
                <TableCell>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProblems
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((problem) => {
                  const statusDisplay = getStatusDisplay(problem.status)
                  return (
                    <TableRow 
                      key={problem.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/problems/${problem.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {problem.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {problem.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {problem.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={problem.priority.toUpperCase()}
                          size="small"
                          color={getPriorityColor(problem.priority) as any}
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
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {problem.assignedTeam}
                          </Typography>
                          <AvatarGroup max={3} sx={{ mt: 0.5 }}>
                            {problem.assignedMembers.map((member, index) => (
                              <Tooltip key={index} title={member}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                  {member.charAt(0)}
                                </Avatar>
                              </Tooltip>
                            ))}
                          </AvatarGroup>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ width: '100px' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">
                              {problem.investigationProgress}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={problem.investigationProgress}
                            color={getProgressColor(problem.investigationProgress) as any}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {problem.relatedIncidents.slice(0, 3).map((incident) => (
                            <Chip
                              key={incident}
                              label={incident}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          ))}
                          {problem.relatedIncidents.length > 3 && (
                            <Chip
                              label={`+${problem.relatedIncidents.length - 3}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(problem.createdAt).toLocaleString('ja-JP')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMenuOpen(e, problem.id)
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
          count={filteredProblems.length}
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
        <MenuItem onClick={handleRCA}>
          <Psychology sx={{ mr: 1 }} />
          RCA分析
        </MenuItem>
        <MenuItem onClick={handleKnownError}>
          <CheckCircle sx={{ mr: 1 }} />
          既知エラー登録
        </MenuItem>
      </Menu>
    </ContentArea>
  )
}

export default ProblemList