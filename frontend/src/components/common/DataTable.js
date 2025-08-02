import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * 高度なデータテーブルコンポーネント
 * ソート、フィルタリング、検索、ページネーション、エクスポート機能を提供
 */
import { useState, useMemo, useCallback } from 'react';
import { Box, Card, CardContent, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, TextField, IconButton, Menu, MenuItem, FormControl, InputLabel, Select, Typography, Checkbox, useTheme, Stack, } from '@mui/material';
import { MoreVert as MoreVertIcon, Search as SearchIcon, GetApp as ExportIcon, Refresh as RefreshIcon, } from '@mui/icons-material';
function DataTable({ data, columns, title, subtitle, loading = false, searchable = true, filterable = true, exportable = true, selectable = false, dense = false, stickyHeader = false, initialPageSize = 10, rowsPerPageOptions = [5, 10, 25, 50], emptyStateMessage = 'データがありません', actions, rowActions, onRowClick, onRowSelect, onRefresh, onExport, className, }) {
    const theme = useTheme();
    // State管理
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);
    const [orderBy, setOrderBy] = useState('');
    const [order, setOrder] = useState('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({});
    const [selected, setSelected] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [columnVisibility, setColumnVisibility] = useState(columns.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}));
    // フィルタリングされたデータ
    const filteredData = useMemo(() => {
        let result = [...data];
        // 検索フィルター
        if (searchQuery) {
            const searchableColumns = columns.filter(col => col.searchable);
            result = result.filter(row => searchableColumns.some(col => {
                const value = row[col.id];
                return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
            }));
        }
        // カラムフィルター
        Object.entries(filters).forEach(([columnId, filterValue]) => {
            if (filterValue !== '' && filterValue != null) {
                result = result.filter(row => {
                    const value = row[columnId];
                    const column = columns.find(col => col.id === columnId);
                    if (column?.filterType === 'select') {
                        return value === filterValue;
                    }
                    else {
                        return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
                    }
                });
            }
        });
        return result;
    }, [data, searchQuery, filters, columns]);
    // ソートされたデータ
    const sortedData = useMemo(() => {
        if (!orderBy)
            return filteredData;
        return [...filteredData].sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];
            if (aValue < bValue)
                return order === 'asc' ? -1 : 1;
            if (aValue > bValue)
                return order === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, orderBy, order]);
    // ページネーションされたデータ
    const paginatedData = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return sortedData.slice(startIndex, startIndex + rowsPerPage);
    }, [sortedData, page, rowsPerPage]);
    // ソートハンドラー
    const handleSort = useCallback((columnId) => {
        const isAsc = orderBy === columnId && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(columnId);
    }, [orderBy, order]);
    // フィルターハンドラー
    const handleFilterChange = useCallback((columnId, value) => {
        setFilters(prev => ({ ...prev, [columnId]: value }));
        setPage(0);
    }, []);
    // 選択ハンドラー
    const handleSelectAll = useCallback((checked) => {
        if (checked) {
            setSelected([...paginatedData]);
        }
        else {
            setSelected([]);
        }
        onRowSelect?.(checked ? [...paginatedData] : []);
    }, [paginatedData, onRowSelect]);
    const handleSelectRow = useCallback((row, checked) => {
        let newSelected;
        if (checked) {
            newSelected = [...selected, row];
        }
        else {
            newSelected = selected.filter(item => item !== row);
        }
        setSelected(newSelected);
        onRowSelect?.(newSelected);
    }, [selected, onRowSelect]);
    // 値の表示フォーマット
    const formatCellValue = useCallback((value, column) => {
        if (column.render) {
            return column.render;
        }
        if (value == null)
            return '-';
        if (column.formatDate && value) {
            return new Date(value).toLocaleString('ja-JP');
        }
        if (column.formatNumber && typeof value === 'number') {
            return value.toLocaleString();
        }
        return value;
    }, []);
    // 表示する列
    const visibleColumns = useMemo(() => columns.filter(col => columnVisibility[col.id]), [columns, columnVisibility]);
    return (_jsxs(Card, { className: className, children: [_jsx(CardHeader, { title: title && _jsx(Typography, { variant: "h6", children: title }), subheader: subtitle && _jsx(Typography, { variant: "body2", color: "text.secondary", children: subtitle }), action: _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [actions, searchable && (_jsx(TextField, { size: "small", placeholder: "\u691C\u7D22...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                                startAdornment: _jsx(SearchIcon, { sx: { mr: 1, color: 'text.secondary' } }),
                            }, sx: { minWidth: 200 } })), _jsx(IconButton, { onClick: (e) => setAnchorEl(e.currentTarget), children: _jsx(MoreVertIcon, {}) }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: () => setAnchorEl(null), children: [onRefresh && (_jsxs(MenuItem, { onClick: () => { onRefresh(); setAnchorEl(null); }, children: [_jsx(RefreshIcon, { sx: { mr: 1 } }), "\u66F4\u65B0"] })), exportable && onExport && (_jsxs(_Fragment, { children: [_jsxs(MenuItem, { onClick: () => { onExport('csv'); setAnchorEl(null); }, children: [_jsx(ExportIcon, { sx: { mr: 1 } }), "CSV\u51FA\u529B"] }), _jsxs(MenuItem, { onClick: () => { onExport('excel'); setAnchorEl(null); }, children: [_jsx(ExportIcon, { sx: { mr: 1 } }), "Excel\u51FA\u529B"] })] }))] })] }) }), _jsxs(CardContent, { sx: { p: 0 }, children: [filterable && (_jsx(Box, { sx: { p: 2, borderBottom: 1, borderColor: 'divider' }, children: _jsx(Stack, { direction: "row", spacing: 2, flexWrap: "wrap", children: columns.filter(col => col.filterable).map(column => (_jsxs(FormControl, { size: "small", sx: { minWidth: 150 }, children: [_jsx(InputLabel, { children: column.label }), column.filterType === 'select' ? (_jsxs(Select, { value: filters[column.id] || '', onChange: (e) => handleFilterChange(column.id.toString(), e.target.value), label: column.label, children: [_jsx(MenuItem, { value: "", children: "\u3059\u3079\u3066" }), column.filterOptions?.map(option => (_jsx(MenuItem, { value: option.value, children: option.label }, option.value)))] })) : (_jsx(TextField, { value: filters[column.id] || '', onChange: (e) => handleFilterChange(column.id.toString(), e.target.value), label: column.label, size: "small" }))] }, column.id.toString()))) }) })), _jsx(TableContainer, { children: _jsxs(Table, { stickyHeader: stickyHeader, size: dense ? 'small' : 'medium', children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [selectable && (_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { indeterminate: selected.length > 0 && selected.length < paginatedData.length, checked: paginatedData.length > 0 && selected.length === paginatedData.length, onChange: (e) => handleSelectAll(e.target.checked) }) })), visibleColumns.map((column) => (_jsx(TableCell, { align: column.align, style: { minWidth: column.minWidth }, sortDirection: orderBy === column.id ? order : false, children: column.sortable !== false ? (_jsx(TableSortLabel, { active: orderBy === column.id, direction: orderBy === column.id ? order : 'asc', onClick: () => handleSort(column.id), children: column.label })) : (column.label) }, column.id.toString()))), rowActions && _jsx(TableCell, { children: "\u64CD\u4F5C" })] }) }), _jsx(TableBody, { children: loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0), children: _jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 3 }, children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." }) }) })) : paginatedData.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0), children: _jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 3 }, children: _jsx(Typography, { color: "text.secondary", children: emptyStateMessage }) }) }) })) : (paginatedData.map((row, index) => {
                                        const isSelected = selected.includes(row);
                                        return (_jsxs(TableRow, { hover: true, selected: isSelected, onClick: () => onRowClick?.(row, index), sx: { cursor: onRowClick ? 'pointer' : 'default' }, children: [selectable && (_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: isSelected, onChange: (e) => handleSelectRow(row, e.target.checked), onClick: (e) => e.stopPropagation() }) })), visibleColumns.map((column) => (_jsx(TableCell, { align: column.align, children: column.render
                                                        ? column.render(row[column.id], row)
                                                        : formatCellValue(row[column.id], column) }, column.id.toString()))), rowActions && (_jsx(TableCell, { children: _jsx(Box, { onClick: (e) => e.stopPropagation(), children: rowActions(row) }) }))] }, index));
                                    })) })] }) }), _jsx(TablePagination, { rowsPerPageOptions: rowsPerPageOptions, component: "div", count: sortedData.length, rowsPerPage: rowsPerPage, page: page, onPageChange: (_, newPage) => setPage(newPage), onRowsPerPageChange: (e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }, labelRowsPerPage: "\u8868\u793A\u4EF6\u6570:", labelDisplayedRows: ({ from, to, count }) => `${from}-${to} / ${count}` })] })] }));
}
export default DataTable;
