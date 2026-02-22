import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { auditApi } from '../api/audit'
import { getDateLocale } from '../utils/dateLocale'
import { useToast } from '../components/common/ToastProvider'
import type { AuditLog } from '../types'
import { AddCircleIcon, EditIcon, DeleteIcon, CheckCircleIcon, CancelIcon, SwapHorizIcon, CloseIcon, FileDownloadIcon, SearchIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Drawer, Divider, IconButton, Pagination, useTheme, useMediaQuery, TextField, InputAdornment } from '@/mui'

const actionConfig: Record<string, { icon: React.ReactNode; color: 'success' | 'info' | 'error' | 'warning' | 'default'; borderColor: string }> = {
  create: { icon: <AddCircleIcon sx={{ fontSize: 18 }} />, color: 'success', borderColor: '#4caf50' },
  update: { icon: <EditIcon sx={{ fontSize: 18 }} />, color: 'info', borderColor: '#c8956a' },
  delete: { icon: <DeleteIcon sx={{ fontSize: 18 }} />, color: 'error', borderColor: '#f44336' },
  status_change: { icon: <SwapHorizIcon sx={{ fontSize: 18 }} />, color: 'warning', borderColor: '#ff9800' },
  approval: { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: 'success', borderColor: '#4caf50' },
  rejection: { icon: <CancelIcon sx={{ fontSize: 18 }} />, color: 'error', borderColor: '#f44336' },
}

const entityTypes = ['equipment', 'material', 'meeting', 'project', 'contact', 'area', 'inspection', 'rfi', 'defect', 'file', 'approval']
const actionTypes = ['create', 'update', 'delete', 'status_change', 'approval', 'rejection']
const PAGE_SIZE = 20

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
  rfi_number: 'auditLog.fieldLabels.rfi_number',
  subject: 'auditLog.fieldLabels.subject',
  notes: 'auditLog.fieldLabels.notes',
  phone: 'auditLog.fieldLabels.phone',
  email: 'auditLog.fieldLabels.email',
  quantity: 'auditLog.fieldLabels.quantity',
  unit: 'auditLog.fieldLabels.unit',
  material_type: 'auditLog.fieldLabels.material_type',
  defect_type: 'auditLog.fieldLabels.defect_type',
  resolved_at: 'auditLog.fieldLabels.resolved_at',
  sent_at: 'auditLog.fieldLabels.sent_at',
  responded_at: 'auditLog.fieldLabels.responded_at',
  total_units: 'auditLog.fieldLabels.total_units',
  area_type: 'auditLog.fieldLabels.area_type',
  code: 'auditLog.fieldLabels.code',
  full_name: 'auditLog.fieldLabels.full_name',
  daily_summary_enabled: 'auditLog.fieldLabels.daily_summary_enabled',
  start_date: 'auditLog.fieldLabels.start_date',
  end_date: 'auditLog.fieldLabels.end_date',
  budget: 'auditLog.fieldLabels.budget',
  address: 'auditLog.fieldLabels.address',
  city: 'auditLog.fieldLabels.city',
  country: 'auditLog.fieldLabels.country',
  language: 'auditLog.fieldLabels.language',
  role: 'auditLog.fieldLabels.role',
  is_active: 'auditLog.fieldLabels.is_active',
  answer: 'auditLog.fieldLabels.answer',
  response: 'auditLog.fieldLabels.response',
}

const HIDDEN_FIELDS = new Set(['id', 'project_id', 'entity_id', 'created_by_id', 'updated_by_id', 'consultant_type_id', 'related_equipment_id', 'related_material_id', 'area_id', 'user_id'])
const STATUS_FIELDS = new Set(['status'])

const isUUID = (val: unknown): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

const isISODate = (val: unknown): boolean =>
  typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)

const isNullish = (val: unknown): boolean =>
  val === null || val === undefined || val === 'null' || val === ''

export default function AuditLogPage() {
  const { showError, showSuccess } = useToast()
  const { t } = useTranslation()
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

  const dateLocale = getDateLocale()

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await auditApi.listAll({ limit: 1000 })
      setLogs(data)
    } catch {
      showError(t('auditLog.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      log.user?.fullName?.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      t(`auditLog.entities.${log.entityType}`).toLowerCase().includes(q) ||
      t(`auditLog.actions.${log.action}`).toLowerCase().includes(q)
    const matchesEntity = !entityFilter || log.entityType === entityFilter
    const matchesAction = !actionFilter || log.action === actionFilter
    return matchesSearch && matchesEntity && matchesAction
  })

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE)
  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  const getVisibleChanges = (log: AuditLog) =>
    formatChanges(log.oldValues, log.newValues)
      .filter(c => !HIDDEN_FIELDS.has(c.field))
      .filter(c => !(isUUID(c.old) || isUUID(c.new)))
      .filter(c => !(isNullish(c.old) && isNullish(c.new)))

  const formatVal = (field: string, val: unknown) => {
    if (isNullish(val)) return ''
    if (isISODate(val)) return new Date(String(val)).toLocaleString(dateLocale)
    if (STATUS_FIELDS.has(field)) return t(`statuses.${String(val)}`, { defaultValue: String(val).replace(/_/g, ' ') })
    return String(val)
  }

  const translateField = (field: string) =>
    FIELD_LABEL_KEYS[field] ? t(FIELD_LABEL_KEYS[field]) : field.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())

  const dayGroups = useMemo(() => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const groups: { label: string; count: number; logs: AuditLog[] }[] = []
    const map = new Map<string, AuditLog[]>()

    for (const log of paginatedLogs) {
      const dateKey = new Date(log.createdAt).toDateString()
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(log)
    }

    for (const [dateKey, dayLogs] of map) {
      let label: string
      if (dateKey === today.toDateString()) label = t('auditLog.today')
      else if (dateKey === yesterday.toDateString()) label = t('auditLog.yesterday')
      else {
        const d = new Date(dateKey)
        label = d.toLocaleDateString(dateLocale, { weekday: 'long', month: 'short', day: 'numeric' })
      }
      groups.push({ label, count: dayLogs.length, logs: dayLogs })
    }
    return groups
  }, [paginatedLogs, t, dateLocale])

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setDetailsOpen(true)
  }

  const handleExportCSV = useCallback(() => {
    if (filteredLogs.length === 0) return
    const headers = [
      t('auditLog.timestamp'), t('auditLog.user'), t('auditLog.action'),
      t('auditLog.entity'), t('auditLog.entityId'), t('auditLog.changes'),
    ]
    const rows = filteredLogs.map(log => {
      const changes = getVisibleChanges(log)
      const changesText = changes.map(c => `${translateField(c.field)}: ${formatVal(c.field, c.old)} → ${formatVal(c.field, c.new)}`).join('; ')
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
      if (val.includes(',') || val.includes('"') || val.includes('\n')) return `"${val.replace(/"/g, '""')}"`
      return val
    }
    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map(row => row.map(escapeCsv).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showSuccess(t('auditLog.exportSuccess'))
  }, [filteredLogs, dateLocale, t, showSuccess])

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
      <Box sx={{ maxWidth: { xs: '100%', md: 900 }, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rounded" height={36} sx={{ borderRadius: 2, mb: 3 }} />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 3, mb: 1.5 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 900 }, mx: 'auto', pb: 10 }}>
      {/* Sticky header */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: { xs: 2, sm: 3 }, pt: 2, pb: 1.5,
        borderBottom: 1, borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" fontWeight={700} letterSpacing='-0.02em'>
            {t('auditLog.pageTitle')}
          </Typography>
          <IconButton
            size="small"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            aria-label={t('auditLog.export')}
            sx={{ color: 'text.secondary' }}
          >
            <FileDownloadIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Search bar */}
        <TextField
          fullWidth
          size="small"
          placeholder={t('auditLog.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 1.5,
            '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' },
          }}
        />

        {/* Entity filter chips - scrollable */}
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
          <Chip
            label={t('auditLog.allEntities')}
            size="small"
            variant={!entityFilter ? 'filled' : 'outlined'}
            color={!entityFilter ? 'primary' : 'default'}
            onClick={() => { setEntityFilter(''); setPage(1) }}
            sx={{ fontWeight: 500, flexShrink: 0 }}
          />
          {entityTypes.map(et => (
            <Chip
              key={et}
              label={t(`auditLog.entities.${et}`)}
              size="small"
              variant={entityFilter === et ? 'filled' : 'outlined'}
              color={entityFilter === et ? 'primary' : 'default'}
              onClick={() => { setEntityFilter(entityFilter === et ? '' : et); setPage(1) }}
              sx={{ fontWeight: 500, flexShrink: 0 }}
            />
          ))}
        </Box>

        {/* Action filter chips - scrollable */}
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pt: 0.75, pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
          <Chip
            label={t('auditLog.allActions')}
            size="small"
            variant={!actionFilter ? 'filled' : 'outlined'}
            color={!actionFilter ? 'secondary' : 'default'}
            onClick={() => { setActionFilter(''); setPage(1) }}
            sx={{ fontWeight: 500, flexShrink: 0 }}
          />
          {actionTypes.map(at => {
            const cfg = actionConfig[at]
            return (
              <Chip
                key={at}
                label={t(`auditLog.actions.${at}`)}
                size="small"
                variant={actionFilter === at ? 'filled' : 'outlined'}
                color={actionFilter === at ? cfg?.color || 'default' : 'default'}
                onClick={() => { setActionFilter(actionFilter === at ? '' : at); setPage(1) }}
                sx={{ fontWeight: 500, flexShrink: 0 }}
              />
            )
          })}
        </Box>
      </Box>

      {/* Entries count */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {t('auditLog.entriesLabel', { count: filteredLogs.length })}
        </Typography>
      </Box>

      {filteredLogs.length === 0 ? (
        <Box sx={{ px: 2, pt: 2 }}>
          <EmptyState
            variant="no-results"
            title={t('auditLog.noLogsFound')}
            description={t('auditLog.tryAdjustingSearch')}
          />
        </Box>
      ) : (
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 1 }}>
          {dayGroups.map((group) => (
            <Box key={group.label} sx={{ mb: 2 }}>
              {/* Day header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {group.label}
                </Typography>
                <Chip
                  label={group.count}
                  size="small"
                  sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'action.selected' }}
                />
                <Divider sx={{ flex: 1 }} />
              </Box>

              {/* Day entries */}
              {group.logs.map((log) => {
                const config = actionConfig[log.action] || actionConfig.update
                const actionLabel = t(`auditLog.actions.${log.action}`, { defaultValue: log.action.replace('_', ' ') })
                const entityLabel = t(`auditLog.entities.${log.entityType}`, { defaultValue: log.entityType })
                const timeStr = new Date(log.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
                const changes = getVisibleChanges(log)
                const firstChange = changes[0]

                return (
                  <Box
                    key={log.id}
                    onClick={() => handleViewDetails(log)}
                    sx={{
                      display: 'flex', gap: 1.5, mb: 1, cursor: 'pointer',
                      bgcolor: 'background.paper', borderRadius: 3,
                      border: 1, borderColor: 'divider',
                      borderInlineStart: 4,
                      borderInlineStartColor: config.borderColor,
                      p: 1.5,
                      transition: 'background-color 150ms, box-shadow 150ms',
                      '&:hover': { bgcolor: 'action.hover', boxShadow: 1 },
                      minHeight: 48,
                    }}
                  >
                    {/* User avatar */}
                    <Avatar name={log.user?.fullName || '?'} size="small" />

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body1" fontWeight={600} noWrap sx={{ flex: 1 }}>
                          {log.user?.fullName || t('common.unknown')}
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ flexShrink: 0, [isRtl ? 'mr' : 'ml']: 1 }}>
                          {timeStr}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: firstChange ? 0.75 : 0 }}>
                        <Box sx={{ color: `${config.color}.main`, display: 'flex', alignItems: 'center' }}>
                          {config.icon}
                        </Box>
                        <Typography variant="caption" fontWeight={500} color="text.secondary">
                          {actionLabel}
                        </Typography>
                        <Chip
                          label={entityLabel}
                          size="small"
                          sx={{
                            height: 22, fontSize: '0.75rem', fontWeight: 600,
                            bgcolor: 'action.hover', textTransform: 'capitalize',
                          }}
                        />
                        {changes.length > 1 && (
                          <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                            {t('auditLog.nChanges', { count: changes.length })}
                          </Typography>
                        )}
                      </Box>

                      {/* Inline change preview */}
                      {firstChange && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {translateField(firstChange.field)}:
                          </Typography>
                          {!isNullish(firstChange.old) && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'error.main', textDecoration: 'line-through' }} noWrap>
                              {formatVal(firstChange.field, firstChange.old)}
                            </Typography>
                          )}
                          {!isNullish(firstChange.old) && !isNullish(firstChange.new) && (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>→</Typography>
                          )}
                          {!isNullish(firstChange.new) && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'success.main', fontWeight: 600 }} noWrap>
                              {formatVal(firstChange.field, firstChange.new)}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, px: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            size={isMobile ? 'small' : 'medium'}
            color="primary"
          />
        </Box>
      )}

      {/* Details drawer */}
      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, borderRadius: { xs: 0, sm: '16px 0 0 16px' } } }}
      >
        {selectedLog && (() => {
          const config = actionConfig[selectedLog.action] || actionConfig.update
          const changes = getVisibleChanges(selectedLog)
          return (
            <Box sx={{ p: { xs: 2, sm: 2, md: 3 }, overflowY: 'auto', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>{t('auditLog.auditDetails')}</Typography>
                <IconButton aria-label={t('common.close')} onClick={() => setDetailsOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Action header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: 2,
                  bgcolor: `${config.color}.light`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: `${config.color}.main`,
                }}>
                  {config.icon}
                </Box>
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

              {/* User & entity */}
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

              {/* Changes */}
              {changes.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                    {t('auditLog.changes').toUpperCase()}
                  </Typography>
                  {changes.map(change => {
                    const isCreate = isNullish(change.old) && !isNullish(change.new)
                    const isDelete = !isNullish(change.old) && isNullish(change.new)
                    return (
                      <Box
                        key={change.field}
                        sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {translateField(change.field)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          {!isNullish(change.old) && (
                            <Chip
                              label={formatVal(change.field, change.old)}
                              size="small"
                              sx={{ bgcolor: 'error.light', color: 'error.dark', fontSize: '0.7rem', maxWidth: '100%' }}
                            />
                          )}
                          {!isCreate && !isDelete && (
                            <SwapHorizIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                          )}
                          {!isNullish(change.new) && (
                            <Chip
                              label={formatVal(change.field, change.new)}
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
          )
        })()}
      </Drawer>
    </Box>
  )
}
