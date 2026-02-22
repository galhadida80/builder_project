import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { SeverityBadge } from '../components/ui/StatusBadge'
import { FormModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import { InspectionHistoryTimeline } from '../components/InspectionHistoryTimeline'
import InspectionReportPreview from '../components/InspectionReportPreview'
import { inspectionsApi } from '../api/inspections'
import type {
  Inspection, InspectionConsultantType, InspectionStageTemplate, InspectionSummary
} from '../types'
import { parseValidationErrors } from '../utils/apiErrors'
import { validateInspectionForm, hasErrors, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import HelpTooltip from '../components/help/HelpTooltip'
import { AddIcon, CheckCircleIcon, WarningIcon, ErrorIcon, ScheduleIcon, AssignmentIcon, DescriptionIcon, PersonIcon, AccessTimeIcon, CalendarTodayIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Alert, MenuItem, TextField as MuiTextField, IconButton, Tooltip, useMediaQuery, useTheme, Divider } from '@/mui'

export default function InspectionsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const { consultantTypes } = useReferenceData()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [summary, setSummary] = useState<InspectionSummary | null>(null)
  const [selectedType, setSelectedType] = useState<InspectionConsultantType | null>(null)
  const [stageTemplates, setStageTemplates] = useState<InspectionStageTemplate[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newInspection, setNewInspection] = useState({ consultantTypeId: '', scheduledDate: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [errors, setErrors] = useState<ValidationError>({})
  const [previewInspection, setPreviewInspection] = useState<Inspection | null>(null)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [projectInspections, inspSummary] = await Promise.all([
        inspectionsApi.getProjectInspections(projectId),
        inspectionsApi.getInspectionSummary(projectId)
      ])
      setInspections(projectInspections)
      setSummary(inspSummary)
    } catch {
      showError(t('inspections.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadStageTemplates = async (consultantTypeId: string) => {
    const templates = await inspectionsApi.getStageTemplates(consultantTypeId)
    setStageTemplates(templates)
  }

  const handleTypeSelect = async (type: InspectionConsultantType) => {
    setSelectedType(type)
    await loadStageTemplates(type.id)
  }

  const handleCreateInspection = async () => {
    if (!projectId) return

    const validationErrors = validateInspectionForm({
      consultant_type_id: newInspection.consultantTypeId,
      scheduled_date: newInspection.scheduledDate,
      notes: newInspection.notes
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    try {
      await inspectionsApi.createInspection(projectId, newInspection)
      showSuccess(t('inspections.createSuccess'))
      setDialogOpen(false)
      setNewInspection({ consultantTypeId: '', scheduledDate: '', notes: '' })
      setErrors({})
      loadData()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...serverErrors }))
        showError(t('validation.checkFields'))
        return
      }
      showError(t('inspections.failedToCreate'))
    }
  }

  const filteredInspections = inspections.filter(inspection => {
    if (activeTab !== 'all' && inspection.status !== activeTab) return false
    if (searchQuery && !inspection.consultantType?.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const statusBorderColor: Record<string, string> = {
    pending: theme.palette.info.main,
    in_progress: theme.palette.warning.main,
    completed: theme.palette.success.main,
    failed: theme.palette.error.main,
  }

  const groupedInspections = useMemo(() => {
    const now = new Date()
    const todayStr = now.toDateString()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toDateString()

    const groups: { key: string; label: string; inspections: Inspection[] }[] = []
    const groupMap = new Map<string, Inspection[]>()
    const orderKeys: string[] = []

    for (const insp of filteredInspections) {
      const date = new Date(insp.scheduledDate)
      const dateStr = date.toDateString()
      let groupKey: string

      if (insp.status === 'completed') {
        groupKey = 'recently_completed'
      } else if (dateStr === todayStr) {
        groupKey = 'today'
      } else if (dateStr === tomorrowStr) {
        groupKey = 'tomorrow'
      } else {
        groupKey = dateStr
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, [])
        orderKeys.push(groupKey)
      }
      groupMap.get(groupKey)!.push(insp)
    }

    const priority: Record<string, number> = { today: 0, tomorrow: 1 }
    orderKeys.sort((a, b) => {
      const pa = priority[a] ?? (a === 'recently_completed' ? 999 : 2)
      const pb = priority[b] ?? (b === 'recently_completed' ? 999 : 2)
      if (pa !== pb) return pa - pb
      if (pa === 2) return new Date(a).getTime() - new Date(b).getTime()
      return 0
    })

    for (const key of orderKeys) {
      let label: string
      if (key === 'today') {
        const formatted = now.toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric' })
        label = `${t('inspections.today')} - ${formatted}`
      } else if (key === 'tomorrow') {
        const formatted = tomorrow.toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric' })
        label = `${t('inspections.tomorrow')} - ${formatted}`
      } else if (key === 'recently_completed') {
        label = t('inspections.recentlyCompleted')
      } else {
        label = new Date(key).toLocaleDateString(getDateLocale(), { weekday: 'long', month: 'short', day: 'numeric' })
      }
      groups.push({ key, label, inspections: groupMap.get(key)! })
    }

    return groups
  }, [filteredInspections, t])

  const inspectionColumns: Column<Inspection>[] = [
    {
      id: 'consultantType',
      label: t('inspections.consultantType'),
      minWidth: 200,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 4,
              height: 36,
              borderRadius: 2,
              bgcolor: statusBorderColor[row.status] || statusBorderColor.pending,
              flexShrink: 0,
            }}
          />
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.consultantType?.name || t('inspections.unknown')}
            </Typography>
            <Typography variant="caption" color="text.secondary" dir="rtl">
              {row.consultantType?.nameHe}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'scheduledDate',
      label: t('inspections.scheduledDate'),
      minWidth: 140,
      sortable: true,
      render: (row) => (
        <Box>
          <Typography variant="body2">
            {new Date(row.scheduledDate).toLocaleDateString(getDateLocale())}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(row.scheduledDate).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 130,
      render: (row) => {
        const statusConfig: Record<string, { icon: React.ReactNode; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
          pending: { icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: 'info' },
          in_progress: { icon: <WarningIcon sx={{ fontSize: 16 }} />, color: 'warning' },
          completed: { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: 'success' },
          failed: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: 'error' },
        }
        const config = statusConfig[row.status] || statusConfig.pending
        return (
          <Chip
            size="small"
            icon={config.icon as React.ReactElement}
            label={t(`common.statuses.${row.status}`, { defaultValue: row.status.replace('_', ' ') })}
            color={config.color}
            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
          />
        )
      },
    },
    {
      id: 'currentStage',
      label: t('inspections.currentStage'),
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color={row.currentStage ? 'text.primary' : 'text.secondary'}>
          {row.currentStage || t('inspections.notStarted')}
        </Typography>
      ),
    },
    {
      id: 'findings',
      label: t('inspections.findings'),
      minWidth: 180,
      render: (row) => {
        if (!row.findings || row.findings.length === 0) {
          return <Typography variant="body2" color="text.secondary">{t('inspections.noFindings')}</Typography>
        }
        const critical = row.findings.filter(f => f.severity === 'critical').length
        const high = row.findings.filter(f => f.severity === 'high').length
        const medium = row.findings.filter(f => f.severity === 'medium').length
        const low = row.findings.filter(f => f.severity === 'low').length

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {critical > 0 && <SeverityBadge severity="critical" />}
            {high > 0 && <SeverityBadge severity="high" />}
            {medium > 0 && <SeverityBadge severity="medium" />}
            {low > 0 && <SeverityBadge severity="low" />}
          </Box>
        )
      },
    },
    {
      id: 'actions',
      label: '',
      minWidth: 80,
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <Tooltip title={t('inspections.previewReport')}>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setPreviewInspection(row); }}
            aria-label={t('inspections.previewReport')}
          >
            <DescriptionIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  const stageColumns: Column<InspectionStageTemplate>[] = [
    {
      id: 'stageOrder',
      label: '#',
      minWidth: 60,
      render: (row) => (
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {row.stageOrder}
        </Box>
      ),
    },
    {
      id: 'name',
      label: t('inspections.stageName'),
      minWidth: 200,
      render: (row) => (
        <Typography variant="body2" fontWeight={500}>
          {row.name}
        </Typography>
      ),
    },
    {
      id: 'nameHe',
      label: t('inspections.hebrewName'),
      minWidth: 200,
      render: (row) => (
        <Typography variant="body2" dir="rtl" color="text.secondary">
          {row.nameHe}
        </Typography>
      ),
    },
    {
      id: 'isActive',
      label: t('common.status'),
      minWidth: 100,
      render: (row) => (
        <Chip
          size="small"
          label={row.isActive ? t('inspections.active') : t('inspections.inactive')}
          color={row.isActive ? 'success' : 'default'}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={250} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, mb: 4, overflow: 'hidden' }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <PageHeader
          title={t('inspections.title')}
          subtitle={t('inspections.subtitle')}
          breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.inspections') }]}
          actions={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                {isMobile ? undefined : t('inspections.scheduleInspection')}
              </Button>
              <HelpTooltip helpKey="help.tooltips.inspectionForm" />
            </Box>
          }
        />
      </Box>

      {summary && (
        <Box sx={{ mb: 2, '& > div': { '& > div > div': { py: { xs: 1, sm: 1.5 }, px: { xs: 1, sm: 2 } } } }}>
          <SummaryBar items={[
            { label: t('inspections.totalInspections'), value: summary.totalInspections },
            { label: t('inspections.pending'), value: summary.pendingCount },
            { label: t('inspections.completed'), value: summary.completedCount, color: theme.palette.success.main },
            { label: t('inspections.overdue'), value: summary.overdueCount, color: theme.palette.error.main },
          ]} />
        </Box>
      )}

      <Box sx={{ display: { xs: 'flex', lg: 'none' }, overflowX: 'auto', gap: 1, pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
        {consultantTypes.map((type) => (
          <Chip
            key={type.id}
            label={type.name}
            onClick={() => handleTypeSelect(type)}
            color={selectedType?.id === type.id ? 'primary' : 'default'}
            variant={selectedType?.id === type.id ? 'filled' : 'outlined'}
            sx={{ flexShrink: 0, fontWeight: 500 }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 2, mb: 3 }}>
        <Card sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('inspections.consultantTypes')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {consultantTypes.map((type) => (
                <Box
                  key={type.id}
                  onClick={() => handleTypeSelect(type)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: selectedType?.id === type.id ? 'primary.main' : 'transparent',
                    color: selectedType?.id === type.id ? 'white' : 'text.primary',
                    transition: 'all 150ms ease-out',
                    '&:hover': {
                      bgcolor: selectedType?.id === type.id ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>{type.name}</Typography>
                  <Typography
                    variant="caption"
                    dir="rtl"
                    sx={{ color: selectedType?.id === type.id ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}
                  >
                    {type.nameHe}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2 }}>
            {selectedType ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedType.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('inspections.inspectionStages', { count: stageTemplates.length })}
                    </Typography>
                  </Box>
                  <Chip label={`${stageTemplates.filter(s => s.isActive).length} ${t('inspections.active').toLowerCase()}`} size="small" color="success" sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
                </Box>

                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  {t('inspections.stageDescription', { name: selectedType.name, count: stageTemplates.length })}
                </Alert>

                <DataTable
                  columns={stageColumns}
                  rows={stageTemplates}
                  getRowId={(row) => row.id}
                  pagination={false}
                  emptyVariant='empty'
                  renderMobileCard={(row) => (
                    <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                        {row.stageOrder}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>{row.name}</Typography>
                        <Typography variant="caption" color="text.secondary" dir="rtl">{row.nameHe}</Typography>
                      </Box>
                      <Chip size="small" label={row.isActive ? t('inspections.active') : t('inspections.inactive')} color={row.isActive ? 'success' : 'default'} sx={{ fontWeight: 500, fontSize: '0.7rem', height: 22 }} />
                    </Box>
                  )}
                />
              </>
            ) : (
              <EmptyState
                title={t('inspections.selectConsultantType')}
                description={t('inspections.selectConsultantTypeDescription')}
              />
            )}
          </Box>
        </Card>
      </Box>

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('inspections.projectInspections')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SearchField
                placeholder={t('inspections.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <FilterChips
              items={[
                { label: t('common.all'), value: 'all', count: inspections.length },
                { label: t('inspections.pending'), value: 'pending', count: inspections.filter(i => i.status === 'pending').length },
                { label: t('inspections.inProgress'), value: 'in_progress', count: inspections.filter(i => i.status === 'in_progress').length },
                { label: t('inspections.completed'), value: 'completed', count: inspections.filter(i => i.status === 'completed').length },
                { label: t('inspections.timeline'), value: 'timeline' },
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            {activeTab === 'timeline' ? (
              <InspectionHistoryTimeline inspections={inspections} loading={loading} />
            ) : filteredInspections.length === 0 ? (
              <EmptyState variant="empty" />
            ) : isMobile ? (
              <Box>
                {groupedInspections.map((group) => (
                  <Box key={group.key} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, py: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                      {group.label}
                    </Typography>
                    <Divider sx={{ mb: 0.5 }} />
                    {group.inspections.map((row) => {
                      const chipColor: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
                        pending: 'info', in_progress: 'warning', completed: 'success', failed: 'error',
                      }
                      const borderColor = statusBorderColor[row.status] || statusBorderColor.pending
                      return (
                        <Box
                          key={row.id}
                          onClick={() => setPreviewInspection(row)}
                          sx={{
                            p: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            borderLeft: `4px solid ${borderColor}`,
                            '&:active': { bgcolor: 'action.pressed' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {row.consultantType?.name || t('inspections.unknown')}
                              </Typography>
                              {row.consultantType?.nameHe && (
                                <Typography variant="caption" color="text.secondary" dir="rtl" noWrap>
                                  {row.consultantType.nameHe}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              size="small"
                              label={t(`common.statuses.${row.status}`, { defaultValue: row.status.replace('_', ' ') })}
                              color={chipColor[row.status] || 'info'}
                              sx={{ fontWeight: 500, fontSize: '0.7rem', height: 24 }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, ml: 7, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {row.consultantType?.name || t('inspections.inspector')}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(row.scheduledDate).toLocaleDateString(getDateLocale())}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(row.scheduledDate).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Box>
                          </Box>
                          {((row.currentStage) || (row.findings && row.findings.length > 0)) && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 7, mt: 1 }}>
                              {row.currentStage && <Chip label={row.currentStage} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />}
                              {row.findings && row.findings.length > 0 && (
                                <>
                                  {row.findings.filter(f => f.severity === 'critical').length > 0 && <SeverityBadge severity="critical" />}
                                  {row.findings.filter(f => f.severity === 'high').length > 0 && <SeverityBadge severity="high" />}
                                  {row.findings.filter(f => f.severity === 'medium').length > 0 && <SeverityBadge severity="medium" />}
                                </>
                              )}
                            </Box>
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box>
                {groupedInspections.map((group) => (
                  <Box key={group.key} sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                      {group.label}
                    </Typography>
                    <DataTable
                      columns={inspectionColumns}
                      rows={group.inspections}
                      getRowId={(row) => row.id}
                      pagination={false}
                      emptyVariant='empty'
                      onRowClick={(row) => setPreviewInspection(row)}
                      renderMobileCard={(row) => {
                        const chipColor: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
                          pending: 'info', in_progress: 'warning', completed: 'success', failed: 'error',
                        }
                        const borderColor = statusBorderColor[row.status] || statusBorderColor.pending
                        return (
                          <Box
                            onClick={() => setPreviewInspection(row)}
                            sx={{
                              p: 2,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              cursor: 'pointer',
                              borderLeft: `4px solid ${borderColor}`,
                              '&:active': { bgcolor: 'action.pressed' },
                            }}
                          >
                            <Typography variant="body2" fontWeight={600}>
                              {row.consultantType?.name || t('inspections.unknown')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(row.scheduledDate).toLocaleDateString(getDateLocale())}
                            </Typography>
                            <Chip
                              size="small"
                              label={t(`common.statuses.${row.status}`, { defaultValue: row.status.replace('_', ' ') })}
                              color={chipColor[row.status] || 'info'}
                              sx={{ ml: 1, fontWeight: 500, fontSize: '0.7rem', height: 24 }}
                            />
                          </Box>
                        )
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Card>

      <FormModal
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setErrors({})
          setNewInspection({ consultantTypeId: '', scheduledDate: '', notes: '' })
        }}
        onSubmit={handleCreateInspection}
        title={t('inspections.scheduleNew')}
        submitLabel={t('inspections.schedule')}
        submitDisabled={!newInspection.consultantTypeId || !newInspection.scheduledDate}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <MuiTextField
            select
            fullWidth
            label={t('inspections.consultantType')}
            value={newInspection.consultantTypeId}
            onChange={(e) => setNewInspection({ ...newInspection, consultantTypeId: e.target.value })}
            error={!!errors.consultant_type_id}
            helperText={errors.consultant_type_id}
          >
            {consultantTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name} ({type.nameHe})
              </MenuItem>
            ))}
          </MuiTextField>

          <TextField
            fullWidth
            label={t('inspections.scheduledDate')}
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={newInspection.scheduledDate}
            onChange={(e) => setNewInspection({ ...newInspection, scheduledDate: e.target.value })}
            error={!!errors.scheduled_date}
            helperText={errors.scheduled_date}
          />

          <TextField
            fullWidth
            label={t('common.notes')}
            multiline
            rows={3}
            value={newInspection.notes}
            onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
            placeholder={t('inspections.notesPlaceholder')}
            error={!!errors.notes}
            helperText={errors.notes}
          />
        </Box>
      </FormModal>

      <InspectionReportPreview
        open={!!previewInspection}
        onClose={() => setPreviewInspection(null)}
        inspection={previewInspection}
      />
    </Box>
  )
}
