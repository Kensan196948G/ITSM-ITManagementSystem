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
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FilterAlt as FilterIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material'
import type { TicketFilters, UserFilters, Priority, TicketStatus, UserRole } from '../../types'

// 拡張フィルター型
interface ExtendedTicketFilters extends TicketFilters {
  slaStatus?: 'compliant' | 'at_risk' | 'violated'
  hasAttachments?: boolean
  lastUpdatedDays?: number
  dueDateFrom?: string
  dueDateTo?: string
  searchFields?: ('title' | 'description' | 'comments')[]
}

interface SavedFilter {
  id: string
  name: string
  filters: TicketFilters | UserFilters
  type: 'ticket' | 'user'
  createdAt: string
}

interface AdvancedFiltersProps {
  open: boolean
  onClose: () => void
  onApply: (filters: TicketFilters | UserFilters) => void
  filterType: 'ticket' | 'user'
  initialFilters?: TicketFilters | UserFilters
  savedFilters?: SavedFilter[]
  onSaveFilter?: (name: string, filters: TicketFilters | UserFilters) => void
  onLoadFilter?: (filterId: string) => void
  onDeleteFilter?: (filterId: string) => void
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  open,
  onClose,
  onApply,
  filterType,
  initialFilters = {},
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
}) => {
  const [filters, setFilters] = useState<TicketFilters | UserFilters>(initialFilters)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [activeTab, setActiveTab] = useState(0) // 0: 基本, 1: 高度, 2: 保存済み

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

  const renderBasicTicketFilters = () => {
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

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="作成開始日"
            type="date"
            value={ticketFilters.dateFrom ? ticketFilters.dateFrom.split('T')[0] : ''}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="作成終了日"
            type="date"
            value={ticketFilters.dateTo ? ticketFilters.dateTo.split('T')[0] : ''}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>
      </>
    )
  }

  const renderAdvancedTicketFilters = () => {
    const ticketFilters = filters as ExtendedTicketFilters

    return (
      <>
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <Typography variant="subtitle2" gutterBottom>
              検索対象フィールド
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['title', 'description', 'comments'].map((field) => {
                const fieldLabels = {
                  title: 'タイトル',
                  description: '説明',
                  comments: 'コメント'
                }
                return (
                  <FormControlLabel
                    key={field}
                    control={
                      <Checkbox
                        checked={ticketFilters.searchFields?.includes(field as any) ?? true}
                        onChange={(e) => {
                          const currentFields = ticketFilters.searchFields || ['title', 'description', 'comments']
                          const newFields = e.target.checked
                            ? [...currentFields, field as any]
                            : currentFields.filter(f => f !== field)
                          setFilters(prev => ({ ...prev, searchFields: newFields } as ExtendedTicketFilters))
                        }}
                        size="small"
                      />
                    }
                    label={fieldLabels[field as keyof typeof fieldLabels]}
                  />
                )
              })}
            </Box>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="期限開始日"
            type="date"
            value={ticketFilters.dueDateFrom ? ticketFilters.dueDateFrom.split('T')[0] : ''}
            onChange={(e) => setFilters(prev => ({ ...prev, dueDateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined } as ExtendedTicketFilters))}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="期限終了日"
            type="date"
            value={ticketFilters.dueDateTo ? ticketFilters.dueDateTo.split('T')[0] : ''}
            onChange={(e) => setFilters(prev => ({ ...prev, dueDateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined } as ExtendedTicketFilters))}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>SLAステータス</InputLabel>
            <Select
              value={ticketFilters.slaStatus || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, slaStatus: e.target.value || undefined } as ExtendedTicketFilters))}
              label="SLAステータス"
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="compliant">遵守</MenuItem>
              <MenuItem value="at_risk">リスク</MenuItem>
              <MenuItem value="violated">違反</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="最終更新日数（以内）"
            type="number"
            value={ticketFilters.lastUpdatedDays || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, lastUpdatedDays: e.target.value ? parseInt(e.target.value) : undefined } as ExtendedTicketFilters))}
            placeholder="例: 7（7日以内）"
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={ticketFilters.hasAttachments ?? false}
                onChange={(e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked || undefined } as ExtendedTicketFilters))}
              />
            }
            label="添付ファイルがあるチケットのみ"
          />
        </Grid>
      </>
    )
  }

  const renderSavedFilters = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          保存済みフィルター
        </Typography>
        <List>
          {savedFilters.map((savedFilter) => (
            <ListItem
              key={savedFilter.id}
              button
              onClick={() => {
                if (onLoadFilter) {
                  onLoadFilter(savedFilter.id)
                  setFilters(savedFilter.filters)
                }
              }}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <BookmarkIcon sx={{ mr: 2, color: 'primary.main' }} />
              <ListItemText
                primary={savedFilter.name}
                secondary={`${savedFilter.type === 'ticket' ? 'チケット' : 'ユーザー'}フィルター - ${new Date(savedFilter.createdAt).toLocaleDateString('ja-JP')}`}
              />
              <ListItemSecondaryAction>
                {onDeleteFilter && (
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteFilter(savedFilter.id)
                    }}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        {savedFilters.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            保存されたフィルターはありません
          </Typography>
        )}
      </Box>
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
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="基本フィルター" />
          <Tab label="高度フィルター" disabled={filterType !== 'ticket'} />
          <Tab label="保存済みフィルター" disabled={!savedFilters.length} />
        </Tabs>

        {activeTab === 0 && (
          <Grid container spacing={2}>
            {filterType === 'ticket' ? renderBasicTicketFilters() : renderUserFilters()}
          </Grid>
        )}

        {activeTab === 1 && filterType === 'ticket' && (
          <Grid container spacing={2}>
            {renderAdvancedTicketFilters()}
          </Grid>
        )}

        {activeTab === 2 && (
          <Box>
            {renderSavedFilters()}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Box>
            {onSaveFilter && (
              <Button
                onClick={() => setShowSaveDialog(true)}
                color="primary"
                variant="outlined"
              >
                フィルターを保存
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Box>
        </Box>
      </DialogActions>

      {/* 保存ダイアログ */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>フィルターを保存</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="フィルター名"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="例: 緊急チケット用フィルター"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>キャンセル</Button>
          <Button
            onClick={() => {
              if (filterName.trim() && onSaveFilter) {
                onSaveFilter(filterName.trim(), filters)
                setFilterName('')
                setShowSaveDialog(false)
              }
            }}
            variant="contained"
            disabled={!filterName.trim()}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default AdvancedFilters