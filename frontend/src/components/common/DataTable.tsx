/**
 * 高度なデータテーブルコンポーネント
 * ソート、フィルタリング、検索、ページネーション、エクスポート機能を提供
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Checkbox,
  Toolbar,
  Tooltip,
  alpha,
  useTheme,
  Paper,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material'

export interface TableColumn<T = any> {
  id: keyof T | string
  label: string
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  searchable?: boolean
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'select' | 'date' | 'number'
  filterOptions?: Array<{ value: any; label: string }>
  render?: (value: any, row: T) => React.ReactNode
  formatNumber?: boolean
  formatDate?: boolean
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  title?: string
  subtitle?: string
  loading?: boolean
  searchable?: boolean
  filterable?: boolean
  exportable?: boolean
  selectable?: boolean
  dense?: boolean
  stickyHeader?: boolean
  initialPageSize?: number
  rowsPerPageOptions?: number[]
  emptyStateMessage?: string
  actions?: React.ReactNode
  rowActions?: (row: T) => React.ReactNode
  onRowClick?: (row: T, index: number) => void
  onRowSelect?: (selectedRows: T[]) => void
  onRefresh?: () => void
  onExport?: (type: 'csv' | 'excel' | 'pdf') => void
  className?: string
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  subtitle,
  loading = false,
  searchable = true,
  filterable = true,
  exportable = true,
  selectable = false,
  dense = false,
  stickyHeader = false,
  initialPageSize = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  emptyStateMessage = 'データがありません',
  actions,
  rowActions,
  onRowClick,
  onRowSelect,
  onRefresh,
  onExport,
  className,
}: DataTableProps<T>) {
  const theme = useTheme()
  
  // State管理
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize)
  const [orderBy, setOrderBy] = useState<keyof T | ''>('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<T[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    columns.reduce((acc, col) => ({ ...acc, [col.id]: true }), {})
  )

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    let result = [...data]

    // 検索フィルター
    if (searchQuery) {
      const searchableColumns = columns.filter(col => col.searchable)
      result = result.filter(row =>
        searchableColumns.some(col => {
          const value = row[col.id]
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        })
      )
    }

    // カラムフィルター
    Object.entries(filters).forEach(([columnId, filterValue]) => {
      if (filterValue !== '' && filterValue != null) {
        result = result.filter(row => {
          const value = row[columnId]
          const column = columns.find(col => col.id === columnId)
          
          if (column?.filterType === 'select') {
            return value === filterValue
          } else {
            return value?.toString().toLowerCase().includes(filterValue.toLowerCase())
          }
        })
      }
    })

    return result
  }, [data, searchQuery, filters, columns])

  // ソートされたデータ
  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[orderBy]
      const bValue = b[orderBy]

      if (aValue < bValue) return order === 'asc' ? -1 : 1
      if (aValue > bValue) return order === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, orderBy, order])

  // ページネーションされたデータ
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage
    return sortedData.slice(startIndex, startIndex + rowsPerPage)
  }, [sortedData, page, rowsPerPage])

  // ソートハンドラー
  const handleSort = useCallback((columnId: keyof T) => {
    const isAsc = orderBy === columnId && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(columnId)
  }, [orderBy, order])

  // フィルターハンドラー
  const handleFilterChange = useCallback((columnId: string, value: any) => {
    setFilters(prev => ({ ...prev, [columnId]: value }))
    setPage(0)
  }, [])

  // 選択ハンドラー
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelected([...paginatedData])
    } else {
      setSelected([])
    }
    onRowSelect?.(checked ? [...paginatedData] : [])
  }, [paginatedData, onRowSelect])

  const handleSelectRow = useCallback((row: T, checked: boolean) => {
    let newSelected: T[]
    if (checked) {
      newSelected = [...selected, row]
    } else {
      newSelected = selected.filter(item => item !== row)
    }
    setSelected(newSelected)
    onRowSelect?.(newSelected)
  }, [selected, onRowSelect])

  // 値の表示フォーマット
  const formatCellValue = useCallback((value: any, column: TableColumn<T>) => {
    if (column.render) {
      return column.render
    }
    
    if (value == null) return '-'
    
    if (column.formatDate && value) {
      return new Date(value).toLocaleString('ja-JP')
    }
    
    if (column.formatNumber && typeof value === 'number') {
      return value.toLocaleString()
    }
    
    return value
  }, [])

  // 表示する列
  const visibleColumns = useMemo(() => 
    columns.filter(col => columnVisibility[col.id])
  , [columns, columnVisibility])

  return (
    <Card className={className}>
      {/* ヘッダー */}
      <CardHeader
        title={title && <Typography variant="h6">{title}</Typography>}
        subheader={subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {actions}
            
            {/* 検索 */}
            {searchable && (
              <TextField
                size="small"
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ minWidth: 200 }}
              />
            )}

            {/* メニュー */}
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              {onRefresh && (
                <MenuItem onClick={() => { onRefresh(); setAnchorEl(null) }}>
                  <RefreshIcon sx={{ mr: 1 }} />
                  更新
                </MenuItem>
              )}
              {exportable && onExport && (
                <>
                  <MenuItem onClick={() => { onExport('csv'); setAnchorEl(null) }}>
                    <ExportIcon sx={{ mr: 1 }} />
                    CSV出力
                  </MenuItem>
                  <MenuItem onClick={() => { onExport('excel'); setAnchorEl(null) }}>
                    <ExportIcon sx={{ mr: 1 }} />
                    Excel出力
                  </MenuItem>
                </>
              )}
            </Menu>
          </Stack>
        }
      />

      <CardContent sx={{ p: 0 }}>
        {/* フィルター */}
        {filterable && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {columns.filter(col => col.filterable).map(column => (
                <FormControl key={column.id.toString()} size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>{column.label}</InputLabel>
                  {column.filterType === 'select' ? (
                    <Select
                      value={filters[column.id] || ''}
                      onChange={(e) => handleFilterChange(column.id.toString(), e.target.value)}
                      label={column.label}
                    >
                      <MenuItem value="">すべて</MenuItem>
                      {column.filterOptions?.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <TextField
                      value={filters[column.id] || ''}
                      onChange={(e) => handleFilterChange(column.id.toString(), e.target.value)}
                      label={column.label}
                      size="small"
                    />
                  )}
                </FormControl>
              ))}
            </Stack>
          </Box>
        )}

        {/* テーブル */}
        <TableContainer>
          <Table stickyHeader={stickyHeader} size={dense ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < paginatedData.length}
                      checked={paginatedData.length > 0 && selected.length === paginatedData.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                )}
                {visibleColumns.map((column) => (
                  <TableCell
                    key={column.id.toString()}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                    sortDirection={orderBy === column.id ? order : false}
                  >
                    {column.sortable !== false ? (
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleSort(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
                {rowActions && <TableCell>操作</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      読み込み中...
                    </Box>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <Typography color="text.secondary">{emptyStateMessage}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => {
                  const isSelected = selected.includes(row)
                  return (
                    <TableRow
                      key={index}
                      hover
                      selected={isSelected}
                      onClick={() => onRowClick?.(row, index)}
                      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {selectable && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(row, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.map((column) => (
                        <TableCell key={column.id.toString()} align={column.align}>
                          {column.render
                            ? column.render(row[column.id], row)
                            : formatCellValue(row[column.id], column)
                          }
                        </TableCell>
                      ))}
                      {rowActions && (
                        <TableCell>
                          <Box onClick={(e) => e.stopPropagation()}>
                            {rowActions(row)}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ページネーション */}
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={sortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </CardContent>
    </Card>
  )
}

export default DataTable
export type { TableColumn }