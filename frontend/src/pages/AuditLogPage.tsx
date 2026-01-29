import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { auditApi } from '../api/audit'
import type { AuditLog } from '../types'
import { useToast } from '../components/common/ToastProvider'

const actionIcons: Record<string, React.ReactNode> = {
  create: <AddCircleIcon color="success" />,
  update: <EditIcon color="info" />,
  delete: <DeleteIcon color="error" />,
  status_change: <SwapHorizIcon color="warning" />,
  approval: <CheckCircleIcon color="success" />,
  rejection: <CancelIcon color="error" />,
}

const actionColors: Record<string, 'success' | 'info' | 'error' | 'warning' | 'default'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  status_change: 'warning',
  approval: 'success',
  rejection: 'error',
}

const entityTypes = ['equipment', 'material', 'meeting', 'project', 'contact', 'area']
const actionTypes = ['create', 'update', 'delete', 'status_change', 'approval', 'rejection']

export default function AuditLogPage() {
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await auditApi.list()
      setLogs(data)
    } catch (error) {
      showError('Failed to load audit logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user?.fullName?.toLowerCase().includes(search.toLowerCase()) || log.entityType.toLowerCase().includes(search.toLowerCase())
    const matchesEntity = !entityFilter || log.entityType === entityFilter
    const matchesAction = !actionFilter || log.action === actionFilter
    return matchesSearch && matchesEntity && matchesAction
  })

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setDetailsOpen(true)
  }

  const formatChanges = (oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) => {
    const changes: { field: string; old: unknown; new: unknown }[] = []
    const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])
    allKeys.forEach(key => {
      const oldVal = oldValues?.[key]
      const newVal = newValues?.[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, old: oldVal, new: newVal })
      }
    })
    return changes
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Audit Log</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Complete history of all changes and actions</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField placeholder="Search by user or entity..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 300 }} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        <TextField select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} sx={{ width: 150 }} size="small">
          <MenuItem value="">All Entities</MenuItem>
          {entityTypes.map(type => <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>{type}</MenuItem>)}
        </TextField>
        <TextField select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} sx={{ width: 150 }} size="small">
          <MenuItem value="">All Actions</MenuItem>
          {actionTypes.map(type => <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</MenuItem>)}
        </TextField>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Changes</TableCell>
                <TableCell align="right">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => {
                const changes = formatChanges(log.oldValues, log.newValues)
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">{new Date(log.createdAt).toLocaleDateString()}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(log.createdAt).toLocaleTimeString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>{log.user?.fullName?.split(' ').map(n => n[0]).join('') || '?'}</Avatar>
                        <Typography variant="body2">{log.user?.fullName || 'Unknown'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {actionIcons[log.action]}
                        <Chip label={log.action.replace('_', ' ')} size="small" color={actionColors[log.action]} sx={{ textTransform: 'capitalize' }} />
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={log.entityType} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} /></TableCell>
                    <TableCell>
                      {changes.length > 0 ? <Typography variant="body2" color="text.secondary">{changes.length} field{changes.length > 1 ? 's' : ''} changed</Typography> : <Typography variant="body2" color="text.secondary">-</Typography>}
                    </TableCell>
                    <TableCell align="right"><Button size="small" onClick={() => handleViewDetails(log)}>View</Button></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {filteredLogs.length === 0 && <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="text.secondary">No audit logs found</Typography></Box>}

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedLog && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {actionIcons[selectedLog.action]}
                <span style={{ textTransform: 'capitalize' }}>{selectedLog.action.replace('_', ' ')} {selectedLog.entityType}</span>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                <Typography>{new Date(selectedLog.createdAt).toLocaleString()}</Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">User</Typography>
                <Typography>{selectedLog.user?.fullName || 'Unknown'}</Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">Entity ID</Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>{selectedLog.entityId}</Typography>
              </Box>
              {(selectedLog.oldValues || selectedLog.newValues) && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Changes</Typography>
                  {formatChanges(selectedLog.oldValues, selectedLog.newValues).map(change => (
                    <Box key={change.field} sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">{change.field}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {change.old !== undefined && <Chip label={String(change.old)} size="small" sx={{ bgcolor: 'error.light', color: 'error.contrastText' }} />}
                        <SwapHorizIcon fontSize="small" color="action" />
                        {change.new !== undefined && <Chip label={String(change.new)} size="small" sx={{ bgcolor: 'success.light', color: 'success.contrastText' }} />}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions><Button onClick={() => setDetailsOpen(false)}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
