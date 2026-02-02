import { Box, Paper, useTheme } from '@mui/material'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { GanttChartProps, GanttTask, GanttViewMode } from '../types/gantt'

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
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        overflow: 'auto',
        '& .gantt-container': {
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize,
        },
      }}
    >
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
            barBackgroundColor={theme.palette.grey[300]}
            barBackgroundSelectedColor={theme.palette.grey[400]}
            projectProgressColor={theme.palette.secondary.main}
            projectProgressSelectedColor={theme.palette.secondary.dark}
            projectBackgroundColor={theme.palette.grey[200]}
            projectBackgroundSelectedColor={theme.palette.grey[300]}
            milestoneBackgroundColor={theme.palette.success.main}
            milestoneBackgroundSelectedColor={theme.palette.success.dark}
            arrowColor={theme.palette.text.secondary}
            arrowIndent={20}
            todayColor={theme.palette.error.light}
            TooltipContent={({ task }) => (
              <Box
                sx={{
                  p: 1,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  boxShadow: theme.shadows[2],
                }}
              >
                <strong>{task.name}</strong>
                <div>Progress: {task.progress}%</div>
                <div>
                  Start: {task.start.toLocaleDateString()}
                </div>
                <div>
                  End: {task.end.toLocaleDateString()}
                </div>
              </Box>
            )}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              color: 'text.secondary',
            }}
          >
            No tasks to display
          </Box>
        )}
      </Box>
    </Paper>
  )
}
