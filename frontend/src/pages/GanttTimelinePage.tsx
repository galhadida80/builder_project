import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import FilterListIcon from '@mui/icons-material/FilterList'
import { Card } from '../components/ui/Card'
import { GanttChart } from '../components/ui/GanttChart'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import type { GanttTask, GanttLink, GanttScale } from '../types/timeline'

// Mock hierarchical timeline data based on design reference
const createMockTimelineData = () => {
  const tasks: GanttTask[] = [
    // Foundation Phase
    {
      id: 'foundation',
      text: 'Foundation',
      start: '2023-10-01',
      end: '2023-11-15',
      type: 'project',
      open: true,
      progress: 75,
    },
    {
      id: 'excavation',
      text: 'Excavation',
      start: '2023-10-01',
      end: '2023-10-14',
      parent: 'foundation',
      type: 'task',
      progress: 100,
    },
    {
      id: 'formwork',
      text: 'Formwork Setup',
      start: '2023-10-15',
      end: '2023-10-21',
      parent: 'foundation',
      type: 'task',
      progress: 100,
    },
    {
      id: 'pouring',
      text: 'Concrete Pouring',
      start: '2023-10-22',
      end: '2023-10-28',
      parent: 'foundation',
      type: 'task',
      progress: 100,
    },
    {
      id: 'curing',
      text: 'Curing Period',
      start: '2023-10-29',
      end: '2023-11-11',
      parent: 'foundation',
      type: 'task',
      progress: 80,
    },
    {
      id: 'foundation-complete',
      text: 'Foundation Complete',
      start: '2023-11-15',
      parent: 'foundation',
      type: 'milestone',
    },

    // Framing Phase
    {
      id: 'framing',
      text: 'Framing',
      start: '2023-11-16',
      end: '2024-01-05',
      type: 'project',
      open: true,
      progress: 45,
    },
    {
      id: 'floor-framing',
      text: 'Floor Framing',
      start: '2023-11-16',
      end: '2023-11-30',
      parent: 'framing',
      type: 'task',
      progress: 100,
    },
    {
      id: 'wall-framing',
      text: 'Wall Framing',
      start: '2023-12-01',
      end: '2023-12-18',
      parent: 'framing',
      type: 'task',
      progress: 90,
    },
    {
      id: 'roof-framing',
      text: 'Roof Framing',
      start: '2023-12-19',
      end: '2024-01-05',
      parent: 'framing',
      type: 'task',
      progress: 30,
    },
    {
      id: 'roof-tight',
      text: 'Roof Tight',
      start: '2024-01-05',
      parent: 'framing',
      type: 'milestone',
    },

    // Electrical Phase
    {
      id: 'electrical',
      text: 'Electrical',
      start: '2024-01-06',
      end: '2024-02-10',
      type: 'project',
      open: true,
      progress: 20,
    },
    {
      id: 'rough-electrical',
      text: 'Rough-In Wiring',
      start: '2024-01-06',
      end: '2024-01-20',
      parent: 'electrical',
      type: 'task',
      progress: 40,
    },
    {
      id: 'panel-installation',
      text: 'Panel Installation',
      start: '2024-01-21',
      end: '2024-01-27',
      parent: 'electrical',
      type: 'task',
      progress: 15,
    },
    {
      id: 'fixture-installation',
      text: 'Fixture Installation',
      start: '2024-01-28',
      end: '2024-02-10',
      parent: 'electrical',
      type: 'task',
      progress: 0,
    },

    // Plumbing Phase
    {
      id: 'plumbing',
      text: 'Plumbing',
      start: '2024-01-06',
      end: '2024-02-15',
      type: 'project',
      open: true,
      progress: 15,
    },
    {
      id: 'rough-plumbing',
      text: 'Rough-In Plumbing',
      start: '2024-01-06',
      end: '2024-01-25',
      parent: 'plumbing',
      type: 'task',
      progress: 35,
    },
    {
      id: 'drain-lines',
      text: 'Drain Lines',
      start: '2024-01-26',
      end: '2024-02-05',
      parent: 'plumbing',
      type: 'task',
      progress: 10,
    },
    {
      id: 'fixture-plumbing',
      text: 'Fixture Installation',
      start: '2024-02-06',
      end: '2024-02-15',
      parent: 'plumbing',
      type: 'task',
      progress: 0,
    },

    // Final Milestone
    {
      id: 'inspections',
      text: 'Final Inspections',
      start: '2024-03-01',
      type: 'milestone',
    },
  ]

  const links: GanttLink[] = [
    // Foundation dependencies
    { id: 'link-1', source: 'excavation', target: 'formwork', type: 'e2s' },
    { id: 'link-2', source: 'formwork', target: 'pouring', type: 'e2s' },
    { id: 'link-3', source: 'pouring', target: 'curing', type: 'e2s' },
    { id: 'link-4', source: 'curing', target: 'foundation-complete', type: 'e2s' },

    // Foundation to Framing
    { id: 'link-5', source: 'foundation-complete', target: 'floor-framing', type: 'e2s' },

    // Framing dependencies
    { id: 'link-6', source: 'floor-framing', target: 'wall-framing', type: 'e2s' },
    { id: 'link-7', source: 'wall-framing', target: 'roof-framing', type: 'e2s' },
    { id: 'link-8', source: 'roof-framing', target: 'roof-tight', type: 'e2s' },

    // Framing to MEP (Mechanical, Electrical, Plumbing)
    { id: 'link-9', source: 'roof-tight', target: 'rough-electrical', type: 'e2s' },
    { id: 'link-10', source: 'roof-tight', target: 'rough-plumbing', type: 'e2s' },

    // Electrical dependencies
    { id: 'link-11', source: 'rough-electrical', target: 'panel-installation', type: 'e2s' },
    { id: 'link-12', source: 'panel-installation', target: 'fixture-installation', type: 'e2s' },

    // Plumbing dependencies
    { id: 'link-13', source: 'rough-plumbing', target: 'drain-lines', type: 'e2s' },
    { id: 'link-14', source: 'drain-lines', target: 'fixture-plumbing', type: 'e2s' },

    // Final inspection dependencies
    { id: 'link-15', source: 'fixture-installation', target: 'inspections', type: 'e2s' },
    { id: 'link-16', source: 'fixture-plumbing', target: 'inspections', type: 'e2s' },
  ]

  return { tasks, links }
}

// Zoom level configurations
const zoomLevels: Array<{ label: string; scales: GanttScale[] }> = [
  {
    label: 'Year/Month',
    scales: [
      { unit: 'year', format: 'YYYY' },
      { unit: 'month', format: 'MMM' },
    ],
  },
  {
    label: 'Month/Week',
    scales: [
      { unit: 'month', format: 'MMM YYYY' },
      { unit: 'week', format: 'w' },
    ],
  },
  {
    label: 'Month/Day',
    scales: [
      { unit: 'month', format: 'MMM YYYY' },
      { unit: 'day', format: 'D' },
    ],
  },
  {
    label: 'Week/Day',
    scales: [
      { unit: 'week', format: 'MMM D' },
      { unit: 'day', format: 'ddd D' },
    ],
  },
]

export default function GanttTimelinePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [zoomLevel, setZoomLevel] = useState(2) // Start with Month/Day view
  const [filterValue, setFilterValue] = useState('all')

  const { tasks, links } = createMockTimelineData()

  if (!projectId) {
    return (
      <Box sx={{ p: 3 }}>
        <EmptyState
          variant="not-found"
          title="Project not found"
          description="Please select a project to view the timeline"
        />
      </Box>
    )
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, zoomLevels.length - 1))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 0))
  }

  const currentScales = zoomLevels[zoomLevel].scales

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Project Timeline"
        subtitle="BuilderOps Construction Project Schedule"
      />

      <Card sx={{ mt: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={600}>
              Construction Schedule
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Zoom Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  Zoom:
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleZoomOut}
                  disabled={zoomLevel === 0}
                  title="Zoom out"
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    '&:disabled': { opacity: 0.5 },
                  }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleZoomIn}
                  disabled={zoomLevel === zoomLevels.length - 1}
                  title="Zoom in"
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    '&:disabled': { opacity: 0.5 },
                  }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Filter Dropdown */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  startAdornment={<FilterListIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="all">All Tasks</MenuItem>
                  <MenuItem value="foundation">Foundation</MenuItem>
                  <MenuItem value="framing">Framing</MenuItem>
                  <MenuItem value="electrical">Electrical</MenuItem>
                  <MenuItem value="plumbing">Plumbing</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="milestones">Milestones Only</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 0, minHeight: 600, height: 'calc(100vh - 320px)' }}>
          <GanttChart tasks={tasks} links={links} scales={currentScales} />
        </Box>
      </Card>

      {/* Timeline Legend */}
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 12,
              bgcolor: 'primary.main',
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Task
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              bgcolor: 'warning.main',
              transform: 'rotate(45deg)',
              border: '2px solid',
              borderColor: 'warning.dark',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Milestone
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 2,
              bgcolor: 'text.secondary',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Dependency
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 2,
              height: 20,
              bgcolor: 'error.main',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Today
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
