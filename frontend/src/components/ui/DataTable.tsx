import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  Box,
  Typography,
  Skeleton,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@/mui'
import { useState, Fragment } from 'react'
import { styled } from '@/mui'
import { ChevronRightIcon, ChevronLeftIcon } from '@/icons'

export interface Column<T> {
  id: keyof T | string
  label: string
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  selectable?: boolean
  selectedIds?: (string | number)[]
  onSelectionChange?: (ids: (string | number)[]) => void
  getRowId: (row: T) => string | number
  onRowClick?: (row: T) => void
  renderExpandedRow?: (row: T) => React.ReactNode | null
  pagination?: boolean
  pageSize?: number
  emptyMessage?: string
}

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 12,
  overflowX: 'auto',
  scrollBehavior: 'smooth',
  WebkitOverflowScrolling: 'touch',
  position: 'relative',
  '& .MuiTableHead-root': {
    '& .MuiTableCell-head': {
      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
      fontWeight: 600,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: theme.palette.text.secondary,
      // Touch-friendly padding on mobile
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1.5),
        fontSize: '0.7rem',
      },
    },
  },
  '& .MuiTableBody-root': {
    '& .MuiTableRow-root': {
      transition: 'background-color 150ms ease-out',
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
      '&:last-child td': {
        borderBottom: 0,
      },
    },
    // Touch-friendly cell padding on mobile
    '& .MuiTableCell-root': {
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1.5),
        fontSize: '0.875rem',
      },
    },
  },
  // Touch-friendly checkbox sizing
  '& .MuiCheckbox-root': {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1.5),
      '& svg': {
        fontSize: '1.5rem',
      },
    },
  },
  // Touch-friendly sort label
  '& .MuiTableSortLabel-root': {
    [theme.breakpoints.down('sm')]: {
      '& .MuiTableSortLabel-icon': {
        fontSize: '1.2rem',
      },
    },
  },
})) as typeof TableContainer

const StyledTablePagination = styled(TablePagination)(({ theme }) => ({
  // Mobile-responsive pagination
  [theme.breakpoints.down('sm')]: {
    // Stack pagination controls on very small screens
    '& .MuiTablePagination-toolbar': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: theme.spacing(1),
      padding: theme.spacing(2),
    },
    // Touch-friendly pagination buttons
    '& .MuiIconButton-root': {
      padding: theme.spacing(1.5),
    },
    // Adjust select dropdown for touch
    '& .MuiTablePagination-select': {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
    },
  },
})) as typeof TablePagination

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId,
  onRowClick,
  renderExpandedRow,
  pagination = true,
  pageSize = 10,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)
  const [orderBy, setOrderBy] = useState<string>('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = rows.map(getRowId)
      onSelectionChange?.(newSelected)
    } else {
      onSelectionChange?.([])
    }
  }

  const handleSelectRow = (id: string | number) => {
    const selectedIndex = selectedIds.indexOf(id)
    let newSelected: (string | number)[] = []

    if (selectedIndex === -1) {
      newSelected = [...selectedIds, id]
    } else {
      newSelected = selectedIds.filter((item) => item !== id)
    }

    onSelectionChange?.(newSelected)
  }

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(columnId)
  }

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const sortedRows = orderBy
    ? [...rows].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[orderBy]
        const bVal = (b as Record<string, unknown>)[orderBy]
        if (aVal == null) return 1
        if (bVal == null) return -1
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        return order === 'asc' ? cmp : -cmp
      })
    : rows

  const displayedRows = pagination
    ? sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sortedRows

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const showChevron = isMobile && !!onRowClick
  const isRtl = theme.direction === 'rtl'

  if (loading) {
    return (
      <StyledTableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && <TableCell padding="checkbox" />}
              {columns.map((column) => (
                <TableCell key={String(column.id)} style={{ minWidth: column.minWidth }}>
                  <Skeleton width={80} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Skeleton variant="rectangular" width={20} height={20} />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={String(column.id)}>
                    <Skeleton />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    )
  }

  if (rows.length === 0) {
    return (
      <StyledTableContainer component={Paper} elevation={0}>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Box>
      </StyledTableContainer>
    )
  }

  return (
    <StyledTableContainer component={Paper} elevation={0}>
      <Table>
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < rows.length}
                  checked={rows.length > 0 && selectedIds.length === rows.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'Select all rows' } as React.InputHTMLAttributes<HTMLInputElement>}
                />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={String(column.id)}
                align={column.align}
                style={{ minWidth: column.minWidth }}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleSort(String(column.id))}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
            {showChevron && <TableCell sx={{ width: 32, p: 0 }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedRows.map((row) => {
            const rowId = getRowId(row)
            const isSelected = selectedIds.includes(rowId)
            const expandedContent = renderExpandedRow?.(row)
            const totalColSpan = columns.length + (selectable ? 1 : 0) + (showChevron ? 1 : 0)

            return (
              <Fragment key={rowId}>
                <TableRow
                  selected={isSelected}
                  onClick={() => onRowClick?.(row)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectRow(rowId)
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={String(column.id)} align={column.align}>
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[column.id as string] ?? '')}
                    </TableCell>
                  ))}
                  {showChevron && (
                    <TableCell sx={{ width: 32, p: 0.5, color: 'text.disabled' }}>
                      {isRtl ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                    </TableCell>
                  )}
                </TableRow>
                {renderExpandedRow && (
                  <TableRow>
                    <TableCell colSpan={totalColSpan} sx={{ p: 0, borderBottom: expandedContent ? 1 : 0, borderColor: 'divider' }}>
                      <Collapse in={!!expandedContent}>
                        {expandedContent}
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      {pagination && (
        <StyledTablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </StyledTableContainer>
  )
}
