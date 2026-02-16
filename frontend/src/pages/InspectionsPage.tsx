import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { SeverityBadge } from '../components/ui/StatusBadge'
import { Tabs } from '../components/ui/Tabs'
import { FormModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import { InspectionHistoryTimeline } from '../components/InspectionHistoryTimeline'
import { inspectionsApi } from '../api/inspections'
import type {
  Inspection, InspectionConsultantType, InspectionStageTemplate, InspectionSummary
} from '../types'
import { parseValidationErrors } from '../utils/apiErrors'
import { validateInspectionForm, hasErrors, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import { AddIcon, CheckCircleIcon, WarningIcon, ErrorIcon, ScheduleIcon, AssignmentIcon, VisibilityIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Alert, MenuItem, TextField as MuiTextField } from '@/mui'

export default function InspectionsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const { consultantTypes } = useReferenceData()
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
    } catch (error) {
      console.error('Failed to load inspections:', error)
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

  const inspectionColumns: Column<Inspection>[] = [
    {
      id: 'consultantType',
      label: t('inspections.consultantType'),
      minWidth: 200,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
            {new Date(row.scheduledDate).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(row.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      minWidth: 100,
      align: 'right',
      render: () => (
        <Button variant="tertiary" size="small" icon={<VisibilityIcon />}>
          {t('buttons.view')}
        </Button>
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
      <PageHeader
        title={t('inspections.title')}
        subtitle={t('inspections.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.inspections') }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            {t('inspections.scheduleInspection')}
          </Button>
        }
      />

      {summary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            gap: 1.5,
            mb: 3,
            overflow: 'hidden',
          }}
        >
          <KPICard title={t('inspections.totalInspections')} value={summary.totalInspections} icon={<AssignmentIcon />} color="primary" />
          <KPICard title={t('inspections.pending')} value={summary.pendingCount} icon={<ScheduleIcon />} color="info" />
          <KPICard title={t('inspections.inProgress')} value={summary.inProgressCount} icon={<WarningIcon />} color="warning" />
          <KPICard title={t('inspections.completed')} value={summary.completedCount} icon={<CheckCircleIcon />} color="success" />
          <KPICard title={t('inspections.overdue')} value={summary.overdueCount} icon={<ErrorIcon />} color="error" />
          <KPICard title={t('inspections.criticalFindings')} value={summary.findingsBySeverity?.critical || 0} icon={<ErrorIcon />} color="error" />
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 2, mb: 3 }}>
        <Card>
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
                  emptyMessage={t('inspections.noStages')}
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

          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: inspections.length },
              { label: t('inspections.pending'), value: 'pending', badge: inspections.filter(i => i.status === 'pending').length },
              { label: t('inspections.inProgress'), value: 'in_progress', badge: inspections.filter(i => i.status === 'in_progress').length },
              { label: t('inspections.completed'), value: 'completed', badge: inspections.filter(i => i.status === 'completed').length },
              { label: t('inspections.timeline'), value: 'timeline' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            {activeTab === 'timeline' ? (
              <InspectionHistoryTimeline inspections={inspections} loading={loading} />
            ) : (
              <DataTable
                columns={inspectionColumns}
                rows={filteredInspections}
                getRowId={(row) => row.id}
                emptyMessage={t('inspections.noInspections')}
                onRowClick={(row) => console.log('View inspection:', row.id)}
              />
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
            type="date"
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
    </Box>
  )
}
