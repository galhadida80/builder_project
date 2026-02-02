import { Box, Paper, useTheme, Typography, ButtonGroup, Menu, MenuItem } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import FilterListIcon from '@mui/icons-material/FilterList'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { GanttChartProps, GanttTask, GanttViewMode, GanttTaskType } from '../types/gantt'
import { Button } from './ui/Button'
import { useState } from 'react'

// Styled components following MUI theme patterns
const StyledGanttPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  overflow: 'auto',
  transition: 'all 200ms ease-out',
  '& .gantt-container': {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body2.fontSize,
  },
  '& ._3Rx27': {
    // Gantt header styling
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& ._1uWLi': {
    // Task list styling
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
  '& ._36ChA': {
    // Grid styling
    backgroundColor: theme.palette.background.default,
  },
}))

const StyledTooltip = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
  borderRadius: 8,
  boxShadow: theme.shadows[4],
  minWidth: 200,
  '& .tooltip-title': {
    fontWeight: 600,
    fontSize: theme.typography.body1.fontSize,
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  '& .tooltip-row': {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(0.5),
    fontSize: theme.typography.body2.fontSize,
    color: theme.palette.text.secondary,
  },
  '& .tooltip-label': {
    fontWeight: 500,
    marginRight: theme.spacing(0.5),
    color: theme.palette.text.primary,
  },
}))

const EmptyStateBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 400,
  color: theme.palette.text.secondary,
  gap: theme.spacing(2),
}))

const ToolbarBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1),
  backgroundColor: alpha(theme.palette.primary.main, 0.03),
  borderRadius: 8,
  gap: theme.spacing(2),
}))

// Map our GanttViewMode string type to the library's ViewMode enum
const viewModeMap: Record<GanttViewMode, ViewMode> = {
  Hour: ViewMode.Hour,
  QuarterDay: ViewMode.QuarterDay,
  HalfDay: ViewMode.HalfDay,
  Day: ViewMode.Day,
  Week: ViewMode.Week,
  Month: ViewMode.Month,
  QuarterYear: ViewMode.QuarterYear,
  Year: ViewMode.Year,
}

// Convert our GanttTask to library's Task format
const convertToLibraryTask = (task: GanttTask): Task => {
  return {
    id: task.id,
    name: task.name,
    type: task.type,
    start: task.start,
    end: task.end,
    progress: task.progress,
    dependencies: task.dependencies,
    styles: task.styles,
    isDisabled: task.isDisabled,
    project: task.project,
    hideChildren: task.hideChildren,
  }
}

export function GanttChart({
  tasks,
  viewMode = 'Day',
  onViewModeChange,
  onDateChange,
  onProgressChange,
  onDelete,
  onExpanderClick,
}: GanttChartProps) {
  const theme = useTheme()
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null)
  const [filterType, setFilterType] = useState<GanttTaskType | 'all'>('all')
  const filterMenuOpen = Boolean(filterAnchorEl)

  // Convert our tasks to library format
  const libraryTasks = tasks.map(convertToLibraryTask)

  // Get the library ViewMode enum value
  const currentViewMode = viewModeMap[viewMode]

  // View mode options for the toolbar
  const viewModeOptions: { value: GanttViewMode; label: string }[] = [
    { value: 'Hour', label: 'Hour' },
    { value: 'Day', label: 'Day' },
    { value: 'Week', label: 'Week' },
    { value: 'Month', label: 'Month' },
  ]

  // Handle view mode change
  const handleViewModeChange = (mode: GanttViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode)
    }
  }

  // Handle date change event
  const handleTaskChange = (task: Task) => {
    if (onDateChange) {
      const originalTask = tasks.find((t) => t.id === task.id)
      if (originalTask) {
        onDateChange(originalTask, task.start, task.end)
      }
    }
  }

  // Handle progress change event
  const handleProgressChange = (task: Task) => {
    if (onProgressChange) {
      const originalTask = tasks.find((t) => t.id === task.id)
      if (originalTask) {
        onProgressChange(originalTask, task.progress)
      }
    }
  }

  // Handle delete event
  const handleDelete = (task: Task) => {
    if (onDelete) {
      const originalTask = tasks.find((t) => t.id === task.id)
      if (originalTask) {
        onDelete(originalTask)
      }
    }
  }

  // Handle expander click event
  const handleExpanderClick = (task: Task) => {
    if (onExpanderClick) {
      const originalTask = tasks.find((t) => t.id === task.id)
      if (originalTask) {
        onExpanderClick(originalTask)
      }
    }
  }

  // Handle filter menu
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget)
  }

  const handleFilterClose = () => {
    setFilterAnchorEl(null)
  }

  const handleFilterSelect = (type: GanttTaskType | 'all') => {
    setFilterType(type)
    handleFilterClose()
  }

  // Filter options for the menu
  const filterOptions: { value: GanttTaskType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Tasks' },
    { value: 'task', label: 'Tasks Only' },
    { value: 'project', label: 'Projects Only' },
    { value: 'milestone', label: 'Milestones Only' },
  ]

  return (
    <StyledGanttPaper elevation={1}>
      <Box sx={{ width: '100%', height: '100%' }}>
        {libraryTasks.length > 0 && (
          <ToolbarBox>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                View Mode:
              </Typography>
              <ButtonGroup size="small">
                {viewModeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={viewMode === option.value ? 'primary' : 'secondary'}
                    onClick={() => handleViewModeChange(option.value)}
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="secondary"
                size="small"
                onClick={handleFilterClick}
                startIcon={<FilterListIcon />}
                sx={{ textTransform: 'none' }}
              >
                Filter: {filterOptions.find((opt) => opt.value === filterType)?.label}
              </Button>
              <Menu
                anchorEl={filterAnchorEl}
                open={filterMenuOpen}
                onClose={handleFilterClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                {filterOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={filterType === option.value}
                    onClick={() => handleFilterSelect(option.value)}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </ToolbarBox>
        )}
        {libraryTasks.length > 0 ? (
          <Gantt
            tasks={libraryTasks}
            viewMode={currentViewMode}
            onDateChange={handleTaskChange}
            onProgressChange={handleProgressChange}
            onDelete={handleDelete}
            onExpanderClick={handleExpanderClick}
            listCellWidth="155px"
            columnWidth={65}
            barProgressColor={theme.palette.primary.main}
            barProgressSelectedColor={theme.palette.primary.dark}
            barBackgroundColor={alpha(theme.palette.primary.main, 0.2)}
            barBackgroundSelectedColor={alpha(theme.palette.primary.main, 0.3)}
            projectProgressColor={theme.palette.secondary.main}
            projectProgressSelectedColor={theme.palette.secondary.dark}
            projectBackgroundColor={alpha(theme.palette.secondary.main, 0.15)}
            projectBackgroundSelectedColor={alpha(theme.palette.secondary.main, 0.25)}
            milestoneBackgroundColor={theme.palette.success.main}
            milestoneBackgroundSelectedColor={theme.palette.success.dark}
            arrowColor={alpha(theme.palette.text.secondary, 0.6)}
            arrowIndent={20}
            todayColor={alpha(theme.palette.error.light, 0.2)}
            TooltipContent={({ task }) => (
              <StyledTooltip>
                <div className="tooltip-title">{task.name}</div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Progress:</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">Start:</span>
                  <span>{task.start.toLocaleDateString()}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">End:</span>
                  <span>{task.end.toLocaleDateString()}</span>
                </div>
              </StyledTooltip>
            )}
          />
        ) : (
          <EmptyStateBox>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              No tasks to display
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add tasks to see them in the timeline
            </Typography>
          </EmptyStateBox>
        )}
      </Box>
    </StyledGanttPaper>
  )
}
