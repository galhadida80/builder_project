import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { AddCircleIcon, EditIcon, DeleteIcon, CheckCircleIcon, CancelIcon, SwapHorizIcon, CloseIcon, HistoryIcon, FileDownloadIcon } from '@/icons'
import { Box, Typography, MenuItem, TextField as MuiTextField, Skeleton, Chip, Drawer, Divider, IconButton } from '@/mui'

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
  const { showError, showSuccess } = useToast()
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const dateLocale = useMemo(() => {
    if (i18n.language === 'he') return 'he-IL'
    if (i18n.language === 'es') return 'es-ES'
    return 'en-US'
  }, [i18n.language])

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await auditApi.listAll()
      setLogs(data)
    } catch {
      showError(t('auditLog.failedToLoad'))
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

  const handleExportCSV = useCallback(() => {
    if (filteredLogs.length === 0) return
    const headers = [
      t('auditLog.timestamp'),
      t('auditLog.user'),
      t('auditLog.action'),
      t('auditLog.entity'),
      t('auditLog.entityId'),
      t('auditLog.changes'),
    ]
    const rows = filteredLogs.map(log => {
      const changes = formatChanges(log.oldValues, log.newValues)
      const changesText = changes.map(c => `${c.field}: ${String(c.old ?? '')} → ${String(c.new ?? '')}`).join('; ')
      return [
        new Date(log.createdAt).toLocaleString(dateLocale),
        log.user?.fullName || log.user?.email || '',
        t(`auditLog.actions.${log.action}`, { defaultValue: log.action }),
        t(`auditLog.entities.${log.entityType}`, { defaultValue: log.entityType }),
        log.entityId,
        changesText,
      ]
    })
    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(',')),
    ].join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showSuccess(t('auditLog.exportSuccess'))
  }, [filteredLogs, dateLocale, t, showSuccess])

  const todayLogs = logs.filter(log => {
    const today = new Date()
    const logDate = new Date(log.createdAt)
    return logDate.toDateString() === today.toDateString()
  }).length

  const columns: Column<AuditLog>[] = [
    {
      id: 'createdAt',
      label: t('auditLog.timestamp'),
      minWidth: 160,
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {new Date(row.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(row.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'user',
      label: t('auditLog.user'),
      minWidth: 180,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar name={row.user?.fullName || t('common.unknown')} size="small" />
          <Typography variant="body2" fontWeight={500}>
            {row.user?.fullName || t('common.unknown')}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'action',
      label: t('auditLog.action'),
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
              label={t(`auditLog.actions.${row.action}`, { defaultValue: row.action.replace('_', ' ') })}
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
      label: t('auditLog.entity'),
      minWidth: 120,
      render: (row) => (
        <Chip
          label={t(`auditLog.entities.${row.entityType}`, { defaultValue: row.entityType })}
          size="small"
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      id: 'changes',
      label: t('auditLog.changes'),
      minWidth: 120,
      render: (row) => {
        const changes = formatChanges(row.oldValues, row.newValues)
        return (
          <Typography variant="body2" color="text.secondary">
            {changes.length > 0 ? t('auditLog.fieldsChanged', { count: changes.length }) : '-'}
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
          {t('common.details')}
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1, md: 2 }, mb: 4 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('auditLog.pageTitle')}
        subtitle={t('auditLog.subtitle')}
        breadcrumbs={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('auditLog.pageTitle') }]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: { xs: 1, md: 2 },
          mb: { xs: 2, md: 4 },
        }}
      >
        <KPICard
          title={t('auditLog.totalEntries')}
          value={logs.length}
          icon={<HistoryIcon />}
          color="primary"
        />
        <KPICard
          title={t('auditLog.todayActivity')}
          value={todayLogs}
          icon={<EditIcon />}
          color="info"
        />
        <KPICard
          title={t('auditLog.usersActive')}
          value={new Set(logs.map(l => l.user?.id)).size}
          icon={<CheckCircleIcon />}
          color="success"
        />
      </Box>

      <Card>
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 2 }, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'stretch', sm: 'center' }, flex: 1, minWidth: 0 }}>
              <SearchField
                placeholder={t('auditLog.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <MuiTextField
                  select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: { xs: 0, sm: 140 }, flex: { xs: 1, sm: 'none' } }}
                >
                  <MenuItem value="">{t('auditLog.allEntities')}</MenuItem>
                  {entityTypes.map(type => (
                    <MenuItem key={type} value={type}>{t(`auditLog.entities.${type}`, { defaultValue: type })}</MenuItem>
                  ))}
                </MuiTextField>
                <MuiTextField
                  select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: { xs: 0, sm: 140 }, flex: { xs: 1, sm: 'none' } }}
                >
                  <MenuItem value="">{t('auditLog.allActions')}</MenuItem>
                  {actionTypes.map(type => (
                    <MenuItem key={type} value={type}>{t(`auditLog.actions.${type}`, { defaultValue: type.replace('_', ' ') })}</MenuItem>
                  ))}
                </MuiTextField>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}>
              <Chip label={t('auditLog.entriesLabel', { count: filteredLogs.length })} size="small" />
              <Button
                variant="secondary"
                size="small"
                icon={<FileDownloadIcon />}
                onClick={handleExportCSV}
                disabled={filteredLogs.length === 0}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {t('auditLog.export')}
                </Box>
              </Button>
            </Box>
          </Box>

          {filteredLogs.length === 0 ? (
            <EmptyState
              variant="no-results"
              title={t('auditLog.noLogsFound')}
              description={t('auditLog.tryAdjustingSearch')}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredLogs}
              getRowId={(row) => row.id}
              onRowClick={handleViewDetails}
              emptyMessage={t('auditLog.noLogsFound')}
            />
          )}
        </Box>
      </Card>

      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderRadius: { xs: 0, sm: '16px 0 0 16px' } } }}
      >
        {selectedLog && (
          <Box sx={{ p: { xs: 2, sm: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>{t('auditLog.auditDetails')}</Typography>
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
                  {t(`auditLog.actions.${selectedLog.action}`, { defaultValue: selectedLog.action.replace('_', ' ') })} {t(`auditLog.entities.${selectedLog.entityType}`, { defaultValue: selectedLog.entityType })}
                </Typography>
                <Chip
                  label={t(`auditLog.entities.${selectedLog.entityType}`, { defaultValue: selectedLog.entityType })}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('auditLog.timestamp').toUpperCase()}</Typography>
                <Typography variant="body2">{new Date(selectedLog.createdAt).toLocaleString(dateLocale)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('auditLog.user').toUpperCase()}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Avatar name={selectedLog.user?.fullName || t('common.unknown')} size="small" />
                  <Typography variant="body2">{selectedLog.user?.fullName || t('common.unknown')}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('auditLog.entityId').toUpperCase()}</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {selectedLog.entityId}
                </Typography>
              </Box>
            </Box>

            {(selectedLog.oldValues || selectedLog.newValues) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                  {t('auditLog.changes').toUpperCase()}
                </Typography>
                {formatChanges(selectedLog.oldValues, selectedLog.newValues).map(change => (
                  <Box
                    key={change.field}
                    sx={{
                      p: 1.5,
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {change.field}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      {change.old !== undefined && (
                        <Chip
                          label={String(change.old)}
                          size="small"
                          sx={{ bgcolor: 'error.light', color: 'error.dark', fontSize: '0.7rem', maxWidth: '100%' }}
                        />
                      )}
                      <SwapHorizIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                      {change.new !== undefined && (
                        <Chip
                          label={String(change.new)}
                          size="small"
                          sx={{ bgcolor: 'success.light', color: 'success.dark', fontSize: '0.7rem', maxWidth: '100%' }}
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
