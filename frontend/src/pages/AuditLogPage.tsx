import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { Avatar } from '../components/ui/Avatar'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import { EmptyState } from '../components/ui/EmptyState'
import { auditApi } from '../api/audit'
import { useToast } from '../components/common/ToastProvider'
import type { AuditLog } from '../types'

const actionConfig: Record<string, { icon: React.ReactNode; color: 'success' | 'info' | 'error' | 'warning' | 'default'; bg: string }> = {
  create: { icon: <AddCircleIcon sx={{ fontSize: 18 }} />, color: 'success', bg: 'success.light' },
  update: { icon: <EditIcon sx={{ fontSize: 18 }} />, color: 'info', bg: 'info.light' },
  delete: { icon: <DeleteIcon sx={{ fontSize: 18 }} />, color: 'error', bg: 'error.light' },
  status_change: { icon: <SwapHorizIcon sx={{ fontSize: 18 }} />, color: 'warning', bg: 'warning.light' },
  approval: { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: 'success', bg: 'success.light' },
  rejection: { icon: <CancelIcon sx={{ fontSize: 18 }} />, color: 'error', bg: 'error.light' },
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
      const data = await auditApi.listAll()
      setLogs(data)
    } catch {
      showError('Failed to load audit logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase())
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

  const todayLogs = logs.filter(log => {
    const today = new Date()
    const logDate = new Date(log.createdAt)
    return logDate.toDateString() === today.toDateString()
  }).length

  const columns: Column<AuditLog>[] = [
    {
      id: 'createdAt',
      label: 'Timestamp',
      minWidth: 160,
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(row.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'user',
      label: 'User',
      minWidth: 180,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar name={row.user?.fullName || 'Unknown'} size="small" />
          <Typography variant="body2" fontWeight={500}>
            {row.user?.fullName || 'Unknown'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'action',
      label: 'Action',
      minWidth: 150,
      render: (row) => {
        const config = actionConfig[row.action] || actionConfig.update
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: config.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: `${config.color}.main`,
              }}
            >
              {config.icon}
            </Box>
            <Chip
              label={row.action.replace('_', ' ')}
              size="small"
              color={config.color}
              sx={{ textTransform: 'capitalize', fontWeight: 500 }}
            />
          </Box>
        )
      },
    },
    {
      id: 'entityType',
      label: 'Entity',
      minWidth: 120,
      render: (row) => (
        <Chip
          label={row.entityType}
          size="small"
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      id: 'changes',
      label: 'Changes',
      minWidth: 120,
      render: (row) => {
        const changes = formatChanges(row.oldValues, row.newValues)
        return (
          <Typography variant="body2" color="text.secondary">
            {changes.length > 0 ? `${changes.length} field${changes.length > 1 ? 's' : ''} changed` : '-'}
          </Typography>
        )
      },
    },
    {
      id: 'actions',
      label: '',
      minWidth: 80,
      align: 'right',
      render: (row) => (
        <Button variant="tertiary" size="small" onClick={() => handleViewDetails(row)}>
          View
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 4 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Audit Log"
        subtitle="Complete history of all changes and actions"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit Log' }]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <KPICard
          title="Total Entries"
          value={logs.length}
          icon={<HistoryIcon />}
          color="primary"
        />
        <KPICard
          title="Today's Activity"
          value={todayLogs}
          icon={<EditIcon />}
          color="info"
        />
        <KPICard
          title="Users Active"
          value={new Set(logs.map(l => l.user?.id)).size}
          icon={<CheckCircleIcon />}
          color="success"
        />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SearchField
                placeholder="Search by user or entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <MuiTextField
                select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                size="small"
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All Entities</MenuItem>
                {entityTypes.map(type => (
                  <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>{type}</MenuItem>
                ))}
              </MuiTextField>
              <MuiTextField
                select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                size="small"
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All Actions</MenuItem>
                {actionTypes.map(type => (
                  <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</MenuItem>
                ))}
              </MuiTextField>
            </Box>
            <Chip label={`${filteredLogs.length} entries`} size="small" />
          </Box>

          {filteredLogs.length === 0 ? (
            <EmptyState
              variant="no-results"
              title="No audit logs found"
              description="Try adjusting your search or filters"
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredLogs}
              getRowId={(row) => row.id}
              onRowClick={handleViewDetails}
              emptyMessage="No audit logs found"
            />
          )}
        </Box>
      </Card>

      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderRadius: '16px 0 0 16px' } }}
      >
        {selectedLog && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Audit Details</Typography>
              <IconButton onClick={() => setDetailsOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              {(() => {
                const config = actionConfig[selectedLog.action] || actionConfig.update
                return (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: config.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: `${config.color}.main`,
                    }}
                  >
                    {config.icon}
                  </Box>
                )
              })()}
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                  {selectedLog.action.replace('_', ' ')} {selectedLog.entityType}
                </Typography>
                <Chip
                  label={selectedLog.entityType}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>TIMESTAMP</Typography>
                <Typography variant="body2">{new Date(selectedLog.createdAt).toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>USER</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Avatar name={selectedLog.user?.fullName || 'Unknown'} size="small" />
                  <Typography variant="body2">{selectedLog.user?.fullName || 'Unknown'}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>ENTITY ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {selectedLog.entityId}
                </Typography>
              </Box>
            </Box>

            {(selectedLog.oldValues || selectedLog.newValues) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                  CHANGES
                </Typography>
                {formatChanges(selectedLog.oldValues, selectedLog.newValues).map(change => (
                  <Box
                    key={change.field}
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {change.field}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {change.old !== undefined && (
                        <Chip
                          label={String(change.old)}
                          size="small"
                          sx={{ bgcolor: 'error.light', color: 'error.dark', fontSize: '0.7rem' }}
                        />
                      )}
                      <SwapHorizIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      {change.new !== undefined && (
                        <Chip
                          label={String(change.new)}
                          size="small"
                          sx={{ bgcolor: 'success.light', color: 'success.dark', fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  )
}
