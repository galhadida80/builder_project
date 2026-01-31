import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import type { Project } from '../../types'

interface ProjectSelectorProps {
  projects: Project[]
  currentProject?: Project
  onProjectChange: (projectId: string) => void
}

export default function ProjectSelector({ projects, currentProject, onProjectChange }: ProjectSelectorProps) {
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
    <FormControl size="small" sx={{ minWidth: 300 }}>
      <Select
        value={currentProject?.id || ''}
        onChange={handleChange}
        displayEmpty
        sx={{
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'action.hover' : 'grey.100',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          borderRadius: 2,
          transition: 'background-color 200ms ease',
          '&:hover': {
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'action.selected' : 'grey.200',
          },
        }}
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderOpenIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography color="text.secondary">Select a project</Typography>
              </Box>
            )
          }
          const project = projects.find(p => p.id === selected)
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FolderOpenIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography fontWeight={500}>{project?.name}</Typography>
              <Chip
                label={project?.code}
                size="small"
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
              />
            </Box>
          )
        }}
      >
        <MenuItem value="" disabled>
          <Typography color="text.secondary">Select a project</Typography>
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
