import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import { EmptyState } from '../components/ui/EmptyState'
import { auditApi } from '../api/audit'
import { useToast } from '../components/common/ToastProvider'
import type { AuditLog } from '../types'
import { AddCircleIcon, EditIcon, DeleteIcon, CheckCircleIcon, CancelIcon, SwapHorizIcon, CloseIcon, HistoryIcon, FileDownloadIcon, ChevronRightIcon, ChevronLeftIcon } from '@/icons'
import { Box, Typography, MenuItem, TextField as MuiTextField, Skeleton, Chip, Drawer, Divider, IconButton, Pagination, useTheme, useMediaQuery } from '@/mui'

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
const PAGE_SIZE = 15

const FIELD_LABEL_KEYS: Record<string, string> = {
  filename: 'auditLog.fieldLabels.filename',
  entity_id: 'auditLog.fieldLabels.entity_id',
  entity_type: 'auditLog.fieldLabels.entity_type',
  contact_name: 'auditLog.fieldLabels.contact_name',
  company_name: 'auditLog.fieldLabels.company_name',
  contact_type: 'auditLog.fieldLabels.contact_type',
  role_description: 'auditLog.fieldLabels.role_description',
  equipment_type: 'auditLog.fieldLabels.equipment_type',
  model_number: 'auditLog.fieldLabels.model_number',
  serial_number: 'auditLog.fieldLabels.serial_number',
  manufacturer: 'auditLog.fieldLabels.manufacturer',
  status: 'auditLog.fieldLabels.status',
  name: 'auditLog.fieldLabels.name',
  description: 'auditLog.fieldLabels.description',
  title: 'auditLog.fieldLabels.title',
  question: 'auditLog.fieldLabels.question',
  category: 'auditLog.fieldLabels.category',
  priority: 'auditLog.fieldLabels.priority',
  severity: 'auditLog.fieldLabels.severity',
  location: 'auditLog.fieldLabels.location',
  floor_number: 'auditLog.fieldLabels.floor_number',
  area_code: 'auditLog.fieldLabels.area_code',
  due_date: 'auditLog.fieldLabels.due_date',
  scheduled_date: 'auditLog.fieldLabels.scheduled_date',
  meeting_type: 'auditLog.fieldLabels.meeting_type',
  file_type: 'auditLog.fieldLabels.file_type',
  file_size: 'auditLog.fieldLabels.file_size',
  storage_path: 'auditLog.fieldLabels.storage_path',
  defect_number: 'auditLog.fieldLabels.defect_number',
  submission_number: 'auditLog.fieldLabels.submission_number',
  created_at: 'auditLog.fieldLabels.created_at',
  updated_at: 'auditLog.fieldLabels.updated_at',
  project_id: 'auditLog.fieldLabels.project_id',
  area_id: 'auditLog.fieldLabels.area_id',
  to_email: 'auditLog.fieldLabels.to_email',
  to_name: 'auditLog.fieldLabels.to_name',
  assigned_to: 'auditLog.fieldLabels.assigned_to',
}

const isUUID = (val: unknown): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

const isISODate = (val: unknown): boolean =>
  typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)

const isNullish = (val: unknown): boolean =>
  val === null || val === undefined || val === 'null' || val === ''

export default function AuditLogPage() {
  const { showError, showSuccess } = useToast()
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isRtl = theme.direction === 'rtl'
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [page, setPage] = useState(1)

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

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE)
  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('auditLog.justNow')
    if (diffMins < 60) return t('auditLog.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('auditLog.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('auditLog.daysAgo', { count: diffDays })
    return date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })
  }

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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 2 }, mb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, alignItems: { xs: 'stretch', sm: 'center' }, flex: 1, minWidth: 0 }}>
              <SearchField
                placeholder={t('auditLog.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <MuiTextField
                  select
                  value={entityFilter}
                  onChange={(e) => { setEntityFilter(e.target.value); setPage(1) }}
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
                  onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
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
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {paginatedLogs.map((log, idx) => {
                  const config = actionConfig[log.action] || actionConfig.update
                  const changes = formatChanges(log.oldValues, log.newValues)
                  const actionLabel = t(`auditLog.actions.${log.action}`, { defaultValue: log.action.replace('_', ' ') })
                  const entityLabel = t(`auditLog.entities.${log.entityType}`, { defaultValue: log.entityType })

                  return (
                    <Box
                      key={log.id}
                      onClick={() => handleViewDetails(log)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 1.5, sm: 2 },
                        py: { xs: 1.5, sm: 2 },
                        px: { xs: 0.5, sm: 1 },
                        cursor: 'pointer',
                        borderBottom: idx < paginatedLogs.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        borderRadius: 1,
                        transition: 'background-color 150ms ease-out',
                        '&:hover': { bgcolor: 'action.hover' },
                        touchAction: 'manipulation',
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: 36, sm: 40 },
                          height: { xs: 36, sm: 40 },
                          borderRadius: '50%',
                          bgcolor: config.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: `${config.color}.main`,
                          flexShrink: 0,
                        }}
                      >
                        {config.icon}
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: { xs: 120, sm: 'none' } }}>
                            {log.user?.fullName || t('common.unknown')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'lowercase' }}>
                            {actionLabel}
                          </Typography>
                          <Chip
                            label={entityLabel}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.7rem', textTransform: 'capitalize' }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                          <Typography variant="caption" color="text.disabled">
                            {formatRelativeTime(log.createdAt)}
                          </Typography>
                          {changes.length > 0 && (
                            <Chip
                              label={t('auditLog.fieldsChanged', { count: changes.length })}
                              size="small"
                              sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'action.hover' }}
                            />
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ color: 'text.disabled', flexShrink: 0 }}>
                        {isRtl ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                      </Box>
                    </Box>
                  )
                })}
              </Box>

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    size={isMobile ? 'small' : 'medium'}
                    color="primary"
                  />
                </Box>
              )}
            </>
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
                <Typography variant="caption" color="text.secondary">
                  {new Date(selectedLog.createdAt).toLocaleString(dateLocale)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('auditLog.user').toUpperCase()}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Avatar name={selectedLog.user?.fullName || t('common.unknown')} size="small" />
                  <Typography variant="body2">{selectedLog.user?.fullName || t('common.unknown')}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('auditLog.entity').toUpperCase()}</Typography>
                <Chip
                  label={t(`auditLog.entities.${selectedLog.entityType}`, { defaultValue: selectedLog.entityType })}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            {(selectedLog.oldValues || selectedLog.newValues) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                  {t('auditLog.changes').toUpperCase()}
                </Typography>
                {formatChanges(selectedLog.oldValues, selectedLog.newValues)
                  .filter(change => !(isUUID(change.old) && isUUID(change.new)) && !(change.old === undefined && isUUID(change.new)) && !(isUUID(change.old) && change.new === undefined))
                  .filter(change => !(isNullish(change.old) && isNullish(change.new)))
                  .map(change => {
                    const isCreate = isNullish(change.old) && !isNullish(change.new)
                    const isDelete = !isNullish(change.old) && isNullish(change.new)
                    const formatVal = (val: unknown) => {
                      if (isNullish(val)) return ''
                      if (isUUID(val)) return String(val).slice(0, 8) + '...'
                      if (isISODate(val)) return new Date(String(val)).toLocaleString(dateLocale)
                      return String(val)
                    }
                    return (
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
                          {FIELD_LABEL_KEYS[change.field] ? t(FIELD_LABEL_KEYS[change.field]) : change.field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          {!isNullish(change.old) && (
                            <Chip
                              label={formatVal(change.old)}
                              size="small"
                              sx={{ bgcolor: 'error.light', color: 'error.dark', fontSize: '0.7rem', maxWidth: '100%' }}
                            />
                          )}
                          {!isCreate && !isDelete && (
                            <SwapHorizIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                          )}
                          {!isNullish(change.new) && (
                            <Chip
                              label={formatVal(change.new)}
                              size="small"
                              sx={{ bgcolor: 'success.light', color: 'success.dark', fontSize: '0.7rem', maxWidth: '100%' }}
                            />
                          )}
                        </Box>
                      </Box>
                    )
                  })}
              </>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  )
}
