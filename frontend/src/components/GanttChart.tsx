import { Box, Paper, useTheme, Typography, ButtonGroup, Menu, MenuItem, Skeleton, Alert, AlertTitle } from '@mui/material'
import { styled, alpha } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import TimelineIcon from '@mui/icons-material/Timeline'
import WarningIcon from '@mui/icons-material/Warning'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { useTranslation } from 'react-i18next'
import { GanttChartProps, GanttTask, GanttViewMode, GanttTaskType } from '../types/gantt'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'
import { useState, useMemo } from 'react'

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

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
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

// Validation warning type
interface ValidationWarning {
  taskId: string
  taskName: string
  message: string
  type: 'error' | 'warning'
}

// Validate task dates
const validateTaskDates = (task: GanttTask): string | null => {
  if (task.end < task.start) {
    return 'End date must be after start date'
  }

  // Check for very short tasks (less than 1 minute)
  const durationMs = task.end.getTime() - task.start.getTime()
  const oneMinute = 60 * 1000
  if (durationMs < oneMinute) {
    return 'Task duration is too short (less than 1 minute)'
  }

  return null
}

// Validate task progress
const validateTaskProgress = (task: GanttTask): string | null => {
  if (task.progress < 0 || task.progress > 100) {
    return 'Task progress must be between 0 and 100'
  }
  return null
}

// Detect circular dependencies using depth-first search
const hasCircularDependency = (
  taskId: string,
  tasks: GanttTask[],
  visited: Set<string> = new Set(),
  recursionStack: Set<string> = new Set()
): boolean => {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return false

  visited.add(taskId)
  recursionStack.add(taskId)

  const dependencies = task.dependencies || []
  for (const depId of dependencies) {
    if (!visited.has(depId)) {
      if (hasCircularDependency(depId, tasks, visited, recursionStack)) {
        return true
      }
    } else if (recursionStack.has(depId)) {
      return true
    }
  }

  recursionStack.delete(taskId)
  return false
}

// Validate all dependencies exist
const validateDependencies = (task: GanttTask, allTasks: GanttTask[]): string | null => {
  if (!task.dependencies || task.dependencies.length === 0) {
    return null
  }

  const taskIds = new Set(allTasks.map((t) => t.id))
  const missingDeps = task.dependencies.filter((depId) => !taskIds.has(depId))

  if (missingDeps.length > 0) {
    return `Task has invalid dependencies: ${missingDeps.join(', ')}`
  }

  return null
}

// Validate tasks and collect warnings
const validateTasks = (tasks: GanttTask[]): { validTasks: GanttTask[]; warnings: ValidationWarning[] } => {
  const warnings: ValidationWarning[] = []
  const validTasks: GanttTask[] = []

  // Check for empty data - already handled by component logic
  if (tasks.length === 0) {
    return { validTasks: [], warnings: [] }
  }

  // First pass: validate individual tasks
  for (const task of tasks) {
    let hasErrors = false

    // Validate dates
    const dateError = validateTaskDates(task)
    if (dateError) {
      warnings.push({
        taskId: task.id,
        taskName: task.name,
        message: dateError,
        type: 'error',
      })
      hasErrors = true
    }

    // Validate progress
    const progressError = validateTaskProgress(task)
    if (progressError) {
      warnings.push({
        taskId: task.id,
        taskName: task.name,
        message: progressError,
        type: 'error',
      })
      hasErrors = true
    }

    // Validate dependencies exist
    const depError = validateDependencies(task, tasks)
    if (depError) {
      warnings.push({
        taskId: task.id,
        taskName: task.name,
        message: depError,
        type: 'error',
      })
      hasErrors = true
    }

    // Only include tasks without errors
    if (!hasErrors) {
      validTasks.push(task)
    }
  }

  // Second pass: check for circular dependencies
  const visited = new Set<string>()
  for (const task of validTasks) {
    if (!visited.has(task.id)) {
      if (hasCircularDependency(task.id, validTasks, visited)) {
        warnings.push({
          taskId: task.id,
          taskName: task.name,
          message: 'Task is part of a circular dependency chain',
          type: 'error',
        })
      }
    }
  }

  // Remove tasks with circular dependencies
  const circularTaskIds = new Set(
    warnings.filter((w) => w.message.includes('circular')).map((w) => w.taskId)
  )
  const finalValidTasks = validTasks.filter((task) => !circularTaskIds.has(task.id))

  // Check for very long tasks (more than 10 years) - warning only
  for (const task of finalValidTasks) {
    const durationMs = task.end.getTime() - task.start.getTime()
    const tenYears = 10 * 365 * 24 * 60 * 60 * 1000
    if (durationMs > tenYears) {
      warnings.push({
        taskId: task.id,
        taskName: task.name,
        message: 'Task duration exceeds 10 years - timeline may not render optimally',
        type: 'warning',
      })
    }
  }

  return { validTasks: finalValidTasks, warnings }
}

// Map our GanttViewMode string type to the library's ViewMode enum
const viewModeMap: Record<GanttViewMode, ViewMode> = {
  Hour: ViewMode.Hour,
  QuarterDay: ViewMode.QuarterDay,
  HalfDay: ViewMode.HalfDay,
  Day: ViewMode.Day,
  Week: ViewMode.Week,
  Month: ViewMode.Month,
  QuarterYear: ViewMode.Month, // QuarterYear not available, fallback to Month
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
  loading = false,
  onViewModeChange,
  onDateChange,
  onProgressChange,
  onDelete,
  onExpanderClick,
}: GanttChartProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null)
  const [filterType, setFilterType] = useState<GanttTaskType | 'all'>('all')
  const filterMenuOpen = Boolean(filterAnchorEl)

  // Validate tasks and get warnings
  const { validTasks, warnings } = useMemo(() => validateTasks(tasks), [tasks])

  // Apply filter to valid tasks
  const filteredTasks = useMemo(() => {
    if (filterType === 'all') {
      return validTasks
    }
    return validTasks.filter((task) => task.type === filterType)
  }, [validTasks, filterType])

  // Convert our tasks to library format
  const libraryTasks = filteredTasks.map(convertToLibraryTask)

  // Get the library ViewMode enum value
  const currentViewMode = viewModeMap[viewMode]

  // View mode options for the toolbar
  const viewModeOptions: { value: GanttViewMode; label: string }[] = [
    { value: 'Hour', label: t('gantt.hour') },
    { value: 'Day', label: t('gantt.day') },
    { value: 'Week', label: t('gantt.week') },
    { value: 'Month', label: t('gantt.month') },
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
      const originalTask = validTasks.find((t) => t.id === task.id)
      if (originalTask) {
        // Validate new dates
        const dateError = validateTaskDates({ ...originalTask, start: task.start, end: task.end })
        if (!dateError) {
          onDateChange(originalTask, task.start, task.end)
        }
      }
    }
  }

  // Handle progress change event
  const handleProgressChange = (task: Task) => {
    if (onProgressChange) {
      const originalTask = validTasks.find((t) => t.id === task.id)
      if (originalTask) {
        // Validate new progress
        const progressError = validateTaskProgress({ ...originalTask, progress: task.progress })
        if (!progressError) {
          onProgressChange(originalTask, task.progress)
        }
      }
    }
  }

  // Handle delete event
  const handleDelete = (task: Task) => {
    if (onDelete) {
      const originalTask = validTasks.find((t) => t.id === task.id)
      if (originalTask) {
        onDelete(originalTask)
      }
    }
  }

  // Handle expander click event
  const handleExpanderClick = (task: Task) => {
    if (onExpanderClick) {
      const originalTask = validTasks.find((t) => t.id === task.id)
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
    { value: 'all', label: t('gantt.allTasksFilter') },
    { value: 'task', label: t('gantt.tasksOnly') },
    { value: 'project', label: t('gantt.projectsOnly') },
    { value: 'milestone', label: t('gantt.milestonesOnlyFilter') },
  ]

  // Render loading skeleton
  if (loading) {
    return (
      <StyledGanttPaper elevation={1}>
        <LoadingContainer>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ width: '200px' }}>
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, mb: 1 }} />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} variant="rectangular" height={32} sx={{ borderRadius: 1, mb: 0.5 }} />
              ))}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, mb: 1 }} />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} variant="rectangular" height={32} sx={{ borderRadius: 1, mb: 0.5 }} />
              ))}
            </Box>
          </Box>
        </LoadingContainer>
      </StyledGanttPaper>
    )
  }

  // Render empty state for original tasks
  if (tasks.length === 0) {
    return (
      <StyledGanttPaper elevation={1}>
        <EmptyState
          variant="no-data"
          title={t('gantt.noTasksAvailable')}
          description={t('gantt.noTasksDescription')}
          icon={<TimelineIcon />}
        />
      </StyledGanttPaper>
    )
  }

  // Render empty state if all tasks are invalid
  if (libraryTasks.length === 0 && tasks.length > 0) {
    return (
      <StyledGanttPaper elevation={1}>
        {warnings.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {warnings.map((warning, index) => (
              <Alert key={index} severity={warning.type} sx={{ mb: 1 }}>
                <AlertTitle>
                  {warning.type === 'error' ? t('gantt.validationError') : t('gantt.validationWarning')}: {warning.taskName}
                </AlertTitle>
                {warning.message}
              </Alert>
            ))}
          </Box>
        )}
        <EmptyState
          variant="no-data"
          title={t('gantt.noValidTasks')}
          description={t('gantt.noValidTasksDescription')}
          icon={<WarningIcon />}
        />
      </StyledGanttPaper>
    )
  }

  // Render the Gantt chart
  return (
    <StyledGanttPaper elevation={1}>
      <Box sx={{ width: '100%', height: '100%' }}>
        {/* Display validation warnings */}
        {warnings.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="warning" icon={<WarningIcon />}>
              <AlertTitle>{t('gantt.validationIssues')}</AlertTitle>
              {warnings.length > 1
                ? t('gantt.tasksHaveIssues', { count: warnings.length })
                : t('gantt.taskHasIssues', { count: warnings.length })}{' '}
              {warnings.filter((w) => w.type === 'error').length > 0 && (
                <>
                  {warnings.filter((w) => w.type === 'error').length > 1
                    ? t('gantt.errorsExcludedPlural', { count: warnings.filter((w) => w.type === 'error').length })
                    : t('gantt.errorsExcluded', { count: warnings.filter((w) => w.type === 'error').length })}
                </>
              )}
            </Alert>
            <Box sx={{ mt: 1, maxHeight: 200, overflowY: 'auto' }}>
              {warnings.slice(0, 5).map((warning, index) => (
                <Alert key={index} severity={warning.type} sx={{ mb: 1 }}>
                  <strong>{warning.taskName}:</strong> {warning.message}
                </Alert>
              ))}
              {warnings.length > 5 && (
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', textAlign: 'center' }}>
                  {warnings.length - 5 > 1
                    ? t('gantt.moreIssuesPlural', { count: warnings.length - 5 })
                    : t('gantt.moreIssues', { count: warnings.length - 5 })}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        <ToolbarBox>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {t('gantt.viewMode')}
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
              {t('gantt.filterLabel')} {filterOptions.find((opt) => opt.value === filterType)?.label}
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
                <span className="tooltip-label">{t('gantt.progressLabel')}</span>
                <span>{task.progress}%</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">{t('gantt.startLabel')}</span>
                <span>{task.start.toLocaleDateString()}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">{t('gantt.endLabel')}</span>
                <span>{task.end.toLocaleDateString()}</span>
              </div>
            </StyledTooltip>
          )}
        />
      </Box>
    </StyledGanttPaper>
  )
}
