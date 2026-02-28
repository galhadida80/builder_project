import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import FilterChips from '../ui/FilterChips'
import { Box, MenuItem, TextField as MuiTextField } from '@/mui'
import type { User, Project } from '../../types'

interface AssignmentFiltersProps {
  selectedConsultant: string
  onConsultantChange: (value: string) => void
  consultants: User[]
  selectedProject: string
  onProjectChange: (value: string) => void
  projects: Project[]
  selectedStatus: string
  onStatusChange: (value: string) => void
  startDateFilter: string
  onStartDateChange: (value: string) => void
  endDateFilter: string
  onEndDateChange: (value: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export default function AssignmentFilters({
  selectedConsultant,
  onConsultantChange,
  consultants,
  selectedProject,
  onProjectChange,
  projects,
  selectedStatus,
  onStatusChange,
  startDateFilter,
  onStartDateChange,
  endDateFilter,
  onEndDateChange,
  onClearFilters,
  hasActiveFilters,
}: AssignmentFiltersProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
      <FilterChips
        items={[
          { label: t('consultantAssignments.allStatuses'), value: 'all' },
          { label: t('common.pending'), value: 'pending' },
          { label: t('common.active'), value: 'active' },
          { label: t('common.completed'), value: 'completed' },
          { label: t('consultantAssignments.cancelled'), value: 'cancelled' },
        ]}
        value={selectedStatus}
        onChange={onStatusChange}
      />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <MuiTextField
          select
          size="small"
          label={t('consultantAssignments.consultant')}
          value={selectedConsultant}
          onChange={(e) => onConsultantChange(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">{t('consultantAssignments.allConsultants')}</MenuItem>
          {consultants.map((consultant) => (
            <MenuItem key={consultant.id} value={consultant.id}>
              {consultant.fullName || consultant.email}
            </MenuItem>
          ))}
        </MuiTextField>

        <MuiTextField
          select
          size="small"
          label={t('consultantAssignments.project')}
          value={selectedProject}
          onChange={(e) => onProjectChange(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">{t('consultantAssignments.allProjects')}</MenuItem>
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </MuiTextField>

        <MuiTextField
          type="date"
          size="small"
          label={t('consultantAssignments.startDateFrom')}
          value={startDateFilter}
          onChange={(e) => onStartDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />

        <MuiTextField
          type="date"
          size="small"
          label={t('consultantAssignments.endDateTo')}
          value={endDateFilter}
          onChange={(e) => onEndDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />

        {hasActiveFilters && (
          <Button variant="secondary" size="small" onClick={onClearFilters}>
            {t('consultantAssignments.clearFilters')}
          </Button>
        )}
      </Box>
    </Box>
  )
}
