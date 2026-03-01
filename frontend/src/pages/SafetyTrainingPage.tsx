import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import { TrainingStatusBadge } from '../components/safety/TrainingStatusBadge'
import { TrainingCard } from '../components/safety/TrainingCard'
import { SafetyTrainingFormDialog } from '../components/safety/SafetyTrainingFormDialog'
import { useSafetyTraining } from '../hooks/useSafetyTraining'
import { useSafetyTrainingForm } from '../hooks/useSafetyTrainingForm'
import type { SafetyTraining, TrainingStatus } from '../types/safety'
import { AddIcon } from '@/icons'
import { Box, Typography, Skeleton, MenuItem, TextField as MuiTextField, useMediaQuery, useTheme, Stack } from '@/mui'

export default function SafetyTrainingPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { trainings, loading, loadTrainings } = useSafetyTraining({
    projectId,
    status: activeTab !== 'all' ? (activeTab as TrainingStatus) : undefined,
    trainingType: typeFilter || undefined,
    searchQuery,
  })

  const {
    summary,
    contacts,
    dialogOpen,
    editingTraining,
    submitting,
    form,
    formErrors,
    handleCreate,
    handleUpdate,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    updateFormField,
    validateField,
  } = useSafetyTrainingForm(projectId)

  const summaryItems = summary
    ? [
        { label: t('safetyTraining.summary.total'), value: summary.total, color: 'default' as const },
        { label: t('safetyTraining.summary.valid'), value: summary.validCount, color: 'success' as const },
        {
          label: t('safetyTraining.summary.expiringSoon'),
          value: summary.expiringSoonCount,
          color: 'warning' as const,
        },
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
          <Button onClick={openCreateDialog} startIcon={<AddIcon />}>
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
                  <TrainingCard key={training.id} training={training} onClick={() => openEditDialog(training)} />
                ))}
              </Stack>
            ) : (
              <DataTable columns={columns} rows={trainings} getRowId={(training) => training.id} onRowClick={openEditDialog} />
            )}
          </Card>
        </>
      )}

      <SafetyTrainingFormDialog
        open={dialogOpen}
        isEditing={!!editingTraining}
        form={form}
        formErrors={formErrors}
        contacts={contacts}
        submitting={submitting}
        onClose={closeDialog}
        onSubmit={editingTraining ? () => handleUpdate(loadTrainings) : () => handleCreate(loadTrainings)}
        onChange={updateFormField}
        onBlur={validateField}
      />
    </Box>
  )
}
