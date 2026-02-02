import { Box, Paper, useTheme, Typography } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { GanttChartProps, GanttTask, GanttViewMode } from '../types/gantt'

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
  onDateChange,
  onProgressChange,
  onDelete,
  onExpanderClick,
}: GanttChartProps) {
  const theme = useTheme()

  // Convert our tasks to library format
  const libraryTasks = tasks.map(convertToLibraryTask)

  // Get the library ViewMode enum value
  const currentViewMode = viewModeMap[viewMode]

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

  return (
    <StyledGanttPaper elevation={1}>
      <Box sx={{ width: '100%', height: '100%' }}>
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
