import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Box,
  Typography,
  Divider,
  OutlinedInput,
  FormControlLabel,
  Checkbox,
  // DatePicker, // Not available in this version
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material'
// import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker' // Not available
import type { TicketFilters, UserFilters, Priority, TicketStatus, UserRole } from '../../types'

interface AdvancedFiltersProps {
  open: boolean
  onClose: () => void
  onApply: (filters: TicketFilters | UserFilters) => void
  filterType: 'ticket' | 'user'
  initialFilters?: TicketFilters | UserFilters
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  open,
  onClose,
  onApply,
  filterType,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<TicketFilters | UserFilters>(initialFilters)

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const handleReset = () => {
    setFilters({})
  }

  const handleClose = () => {
    setFilters(initialFilters)
    onClose()
  }

  const renderTicketFilters = () => {
    const ticketFilters = filters as TicketFilters

    return (
      <>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>ステータス</InputLabel>
            <Select
              multiple
              value={ticketFilters.status || []}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TicketStatus[] }))}
              input={<OutlinedInput label="ステータス" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const statusLabels = {
                      open: '未対応',
                      in_progress: '対応中',
                      resolved: '解決済み',
                      closed: '完了',
                      on_hold: '保留中',
                    }
                    return (
                      <Chip
                        key={value}
                        label={statusLabels[value as keyof typeof statusLabels]}
                        size="small"
                      />
                    )
                  })}
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

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>優先度</InputLabel>
            <Select
              multiple
              value={ticketFilters.priority || []}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as Priority[] }))}
              input={<OutlinedInput label="優先度" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const priorityLabels = {
                      critical: '緊急',
                      high: '高',
                      medium: '中',
                      low: '低',
                    }
                    return (
                      <Chip
                        key={value}
                        label={priorityLabels[value as keyof typeof priorityLabels]}
                        size="small"
                      />
                    )
                  })}
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

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>カテゴリ</InputLabel>
            <Select
              multiple
              value={ticketFilters.category || []}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as string[] }))}
              input={<OutlinedInput label="カテゴリ" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="Infrastructure">Infrastructure</MenuItem>
              <MenuItem value="Network">Network</MenuItem>
              <MenuItem value="Hardware">Hardware</MenuItem>
              <MenuItem value="Software">Software</MenuItem>
              <MenuItem value="Email">Email</MenuItem>
              <MenuItem value="Security">Security</MenuItem>
              <MenuItem value="License">License</MenuItem>
              <MenuItem value="Database">Database</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="検索キーワード"
            placeholder="タイトルや説明で検索"
            value={ticketFilters.search || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            日付範囲
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <MuiDatePicker
            label="作成開始日"
            value={ticketFilters.dateFrom ? new Date(ticketFilters.dateFrom) : null}
            onChange={(date) => setFilters(prev => ({ ...prev, dateFrom: date?.toISOString() }))}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <MuiDatePicker
            label="作成終了日"
            value={ticketFilters.dateTo ? new Date(ticketFilters.dateTo) : null}
            onChange={(date) => setFilters(prev => ({ ...prev, dateTo: date?.toISOString() }))}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>
      </>
    )
  }

  const renderUserFilters = () => {
    const userFilters = filters as UserFilters

    return (
      <>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>役割</InputLabel>
            <Select
              multiple
              value={userFilters.role || []}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value as UserRole[] }))}
              input={<OutlinedInput label="役割" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const roleLabels = {
                      admin: '管理者',
                      manager: 'マネージャー',
                      operator: 'オペレーター',
                      viewer: '閲覧者',
                    }
                    return (
                      <Chip
                        key={value}
                        label={roleLabels[value as keyof typeof roleLabels]}
                        size="small"
                      />
                    )
                  })}
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

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>部署</InputLabel>
            <Select
              multiple
              value={userFilters.department || []}
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
              <MenuItem value="IT部">IT部</MenuItem>
              <MenuItem value="営業部">営業部</MenuItem>
              <MenuItem value="サポート部">サポート部</MenuItem>
              <MenuItem value="セキュリティ部">セキュリティ部</MenuItem>
              <MenuItem value="人事部">人事部</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="検索キーワード"
            placeholder="名前、メール、部署で検索"
            value={userFilters.search || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={userFilters.isActive ?? true}
                onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.checked }))}
              />
            }
            label="アクティブユーザーのみ表示"
          />
        </Grid>
      </>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant="h6">
              高度なフィルター ({filterType === 'ticket' ? 'チケット' : 'ユーザー'})
            </Typography>
          </Box>
          <Tooltip title="閉じる">
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {filterType === 'ticket' ? renderTicketFilters() : renderUserFilters()}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleReset}
          startIcon={<RefreshIcon />}
          color="inherit"
        >
          リセット
        </Button>
        <Button onClick={handleClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          startIcon={<FilterIcon />}
        >
          フィルターを適用
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AdvancedFilters