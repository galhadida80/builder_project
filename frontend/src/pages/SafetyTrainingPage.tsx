import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import { safetyApi, SafetyTrainingCreateData, SafetyTrainingUpdateData, SafetyTrainingSummary } from '../api/safety'
import { contactsApi } from '../api/contacts'
import type { SafetyTraining, TrainingStatus } from '../types/safety'
import type { Contact } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateRequired, type ValidationError, hasErrors } from '../utils/validation'
import { AddIcon, WarningIcon } from '@/icons'
import {
  Box,
  Typography,
  Chip,
  MenuItem,
  Skeleton,
  TextField as MuiTextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Stack,
} from '@/mui'

const TRAINING_BORDER_COLORS: Record<TrainingStatus, string> = {
  valid: '#22C55E',
  expiring_soon: '#EAB308',
  expired: '#DC2626',
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 0) return t('safetyTraining.expired')
  if (diffDays === 0) return t('safetyTraining.expiresTime.today')
  if (diffDays === 1) return t('safetyTraining.expiresTime.tomorrow')
  if (diffDays <= 30) return t('safetyTraining.expiresTime.inDays', { count: diffDays })
  return date.toLocaleDateString(getDateLocale())
}

interface TrainingStatusBadgeProps {
  status: TrainingStatus
  expiryDate?: string
  size?: 'small' | 'medium'
}

function TrainingStatusBadge({ status, expiryDate, size = 'small' }: TrainingStatusBadgeProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const statusConfig: Record<TrainingStatus, { light: { bg: string; text: string }; dark: { bg: string; text: string }; icon?: React.ReactNode }> = {
    valid: {
      light: { bg: '#F0FDF4', text: '#16A34A' },
      dark: { bg: 'rgba(34,197,94,0.14)', text: '#86EFAC' },
    },
    expiring_soon: {
      light: { bg: '#FEFCE8', text: '#CA8A04' },
      dark: { bg: 'rgba(234,179,8,0.14)', text: '#FDE047' },
      icon: <WarningIcon />,
    },
    expired: {
      light: { bg: '#FEF2F2', text: '#DC2626' },
      dark: { bg: 'rgba(239,68,68,0.14)', text: '#FCA5A5' },
      icon: <WarningIcon />,
    },
  }

  const config = statusConfig[status]
  const colors = isDark ? config.dark : config.light
  const label = status === 'expiring_soon' && expiryDate
    ? formatRelativeTime(expiryDate, t)
    : t(`safetyTraining.status.${status}`, status)

  return (
    <Chip
      label={label}
      size={size}
      icon={config.icon as React.ReactElement | undefined}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
        borderRadius: 1.5,
        '& .MuiChip-icon': { fontSize: '1rem', color: colors.text },
      }}
    />
  )
}

interface TrainingCardProps {
  training: SafetyTraining
  onClick: () => void
}

function TrainingCard({ training, onClick }: TrainingCardProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        borderLeft: `4px solid ${TRAINING_BORDER_COLORS[training.status]}`,
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      <Stack spacing={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle1" fontWeight={600}>
            {training.trainingType}
          </Typography>
          <TrainingStatusBadge status={training.status} expiryDate={training.expiryDate} />
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            {t('safetyTraining.worker')}: {training.worker?.contactName || t('common.unknown')}
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('safetyTraining.trainingDate')}
            </Typography>
            <Typography variant="body2">
              {new Date(training.trainingDate).toLocaleDateString(getDateLocale())}
            </Typography>
          </Box>
          {training.expiryDate && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('safetyTraining.expiryDate')}
              </Typography>
              <Typography variant="body2">
                {new Date(training.expiryDate).toLocaleDateString(getDateLocale())}
              </Typography>
            </Box>
          )}
        </Box>

        {training.certificateNumber && (
          <Typography variant="caption" color="text.secondary">
            {t('safetyTraining.certificateNumber')}: {training.certificateNumber}
          </Typography>
        )}
      </Stack>
    </Card>
  )
}

interface TrainingFormData {
  workerId: string
  trainingType: string
  trainingDate: string
  expiryDate: string
  certificateNumber: string
  instructor: string
  notes: string
}

export default function SafetyTrainingPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [trainings, setTrainings] = useState<SafetyTraining[]>([])
  const [summary, setSummary] = useState<SafetyTrainingSummary | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState<SafetyTraining | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [form, setForm] = useState<TrainingFormData>({
    workerId: '',
    trainingType: '',
    trainingDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    certificateNumber: '',
    instructor: '',
    notes: '',
  })

  const validateTrainingForm = (data: TrainingFormData): ValidationError => {
    const errors: ValidationError = {}
    errors.workerId = validateRequired(data.workerId, t('safetyTraining.worker'))
    errors.trainingType = validateRequired(data.trainingType, t('safetyTraining.trainingType'))
    errors.trainingDate = validateRequired(data.trainingDate, t('safetyTraining.trainingDate'))
    return errors
  }

  const validateField = (field: string) => {
    const allErrors = validateTrainingForm(form)
    setFormErrors(prev => ({ ...prev, [field]: allErrors[field] || null }))
  }

  useEffect(() => {
    if (projectId) loadReferenceData()
  }, [projectId])

  useEffect(() => {
    if (projectId) loadTrainings()
  }, [projectId, activeTab, typeFilter, searchQuery])

  const loadReferenceData = async () => {
    if (!projectId) return
    try {
      const [trainingSummary, contactList] = await Promise.all([
        safetyApi.training.getSummary(projectId),
        contactsApi.list(projectId).catch(() => []),
      ])
      setSummary(trainingSummary)
      setContacts(contactList.filter(c => c.contactType === 'worker' || c.contactType === 'subcontractor'))
    } catch (error) {
      console.error('Failed to load reference data:', error)
    }
  }

  const loadTrainings = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { status?: TrainingStatus; trainingType?: string } = {}
      if (activeTab !== 'all') params.status = activeTab as TrainingStatus
      if (typeFilter) params.trainingType = typeFilter
      const result = await safetyApi.training.list(projectId, params)

      let filtered = result
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = result.filter(t =>
          t.trainingType.toLowerCase().includes(query) ||
          t.worker?.contactName?.toLowerCase().includes(query) ||
          t.certificateNumber?.toLowerCase().includes(query)
        )
      }

      setTrainings(filtered)
    } catch (error) {
      console.error('Failed to load trainings:', error)
      showError(t('safetyTraining.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!projectId) return

    const errors = validateTrainingForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const data: SafetyTrainingCreateData = {
        workerId: form.workerId,
        trainingType: form.trainingType,
        trainingDate: form.trainingDate,
        expiryDate: form.expiryDate || undefined,
        certificateNumber: form.certificateNumber || undefined,
        instructor: form.instructor || undefined,
        notes: form.notes || undefined,
      }

      await safetyApi.training.create(projectId, data)
      showSuccess(t('safetyTraining.createSuccess'))
      setDialogOpen(false)
      resetForm()
      loadTrainings()
      loadReferenceData()
    } catch (error) {
      console.error('Failed to create training:', error)
      showError(t('safetyTraining.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!projectId || !editingTraining) return

    const errors = validateTrainingForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const data: SafetyTrainingUpdateData = {
        workerId: form.workerId,
        trainingType: form.trainingType,
        trainingDate: form.trainingDate,
        expiryDate: form.expiryDate || undefined,
        certificateNumber: form.certificateNumber || undefined,
        instructor: form.instructor || undefined,
        notes: form.notes || undefined,
      }

      await safetyApi.training.update(projectId, editingTraining.id, data)
      showSuccess(t('safetyTraining.updateSuccess'))
      setDialogOpen(false)
      setEditingTraining(null)
      resetForm()
      loadTrainings()
      loadReferenceData()
    } catch (error) {
      console.error('Failed to update training:', error)
      showError(t('safetyTraining.updateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({
      workerId: '',
      trainingType: '',
      trainingDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      certificateNumber: '',
      instructor: '',
      notes: '',
    })
    setFormErrors({})
  }

  const handleEdit = (training: SafetyTraining) => {
    setEditingTraining(training)
    setForm({
      workerId: training.workerId,
      trainingType: training.trainingType,
      trainingDate: training.trainingDate.split('T')[0],
      expiryDate: training.expiryDate ? training.expiryDate.split('T')[0] : '',
      certificateNumber: training.certificateNumber || '',
      instructor: training.instructor || '',
      notes: training.notes || '',
    })
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTraining(null)
    resetForm()
  }

  const summaryItems = summary
    ? [
        { label: t('safetyTraining.summary.total'), value: summary.total, color: 'default' as const },
        { label: t('safetyTraining.summary.valid'), value: summary.validCount, color: 'success' as const },
        { label: t('safetyTraining.summary.expiringSoon'), value: summary.expiringSoonCount, color: 'warning' as const },
        { label: t('safetyTraining.summary.expired'), value: summary.expiredCount, color: 'error' as const },
      ]
    : []

  const filterItems = [
    { label: t('safetyTraining.tabs.all'), value: 'all' },
    { label: t('safetyTraining.tabs.valid'), value: 'valid' },
    { label: t('safetyTraining.tabs.expiringSoon'), value: 'expiring_soon' },
    { label: t('safetyTraining.tabs.expired'), value: 'expired' },
  ]

  const trainingTypes = summary?.byType ? Object.keys(summary.byType) : []

  const columns: Column<SafetyTraining>[] = [
    {
      id: 'worker',
      label: t('safetyTraining.worker'),
      render: (training) => training.worker?.contactName || t('common.unknown'),
    },
    {
      id: 'trainingType',
      label: t('safetyTraining.trainingType'),
      render: (training) => training.trainingType,
    },
    {
      id: 'trainingDate',
      label: t('safetyTraining.trainingDate'),
      render: (training) => new Date(training.trainingDate).toLocaleDateString(getDateLocale()),
    },
    {
      id: 'expiryDate',
      label: t('safetyTraining.expiryDate'),
      render: (training) =>
        training.expiryDate ? new Date(training.expiryDate).toLocaleDateString(getDateLocale()) : '—',
    },
    {
      id: 'status',
      label: t('safetyTraining.status.label'),
      render: (training) => <TrainingStatusBadge status={training.status} expiryDate={training.expiryDate} />,
    },
    {
      id: 'certificateNumber',
      label: t('safetyTraining.certificateNumber'),
      render: (training) => training.certificateNumber || '—',
    },
  ]

  return (
    <Box>
      <PageHeader
        title={t('safetyTraining.title')}
        actions={
          <Button onClick={() => setDialogOpen(true)} startIcon={<AddIcon />}>
            {t('safetyTraining.createNew')}
          </Button>
        }
      />

      {loading ? (
        <Card sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Card>
      ) : (
        <>
          <SummaryBar items={summaryItems} />

          <Card sx={{ p: isMobile ? 2 : 3 }}>
            <Box mb={3} display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} alignItems="stretch">
              <SearchField
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('safetyTraining.searchPlaceholder')}
                sx={{ flex: 1 }}
              />
              {trainingTypes.length > 0 && (
                <MuiTextField
                  select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label={t('safetyTraining.filterByType')}
                  sx={{ minWidth: isMobile ? '100%' : 200 }}
                >
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  {trainingTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </MuiTextField>
              )}
            </Box>

            <FilterChips items={filterItems} value={activeTab} onChange={setActiveTab} />

            {trainings.length === 0 ? (
              <Box py={8} textAlign="center">
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('safetyTraining.noTrainings')}
                </Typography>
              </Box>
            ) : isMobile ? (
              <Stack spacing={2}>
                {trainings.map((training) => (
                  <TrainingCard key={training.id} training={training} onClick={() => handleEdit(training)} />
                ))}
              </Stack>
            ) : (
              <DataTable
                columns={columns}
                rows={trainings}
                getRowId={(training) => training.id}
                onRowClick={handleEdit}
              />
            )}
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTraining ? t('safetyTraining.editTraining') : t('safetyTraining.createNew')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MuiTextField
              select
              label={t('safetyTraining.worker')}
              value={form.workerId}
              onChange={(e) => setForm({ ...form, workerId: e.target.value })}
              onBlur={() => validateField('workerId')}
              error={!!formErrors.workerId}
              helperText={formErrors.workerId}
              required
              fullWidth
            >
              {contacts.map((contact) => (
                <MenuItem key={contact.id} value={contact.id}>
                  {contact.contactName} {contact.companyName ? `(${contact.companyName})` : ''}
                </MenuItem>
              ))}
            </MuiTextField>

            <MuiTextField
              label={t('safetyTraining.trainingType')}
              value={form.trainingType}
              onChange={(e) => setForm({ ...form, trainingType: e.target.value })}
              onBlur={() => validateField('trainingType')}
              error={!!formErrors.trainingType}
              helperText={formErrors.trainingType}
              required
              fullWidth
            />

            <MuiTextField
              type="date"
              label={t('safetyTraining.trainingDate')}
              value={form.trainingDate}
              onChange={(e) => setForm({ ...form, trainingDate: e.target.value })}
              onBlur={() => validateField('trainingDate')}
              error={!!formErrors.trainingDate}
              helperText={formErrors.trainingDate}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />

            <MuiTextField
              type="date"
              label={t('safetyTraining.expiryDate')}
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <MuiTextField
              label={t('safetyTraining.certificateNumber')}
              value={form.certificateNumber}
              onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
              fullWidth
            />

            <MuiTextField
              label={t('safetyTraining.instructor')}
              value={form.instructor}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              fullWidth
            />

            <MuiTextField
              label={t('safetyTraining.notes')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={editingTraining ? handleUpdate : handleCreate}
            variant="primary"
            disabled={submitting}
          >
            {editingTraining ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
