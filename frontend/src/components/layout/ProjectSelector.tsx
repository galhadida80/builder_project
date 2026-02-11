import { useTranslation } from 'react-i18next'
import type { Project } from '../../types'
import { FormControl, MenuItem, Typography, Box, Chip } from '@/mui'
import { Select, SelectChangeEvent } from '@/mui'

interface ProjectSelectorProps {
  projects: Project[]
  currentProject?: Project
  onProjectChange: (projectId: string) => void
}

export default function ProjectSelector({ projects, currentProject, onProjectChange }: ProjectSelectorProps) {
  const { t } = useTranslation()

  const handleChange = (event: SelectChangeEvent<string>) => {
    onProjectChange(event.target.value)
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'success'
      case 'on_hold': return 'warning'
      case 'completed': return 'info'
      case 'archived': return 'default'
      default: return 'default'
    }
  }

  return (
    <FormControl size="small" sx={{ minWidth: 280 }}>
      <Select
        value={currentProject?.id || ''}
        onChange={handleChange}
        displayEmpty
        sx={{
          bgcolor: 'action.hover',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          borderRadius: 2,
        }}
        renderValue={(selected) => {
          if (!selected) {
            return <Typography color="text.secondary">{t('projectSelector.selectAProject')}</Typography>
          }
          const project = projects.find(p => p.id === selected)
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>{project?.name}</Typography>
              <Chip
                label={project?.code}
                size="small"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
          )
        }}
      >
        <MenuItem value="" disabled>
          <Typography color="text.secondary">{t('projectSelector.selectAProject')}</Typography>
        </MenuItem>
        {projects.map((project) => (
          <MenuItem key={project.id} value={project.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box>
                <Typography variant="body2">{project.name}</Typography>
                <Typography variant="caption" color="text.secondary">{project.code}</Typography>
              </Box>
              <Chip
                label={project.status}
                size="small"
                color={getStatusColor(project.status)}
                sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }}
              />
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
